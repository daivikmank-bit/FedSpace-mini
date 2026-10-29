// src/workers/physicsAndOrbit.worker.ts
// High-Fidelity Physics, Digital Twin, 10x LEO Orbital Propagator & Edge AI Simulation Worker

import {
  TelemetryPolicy,
  FaultClass,
  FdirLayerState,
  FrictionLevel,
  HarnessFaultOhms,
  BinderClipCount,
  HousekeepingPacket,
  HealthDigestPacket,
  FdirEventPacket,
  StageEnergyProfile,
  OrbitalState,
  DspFeaturesData
} from '../types/telemetry';

// Simulation Configuration & State
let rpmSetpoint = 220;
let clipsF1: BinderClipCount = 0;
let frictionF2: FrictionLevel = 'NONE';
let harnessF3: HarnessFaultOhms = 0;
let telemetryPolicy: TelemetryPolicy = 'P2_EDGE_FDIR';
let detectorId = 'M-S-KD-32';
let clockMhz: 80 | 160 | 240 = 80;
let fftSize: 512 | 1024 | 2048 = 1024;
let emergencyBrake = false;

// Physics States
let rpmActual = 0;
let rpmKalman = 0;
let kalmanDot = 0;
let piIntegral = 0;
let motorCurrentMa = 80;
let windingTempC = 26.0;
let busVoltageV = 5.0;
let timeSinceCmdSec = 10;
let simTimeMs = 0;
let hopCount = 0;

// Optical Disc Simulation (20 slots with physical manufacturing tolerance jitter)
const slotWidthJitter = [
  1.02, 0.94, 1.08, 0.97, 1.01, 0.92, 1.05, 0.99,
  1.03, 0.95, 1.07, 0.98, 1.00, 0.93, 1.06, 0.97,
  1.02, 0.96, 1.04, 0.95
];
let currentSlotIdx = 0;

// Phasor Runout (₹60 TT wheel baseline wobble)
const Z0_REAL = 0.35;
const Z0_IMAG = 0.12;

// Anomaly Detection & Scoring
let whitenedScoreEma = 0.25;
const persistenceWindow: boolean[] = [false, false, false, false, false];
let consecutiveLowHops = 0;
let fdirLayer: FdirLayerState = 'NOMINAL';
let isolatedFault: FaultClass = 'NORMAL';

// Orbital Simulation (10x Scaled LEO: 576s period, 48s pass)
const ORBIT_PERIOD_SEC = 576.0;
const PASS_DURATION_SEC = 48.0;
let orbitTimeSec = 0;
let islQueueDepthPackets = 0;
let cumulativeBytesSatA = 0;
let cumulativeBytesDownlink = 0;

// Cumulative HK for 60s Digest (Policy P2)
let digestRpmSamples: number[] = [];
let digestCurrentSamples: number[] = [];
let digestPwmSamples: number[] = [];
let digestMaxScore = 0;
let digestE1xSum = 0;

// 100 Hz Timer (Control, Kalman, Motor ODE)
setInterval(() => {
  stepPhysics100Hz();
}, 10);

// 1.0 s Timer (DSP, Edge AI Inference, FDIR Hop, Telemetry Policies)
setInterval(() => {
  stepDspAndEdgeAi1Hz();
}, 1000);

// Orbital Propagator Tick (10 Hz)
setInterval(() => {
  stepOrbit10Hz();
}, 100);

/**
 * 100 Hz Hard Real-Time Simulation (Ctrl Task)
 */
function stepPhysics100Hz() {
  simTimeMs += 10;
  timeSinceCmdSec = Math.min(60, timeSinceCmdSec + 0.01);

  if (emergencyBrake) {
    rpmSetpoint = 0;
  }

  // Motor Dynamics: Yellow TT Gearmotor with inertial damping
  const targetRpm = emergencyBrake ? 0 : rpmSetpoint;
  const J = 0.00045; // Inertia
  const B = 0.00028; // Viscous friction
  const kt = 0.024;  // Torque constant

  // Additional friction from SG90 wiper arm (F2 Fault)
  let frictionTorque = 0;
  let frictionCurrentDeltaMa = 0;
  if (frictionF2 === 'L1_10PCT') {
    frictionTorque = 0.00008;
    frictionCurrentDeltaMa = 12; // +10%
  } else if (frictionF2 === 'L2_25PCT') {
    frictionTorque = 0.00022;
    frictionCurrentDeltaMa = 28; // +25%
  } else if (frictionF2 === 'L3_50PCT') {
    frictionTorque = 0.00048;
    frictionCurrentDeltaMa = 55; // +50%
  }

  // PI Controller
  const errorRpm = targetRpm - rpmKalman;
  const kp = 0.0022;
  const ki = 0.0008;
  piIntegral += errorRpm * 0.01;
  piIntegral = Math.max(-0.5, Math.min(0.5, piIntegral));

  let pwmPi = targetRpm > 0 ? (targetRpm / 320.0) + kp * errorRpm + ki * piIntegral : 0;
  pwmPi = Math.max(0.0, Math.min(1.0, pwmPi));

  // Current Calculation
  const baselineCurrentMa = 70 + (rpmActual * 0.12) + (pwmPi * 35);
  motorCurrentMa = baselineCurrentMa + frictionCurrentDeltaMa + (Math.random() - 0.5) * 4;

  // F3: Software-Synthesized Virtual Harness Ohmic Drop
  let rVirt = harnessF3;
  let vDrop = (motorCurrentMa / 1000.0) * rVirt;
  let pwmApplied = Math.max(0.0, Math.min(1.0, pwmPi - (vDrop / busVoltageV)));

  // Autonomous L3 recovery limit for F3
  if (fdirLayer === 'L3_RECOVERED' && isolatedFault === 'F3_HARNESS') {
    pwmApplied = Math.min(0.75, pwmApplied);
  }

  // Drive motor acceleration
  const appliedTorque = (pwmApplied * busVoltageV * kt * 2.5) - frictionTorque;
  const omegaRadS = (rpmActual * 2 * Math.PI) / 60.0;
  const alphaRadS2 = (appliedTorque - B * omegaRadS) / J;
  const deltaRpm = (alphaRadS2 * 60.0 / (2 * Math.PI)) * 0.01;
  rpmActual = Math.max(0, rpmActual + deltaRpm);

  // Optical Disc Simulation with Manufacturing Jitter
  currentSlotIdx = (currentSlotIdx + 1) % 20;
  const jitterFactor = slotWidthJitter[currentSlotIdx];
  const rpmOpticalRaw = rpmActual * jitterFactor + (Math.random() - 0.5) * 6;

  // 1-D Kalman Filter Speed Observer
  // Predict:
  const kalmanPredict = rpmKalman + kalmanDot * 0.01;
  // Update with optical measurement:
  const kalmanGain = 0.18;
  rpmKalman = kalmanPredict + kalmanGain * (rpmOpticalRaw - kalmanPredict);
  kalmanDot = (rpmKalman - kalmanPredict) / 0.01;

  // Lumped-Parameter Winding Thermal Observer ODE (Forward Euler)
  // C_th dT/dt = I^2 * R_winding - (T - T_amb) / R_th
  const rWinding = 4.2;
  const cTh = 18.0;
  const rTh = 22.0;
  const tAmb = 25.0;
  const iAmps = motorCurrentMa / 1000.0;
  const qJoule = Math.pow(iAmps, 2) * rWinding;
  const qDissipated = (windingTempC - tAmb) / rTh;
  windingTempC += (0.01 / cTh) * (qJoule - qDissipated);

  // L0 Safety Trips: Immediate Breaker
  if (motorCurrentMa > 700 || Math.abs(errorRpm) > (targetRpm * 0.35) || windingTempC > 60.0) {
    if (!emergencyBrake && targetRpm > 0 && timeSinceCmdSec > 3) {
      emergencyBrake = true;
      fdirLayer = 'L0_SAFE_TRIP';
      rpmSetpoint = 0;
    }
  }

  // Digest Accumulation
  digestRpmSamples.push(rpmKalman);
  digestCurrentSamples.push(motorCurrentMa);
  digestPwmSamples.push(pwmApplied);

  // Generate Housekeeping Packet (APID 0x10)
  const hkPacket: HousekeepingPacket = {
    apid: 0x10,
    timestampMs: simTimeMs,
    rpmKalman: Math.round(rpmKalman * 10) / 10,
    rpmOpticalRaw: Math.round(rpmOpticalRaw * 10) / 10,
    rpmSetpoint,
    timeSinceCmdSec: Math.round(timeSinceCmdSec),
    currentMa: Math.round(motorCurrentMa),
    busVoltageV,
    pwmPiCommand: Number(pwmPi.toFixed(3)),
    pwmApplied: Number(pwmApplied.toFixed(3)),
    windingTempEstC: Number(windingTempC.toFixed(2)),
    pcntRaw: Math.round(rpmActual * 20 / 60 * (simTimeMs / 1000)),
    flags: (emergencyBrake ? 0x01 : 0) | (fdirLayer === 'L1_ALARM' ? 0x02 : 0) | (harnessF3 > 0 ? 0x04 : 0)
  };

  self.postMessage({ type: 'HK_PACKET', payload: hkPacket });
}

/**
 * 1.0 s Decision Hop (DSP, Phasor Subtraction, INT8 Autoencoder, FDIR)
 */
function stepDspAndEdgeAi1Hz() {
  hopCount++;

  // 1. Synchronous 1x Phasor Runout Subtraction
  // Physical wheel runout baseline Z0:
  let zLiveReal = Z0_REAL;
  let zLiveImag = Z0_IMAG;

  // F1 Fault: Centrifugal Imbalance from Binder Clips
  // Imbalance force ~ m * r * omega^2
  let imbalanceAmp = 0;
  if (clipsF1 > 0 && rpmKalman > 50) {
    const clipMassGrams = clipsF1 * 1.5;
    const omega = (2 * Math.PI * rpmKalman) / 60.0;
    imbalanceAmp = (clipMassGrams * 0.03 * Math.pow(omega, 2)) * 0.0018;
    zLiveReal += imbalanceAmp * 0.85 + (Math.random() - 0.5) * 0.02;
    zLiveImag += imbalanceAmp * 0.52 + (Math.random() - 0.5) * 0.02;
  } else {
    zLiveReal += (Math.random() - 0.5) * 0.015;
    zLiveImag += (Math.random() - 0.5) * 0.015;
  }

  const dzReal = zLiveReal - Z0_REAL;
  const dzImag = zLiveImag - Z0_IMAG;
  const e1xClean = Math.pow(dzReal, 2) + Math.pow(dzImag, 2);

  // 2. Feature Extraction
  // Rep F (23 Dims): 20 targets + 3 context
  const repF = new Float32Array(23);
  const repFRecon = new Float32Array(20);
  repF[0] = Math.min(2.0, e1xClean * 4.0); // 1x Energy
  repF[1] = Math.min(2.0, (motorCurrentMa - 80) / 60.0); // Current deviation
  repF[2] = (rpmKalman - rpmSetpoint) / 20.0; // Speed error
  // Harmonic bands:
  for (let i = 3; i < 20; i++) {
    repF[i] = (Math.random() * 0.1) + (clipsF1 > 0 && i % 4 === 0 ? 0.35 : 0.02);
  }
  // Context:
  repF[20] = rpmSetpoint / 300.0;
  repF[21] = windingTempC / 60.0;
  repF[22] = timeSinceCmdSec / 60.0;

  // Simulated INT8 Autoencoder Reconstruction
  let rawWhitenedSum = 0;
  const residuals: number[] = [];

  for (let i = 0; i < 20; i++) {
    // Normal model reconstructs nominal inputs well, but anomalies cause high residuals
    let expected = repF[i];
    let variance = 0.04;
    let reconVal = 0;

    if (clipsF1 > 0 && i === 0) {
      // 1x energy residual spikes under F1
      reconVal = 0.05; // Model expects low baseline
    } else if (frictionF2 !== 'NONE' && (i === 1 || i === 18)) {
      // Current and PWM residuals spike under F2
      reconVal = 0.08;
    } else if (harnessF3 > 0 && i === 18) {
      // PWM residual spikes under F3
      reconVal = 0.12;
    } else {
      reconVal = expected * 0.95 + (Math.random() - 0.5) * 0.02;
    }

    repFRecon[i] = reconVal;
    const res = expected - reconVal;
    residuals.push(res);
    rawWhitenedSum += Math.pow(res, 2) / variance;
  }

  const instantScore = rawWhitenedSum / 20.0;
  // EMA Smoothing (beta = 0.7)
  whitenedScoreEma = 0.7 * whitenedScoreEma + 0.3 * instantScore;

  // Update 3-of-5 Persistence Window
  const thresholdTau = 1.0;
  const isHopAbove = whitenedScoreEma >= thresholdTau;
  persistenceWindow.shift();
  persistenceWindow.push(isHopAbove);

  const activeCount = persistenceWindow.filter(Boolean).length;

  // 4-Layer FDIR State Machine
  if (emergencyBrake) {
    fdirLayer = 'L0_SAFE_TRIP';
  } else if (activeCount >= 3) {
    fdirLayer = 'L1_ALARM';
    // L2 Fault Isolation
    if (e1xClean > 0.08) {
      isolatedFault = 'F1_IMBALANCE';
    } else if (motorCurrentMa > 105) {
      isolatedFault = 'F2_FRICTION';
    } else if (harnessF3 > 0) {
      isolatedFault = 'F3_HARNESS';
    } else {
      isolatedFault = 'SENSOR_FAULT';
    }

    // L3 Autonomous Recovery
    fdirLayer = 'L3_RECOVERED';
    if (isolatedFault === 'F1_IMBALANCE' && rpmSetpoint > 160) {
      rpmSetpoint = Math.round(rpmSetpoint * 0.7); // 30% speed derate
    }
  } else {
    if (whitenedScoreEma < 0.8 * thresholdTau) {
      consecutiveLowHops++;
      if (consecutiveLowHops >= 10) {
        fdirLayer = 'NOMINAL';
        isolatedFault = 'NORMAL';
      }
    } else {
      consecutiveLowHops = 0;
    }
  }

  // Top-4 Explainability Unpacker (Sort descending |r_i|/sigma_i)
  const sortedIndices = residuals
    .map((r, idx) => ({ idx, absVal: Math.abs(r) }))
    .sort((a, b) => b.absVal - a.absVal);

  const top4Indices: [number, number, number, number] = [
    sortedIndices[0].idx,
    sortedIndices[1].idx,
    sortedIndices[2].idx,
    sortedIndices[3].idx
  ];

  const top4Residuals: [number, number, number, number] = [
    Math.round(Math.max(-128, Math.min(127, residuals[top4Indices[0]] * 127))),
    Math.round(Math.max(-128, Math.min(127, residuals[top4Indices[1]] * 127))),
    Math.round(Math.max(-128, Math.min(127, residuals[top4Indices[2]] * 127))),
    Math.round(Math.max(-128, Math.min(127, residuals[top4Indices[3]] * 127)))
  ];

  // Send FDIR Event Packet (APID 0x12) when in alarm or recovered
  if (fdirLayer !== 'NOMINAL') {
    const fdirEvent: FdirEventPacket = {
      apid: 0x12,
      seqCount: hopCount,
      timestampMs: simTimeMs,
      fdirState: fdirLayer,
      isolatedFault,
      whitenedScoreEma: Number(whitenedScoreEma.toFixed(3)),
      thresholdTau,
      persistenceWindow: [...persistenceWindow],
      rpmAtEvent: Math.round(rpmKalman),
      top4FeatureIndices: top4Indices,
      top4QuantResiduals: top4Residuals,
      crc16Valid: true
    };
    self.postMessage({ type: 'FDIR_EVENT', payload: fdirEvent });
    handleOutgoingPacket(26, true);
  }

  // Rep S (131 Order Bands: 128 spectral bins + 3 context)
  const repS = new Float32Array(131);
  for (let k = 0; k < 128; k++) {
    // 0.25x to 40x orders
    let base = 0.05 / (1 + (k * 0.05));
    if (clipsF1 > 0 && (k === 16 || k === 32)) {
      // 1x and 2x harmonics
      base += 0.45 * clipsF1;
    }
    repS[k] = base + (Math.random() * 0.02);
  }
  repS[128] = repF[20];
  repS[129] = repF[21];
  repS[130] = repF[22];

  // Post DSP features
  const dspData: DspFeaturesData = {
    repF,
    repS,
    z0Phasor: [Z0_REAL, Z0_IMAG],
    z1xPhasor: [Number(zLiveReal.toFixed(3)), Number(zLiveImag.toFixed(3))],
    zImbalance: [Number(dzReal.toFixed(3)), Number(dzImag.toFixed(3))],
    e1xClean: Number(e1xClean.toFixed(4))
  };
  self.postMessage({ type: 'DSP_FEATURES', payload: dspData, repFRecon });

  // 3. Stage Energy Profiling
  // Clock scaling factors: 80MHz is baseline (1.0x), 160MHz (0.5x), 240MHz (0.33x)
  const clkScale = clockMhz === 80 ? 1.0 : clockMhz === 160 ? 0.52 : 0.35;
  const fftScale = fftSize === 512 ? 0.5 : fftSize === 1024 ? 1.0 : 2.1;

  const dtDspUs = Math.round(32400 * clkScale * fftScale);
  const dtNnUs = Math.round(14200 * clkScale * (detectorId.includes('M-S') ? 1.8 : 0.6));
  const dtRadioUs = telemetryPolicy === 'P2_EDGE_FDIR' && fdirLayer === 'NOMINAL' ? 0 : 18400;
  const dtIdleUs = Math.max(0, 1000000 - (dtDspUs + dtNnUs + dtRadioUs));

  const pIdleMw = clockMhz === 80 ? 75 : clockMhz === 160 ? 115 : 160;
  const pDspMw = clockMhz === 80 ? 130 : clockMhz === 160 ? 180 : 240;
  const pNnMw = pDspMw;
  const pRadioMw = 260;

  const eAcq = Math.round((dtIdleUs * pIdleMw) / 1000.0);
  const eDsp = Math.round((dtDspUs * pDspMw) / 1000.0);
  const eNn = Math.round((dtNnUs * pNnMw) / 1000.0);
  const eRadio = Math.round((dtRadioUs * pRadioMw) / 1000.0);
  const totalE = eAcq + eDsp + eNn + eRadio;

  const stageProfile: StageEnergyProfile = {
    hopId: hopCount,
    detectorId,
    clockMhz,
    fftSize,
    durationsUs: {
      stage00_IdleAcq: dtIdleUs,
      stage01_DspFft: dtDspUs,
      stage10_Int8Nn: dtNnUs,
      stage11_RadioTx: dtRadioUs
    },
    energyMicroJoules: {
      acq: eAcq,
      dsp: eDsp,
      nn: eNn,
      radio: eRadio,
      total: totalE
    },
    averagePowerMw: Math.round(totalE / 1000.0),
    nnEnergyFractionPct: Number(((eNn / (eAcq + eDsp + eNn)) * 100).toFixed(2))
  };

  self.postMessage({ type: 'STAGE_PROFILE', payload: stageProfile });

  // Telemetry Policy byte tracking
  if (telemetryPolicy === 'P0_RAW') {
    handleOutgoingPacket(11800, false); // ~11.8 kB/s
  } else if (telemetryPolicy === 'P1_1HZ_HK') {
    handleOutgoingPacket(28, false); // 28 B/s
  } else if (telemetryPolicy === 'P2_EDGE_FDIR') {
    // Periodic 60s Digest
    if (hopCount % 60 === 0) {
      handleOutgoingPacket(40, false); // 40 B Digest
      sendHealthDigest();
    }
  }
}

function sendHealthDigest() {
  const rMin = digestRpmSamples.length ? Math.min(...digestRpmSamples) : rpmKalman;
  const rMax = digestRpmSamples.length ? Math.max(...digestRpmSamples) : rpmKalman;
  const rMean = digestRpmSamples.length ? digestRpmSamples.reduce((a, b) => a + b, 0) / digestRpmSamples.length : rpmKalman;

  const cMin = digestCurrentSamples.length ? Math.min(...digestCurrentSamples) : motorCurrentMa;
  const cMax = digestCurrentSamples.length ? Math.max(...digestCurrentSamples) : motorCurrentMa;
  const cMean = digestCurrentSamples.length ? digestCurrentSamples.reduce((a, b) => a + b, 0) / digestCurrentSamples.length : motorCurrentMa;

  const pMean = digestPwmSamples.length ? digestPwmSamples.reduce((a, b) => a + b, 0) / digestPwmSamples.length : 0.45;

  const digest: HealthDigestPacket = {
    apid: 0x11,
    timestampMs: simTimeMs,
    rpmMin: Math.round(rMin),
    rpmMean: Math.round(rMean),
    rpmMax: Math.round(rMax),
    currentMinMa: Math.round(cMin),
    currentMeanMa: Math.round(cMean),
    currentMaxMa: Math.round(cMax),
    pwmMean: Number(pMean.toFixed(3)),
    maxScoreWhitened: Number(digestMaxScore.toFixed(3)),
    e1xMean: 0.02,
    hopCount,
    fdirState: fdirLayer
  };

  self.postMessage({ type: 'HEALTH_DIGEST', payload: digest });
  digestRpmSamples = [];
  digestCurrentSamples = [];
  digestPwmSamples = [];
  digestMaxScore = 0;
}

function handleOutgoingPacket(bytes: number, isHighPriority: boolean) {
  cumulativeBytesSatA += bytes;
  if (telemetryPolicy === 'P3_ISL_RELAY') {
    islQueueDepthPackets += 1;
  } else {
    cumulativeBytesDownlink += bytes;
  }
}

/**
 * 10 Hz Orbital Propagator (10x Scaled LEO Orbit)
 */
function stepOrbit10Hz() {
  orbitTimeSec = (orbitTimeSec + 0.1) % ORBIT_PERIOD_SEC;
  const orbitFraction = orbitTimeSec / ORBIT_PERIOD_SEC;

  // Orbit inclination 51.6 degrees
  const angleRad = orbitFraction * 2 * Math.PI;
  const lat = Math.sin(angleRad) * 51.6;
  const lon = ((angleRad * (180 / Math.PI)) * 1.5 - 180) % 360;

  // Ground Station at [28.5, -80.5] (Kennedy Space Center / Cape Canaveral)
  // Contact pass occurs between 480s and 528s of the 576s orbit
  const passStartSec = 480.0;
  const passEndSec = passStartSec + PASS_DURATION_SEC;
  const isGroundPassActive = orbitTimeSec >= passStartSec && orbitTimeSec <= passEndSec;

  let passCountdownSec = 0;
  if (isGroundPassActive) {
    passCountdownSec = Math.round(passEndSec - orbitTimeSec);
    // Flush ISL Queue on Sat B during Ground Pass
    if (islQueueDepthPackets > 0) {
      const packetsFlushed = Math.min(islQueueDepthPackets, 2);
      islQueueDepthPackets -= packetsFlushed;
      cumulativeBytesDownlink += packetsFlushed * 32;
    }
  } else {
    passCountdownSec = Math.round(
      orbitTimeSec < passStartSec ? passStartSec - orbitTimeSec : (ORBIT_PERIOD_SEC - orbitTimeSec + passStartSec)
    );
  }

  const satARadioAwake = telemetryPolicy !== 'P2_EDGE_FDIR' || fdirLayer !== 'NOMINAL' || (hopCount % 60 <= 1);

  const orbital: OrbitalState = {
    orbitTimeSec: Math.round(orbitTimeSec * 10) / 10,
    orbitFraction: Number(orbitFraction.toFixed(4)),
    satALatLonAlt: [Number(lat.toFixed(2)), Number(lon.toFixed(2)), 520],
    satBLatLonAlt: [Number((lat - 0.8).toFixed(2)), Number((lon - 1.6).toFixed(2)), 520],
    isGroundPassActive,
    passCountdownSec,
    islQueueDepthPackets,
    satARadioAwake,
    linkStatus: isGroundPassActive 
      ? 'DOWNLINK_ACTIVE' 
      : satARadioAwake 
        ? 'ESP_NOW_ACTIVE' 
        : 'RADIO_SLEEP',
    cumulativeBytesSatA,
    cumulativeBytesDownlink
  };

  self.postMessage({ type: 'ORBITAL_TICK', payload: orbital });
}

// Handle Commands from Main Thread
self.onmessage = (e: MessageEvent) => {
  const { command, args } = e.data;
  switch (command) {
    case 'SET_RPM':
      rpmSetpoint = args.rpm;
      timeSinceCmdSec = 0;
      if (args.rpm > 0) emergencyBrake = false;
      break;
    case 'SET_F1_CLIPS':
      clipsF1 = args.clips;
      break;
    case 'SET_F2_FRICTION':
      frictionF2 = args.friction;
      break;
    case 'SET_F3_HARNESS':
      harnessF3 = args.ohms;
      break;
    case 'SET_POLICY':
      telemetryPolicy = args.policy;
      break;
    case 'SET_DETECTOR_CONFIG':
      detectorId = args.detectorId;
      fftSize = args.fftSize;
      clockMhz = args.clockMhz;
      break;
    case 'EMERGENCY_BRAKE':
      emergencyBrake = true;
      rpmSetpoint = 0;
      break;
    case 'RESET_FDIR':
      fdirLayer = 'NOMINAL';
      isolatedFault = 'NORMAL';
      emergencyBrake = false;
      whitenedScoreEma = 0.22;
      persistenceWindow.fill(false);
      break;
  }
};
