// src/types/telemetry.ts
// Unified Telemetry & Digital Twin Contract for FedSpace-Mini v2

export type TelemetryPolicy = 'P0_RAW' | 'P1_1HZ_HK' | 'P2_EDGE_FDIR' | 'P3_ISL_RELAY';

export type FaultClass = 
  | 'NORMAL' 
  | 'F1_IMBALANCE' 
  | 'F2_FRICTION' 
  | 'F3_HARNESS' 
  | 'SENSOR_FAULT';

export type FdirLayerState = 
  | 'NOMINAL' 
  | 'L0_SAFE_TRIP' 
  | 'L1_ALARM' 
  | 'L2_ISOLATED' 
  | 'L3_RECOVERED';

export type FrictionLevel = 'NONE' | 'L1_10PCT' | 'L2_25PCT' | 'L3_50PCT';

export type HarnessFaultOhms = 0 | 2.2 | 4.7;

export type BinderClipCount = 0 | 1 | 2 | 3;

// 10x Scaled LEO Orbital State for 3D Space View
export interface OrbitalState {
  orbitTimeSec: number;           // 576s (9.6 min) full period (10x LEO)
  orbitFraction: number;          // 0.0 to 1.0 around orbital plane
  satALatLonAlt: [number, number, number]; // [lat, lon, altKm]
  satBLatLonAlt: [number, number, number]; // trailing relay
  isGroundPassActive: boolean;    // True during 48s contact window every 9.6 min
  passCountdownSec: number;       // Seconds remaining in pass or until next pass
  islQueueDepthPackets: number;   // Buffered packets on Sat B in P3 mode
  satARadioAwake: boolean;        // True in P0/P1, pulsed in P2/P3 (esp_wifi_stop sleep)
  linkStatus: 'DISCONNECTED' | 'ESP_NOW_ACTIVE' | 'DOWNLINK_ACTIVE' | 'RADIO_SLEEP';
  cumulativeBytesSatA: number;    // Cumulative bytes emitted by Sat A
  cumulativeBytesDownlink: number;// Bytes received on ground station
}

// Matches CCSDS APID 0x10 (28 Bytes Packed HK)
export interface HousekeepingPacket {
  apid: 0x10;
  timestampMs: number;            // PPS-aligned millisecond counter
  rpmKalman: number;              // 1-D Kalman Filter + 1x FFT fused RPM
  rpmOpticalRaw: number;          // Unfiltered 20-slot LM393 RPM (shows physical slot jitter)
  rpmSetpoint: number;            // Context 1: Target speed command
  timeSinceCmdSec: number;        // Context 3: Time since setpoint change (<= 60s)
  currentMa: number;              // 500 Hz INA219/226 motor current I(t)
  busVoltageV: number;            // Motor supply rail V_bus
  pwmPiCommand: number;           // Controller output PWM_PI before virtual drop [0..1]
  pwmApplied: number;             // Actual LEDC duty: PWM_PI - (I * R_virt / V_bus) [0..1]
  windingTempEstC: number;        // Context 2: Lumped thermal observer T_hat(t)
  pcntRaw: number;                // Raw PCNT hardware counter
  flags: number;                  // Bitmask: [0: L0 Trip, 1: L1 Alarm, 2: F3 active, ...]
}

// Matches CCSDS APID 0x11 (40 Bytes Health Digest - Policy P2)
export interface HealthDigestPacket {
  apid: 0x11;
  timestampMs: number;
  rpmMin: number;
  rpmMean: number;
  rpmMax: number;
  currentMinMa: number;
  currentMeanMa: number;
  currentMaxMa: number;
  pwmMean: number;
  maxScoreWhitened: number;
  e1xMean: number;
  hopCount: number;
  fdirState: FdirLayerState;
}

// Matches CCSDS APID 0x12 (26 Bytes Packed FDIR Event)
export interface FdirEventPacket {
  apid: 0x12;
  seqCount: number;
  timestampMs: number;
  fdirState: FdirLayerState;
  isolatedFault: FaultClass;
  whitenedScoreEma: number;       // EMA-smoothed whitened score S_t (beta = 0.7)
  thresholdTau: number;           // Calibrated N-val threshold tau
  persistenceWindow: boolean[];   // Last 5 hops (triggers at k = 3 of n = 5)
  rpmAtEvent: number;
  top4FeatureIndices: [number, number, number, number];
  top4QuantResiduals: [number, number, number, number]; // Signed INT8 residuals
  crc16Valid: boolean;
}

// Matches CCSDS APID 0x13 (Raw Vib Chunk - Policy P0)
export interface RawVibPacket {
  apid: 0x13;
  chunkSeq: number;
  sampleRate: number;             // 1600 Hz
  axSamples: Float32Array;
  aySamples: Float32Array;
}

// Matches MCU #2 Hardware-Timer Stage Profiler (Pins 32/33 -> Sat A Pins 16/17)
export interface StageEnergyProfile {
  hopId: number;
  detectorId: string;             // e.g., 'B0', 'B1', 'B2', 'M-F-16', 'M-S-KD-32'
  clockMhz: 80 | 160 | 240;
  fftSize: 512 | 1024 | 2048;
  durationsUs: {
    stage00_IdleAcq: number;      // 00: Idle & Background DMA
    stage01_DspFft: number;       // 01: Hann + FFT + Phasor subtraction
    stage10_Int8Nn: number;       // 10: TFLM INT8 Autoencoder Inference
    stage11_RadioTx: number;      // 11: Active ESP-NOW packet burst
  };
  energyMicroJoules: {
    acq: number;
    dsp: number;
    nn: number;
    radio: number;
    total: number;
  };
  averagePowerMw: number;
  nnEnergyFractionPct: number;    // Verifies Hypothesis H4 (< 20%)
}

// High-Rate Spectral & DSP Features
export interface DspFeaturesData {
  repF: Float32Array;             // 23 dimensions (20 targets + 3 context)
  repS: Float32Array;             // 131 dimensions (128 spectral bands + 3 context)
  z0Phasor: [number, number];     // [real, imag] baseline runout
  z1xPhasor: [number, number];    // [real, imag] live 1x phasor
  zImbalance: [number, number];   // Z_1x - Z_0 (Centrifugal fault vector)
  e1xClean: number;               // Phasor-subtracted 1x energy
}

// Unified Telemetry Adapter Interface (HAL)
export interface ITelemetryAdapter {
  connect(mode: 'MOCK_SIMULATOR' | 'WEBSERIAL_COBS' | 'FASTAPI_WS', endpoint?: string): Promise<void>;
  disconnect(): void;

  // Real-Time Stream Subscriptions
  onOrbitalTick(cb: (orbit: OrbitalState) => void): void;
  onHousekeeping(cb: (hk: HousekeepingPacket) => void): void;
  onHealthDigest(cb: (digest: HealthDigestPacket) => void): void;
  onFdirEvent(cb: (evt: FdirEventPacket) => void): void;
  onDspFeatures(cb: (features: DspFeaturesData) => void): void;
  onStageProfile(cb: (profile: StageEnergyProfile) => void): void;

  // EGSE & Flight Actuation Commands
  setRpmSetpoint(rpm: number): Promise<void>;
  setBinderClipsF1(clips: BinderClipCount): Promise<void>;
  setServoFrictionF2(level: FrictionLevel): Promise<void>;
  setVirtualHarnessF3(ohms: HarnessFaultOhms): Promise<void>;
  setTelemetryPolicy(policy: TelemetryPolicy): Promise<void>;
  setDetectorConfig(detectorId: string, fftSize: 512 | 1024 | 2048, clockMhz: 80 | 160 | 240): Promise<void>;
  triggerEmergencyBrake(): Promise<void>;
  resetFdir(): Promise<void>;
}

