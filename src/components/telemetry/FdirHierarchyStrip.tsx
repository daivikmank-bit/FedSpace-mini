// src/components/telemetry/FdirHierarchyStrip.tsx
// 4-Layer FDIR Status Banner & 3-of-5 Persistence Shift Register

import React from 'react';
import { useStationStore } from '../../store/useStationStore';
import { AlertTriangle, ShieldCheck, Zap, RotateCcw } from 'lucide-react';

export const FdirHierarchyStrip: React.FC = () => {
  const store = useStationStore();
  const { fdirLayer, activeFault, persistenceWindow, fdir, resetFdir, triggerEmergencyBrake } = store;

  const score = fdir.whitenedScoreEma;
  const tau = fdir.thresholdTau;
  const scoreFrac = Math.min(1.0, score / (tau * 2.0));

  return (
    <div className="w-full bg-space-900/90 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
      {/* 4-Layer Architecture Indicators */}
      <div className="flex items-center space-x-2">
        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">FDIR Pipeline:</span>

        {/* L0: Hard Trips */}
        <div className={`px-2.5 py-1 rounded border flex items-center space-x-1.5 transition-all ${
          fdirLayer === 'L0_SAFE_TRIP'
            ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold animate-pulse'
            : 'bg-slate-900 border-slate-800 text-slate-500'
        }`}>
          <Zap className="w-3.5 h-3.5" />
          <span>L0: HARD SAFETY TRIP</span>
        </div>

        {/* L1: Detection */}
        <div className={`px-2.5 py-1 rounded border flex items-center space-x-1.5 transition-all ${
          fdirLayer === 'L1_ALARM' || fdirLayer === 'L2_ISOLATED' || fdirLayer === 'L3_RECOVERED'
            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
            : 'bg-slate-900 border-slate-800 text-slate-500'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>L1: INT8 AE PERSISTENCE</span>
        </div>

        {/* L2: Isolation */}
        <div className={`px-2.5 py-1 rounded border flex items-center space-x-1.5 transition-all ${
          fdirLayer === 'L2_ISOLATED' || fdirLayer === 'L3_RECOVERED'
            ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
            : 'bg-slate-900 border-slate-800 text-slate-500'
        }`}>
          <span>L2: ISOLATION [{activeFault}]</span>
        </div>

        {/* L3: Autonomous Recovery */}
        <div className={`px-2.5 py-1 rounded border flex items-center space-x-1.5 transition-all ${
          fdirLayer === 'L3_RECOVERED'
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
            : 'bg-slate-900 border-slate-800 text-slate-500'
        }`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>L3: AUTONOMOUS RECOVERY</span>
        </div>
      </div>

      {/* 3-of-5 Persistence Shift Register */}
      <div className="flex items-center space-x-3 bg-space-950/80 px-3 py-1.5 rounded border border-slate-800">
        <span className="text-slate-400 text-[10px]">3-OF-5 PERSISTENCE:</span>
        <div className="flex items-center space-x-1">
          {persistenceWindow.map((active, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-sm border transition-all ${
                active 
                  ? 'bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]' 
                  : 'bg-slate-800 border-slate-700'
              }`}
              title={`Hop slot ${i + 1}: ${active ? 'Above tau' : 'Below tau'}`}
            />
          ))}
        </div>
        <span className="text-[10px] text-slate-400">
          ({persistenceWindow.filter(Boolean).length}/5)
        </span>
      </div>

      {/* Whitened Score Gauge */}
      <div className="flex items-center space-x-2 bg-space-950/80 px-3 py-1.5 rounded border border-slate-800">
        <span className="text-slate-400 text-[10px]">S̃ₜ SCORE:</span>
        <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700">
          <div
            className={`h-full transition-all duration-300 ${
              score >= tau ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]' : 'bg-space-accent'
            }`}
            style={{ width: `${Math.min(100, scoreFrac * 100)}%` }}
          />
          {/* Threshold marker */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-amber-400 z-10" title="Threshold tau = 1.0" />
        </div>
        <span className={`font-bold ${score >= tau ? 'text-rose-400' : 'text-space-accent'}`}>
          {score.toFixed(2)} / {tau.toFixed(1)}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={resetFdir}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center space-x-1 transition"
          title="Clear Alarms and Return to Nominal State"
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESET FDIR</span>
        </button>

        <button
          onClick={triggerEmergencyBrake}
          className="px-2.5 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/60 rounded flex items-center space-x-1 font-bold transition"
          title="Trip Layer-0 Emergency Brake"
        >
          <span>L0 BRAKE</span>
        </button>
      </div>
    </div>
  );
};

