// src/components/v2/Center3DView.tsx
// Central Hero 3D Viewport with Satellite Big in the Middle and Spinning Wheel Small on a Side

import React, { useState } from 'react';
import { useStationStore } from '../../store/useStationStore';
import { SpaceConstellationCanvas } from '../space3d/SpaceConstellationCanvas';
import { ReactionWheelCutaway } from '../space3d/ReactionWheelCutaway';
import { HighRatePlots } from '../telemetry/HighRatePlots';
import {
  RotateCcw,
  Play,
  Pause,
  Compass,
  Maximize2,
  Minimize2,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Layers,
  Activity
} from 'lucide-react';

interface Center3DViewProps {
  showPlots: boolean;
  onTogglePlots: () => void;
}

export const Center3DView: React.FC<Center3DViewProps> = ({
  showPlots,
  onTogglePlots
}) => {
  const store = useStationStore();
  const { hk, fdirLayer, activeFault, orbital, clipsF1 } = store;

  const [sceneMotion, setSceneMotion] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  
  // Floating Reaction Wheel PiP state: 'compact' | 'expanded' | 'minimized'
  const [wheelPipState, setWheelPipState] = useState<'compact' | 'expanded' | 'minimized'>('compact');

  const isAlarm = fdirLayer !== 'NOMINAL';
  const residualE1x = (store.hk.currentMa > 100 || clipsF1 > 0 ? 0.084 : 0.002);

  return (
    <div className="relative flex-1 h-full bg-[#070c18] overflow-hidden flex flex-col select-none">
      {/* 1. Top Floating Status Banner (Ref: Vidyut Drishti Header Banner) */}
      {!bannerDismissed && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2 bg-[#0c1529]/90 backdrop-blur-md border border-slate-700/70 px-3.5 py-1.5 rounded-lg shadow-xl text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-slate-200">
            <span className={`w-2 h-2 rounded-full ${isAlarm ? 'bg-rose-500 animate-ping' : 'bg-cyan-400'}`} />
            <span className="font-bold">Sat A (DUT CubeSat)</span>
          </div>

          <span className="text-slate-600">|</span>

          <div className="text-slate-300">
            Residual: <strong className={isAlarm ? 'text-rose-400' : 'text-slate-100'}>{residualE1x.toFixed(3)}</strong>{' '}
            <span className="text-slate-500">({isAlarm ? '+420%' : '0.1%'})</span>
          </div>

          <div className={`px-2 py-0.5 rounded text-[11px] flex items-center space-x-1 ${
            isAlarm
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          }`}>
            <Check className="w-3 h-3" />
            <span>{isAlarm ? `Anomaly: ${activeFault}` : 'Baseline ready.'}</span>
            <button
              onClick={() => setBannerDismissed(true)}
              className="ml-1 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Floating 3D Scene Controls (Top Left) */}
      <div className="absolute top-3 left-4 z-20 flex items-center space-x-2 font-mono text-[11px]">
        {/* Scene Motion Toggle */}
        <button
          onClick={() => setSceneMotion(!sceneMotion)}
          className={`px-3 py-1.5 rounded-lg border backdrop-blur-md shadow-lg flex items-center space-x-1.5 transition ${
            sceneMotion
              ? 'bg-[#0d1629]/90 border-slate-700/60 text-slate-200'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
        >
          {sceneMotion ? <Pause className="w-3 h-3 text-cyan-400" /> : <Play className="w-3 h-3" />}
          <span>{sceneMotion ? 'Scene motion on' : 'Paused'}</span>
        </button>

        {/* Orbit Tour POV */}
        <button
          onClick={() => {
            // Trigger custom camera event
            const btn = document.querySelector('button[title="Camera Mode"]');
            if (btn) (btn as HTMLElement).click();
          }}
          className="px-3 py-1.5 rounded-lg border border-slate-700/60 bg-[#0d1629]/90 hover:bg-slate-800 backdrop-blur-md text-slate-200 shadow-lg flex items-center space-x-1.5 transition"
        >
          <Compass className="w-3 h-3 text-amber-400" />
          <span>Tour POV</span>
        </button>
      </div>

      {/* 3. HERO VIEWPORT: SATELLITE BIG IN THE MIDDLE */}
      <div className="flex-1 w-full h-full relative">
        {/* Space Constellation & Hero Satellite Canvas Fills Entire Area */}
        <SpaceConstellationCanvas />

        {/* Floating 3D Callout Pins right over Satellite in 3D scene */}
        <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className={`px-3 py-1.5 rounded-lg backdrop-blur-md border shadow-2xl flex flex-col font-mono text-xs transition-all ${
            isAlarm
              ? 'bg-rose-950/85 border-rose-500 text-rose-200 animate-bounce'
              : 'bg-[#0b1426]/85 border-slate-700/80 text-slate-200'
          }`}>
            <div className="flex items-center space-x-1.5 font-bold">
              <span className={`w-2 h-2 rounded-full ${isAlarm ? 'bg-rose-500' : 'bg-emerald-400'}`} />
              <span>Sat A (DUT CubeSat)</span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
              <span>{isAlarm ? `⚠ ${activeFault}` : '✓ Attitude & Wheel Nominal'}</span>
            </div>
          </div>
        </div>

        {/* Floating Pin B: Sat B Relay */}
        <div className="absolute top-[32%] left-[26%] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="px-3 py-1.5 rounded-lg bg-[#0b1426]/85 backdrop-blur-md border border-slate-700/80 shadow-2xl flex flex-col font-mono text-xs text-slate-200">
            <div className="flex items-center space-x-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Sat B (ISL Relay)</span>
            </div>
            <div className="text-[10px] text-cyan-400 font-bold flex items-center space-x-1 mt-0.5">
              <span>{orbital.isGroundPassActive ? 'DOWNLINK ACTIVE' : 'ORBIT • STANDBY'}</span>
            </div>
          </div>
        </div>

        {/* 4. COMPACT SPINNING WHEEL ON A SIDE (Picture-in-Picture Digital Twin Window) */}
        {wheelPipState !== 'minimized' ? (
          <div
            className={`absolute z-20 transition-all duration-300 shadow-2xl rounded-xl border border-slate-700/80 bg-[#091122]/95 backdrop-blur-md flex flex-col overflow-hidden ${
              wheelPipState === 'expanded'
                ? 'bottom-16 right-4 w-96 h-72'
                : 'bottom-14 right-4 w-72 h-52'
            }`}
          >
            {/* PiP Header */}
            <div className="h-8 bg-[#0d172e] border-b border-slate-800 px-3 flex items-center justify-between text-xs font-mono shrink-0">
              <div className="flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  isAlarm ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'
                }`} />
                <span className="font-bold text-slate-200 text-[11px] truncate">
                  Wheel Twin
                </span>
                <span className="text-cyan-400 text-[10px] font-bold">
                  {hk.rpmKalman.toFixed(0)} RPM
                </span>
              </div>

              {/* PiP Controls: Maximize/Minimize */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setWheelPipState(wheelPipState === 'expanded' ? 'compact' : 'expanded')}
                  className="p-1 hover:text-white text-slate-400 rounded transition"
                  title={wheelPipState === 'expanded' ? 'Compact' : 'Expand'}
                >
                  {wheelPipState === 'expanded' ? (
                    <Minimize2 className="w-3 h-3" />
                  ) : (
                    <Maximize2 className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={() => setWheelPipState('minimized')}
                  className="p-1 hover:text-white text-slate-400 rounded transition"
                  title="Minimize Twin"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* PiP 3D Reaction Wheel Cutaway Content */}
            <div className="flex-1 w-full h-full relative">
              <ReactionWheelCutaway />
            </div>
          </div>
        ) : (
          /* Minimized Floating Pill Button on the Side */
          <button
            onClick={() => setWheelPipState('compact')}
            className="absolute bottom-14 right-4 z-20 px-3 py-1.5 bg-[#0b1426]/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 shadow-xl flex items-center space-x-2 transition"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Reaction Wheel Twin</span>
            <span className="text-cyan-300 font-bold">({hk.rpmKalman.toFixed(0)} RPM)</span>
            <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>
        )}
      </div>

      {/* 5. Bottom Legend (Left) */}
      <div className="absolute bottom-3 left-4 z-20 flex items-center space-x-4 bg-[#0a101f]/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono">
        <span className="flex items-center space-x-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Subsystem</span>
        </span>
        <span className="flex items-center space-x-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Selected</span>
        </span>
        <span className="flex items-center space-x-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Alert</span>
        </span>
      </div>

      {/* 6. Bottom Right Controls */}
      <div className="absolute bottom-3 right-4 z-20 flex items-center space-x-1.5">
        <button
          onClick={onTogglePlots}
          className={`h-8 px-2.5 rounded-lg border text-[11px] font-mono flex items-center space-x-1.5 transition ${
            showPlots ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#0a101f]/80 border-slate-800 text-slate-300'
          }`}
          title="Toggle Bottom Waveform Telemetry Plots"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Telemetry Charts</span>
          {showPlots ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
      </div>

      {/* 7. Collapsible High-Rate Telemetry Charts Drawer */}
      {showPlots && (
        <div className="h-56 w-full border-t border-slate-800/90 z-20 shrink-0 bg-[#070d1e] shadow-2xl">
          <HighRatePlots />
        </div>
      )}
    </div>
  );
};
