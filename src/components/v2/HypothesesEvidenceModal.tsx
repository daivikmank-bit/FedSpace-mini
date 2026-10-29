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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0b1325] border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 bg-[#0e1930] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              Evaluation & Provenance (Hypotheses H1–H8 Matrix)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-2.5 font-mono text-xs">
          {HYPOTHESES.map((h) => (
            <div
              key={h.id}
              className="bg-[#080d1a] border border-slate-800/80 p-3 rounded-lg flex flex-col space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 rounded bg-blue-600/20 text-cyan-400 font-bold text-[10px]">
                    {h.id} ({h.claim})
                  </span>
                  <span className="font-bold text-slate-200">{h.title}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{h.status}</span>
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Criterion: {h.metric}
              </div>
              <div className="text-[11px] text-slate-200 font-medium pt-0.5">
                Evidence: {h.result}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0e1930] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Target Hardware: ESP32-WROOM-32D (80MHz, ≤48KB RAM)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

