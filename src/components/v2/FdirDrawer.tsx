// src/components/v2/FdirDrawer.tsx
// SpaceX-styled FDIR Diagnostics, 3-of-5 Persistence & Top-4 Explainability Dropdown Drawer

import React from 'react';
import { useStationStore } from '../../store/useStationStore';
import { ShieldAlert, AlertTriangle, RotateCcw, Check, Zap } from 'lucide-react';

interface FdirDrawerProps {
  onClose: () => void;
  onOpenHypothesesModal: () => void;
}

const FEATURE_NAMES: Record<number, string> = {
  0: '1x Phasor Imbalance (E₁ₓ)',
  1: 'Current Deviation (ΔI)',
  2: 'Speed Error (Δω)',
  3: 'Harmonic 0.5x Energy',
  4: 'Harmonic 1.5x Energy',
  14: 'Vibration Kurtosis',
  18: 'Closed-Loop PWM Duty',
  19: 'Bus Voltage Droop (V_bus)',
  20: 'Setpoint Context',
  21: 'Winding Temp Context',
  22: 'Time Elapsed Context'
};

export const FdirDrawer: React.FC<FdirDrawerProps> = ({ onClose, onOpenHypothesesModal }) => {
  const store = useStationStore();
  const {
    fdirLayer,
    activeFault,
    persistenceWindow,
    fdir,
    top4Indices,
    top4Residuals,
    resetFdir,
    triggerEmergencyBrake
  } = store;

  const isAlarm = fdirLayer !== 'NOMINAL';
  const score = fdir.whitenedScoreEma;
  const tau = fdir.thresholdTau;

  return (
    <div className="w-full bg-black/92 backdrop-blur-2xl border-b border-white/20 text-white font-mono p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95)] select-none">
      <div className="max-w-7xl mx-auto flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <span className={`w-2 h-2 rounded-full ${isAlarm ? 'bg-red-500 animate-ping' : 'bg-white'}`} />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
              // 02 ON-ORBIT FDIR & EDGE AI INVESTIGATION
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 border ${
              isAlarm ? 'border-red-500 bg-red-950/60 text-red-300' : 'border-white/20 text-zinc-400'
            }`}>
              LAYER: {fdirLayer}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenHypothesesModal}
              className="text-xs uppercase tracking-widest px-3 py-1 bg-white/5 hover:bg-white text-zinc-300 hover:text-black transition-all border border-white/10"
            >
              [SCIENTIFIC EVIDENCE (H1-H8)]
            </button>
            <button
              onClick={onClose}
              className="text-xs uppercase tracking-widest px-3 py-1 bg-white/5 hover:bg-white text-zinc-400 hover:text-black transition-all border border-white/10"
            >
              [CLOSE ✕]
            </button>
          </div>
        </div>

        {/* Grid Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
          {/* Left Column: Diagnostics & 3-of-5 Persistence (6 cols) */}
          <div className="md:col-span-6 bg-zinc-950/80 border border-white/10 p-5 space-y-4">
            {/* Status Banner */}
            <div className={`p-3 border ${
              isAlarm ? 'border-red-500/80 bg-red-950/30 text-red-200' : 'border-white/10 bg-black/50 text-zinc-300'
            }`}>
              <span className="text-[10px] uppercase text-zinc-500 block">EDGE CLASSIFICATION STATUS</span>
              <strong className="text-base tracking-wider text-white uppercase block mt-0.5">
                {isAlarm ? `ALARM: ${activeFault}` : 'WITHIN MODEL SPECIFICATION — NOMINAL'}
              </strong>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                {isAlarm
                  ? 'Persistent deviation detected across 3-of-5 hop evaluation window. Autoencoder reconstruction error exceeds whitened threshold.'
                  : 'Rotor dynamics and electrical parameters conform to nominal flight envelope.'}
              </p>
            </div>

            {/* 3-of-5 Persistence Register */}
            <div className="bg-black/60 border border-white/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-zinc-400">
                  3-OF-5 PERSISTENCE REGISTER (1.0s HOP)
                </span>
                <span className="text-[10px] text-zinc-500">ANTI-CHATTER GATE</span>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                {persistenceWindow.map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center space-y-1">
                    <div className={`w-full h-8 border flex items-center justify-center font-bold text-xs ${
                      val
                        ? 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                        : 'bg-zinc-900 border-white/10 text-zinc-600'
                    }`}>
                      {val ? 'ALARM' : 'OK'}
                    </div>
                    <span className="text-[9px] text-zinc-500">HOP {idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Anomaly Score vs Threshold */}
            <div className="bg-black/60 border border-white/10 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="uppercase tracking-widest text-zinc-400">WHITENED ANOMALY SCORE (S_t)</span>
                <span className="font-bold text-white">
                  {score.toFixed(2)} / <span className="text-zinc-500">τ = {tau.toFixed(2)}</span>
                </span>
              </div>

              <div className="w-full h-2 bg-zinc-900 border border-white/10 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 ${isAlarm ? 'bg-red-500' : 'bg-white'}`}
                  style={{ width: `${Math.min(100, (score / (tau * 1.8)) * 100)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10"
                  style={{ left: `${(tau / (tau * 1.8)) * 100}%` }}
                  title="Threshold tau = 3.50"
                />
              </div>

              <div className="flex justify-between text-[10px] text-zinc-500 pt-0.5">
                <span>0.00</span>
                <span className="text-yellow-400">THRESHOLD τ = 3.50</span>
                <span>{(tau * 1.8).toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Top-4 Explainability & Action Controls (6 cols) */}
          <div className="md:col-span-6 bg-zinc-950/80 border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs uppercase tracking-widest text-zinc-400">
                TOP-4 EXPLAINABILITY RESIDUALS (DIAGNOSTIC PROVENANCE)
              </span>
              <span className="text-[10px] text-zinc-500">Z-SCORE CONTRIBUTION</span>
            </div>

            {/* Top-4 Bars */}
            <div className="space-y-3">
              {top4Indices.map((featIdx, i) => {
                const res = top4Residuals[i] || 0;
                const name = FEATURE_NAMES[featIdx] || `Feature #${featIdx}`;
                const barWidth = Math.min(100, Math.abs(res) * 22);

                return (
                  <div key={i} className="bg-black/60 border border-white/10 p-2.5 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-200 font-bold uppercase">{name}</span>
                      <strong className={Math.abs(res) > 2.0 ? 'text-white' : 'text-zinc-400'}>
                        {res > 0 ? `+${res.toFixed(2)}σ` : `${res.toFixed(2)}σ`}
                      </strong>
                    </div>

                    <div className="w-full h-1.5 bg-zinc-900 overflow-hidden">
                      <div
                        className={`h-full ${Math.abs(res) > 2.0 ? 'bg-white' : 'bg-zinc-600'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center space-x-3">
              <button
                onClick={resetFdir}
                className="flex-1 py-2 bg-white/5 hover:bg-white text-zinc-300 hover:text-black font-bold uppercase tracking-widest text-xs border border-white/20 transition flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET FDIR STATE</span>
              </button>

              <button
                onClick={triggerEmergencyBrake}
                className="flex-1 py-2 bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white font-bold uppercase tracking-widest text-xs border border-red-500/50 transition flex items-center justify-center space-x-2"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>L0 EMERGENCY TRIP</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
