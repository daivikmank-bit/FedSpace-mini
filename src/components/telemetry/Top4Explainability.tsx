// src/components/telemetry/Top4Explainability.tsx
// Unpacks CCSDS APID 0x12 Top-4 Edge Explainability Residuals

import React from 'react';
import { useStationStore } from '../../store/useStationStore';

const FEATURE_NAMES: Record<number, string> = {
  0: '1x Phasor Imbalance Energy (E₁ₓ)',
  1: 'Motor Current Deviation (ΔI)',
  2: 'Speed Tracking Error (Δω)',
  3: 'Harmonic Band 0.5x Energy',
  4: 'Harmonic Band 1.5x Energy',
  5: 'Harmonic Band 2.0x Energy',
  6: 'Harmonic Band 3.0x Energy',
  7: 'Harmonic Band 4.0x Energy',
  8: 'High-Frequency Radial Vib',
  14: 'Vibration Kurtosis / Crest',
  18: 'Closed-Loop PWM Duty Cycle',
  19: 'Bus Supply Voltage (V_bus)',
  20: 'Speed Setpoint Context (ω_ref)',
  21: 'Winding Temperature Context (T̂)',
  22: 'Time Since Command Context (Δt)'
};

export const Top4Explainability: React.FC = () => {
  const store = useStationStore();
  const { top4Indices, top4Residuals, activeFault, fdirLayer } = store;

  const isAlarm = fdirLayer !== 'NOMINAL';

  return (
    <div className="w-full bg-space-900/90 border border-slate-800 rounded-lg p-3 text-xs font-mono">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2.5">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-space-accent" />
          <span className="font-bold text-slate-200">EDGE EXPLAINABILITY (APID 0x12)</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] ${
          isAlarm ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-800 text-slate-400'
        }`}>
          {isAlarm ? `FAULT CAUSE: ${activeFault}` : 'BASELINE RESIDUALS'}
        </span>
      </div>

      <div className="space-y-2">
        {top4Indices.map((idx, rank) => {
          const res = top4Residuals[rank];
          const name = FEATURE_NAMES[idx] || `Spectral Order Feature #${idx}`;
          const absRes = Math.abs(res);
          const barWidthPct = Math.min(100, (absRes / 128.0) * 100);
          const isDominant = rank === 0 && isAlarm;

          return (
            <div key={rank} className="flex flex-col space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="text-slate-500 font-bold">#{rank + 1}</span>
                  <span className={`truncate ${isDominant ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    {name}
                  </span>
                  <span className="text-[10px] text-slate-500">[{idx}]</span>
                </div>
                <span className={`font-bold ${res >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                  {res > 0 ? `+${res}` : res} q8
                </span>
              </div>

              {/* Residual Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isDominant ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : res >= 0 ? 'bg-rose-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${barWidthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
