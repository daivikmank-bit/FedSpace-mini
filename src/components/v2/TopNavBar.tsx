// src/components/v2/TopNavBar.tsx
// SpaceX-styled Mission Control Top Navigation Bar with Feature Dropdown Triggers

import React, { useState } from 'react';
import { useStationStore } from '../../store/useStationStore';
import { TelemetryPolicy } from '../../types/telemetry';
import { CameraPreset } from '../space3d/SpaceConstellationCanvas';
import {
  Satellite,
  ChevronDown,
  ShieldAlert,
  Usb,
  Radio,
  Play,
  RotateCcw,
  Check,
  Camera
} from 'lucide-react';

export type ActiveDrawer = 'subsystems' | 'fdir' | 'egse' | 'energy' | 'waveforms' | null;

interface TopNavBarProps {
  activeDrawer: ActiveDrawer;
  onToggleDrawer: (drawer: ActiveDrawer) => void;
  onOpenHypothesesModal: () => void;
  onOpenHardwareModal: () => void;
  cameraPreset: CameraPreset;
  onCameraPresetChange: (preset: CameraPreset) => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeDrawer,
  onToggleDrawer,
  onOpenHypothesesModal,
  onOpenHardwareModal,
  cameraPreset,
  onCameraPresetChange
}) => {
  const store = useStationStore();
  const { orbital, telemetryPolicy, connectionMode, fdirLayer, triggerEmergencyBrake, isConnected } = store;

  const [isCameraDropdownOpen, setIsCameraDropdownOpen] = useState(false);
  const [isPolicyDropdownOpen, setIsPolicyDropdownOpen] = useState(false);

  const isSim = connectionMode === 'MOCK_SIMULATOR';
  const isAlarm = fdirLayer !== 'NOMINAL';

  const cameraPresetLabels: Record<CameraPreset, string> = {
    HERO_CHASE: 'HERO POV (SAT A)',
    EARTH_HORIZON: 'ORBITAL CONSTELLATION',
    GROUND_TRACK: 'CAPE CANAVERAL PASS',
    WHEEL_INSPECT: 'RW-01 MACRO INSPECT'
  };

  // Convert orbital time into mission clock T+ format (HH:MM:SS)
  const totalSec = Math.floor(orbital.orbitTimeSec);
  const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const secs = String(totalSec % 60).padStart(2, '0');
  const missionClock = `T+ ${hrs}:${mins}:${secs}`;

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-black/85 backdrop-blur-xl border-b border-white/10 px-5 flex items-center justify-between text-white font-mono uppercase tracking-[0.15em] text-xs select-none z-40">
      {/* 1. Left: Brand & Camera Switcher */}
      <div className="flex items-center space-x-4">
        {/* Brand */}
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 bg-white text-black font-bold flex items-center justify-center text-xs tracking-tighter">
            FS
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs tracking-[0.2em] text-white leading-none">
              FEDSPACE // MINI
            </span>
            <span className="text-[9px] text-zinc-500 tracking-widest mt-0.5">
              MISSION CONTROL &bull; LEO
            </span>
          </div>
        </div>

        <span className="text-zinc-800">|</span>

        {/* Camera Preset Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsCameraDropdownOpen(!isCameraDropdownOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 hover:text-white transition"
          >
            <Camera className="w-3 h-3 text-zinc-400" />
            <span className="font-bold">{cameraPresetLabels[cameraPreset]}</span>
            <ChevronDown className="w-3 h-3 text-zinc-500 ml-0.5" />
          </button>

          {isCameraDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-black/95 backdrop-blur-2xl border border-white/20 shadow-2xl p-1 z-50 text-[11px]">
              {(['HERO_CHASE', 'EARTH_HORIZON', 'GROUND_TRACK', 'WHEEL_INSPECT'] as CameraPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    onCameraPresetChange(preset);
                    setIsCameraDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 font-bold transition flex items-center justify-between ${
                    cameraPreset === preset
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{cameraPresetLabels[preset]}</span>
                  {cameraPreset === preset && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Center: Feature Dropdown Buttons (The Core Requirement) */}
      <nav className="hidden lg:flex items-center space-x-1">
        <button
          onClick={() => onToggleDrawer(activeDrawer === 'subsystems' ? null : 'subsystems')}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition border ${
            activeDrawer === 'subsystems'
              ? 'bg-white text-black border-white shadow-lg'
              : 'bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'
          }`}
        >
          01 SUBSYSTEMS ▾
        </button>

        <button
          onClick={() => onToggleDrawer(activeDrawer === 'fdir' ? null : 'fdir')}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition border ${
            activeDrawer === 'fdir'
              ? 'bg-white text-black border-white shadow-lg'
              : isAlarm
              ? 'bg-red-950/40 text-red-400 border-red-500/50 animate-pulse'
              : 'bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'
          }`}
        >
          02 FDIR DIAGNOSTICS ▾
        </button>

        <button
          onClick={() => onToggleDrawer(activeDrawer === 'egse' ? null : 'egse')}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition border ${
            activeDrawer === 'egse'
              ? 'bg-white text-black border-white shadow-lg'
              : store.clipsF1 > 0 || store.frictionF2 !== 'NONE' || store.harnessF3 > 0
              ? 'bg-amber-950/40 text-amber-300 border-amber-500/50'
              : 'bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'
          }`}
        >
          03 EGSE FAULT DOCK ▾
        </button>

        <button
          onClick={() => onToggleDrawer(activeDrawer === 'energy' ? null : 'energy')}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition border ${
            activeDrawer === 'energy'
              ? 'bg-white text-black border-white shadow-lg'
              : 'bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'
          }`}
        >
          04 ENERGY CLOSURE ▾
        </button>

        <button
          onClick={() => onToggleDrawer(activeDrawer === 'waveforms' ? null : 'waveforms')}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition border ${
            activeDrawer === 'waveforms'
              ? 'bg-white text-black border-white shadow-lg'
              : 'bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'
          }`}
        >
          05 WAVEFORMS (1.6 kHz) ▾
        </button>

        <button
          onClick={onOpenHypothesesModal}
          className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"
        >
          06 EVIDENCE (H1-H8) ↗
        </button>
      </nav>

      {/* 3. Right: Mission Clock, Telemetry Policy & Emergency L0 */}
      <div className="flex items-center space-x-3">
        {/* Mission Clock */}
        <div className="bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-bold text-white tracking-widest">
          {missionClock}
        </div>

        {/* Telemetry Policy Dropdown */}
        <div className="relative hidden xl:block">
          <button
            onClick={() => setIsPolicyDropdownOpen(!isPolicyDropdownOpen)}
            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 hover:text-white transition flex items-center space-x-1"
          >
            <span>POL: {telemetryPolicy}</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>

          {isPolicyDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 w-44 bg-black/95 backdrop-blur-2xl border border-white/20 shadow-2xl p-1 z-50 text-[11px]">
              {(['P0_RAW', 'P1_1HZ_HK', 'P2_EDGE_FDIR', 'P3_ISL_RELAY'] as TelemetryPolicy[]).map((pol) => (
                <button
                  key={pol}
                  onClick={() => {
                    store.setTelemetryPolicy(pol);
                    setIsPolicyDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 font-bold transition flex items-center justify-between ${
                    telemetryPolicy === pol
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{pol}</span>
                  {telemetryPolicy === pol && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* L0 Emergency Trip Button */}
        <button
          onClick={triggerEmergencyBrake}
          className={`px-3 py-1 font-bold text-xs uppercase tracking-widest transition border ${
            fdirLayer === 'L0_SAFE_TRIP'
              ? 'bg-red-600 text-white border-red-500 animate-pulse'
              : 'bg-black text-red-400 border-red-800/80 hover:bg-red-950/50 hover:border-red-500'
          }`}
          title="Layer-0 Hard Emergency Motor Trip"
        >
          L0 TRIP
        </button>

        {/* Connect Hardware Button */}
        <button
          onClick={onOpenHardwareModal}
          className={`px-3 py-1 font-bold text-xs uppercase tracking-widest transition flex items-center space-x-1.5 ${
            !isSim && isConnected
              ? 'bg-emerald-500 text-black border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
              : 'bg-white text-black hover:bg-zinc-200 border border-white'
          }`}
        >
          <Usb className="w-3 h-3" />
          <span>{!isSim && isConnected ? 'USB LINKED' : 'HARDWARE'}</span>
        </button>
      </div>
    </header>
  );
};
