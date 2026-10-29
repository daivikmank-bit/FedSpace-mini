// src/App.tsx
// FedSpace-Mini v2-School: Mission Control Ground Station & Digital Twin

import React, { useEffect } from 'react';
import { useStationStore, stationStore } from './store/useStationStore';
import { MockSpacePhysicsAdapter } from './adapters/MockSpacePhysicsAdapter';
import { SpaceConstellationCanvas } from './components/space3d/SpaceConstellationCanvas';
import { ReactionWheelCutaway } from './components/space3d/ReactionWheelCutaway';
import { FdirHierarchyStrip } from './components/telemetry/FdirHierarchyStrip';
import { HighRatePlots } from './components/telemetry/HighRatePlots';
import { Top4Explainability } from './components/telemetry/Top4Explainability';
import { StageEnergyCard } from './components/telemetry/StageEnergyCard';
import { ClaimsScorecard } from './components/telemetry/ClaimsScorecard';
import { EgseControlBar } from './components/telemetry/EgseControlBar';
import { Satellite, Shield, Wifi, Database } from 'lucide-react';

export const App: React.FC = () => {
  const store = useStationStore();

  // Initialize Simulator on Mount ("Simulate Now")
  useEffect(() => {
    const mock = new MockSpacePhysicsAdapter();
    mock.connect().then(() => {
      mock.onHousekeeping((hk) => stationStore.updateHk(hk));
      mock.onFdirEvent((evt) => stationStore.updateFdir(evt));
      mock.onStageProfile((stg) => stationStore.updateStage(stg));
      mock.onOrbitalTick((orb) => stationStore.updateOrbital(orb));
      stationStore.setAdapter(mock, true);
    });

    return () => {
      mock.disconnect();
    };
  }, []);

  const { hk, orbital, telemetryPolicy, connectionMode, fdirLayer } = store;

  return (
    <div className="w-screen h-screen flex flex-col bg-space-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* 1. Top Mission Control Header */}
      <header className="h-12 bg-space-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 font-mono text-xs z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Satellite className="w-5 h-5 text-space-accent animate-pulse" />
            <span className="font-bold text-sm tracking-wide text-white">FEDSPACE-MINI v2</span>
          </div>
          <span className="text-slate-500">|</span>
          <span className="text-[11px] text-slate-400">GROUND STATION & 3D DIGITAL TWIN</span>
          <span className="px-2 py-0.5 rounded bg-space-accent/10 border border-space-accent/30 text-space-accent text-[10px]">
            {connectionMode === 'MOCK_SIMULATOR' ? 'SIMULATION MODE' : 'HARDWARE USB-UART'}
          </span>
        </div>

        {/* Live System Metrics in Header */}
        <div className="flex items-center space-x-5 text-[11px]">
          {/* Kalman RPM */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">RPM:</span>
            <span className="text-space-accent font-bold">{hk.rpmKalman.toFixed(0)}</span>
            <span className="text-slate-500 text-[10px]">({hk.rpmSetpoint})</span>
          </div>

          {/* Current */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">CURRENT:</span>
            <span className="text-emerald-400 font-bold">{hk.currentMa} mA</span>
          </div>

          {/* Motor Temp */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">TEMP:</span>
            <span className={`font-bold ${hk.windingTempEstC > 50 ? 'text-rose-400' : 'text-amber-300'}`}>
              {hk.windingTempEstC.toFixed(1)}°C
            </span>
          </div>

          {/* Cumulative Downlink Bytes */}
          <div className="flex items-center space-x-1.5">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">DOWNLINK:</span>
            <span className="text-white font-bold">{(orbital.cumulativeBytesDownlink / 1024).toFixed(1)} kB</span>
          </div>

          {/* Link Status Pill */}
          <div className={`px-2.5 py-1 rounded-full border flex items-center space-x-1.5 text-[10px] ${
            orbital.linkStatus === 'DOWNLINK_ACTIVE'
              ? 'bg-space-success/20 border-space-success text-space-success font-bold animate-pulse'
              : orbital.linkStatus === 'ESP_NOW_ACTIVE'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-500'
          }`}>
            <Wifi className="w-3 h-3" />
            <span>{orbital.linkStatus.replace('_', ' ')}</span>
          </div>
        </div>
      </header>

      {/* 2. Main Content Split View */}
      <main className="flex-1 min-h-0 flex flex-col p-2 space-y-2 overflow-hidden">
        {/* Top Half: Dual 3D Viewports (Space Constellation + Reaction Wheel Cutaway) */}
        <div className="h-[46%] min-h-[260px] grid grid-cols-12 gap-2">
          {/* Viewport A: Macro 3D Space Constellation (7 cols) */}
          <div className="col-span-7 h-full rounded-lg overflow-hidden border border-slate-800 shadow-lg relative">
            <SpaceConstellationCanvas />
          </div>

          {/* Viewport B: Micro 3D Reaction Wheel Digital Twin (5 cols) */}
          <div className="col-span-5 h-full rounded-lg overflow-hidden border border-slate-800 shadow-lg relative">
            <ReactionWheelCutaway />
          </div>
        </div>

        {/* FDIR Pipeline & Persistence Strip */}
        <div className="shrink-0">
          <FdirHierarchyStrip />
        </div>

        {/* Bottom Half: High-Rate Canvas Plots & Engineering Scorecards */}
        <div className="flex-1 min-h-0 grid grid-cols-12 gap-2">
          {/* Left Column: 60 FPS Canvas Plots (7 cols) */}
          <div className="col-span-7 h-full min-h-0">
            <HighRatePlots />
          </div>

          {/* Right Column: Explainability, Stage Profiler & Claims (5 cols) */}
          <div className="col-span-5 h-full min-h-0 flex flex-col space-y-2 overflow-y-auto pr-0.5">
            <Top4Explainability />
            <StageEnergyCard />
            <ClaimsScorecard />
          </div>
        </div>
      </main>

      {/* 3. Bottom EGSE Fault Actuation & Telemetry Control Dock */}
      <footer className="shrink-0 z-20">
        <EgseControlBar />
      </footer>
    </div>
  );
};

export default App;
