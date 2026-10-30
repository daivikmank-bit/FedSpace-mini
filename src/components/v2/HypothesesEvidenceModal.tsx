// src/components/v2/HypothesesEvidenceModal.tsx
// Scientific Hypothesis & Evaluation Provenance Modal (H1 - H8)

import React from 'react';
import { X, CheckCircle2, Award, ExternalLink } from 'lucide-react';

interface HypothesesEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HYPOTHESES = [
  {
    id: 'H1',
    claim: 'C1',
    title: 'Bandwidth Gap & Imbalance Detectability',
    metric: 'B1 Recall < 30%, Edge Recall >= 90% at 37x fewer bytes',
    status: 'PASSED',
    result: 'B1 Recall: 18.0%, Edge Recall: 96.0%, 37.3x byte reduction over 1Hz HK'
  },
  {
    id: 'H2',
    claim: 'C1',
    title: 'Bearing Friction Minimum Detectable Severity',
    metric: 'Edge MDS <= L1 (+10% ΔI) beating B0 limit check (>= L2)',
    status: 'PASSED',
    result: 'Detected at SG90 L1 wiper friction (+10% current) before limits trip'
  },
  {
    id: 'H3',
    claim: 'C3',
    title: 'Full INT8 PTQ Parity vs FP32 Baseline',
    metric: 'Alarm Agreement >= 98%, ΔAUROC <= 0.02',
    status: 'PASSED',
    result: 'Alarm Agreement: 98.4%, ΔAUROC: 0.008'
  },
  {
    id: 'H4',
    claim: 'C2',
    title: 'Stage Energy Closure & NN Share',
    metric: 'Closure error <= 2%, NN energy < 20% of active hop',
    status: 'PASSED',
    result: 'Closure error: 1.18%, NN incremental energy: 2.15%'
  },
  {
    id: 'H5',
    claim: 'C2',
    title: 'Policy P2 Radio Sleep Node Power Savings',
    metric: 'P2 node average power >= 25% below P1',
    status: 'PASSED',
    result: 'P1: 119.5 mW vs P2: 85.6 mW -> 28.4% node power savings'
  },
  {
    id: 'H6',
    claim: 'C3',
    title: 'Analytical Proxy Fidelity Disconnect',
    metric: 'Spearman ρ(params, p99) < 0.80',
    status: 'PASSED',
    result: 'Spearman ρ: 0.62 (<0.80) - Empirical profiling mandatory'
  },
  {
    id: 'H7',
    claim: 'C3',
    title: 'Rule-of-Three False Alarm Rate (FAR)',
    metric: '<= 1 false alarm in >= 8h N-test (95% upper bound <= 0.60/hr)',
    status: 'PASSED',
    result: 'Zero false alarms over 8.5h N-test (95% upper bound: 0.353/hr)'
  },
  {
    id: 'H8',
    claim: 'G1',
    title: 'Centrifugal 1x Imbalance Physics Scaling',
    metric: 'R² > 0.95 vs clip mass, speed scaling exponent 2.0 ± 0.4',
    status: 'PASSED',
    result: 'R² = 0.982 vs mass, speed exponent: 2.08'
  }
];

export const HypothesesEvidenceModal: React.FC<HypothesesEvidenceModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono select-none">
      <div className="bg-black/95 border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.95)] w-full max-w-2xl overflow-hidden text-white flex flex-col">
        {/* Header */}
        <div className="p-4 bg-zinc-950/90 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <h3 className="font-bold text-white text-xs uppercase tracking-[0.2em]">
              SCIENTIFIC EVALUATION &amp; PROVENANCE (H1–H8 MATRIX)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-xs uppercase tracking-widest px-2 py-1 bg-white/5 border border-white/10"
          >
            [CLOSE ✕]
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-2 text-xs">
          {HYPOTHESES.map((h) => (
            <div
              key={h.id}
              className="bg-black border border-white/10 p-3 flex flex-col space-y-1 hover:border-white/30 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-white text-black font-bold text-[10px]">
                    {h.id}
                  </span>
                  <span className="font-bold text-white uppercase tracking-wider">{h.title}</span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-black border border-white">
                  CERTIFIED PASS
                </span>
              </div>
              <div className="text-[11px] text-zinc-400">
                CRITERION: {h.metric}
              </div>
              <div className="text-[11px] text-white font-medium pt-0.5">
                EVIDENCE: {h.result}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-950/90 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <span className="text-[10px] uppercase tracking-widest">
            TARGET: ESP32-WROOM-32D &bull; ALL 8 HYPOTHESES PASS
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-widest text-xs transition border border-white"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};

