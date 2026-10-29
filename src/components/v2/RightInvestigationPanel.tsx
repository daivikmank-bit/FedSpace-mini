// src/components/v2/RightInvestigationPanel.tsx
// Investigation & FDIR Diagnostic Panel matching the reference layout

import React from 'react';
import { useStationStore } from '../../store/useStationStore';
import {
  FrictionLevel,
  HarnessFaultOhms,
  BinderClipCount
} from '../../types/telemetry';
import {
  AlertTriangle,
  ShieldCheck,
  Zap,
  Sliders,
  CheckCircle2,
  Flame,
  ArrowRight,
  ExternalLink,
  RotateCcw
} from 'lucide-react';

interface RightInvestigationPanelProps {
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
  19: 'Bus Voltage (V_bus)',
  20: 'Setpoint Context',
  21: 'Winding Temp Context',
  22: 'Time Context'
};

export const RightInvestigationPanel: React.FC<RightInvestigationPanelProps> = ({
  onOpenHypothesesModal
}) => {
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

  const headline = fdirLayer === 'NOMINAL'
    ? 'Within model range'
    : activeFault === 'F1_IMBALANCE'
      ? 'Centrifugal Imbalance (F₁)'
      : activeFault === 'F2_FRICTION'
        ? 'Bearing Friction Anomaly (F₂)'
        : activeFault === 'F3_HARNESS'
          ? 'Virtual Harness Ohmic Drop (F₃)'
          : 'Subsystem Anomaly Trip';

  const description = fdirLayer === 'NOMINAL'
    ? 'No persistent alert in this section.'
    : fdirLayer === 'L3_RECOVERED'
      ? 'L3 Autonomous speed derating engaged (-30% RPM).'
      : '3-of-5 persistence threshold exceeded (τ = 1.0).';

  return (
    <aside className="w-80 xl:w-96 bg-[#090e1a] border-l border-slate-800/80 flex flex-col justify-between select-none shrink-0 h-full overflow-hidden text-xs">
      {/* 1. Header (Ref: "Investigation  [Monitoring]") */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
        <span className="font-semibold text-slate-200 text-xs tracking-wide">Investigation</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
          isAlarm
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
            : 'bg-[#15233d] text-slate-400 border border-slate-700/60'
        }`}>
          {isAlarm ? 'ALERT DETECTED' : 'Monitoring'}
        </span>
      </div>

      {/* 2. Investigation Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono">
        {/* Active Subsystem Title & Big Status Headline */}
        <div>
          <span className="text-[10px] text-slate-400 block mb-1">
            Sat A / Reaction Wheel (DUT)
          </span>
          <h2 className={`text-lg font-sans font-bold leading-tight ${
            isAlarm ? 'text-rose-400' : 'text-slate-100'
          }`}>
            {headline}
          </h2>
          <p className="text-[11px] text-slate-400 mt-1 leading-normal">
            {description}
          </p>
        </div>

        {/* 3-of-5 Persistence Register & Score Gauge */}
        <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">3-of-5 Persistence Register:</span>
            <span className="text-slate-300 font-bold">
              {persistenceWindow.filter(Boolean).length}/5 hops
            </span>
          </div>

          {/* LED Shift Register */}
          <div className="flex items-center space-x-1.5">
            {persistenceWindow.map((active, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded transition-all ${
                  active
                    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>

          {/* Whitened Score Bar */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Score S̃ₜ: <strong className={score >= tau ? 'text-rose-400' : 'text-cyan-400'}>{score.toFixed(2)}</strong></span>
            <span>Threshold τ: <strong>{tau.toFixed(1)}</strong></span>
          </div>
        </div>

        {/* Big Action CTA Button (Ref: "[ Analyze section → ]") */}
        <div>
          {isAlarm ? (
            <button
              onClick={resetFdir}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg shadow-lg flex items-center justify-center space-x-2 transition text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset FDIR Pipeline</span>
            </button>
          ) : (
            <button
              onClick={() => {
                store.setClipsF1(2); // Inject imbalance demo
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg flex items-center justify-center space-x-2 transition text-xs"
            >
              <span>Inject Anomaly Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Top-4 Explainability Residuals (APID 0x12) */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-bold">Top-4 Explainability Residuals</span>
            <span className="text-[10px] text-slate-500">APID 0x12</span>
          </div>

          <div className="space-y-1.5">
            {top4Indices.map((idx, rank) => {
              const res = top4Residuals[rank];
              const name = FEATURE_NAMES[idx] || `Spectral Order #${idx}`;
              const barWidthPct = Math.min(100, (Math.abs(res) / 128.0) * 100);

              return (
                <div key={rank} className="bg-[#0b1325] p-2 rounded border border-slate-800/60">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-300 font-medium truncate pr-2">
                      #{rank + 1} {name}
                    </span>
                    <span className={`font-bold ${res >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                      {res > 0 ? `+${res}` : res} q8
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${res >= 0 ? 'bg-rose-500' : 'bg-blue-500'}`}
                      style={{ width: `${barWidthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* EGSE Fault Actuation Controls (Compact in Sidebar) */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <span className="text-slate-300 font-bold text-[11px] block">EGSE Fault Injection Dock</span>

          {/* F1 Clips */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-purple-400 flex items-center space-x-1">
              <Flame className="w-3 h-3" />
              <span>F1 Imbalance</span>
            </span>
            <div className="flex items-center space-x-1">
              {([0, 1, 2, 3] as BinderClipCount[]).map((c) => (
                <button
                  key={c}
                  onClick={() => store.setClipsF1(c)}
                  className={`w-6 h-6 rounded text-[10px] font-bold transition ${
                    store.clipsF1 === c
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* F2 SG90 */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-blue-400">F2 Friction</span>
            <div className="flex items-center space-x-1">
              {(['NONE', 'L1_10PCT', 'L2_25PCT', 'L3_50PCT'] as FrictionLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => store.setFrictionF2(lvl)}
                  className={`px-1.5 py-0.5 rounded text-[9px] transition ${
                    store.frictionF2 === lvl
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl === 'NONE' ? 'OFF' : lvl.split('_')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* F3 Harness */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-amber-400">F3 Virtual R</span>
            <div className="flex items-center space-x-1">
              {([0, 2.2, 4.7] as HarnessFaultOhms[]).map((o) => (
                <button
                  key={o}
                  onClick={() => store.setHarnessF3(o)}
                  className={`px-2 py-0.5 rounded text-[10px] transition ${
                    store.harnessF3 === o
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {o}Ω
                </button>
              ))}
            </div>
          </div>

          {/* Speed Setpoint Slider */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>RPM Setpoint</span>
              <span className="text-cyan-400 font-bold">{store.rpmSetpoint} RPM</span>
            </div>
            <input
              type="range"
              min="150"
              max="280"
              step="5"
              value={store.rpmSetpoint}
              onChange={(e) => store.setRpmSetpoint(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Saved Cases (Ref: Vidyut Drishti "Saved cases  0") */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold mb-1">
            <span>Saved cases</span>
            <span className="text-slate-500">0</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Cases appear after reviewing an alert. Synthetic observations. Flight verification required.
          </p>
        </div>
      </div>

      {/* 3. Footer Link (Ref: "Evaluation & provenance ↗") */}
      <div className="p-3 bg-[#0d1527] border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <button
          onClick={onOpenHypothesesModal}
          className="flex items-center space-x-1 hover:text-slate-200 cursor-pointer"
        >
          <span>Evaluation & provenance (H1-H8)</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
        <span className="font-mono text-slate-500">v2.0-core</span>
      </div>
    </aside>
  );
};

