// src/components/v2/TopNavBar.tsx
// Sleek Mission Control Top Bar inspired by the reference design

import React from 'react';
import { useStationStore } from '../../store/useStationStore';
import { TelemetryPolicy } from '../../types/telemetry';
import {
  Satellite,
  Play,
  Pause,
  RotateCcw,
  Compass,
  FlaskConical,
  ShieldAlert,
  ChevronDown,
  ExternalLink,
  Radio,
  Check
} from 'lucide-react';

interface TopNavBarProps {
  onTogglePlots: () => void;
  showPlots: boolean;
  onOpenHypothesesModal: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  onTogglePlots,
  showPlots,
  onOpenHypothesesModal
}) => {
  const store = useStationStore();
  const { orbital, telemetryPolicy, connectionMode, fdirLayer, triggerEmergencyBrake } = store;

  const isSim = connectionMode === 'MOCK_SIMULATOR';

  return (
    <header className="h-14 bg-[#0a101f] border-b border-slate-800/80 px-4 flex items-center justify-between text-xs select-none z-30 shrink-0">
      {/* 1. Left: Brand & Lab Pill */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Satellite className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-wide text-white leading-none flex items-center space-x-1.5">
              <span>((o))</span>
              <span>FedSpace-Mini</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono leading-tight mt-0.5">
              Simulation Lab v2S
            </span>
          </div>
        </div>

        {/* Mode Toggle Button */}
        <div className="hidden sm:flex items-center bg-[#0f172a] p-0.5 rounded-full border border-slate-800 text-[11px]">
          <button
            onClick={() => {
              if (!isSim) {
                // Switch to simulator
                const evt = new CustomEvent('switch-adapter', { detail: 'MOCK_SIMULATOR' });
                window.dispatchEvent(evt);
              }
            }}
            className={`px-3 py-1 rounded-full transition ${
              isSim
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Baseline
          </button>
          <button
            onClick={() => {
              const evt = new CustomEvent('switch-adapter', { detail: 'WEBSERIAL_COBS' });
              window.dispatchEvent(evt);
            }}
            className={`px-3 py-1 rounded-full transition flex items-center space-x-1 ${
              !isSim
                ? 'bg-emerald-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Live Hardware</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </button>
        </div>

        {/* Telemetry Policy Pills */}
        <div className="hidden md:flex items-center space-x-1 pl-2 border-l border-slate-800/80">
          {(['P0_RAW', 'P1_1HZ_HK', 'P2_EDGE_FDIR', 'P3_ISL_RELAY'] as TelemetryPolicy[]).map((p) => {
            const isActive = telemetryPolicy === p;
            const labelMap: Record<TelemetryPolicy, string> = {
              P0_RAW: 'Raw 1.6kHz',
              P1_1HZ_HK: '1Hz HK',
              P2_EDGE_FDIR: 'Edge FDIR',
              P3_ISL_RELAY: 'ISL Relay'
            };

            return (
              <button
                key={p}
                onClick={() => store.setTelemetryPolicy(p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition ${
                  isActive
                    ? 'bg-slate-800 text-cyan-400 font-medium border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {labelMap[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Center: Timeline & Orbital Pass Controls (Ref: "▶ |▷ 10x ⌵ | 01:00 IST | Interval 4 / 96") */}
      <div className="flex items-center space-x-3 bg-[#0d1527] px-3 py-1.5 rounded-full border border-slate-800 font-mono text-[11px]">
        {/* Playback Controls */}
        <div className="flex items-center space-x-1.5 text-slate-300">
          <button className="p-1 hover:text-white rounded">
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
          <div className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 cursor-pointer">
            <span className="font-semibold text-white">10x LEO</span>
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>

        <span className="text-slate-700">|</span>

        {/* Clock & Contact Window */}
        <div className="flex items-center space-x-2">
          <span className="text-white font-bold">
            {(orbital.orbitTimeSec).toFixed(1)}s
          </span>
          <span className="text-[10px] text-slate-400">
            {orbital.isGroundPassActive
              ? `PASS ACTIVE (${orbital.passCountdownSec}s)`
              : `PASS IN ${orbital.passCountdownSec}s`}
          </span>
        </div>

        <span className="text-slate-700">|</span>

        {/* Orbit Progress Indicator */}
        <div className="flex items-center space-x-1 text-[10px] text-slate-400">
          <span>Orb:</span>
          <span className="text-cyan-400 font-bold">
            {Math.round(orbital.orbitFraction * 100)}%
          </span>
        </div>
      </div>

      {/* 3. Right: Action Buttons, Evidence & Analyst Profile */}
      <div className="flex items-center space-x-3">
        {/* Toggle Telemetry Charts Pill */}
        <button
          onClick={onTogglePlots}
          className={`px-3 py-1.5 rounded-full border text-[11px] font-medium flex items-center space-x-1.5 transition ${
            showPlots
              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
              : 'bg-[#0f172a] hover:bg-slate-800 text-slate-300 border-slate-800'
          }`}
        >
          <Radio className="w-3 h-3" />
          <span>Telemetry Charts</span>
        </button>

        {/* Evidence / Hypotheses Button */}
        <button
          onClick={onOpenHypothesesModal}
          className="px-2.5 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-slate-300 rounded-md border border-slate-800 flex items-center space-x-1.5 transition text-[11px]"
          title="Review H1-H8 Scientific Hypotheses & Evidence"
        >
          <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Evidence (H1-H8)</span>
        </button>

        {/* Emergency Brake Button */}
        <button
          onClick={triggerEmergencyBrake}
          className={`px-2.5 py-1.5 rounded-md border flex items-center space-x-1.5 text-[11px] font-bold transition ${
            fdirLayer === 'L0_SAFE_TRIP'
              ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
              : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/60'
          }`}
          title="Layer-0 Hard Emergency Motor Trip"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">L0 Trip</span>
        </button>

        {/* Profile / Flight Director Role Dropdown */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-800/80">
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200">
            FD
          </div>
          <span className="text-[11px] font-medium text-slate-300 hidden xl:inline">
            Flight Director
          </span>
          <ChevronDown className="w-3 h-3 text-slate-500 hidden xl:inline" />
        </div>
      </div>
    </header>
  );
};

