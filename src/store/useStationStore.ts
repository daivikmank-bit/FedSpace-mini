// src/store/useStationStore.ts
// Central reactive state store for FedSpace-Mini Ground Station HUD

import { useState, useEffect } from 'react';
import {
  TelemetryPolicy,
  FaultClass,
  FdirLayerState,
  FrictionLevel,
  HarnessFaultOhms,
  BinderClipCount,
  HousekeepingPacket,
  FdirEventPacket,
  StageEnergyProfile,
  OrbitalState,
  ITelemetryAdapter
} from '../types/telemetry';

export interface StationState {
  // Connection & HAL
  connectionMode: 'MOCK_SIMULATOR' | 'WEBSERIAL_COBS' | 'FASTAPI_WS';
  isConnected: boolean;
  adapter: ITelemetryAdapter | null;

  // Actuation & Fault Injection Controls
  rpmSetpoint: number;
  clipsF1: BinderClipCount;
  frictionF2: FrictionLevel;
  harnessF3: HarnessFaultOhms;
  telemetryPolicy: TelemetryPolicy;
  detectorId: string;
  clockMhz: 80 | 160 | 240;
  fftSize: 512 | 1024 | 2048;

  // Telemetry Snapshots
  orbital: OrbitalState;
  hk: HousekeepingPacket;
  fdir: FdirEventPacket;
  stage: StageEnergyProfile;

  // Derived Indicators
  fdirLayer: FdirLayerState;
  activeFault: FaultClass;
  persistenceWindow: boolean[];
  top4Indices: [number, number, number, number];
  top4Residuals: [number, number, number, number];
  emergencyBrakeEngaged: boolean;
  
  // UI Tabs
  activeChartTab: 'control' | 'repf' | 'reps';
}

export interface StationActions {
  setAdapter: (adapter: ITelemetryAdapter | null, isConnected: boolean) => void;
  setConnectionMode: (mode: 'MOCK_SIMULATOR' | 'WEBSERIAL_COBS' | 'FASTAPI_WS') => void;
  setRpmSetpoint: (rpm: number) => void;
  setClipsF1: (clips: BinderClipCount) => void;
  setFrictionF2: (friction: FrictionLevel) => void;
  setHarnessF3: (ohms: HarnessFaultOhms) => void;
  setTelemetryPolicy: (policy: TelemetryPolicy) => void;
  setDetectorConfig: (detectorId: string, fftSize: 512 | 1024 | 2048, clockMhz: 80 | 160 | 240) => void;
  triggerEmergencyBrake: () => void;
  resetFdir: () => void;
  setActiveChartTab: (tab: 'control' | 'repf' | 'reps') => void;
  updateOrbital: (orbital: OrbitalState) => void;
  updateHk: (hk: HousekeepingPacket) => void;
  updateFdir: (fdir: FdirEventPacket) => void;
  updateStage: (stage: StageEnergyProfile) => void;
}

export type StationStore = StationState & StationActions;

const initialOrbital: OrbitalState = {
  orbitTimeSec: 0,
  orbitFraction: 0,
  satALatLonAlt: [28.5, -80.5, 520],
  satBLatLonAlt: [28.3, -80.7, 520],
  isGroundPassActive: false,
  passCountdownSec: 528,
  islQueueDepthPackets: 0,
  satARadioAwake: true,
  linkStatus: 'ESP_NOW_ACTIVE',
  cumulativeBytesSatA: 0,
  cumulativeBytesDownlink: 0
};

const initialHk: HousekeepingPacket = {
  apid: 0x10,
  timestampMs: 0,
  rpmKalman: 220,
  rpmOpticalRaw: 220,
  rpmSetpoint: 220,
  timeSinceCmdSec: 15,
  currentMa: 85,
  busVoltageV: 5.0,
  pwmPiCommand: 0.45,
  pwmApplied: 0.45,
  windingTempEstC: 28.5,
  pcntRaw: 0,
  flags: 0
};

const initialFdir: FdirEventPacket = {
  apid: 0x12,
  seqCount: 0,
  timestampMs: 0,
  fdirState: 'NOMINAL',
  isolatedFault: 'NORMAL',
  whitenedScoreEma: 0.28,
  thresholdTau: 1.0,
  persistenceWindow: [false, false, false, false, false],
  rpmAtEvent: 220,
  top4FeatureIndices: [0, 1, 14, 18],
  top4QuantResiduals: [12, -8, 5, 3],
  crc16Valid: true
};

const initialStage: StageEnergyProfile = {
  hopId: 1,
  detectorId: 'M-S-KD-32',
  clockMhz: 80,
  fftSize: 1024,
  durationsUs: {
    stage00_IdleAcq: 935000,
    stage01_DspFft: 32400,
    stage10_Int8Nn: 14200,
    stage11_RadioTx: 18400
  },
  energyMicroJoules: {
    acq: 74800,
    dsp: 4212,
    nn: 1846,
    radio: 4784,
    total: 85642
  },
  averagePowerMw: 85.6,
  nnEnergyFractionPct: 2.15
};

let state: StationState = {
  connectionMode: 'MOCK_SIMULATOR',
  isConnected: false,
  adapter: null,
  rpmSetpoint: 220,
  clipsF1: 0,
  frictionF2: 'NONE',
  harnessF3: 0,
  telemetryPolicy: 'P2_EDGE_FDIR',
  detectorId: 'M-S-KD-32',
  clockMhz: 80,
  fftSize: 1024,
  orbital: initialOrbital,
  hk: initialHk,
  fdir: initialFdir,
  stage: initialStage,
  fdirLayer: 'NOMINAL',
  activeFault: 'NORMAL',
  persistenceWindow: [false, false, false, false, false],
  top4Indices: [0, 1, 14, 18],
  top4Residuals: [12, -8, 5, 3],
  emergencyBrakeEngaged: false,
  activeChartTab: 'control'
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export const stationActions: StationActions = {
  setAdapter: (adapter: ITelemetryAdapter | null, isConnected: boolean) => {
    state = { ...state, adapter, isConnected };
    notify();
  },

  setConnectionMode: (mode: 'MOCK_SIMULATOR' | 'WEBSERIAL_COBS' | 'FASTAPI_WS') => {
    state = { ...state, connectionMode: mode };
    notify();
  },

  setRpmSetpoint: (rpm: number) => {
    state = { ...state, rpmSetpoint: rpm, emergencyBrakeEngaged: rpm === 0 };
    if (state.adapter) state.adapter.setRpmSetpoint(rpm);
    notify();
  },

  setClipsF1: (clips: BinderClipCount) => {
    state = { ...state, clipsF1: clips };
    if (state.adapter) state.adapter.setBinderClipsF1(clips);
    notify();
  },

  setFrictionF2: (friction: FrictionLevel) => {
    state = { ...state, frictionF2: friction };
    if (state.adapter) state.adapter.setServoFrictionF2(friction);
    notify();
  },

  setHarnessF3: (ohms: HarnessFaultOhms) => {
    state = { ...state, harnessF3: ohms };
    if (state.adapter) state.adapter.setVirtualHarnessF3(ohms);
    notify();
  },

  setTelemetryPolicy: (policy: TelemetryPolicy) => {
    state = { ...state, telemetryPolicy: policy };
    if (state.adapter) state.adapter.setTelemetryPolicy(policy);
    notify();
  },

  setDetectorConfig: (detectorId: string, fftSize: 512 | 1024 | 2048, clockMhz: 80 | 160 | 240) => {
    state = { ...state, detectorId, fftSize, clockMhz };
    if (state.adapter) state.adapter.setDetectorConfig(detectorId, fftSize, clockMhz);
    notify();
  },

  triggerEmergencyBrake: () => {
    state = { ...state, emergencyBrakeEngaged: true, rpmSetpoint: 0 };
    if (state.adapter) state.adapter.triggerEmergencyBrake();
    notify();
  },

  resetFdir: () => {
    state = { 
      ...state, 
      fdirLayer: 'NOMINAL', 
      activeFault: 'NORMAL', 
      emergencyBrakeEngaged: false,
      persistenceWindow: [false, false, false, false, false]
    };
    if (state.adapter) state.adapter.resetFdir();
    notify();
  },

  setActiveChartTab: (tab: 'control' | 'repf' | 'reps') => {
    state = { ...state, activeChartTab: tab };
    notify();
  },

  // Telemetry stream updates called by Adapter
  updateOrbital: (orbital: OrbitalState) => {
    state = { ...state, orbital };
    notify();
  },

  updateHk: (hk: HousekeepingPacket) => {
    state = { ...state, hk };
    notify();
  },

  updateFdir: (fdir: FdirEventPacket) => {
    state = {
      ...state,
      fdir,
      fdirLayer: fdir.fdirState,
      activeFault: fdir.isolatedFault,
      persistenceWindow: fdir.persistenceWindow,
      top4Indices: fdir.top4FeatureIndices,
      top4Residuals: fdir.top4QuantResiduals
    };
    notify();
  },

  updateStage: (stage: StageEnergyProfile) => {
    state = { ...state, stage };
    notify();
  }
};

export const stationStore = {
  getState: () => state,
  ...stationActions
};

export function useStationStore(): StationStore {
  const [snapshot, setSnapshot] = useState(stationStore.getState());

  useEffect(() => {
    const onChange = () => setSnapshot(stationStore.getState());
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return {
    ...snapshot,
    ...stationActions
  };
}
