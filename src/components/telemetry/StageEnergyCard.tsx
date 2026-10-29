// src/components/telemetry/StageEnergyCard.tsx
// Hardware-Timer Stage Profiler (Pins 32/33 -> Sat A Pins 16/17) Latency & Microjoule Card

import React from 'react';
import { useStationStore } from '../../store/useStationStore';
import { BatteryCharging, Cpu, CheckCircle2 } from 'lucide-react';

export const StageEnergyCard: React.FC = () => {
  const store = useStationStore();
  const { stage, detectorId, clockMhz, fftSize } = store;

  const { durationsUs, energyMicroJoules, nnEnergyFractionPct, averagePowerMw } = stage;
  const isH4Passed = nnEnergyFractionPct < 20.0;

  return (
    <div className="w-full bg-space-900/90 border border-slate-800 rounded-lg p-3 text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2.5">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-space-accent" />
          <span className="font-bold text-slate-200">STAGE PROFILER (GPIO 16/17)</span>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
          <span className="px-1.5 py-0.5 rounded bg-slate-800">{clockMhz} MHz</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800">N={fftSize}</span>
          <span className="px-1.5 py-0.5 rounded bg-space-accent/20 text-space-accent font-bold">{detectorId}</span>
        </div>
      </div>

      {/* Stage Microsecond Latency Stack */}
      <div className="space-y-2 mb-3">
        {/* Stage 00: Idle/Acq */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Stage 00 (Idle & DMA Acq):</span>
          <span className="text-slate-300 font-bold">
            {(durationsUs.stage00_IdleAcq / 1000).toFixed(1)} ms • {energyMicroJoules.acq.toLocaleString()} μJ
          </span>
        </div>

        {/* Stage 01: DSP & FFT */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-sky-400">Stage 01 (Complex FFT & Phasor):</span>
          <span className="text-sky-300 font-bold">
            {(durationsUs.stage01_DspFft / 1000).toFixed(2)} ms • {energyMicroJoules.dsp.toLocaleString()} μJ
          </span>
        </div>

        {/* Stage 10: INT8 Neural Net */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-amber-400">Stage 10 (TFLM INT8 Autoencoder):</span>
          <span className="text-amber-300 font-bold">
            {(durationsUs.stage10_Int8Nn / 1000).toFixed(2)} ms • {energyMicroJoules.nn.toLocaleString()} μJ
          </span>
        </div>

        {/* Stage 11: Radio TX */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-emerald-400">Stage 11 (ESP-NOW Radio TX):</span>
          <span className="text-emerald-300 font-bold">
            {(durationsUs.stage11_RadioTx / 1000).toFixed(2)} ms • {energyMicroJoules.radio.toLocaleString()} μJ
          </span>
        </div>
      </div>

      {/* Stacked Visual Bar */}
      <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800 mb-3">
        <div style={{ width: '75%' }} className="bg-slate-600" title="Idle/Acq" />
        <div style={{ width: '12%' }} className="bg-sky-500" title="DSP" />
        <div style={{ width: '5%' }} className="bg-amber-400" title="NN" />
        <div style={{ width: '8%' }} className="bg-emerald-500" title="Radio" />
      </div>

      {/* Summary Score & Hypothesis H4 Badge */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-slate-300">
          <BatteryCharging className="w-3.5 h-3.5 text-space-accent" />
          <span>Total Hop: <strong>{(energyMicroJoules.total / 1000).toFixed(1)} mJ</strong> ({averagePowerMw} mW)</span>
        </div>

        <div className={`px-2 py-0.5 rounded text-[10px] flex items-center space-x-1 border ${
          isH4Passed 
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        }`}>
          <CheckCircle2 className="w-3 h-3" />
          <span>H4 PASSED: NN {nnEnergyFractionPct}% (&lt;20%)</span>
        </div>
      </div>
    </div>
  );
};
