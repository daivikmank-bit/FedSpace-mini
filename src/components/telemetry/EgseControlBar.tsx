// src/components/telemetry/EgseControlBar.tsx
// Comprehensive Interactive Mission Control Dock & Runtime HAL Hot-Swap Switch

import React from 'react';
import { useStationStore } from '../../store/useStationStore';
import {
  TelemetryPolicy,
  FrictionLevel,
  HarnessFaultOhms,
  BinderClipCount
} from '../../types/telemetry';
import {
  Sliders,
  Flame,
  Radio,
  Cpu,
  Usb,
  RotateCcw,
  Octagon
} from 'lucide-react';
import { WebSerialCobsAdapter } from '../../adapters/WebSerialCobsAdapter';
import { MockSpacePhysicsAdapter } from '../../adapters/MockSpacePhysicsAdapter';

export const EgseControlBar: React.FC = () => {
  const store = useStationStore();

  const handleConnectionSwitch = async (mode: 'MOCK_SIMULATOR' | 'WEBSERIAL_COBS') => {
    if (store.adapter) {
      store.adapter.disconnect();
    }

    try {
      if (mode === 'WEBSERIAL_COBS') {
        const serialAdapter = new WebSerialCobsAdapter();
        await serialAdapter.connect();
        serialAdapter.onHousekeeping((hk) => store.updateHk(hk));
        serialAdapter.onFdirEvent((evt) => store.updateFdir(evt));
        serialAdapter.onStageProfile((stg) => store.updateStage(stg));
        serialAdapter.onOrbitalTick((orb) => store.updateOrbital(orb));
        store.setAdapter(serialAdapter, true);
        store.setConnectionMode('WEBSERIAL_COBS');
      } else {
        const mockAdapter = new MockSpacePhysicsAdapter();
        await mockAdapter.connect();
        mockAdapter.onHousekeeping((hk) => store.updateHk(hk));
        mockAdapter.onFdirEvent((evt) => store.updateFdir(evt));
        mockAdapter.onStageProfile((stg) => store.updateStage(stg));
        mockAdapter.onOrbitalTick((orb) => store.updateOrbital(orb));
        store.setAdapter(mockAdapter, true);
        store.setConnectionMode('MOCK_SIMULATOR');
      }
    } catch (err: any) {
      alert(`Connection failed: ${err.message}`);
      // Fallback to simulator
      const mockAdapter = new MockSpacePhysicsAdapter();
      await mockAdapter.connect();
      mockAdapter.onHousekeeping((hk) => store.updateHk(hk));
      mockAdapter.onFdirEvent((evt) => store.updateFdir(evt));
      mockAdapter.onStageProfile((stg) => store.updateStage(stg));
      mockAdapter.onOrbitalTick((orb) => store.updateOrbital(orb));
      store.setAdapter(mockAdapter, true);
      store.setConnectionMode('MOCK_SIMULATOR');
    }
  };

  return (
    <div className="w-full bg-space-900 border-t border-slate-800 p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono select-none">
      {/* 1. EGSE Fault Injection Cockpit */}
      <div className="flex items-center space-x-4">
        {/* F1: Rotor Imbalance */}
        <div className="flex flex-col space-y-1">
          <span className="text-[10px] text-purple-400 font-bold flex items-center space-x-1">
            <Flame className="w-3 h-3" />
            <span>F1: IMBALANCE (CLIPS)</span>
          </span>
          <div className="flex items-center space-x-1">
            {([0, 1, 2, 3] as BinderClipCount[]).map((count) => (
              <button
                key={count}
                onClick={() => store.setClipsF1(count)}
                className={`px-2 py-1 rounded transition ${
                  store.clipsF1 === count
                    ? 'bg-purple-600 text-white font-bold shadow-[0_0_8px_rgba(147,51,234,0.6)]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {count === 0 ? '0' : `+${count}`}
              </button>
            ))}
          </div>
        </div>

        {/* F2: SG90 Servo Bearing Friction */}
        <div className="flex flex-col space-y-1">
          <span className="text-[10px] text-blue-400 font-bold flex items-center space-x-1">
            <span>F2: SG90 FRICTION</span>
          </span>
          <div className="flex items-center space-x-1">
            {(['NONE', 'L1_10PCT', 'L2_25PCT', 'L3_50PCT'] as FrictionLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => store.setFrictionF2(lvl)}
                className={`px-2 py-1 rounded transition ${
                  store.frictionF2 === lvl
                    ? 'bg-blue-600 text-white font-bold shadow-[0_0_8px_rgba(37,99,235,0.6)]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {lvl === 'NONE' ? 'OFF' : lvl.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* F3: Virtual Harness Ohmic Drop */}
        <div className="flex flex-col space-y-1">
          <span className="text-[10px] text-amber-400 font-bold flex items-center space-x-1">
            <span>F3: VIRTUAL HARNESS</span>
          </span>
          <div className="flex items-center space-x-1">
            {([0, 2.2, 4.7] as HarnessFaultOhms[]).map((ohms) => (
              <button
                key={ohms}
                onClick={() => store.setHarnessF3(ohms)}
                className={`px-2 py-1 rounded transition ${
                  store.harnessF3 === ohms
                    ? 'bg-amber-600 text-white font-bold shadow-[0_0_8px_rgba(217,119,6,0.6)]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {ohms === 0 ? '0 Ω' : `${ohms} Ω`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Speed Setpoint Slider */}
      <div className="flex items-center space-x-3 bg-space-950/80 px-3 py-1.5 rounded border border-slate-800">
        <Sliders className="w-3.5 h-3.5 text-slate-400" />
        <div className="flex flex-col space-y-0.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>TARGET SPEED</span>
            <span className="text-space-accent font-bold">{store.rpmSetpoint} RPM</span>
          </div>
          <input
            type="range"
            min="150"
            max="280"
            step="5"
            value={store.rpmSetpoint}
            onChange={(e) => store.setRpmSetpoint(Number(e.target.value))}
            className="w-32 accent-space-accent h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        <button
          onClick={() => store.triggerEmergencyBrake()}
          className="p-1.5 bg-rose-600/30 hover:bg-rose-600/60 text-rose-300 rounded border border-rose-500/50 transition ml-1"
          title="Trip Layer-0 Emergency Brake (RPM = 0)"
        >
          <Octagon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. Telemetry Policy Selector */}
      <div className="flex flex-col space-y-1">
        <span className="text-[10px] text-slate-400 font-bold flex items-center space-x-1">
          <Radio className="w-3 h-3 text-space-accent" />
          <span>TELEMETRY POLICY</span>
        </span>
        <div className="flex items-center space-x-1">
          {(['P0_RAW', 'P1_1HZ_HK', 'P2_EDGE_FDIR', 'P3_ISL_RELAY'] as TelemetryPolicy[]).map((p) => (
            <button
              key={p}
              onClick={() => store.setTelemetryPolicy(p)}
              className={`px-2 py-1 rounded transition ${
                store.telemetryPolicy === p
                  ? 'bg-space-accent/20 text-space-accent font-bold border border-space-accent/60'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {p.split('_')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Detector & Sweep Config */}
      <div className="flex items-center space-x-2">
        <div className="flex flex-col space-y-1">
          <span className="text-[10px] text-slate-400 font-bold flex items-center space-x-1">
            <Cpu className="w-3 h-3" />
            <span>DETECTOR</span>
          </span>
          <select
            value={store.detectorId}
            onChange={(e) => store.setDetectorConfig(e.target.value, store.fftSize, store.clockMhz)}
            className="bg-slate-800 border border-slate-700 text-slate-200 px-2 py-1 rounded focus:outline-none"
          >
            <option value="M-S-KD-32">M-S (KD Student 32)</option>
            <option value="M-F-16">M-F (Conditional AE 16)</option>
            <option value="B2">B2 (Mahalanobis 23x23)</option>
            <option value="B0">B0 (Scalar Limits)</option>
          </select>
        </div>

        <div className="flex flex-col space-y-1">
          <span className="text-[10px] text-slate-400 font-bold">CLOCK</span>
          <select
            value={store.clockMhz}
            onChange={(e) => store.setDetectorConfig(store.detectorId, store.fftSize, Number(e.target.value) as any)}
            className="bg-slate-800 border border-slate-700 text-slate-200 px-2 py-1 rounded focus:outline-none"
          >
            <option value="80">80 MHz</option>
            <option value="160">160 MHz</option>
            <option value="240">240 MHz</option>
          </select>
        </div>
      </div>

      {/* 5. Runtime Data Source / HAL Switch ("Simulate Now, Plug Later") */}
      <div className="flex flex-col space-y-1">
        <span className="text-[10px] text-slate-400 font-bold flex items-center space-x-1">
          <Usb className="w-3 h-3 text-space-success" />
          <span>DATA SOURCE HAL</span>
        </span>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleConnectionSwitch('MOCK_SIMULATOR')}
            className={`px-2.5 py-1 rounded border transition ${
              store.connectionMode === 'MOCK_SIMULATOR'
                ? 'bg-space-accent/20 border-space-accent text-space-accent font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            SIMULATE NOW
          </button>

          <button
            onClick={() => handleConnectionSwitch('WEBSERIAL_COBS')}
            className={`px-2.5 py-1 rounded border transition ${
              store.connectionMode === 'WEBSERIAL_COBS'
                ? 'bg-space-success/20 border-space-success text-space-success font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            PLUG HARDWARE
          </button>
        </div>
      </div>
    </div>
  );
};

