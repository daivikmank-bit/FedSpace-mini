// src/components/v2/BottomTelemetryStrip.tsx
// SpaceX-styled Minimalist Bottom Telemetry HUD Strip

import React from 'react';
import { useStationStore } from '../../store/useStationStore';
import { Radio, Eye, Activity, ShieldAlert, Cpu } from 'lucide-react';

interface BottomTelemetryStripProps {
  onTogglePip: () => void;
  isPipVisible: boolean;
  onOpenWaveforms: () => void;
  onOpenFdir: () => void;
}

export const BottomTelemetryStrip: React.FC<BottomTelemetryStripProps> = ({
  onTogglePip,
  isPipVisible,
  onOpenWaveforms,
  onOpenFdir
}) => {
  const store = useStationStore();
  const { hk, orbital, fdirLayer, activeFault } = store;

  const isAlarm = fdirLayer !== 'NOMINAL';

  return (
    <div className="fixed bottom-0 left-0 right-0 h-11 bg-black/85 backdrop-blur-md border-t border-white/10 px-6 flex items-center justify-between text-[11px] font-mono tracking-widest text-zinc-300 z-30 select-none">
      {/* Telemetry Telemetry Metric Cells */}
      <div className="flex items-center space-x-6 overflow-x-auto py-1">
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[9px] uppercase text-zinc-500">STAGE:</span>
          <strong className="text-white font-bold">ORBITAL LEO</strong>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[9px] uppercase text-zinc-500">ALTITUDE:</span>
          <strong className="text-white font-bold">520.0 KM</strong>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[9px] uppercase text-zinc-500">VELOCITY:</span>
          <strong className="text-white font-bold">7.66 KM/S</strong>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[9px] uppercase text-zinc-500">ROTOR SPEED:</span>
          <strong className="text-white font-bold">{hk.rpmKalman.toFixed(0)} RPM</strong>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[9px] uppercase text-zinc-500">CURRENT:</span>
          <strong className="text-white font-bold">{hk.currentMa.toFixed(0)} mA</strong>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[9px] uppercase text-zinc-500">BUS VOLT:</span>
          <strong className="text-white font-bold">{hk.busVoltageV.toFixed(2)} V</strong>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[9px] uppercase text-zinc-500">TEMP:</span>
          <strong className="text-white font-bold">{hk.windingTempEstC.toFixed(1)}°C</strong>
        </div>

        {/* FDIR Status Badge */}
        <div
          onClick={onOpenFdir}
          className={`flex items-center space-x-1.5 px-2 py-0.5 border cursor-pointer shrink-0 transition ${
            isAlarm
              ? 'border-red-500 bg-red-950/60 text-red-300 animate-pulse'
              : 'border-white/20 bg-white/5 text-white hover:border-white/50'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isAlarm ? 'bg-red-400' : 'bg-white'}`} />
          <span>FDIR: {isAlarm ? activeFault : 'NOMINAL'}</span>
        </div>

        {/* LoS Ground Pass Badge */}
        <div className={`flex items-center space-x-1 px-2 py-0.5 border shrink-0 ${
          orbital.isGroundPassActive
            ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300 font-bold animate-pulse'
            : 'border-white/10 bg-black/40 text-zinc-400'
        }`}>
          <span>PASS: {orbital.isGroundPassActive ? `ACTIVE (${orbital.passCountdownSec}s)` : `IN ${orbital.passCountdownSec}s`}</span>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="hidden sm:flex items-center space-x-3 shrink-0 pl-4 border-l border-white/10">
        <button
          onClick={onOpenWaveforms}
          className="px-2.5 py-1 bg-white/5 hover:bg-white text-zinc-400 hover:text-black transition border border-white/10 text-[10px] uppercase font-bold tracking-widest flex items-center space-x-1"
        >
          <Activity className="w-3 h-3" />
          <span>WAVEFORMS</span>
        </button>

        <button
          onClick={onTogglePip}
          className={`px-2.5 py-1 transition border text-[10px] uppercase font-bold tracking-widest flex items-center space-x-1 ${
            isPipVisible
              ? 'bg-white text-black border-white'
              : 'bg-white/5 hover:bg-white text-zinc-400 hover:text-black border-white/10'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>RW-01 TWIN PIP</span>
        </button>
      </div>
    </div>
  );
};
