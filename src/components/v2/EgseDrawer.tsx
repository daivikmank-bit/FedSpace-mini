// src/components/v2/EgseDrawer.tsx
// SpaceX-styled EGSE Ground-Truth Fault Actuation Dropdown Drawer

import React from 'react';
import { useStationStore } from '../../store/useStationStore';
import { FrictionLevel, HarnessFaultOhms, BinderClipCount } from '../../types/telemetry';
import { Sliders, Zap, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface EgseDrawerProps {
  onClose: () => void;
}

export const EgseDrawer: React.FC<EgseDrawerProps> = ({ onClose }) => {
  const store = useStationStore();
  const {
    clipsF1,
    frictionF2,
    harnessF3,
    setClipsF1,
    setFrictionF2,
    setHarnessF3,
    hk
  } = store;

  const handleClearAll = () => {
    setClipsF1(0);
    setFrictionF2('NONE');
    setHarnessF3(0.0);
  };

  const isFaultActive = clipsF1 > 0 || frictionF2 !== 'NONE' || harnessF3 > 0;

  return (
    <div className="w-full bg-black/92 backdrop-blur-2xl border-b border-white/20 text-white font-mono p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95)] select-none">
      <div className="max-w-7xl mx-auto flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <span className={`w-2 h-2 rounded-full ${isFaultActive ? 'bg-amber-400 animate-pulse' : 'bg-white'}`} />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
              // 03 EGSE AIR-GAPPED HARDWARE FAULT INJECTION DOCK
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 border ${
              isFaultActive ? 'border-amber-400 bg-amber-950/40 text-amber-300' : 'border-white/20 text-zinc-400'
            }`}>
              {isFaultActive ? 'FAULT ACTIVE ON HARDWARE' : 'NOMINAL BASELINE'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleClearAll}
              className="text-xs uppercase tracking-widest px-3 py-1 bg-white hover:bg-zinc-200 text-black font-bold transition-all border border-white"
            >
              [CLEAR ALL FAULTS ✕]
            </button>
            <button
              onClick={onClose}
              className="text-xs uppercase tracking-widest px-3 py-1 bg-white/5 hover:bg-white text-zinc-400 hover:text-black transition-all border border-white/10"
            >
              [CLOSE ✕]
            </button>
          </div>
        </div>

        {/* 3 Fault Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-xs">
          {/* F1: Mass Imbalance */}
          <div className="bg-zinc-950/80 border border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-bold uppercase tracking-wider text-white">
                F1: MASS IMBALANCE
              </span>
              <span className="text-[10px] text-zinc-500">SNAP-ON CLIPS</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Attaches physical binder clips (0.45g each) to the 65mm tire rim. Drives synchronous 1x radial acceleration phasor (Z₁ₓ - Z₀).
            </p>

            <div className="grid grid-cols-4 gap-2 pt-2">
              {([0, 1, 2, 3] as BinderClipCount[]).map((count) => (
                <button
                  key={count}
                  onClick={() => setClipsF1(count)}
                  className={`py-2 text-xs font-bold uppercase transition border ${
                    clipsF1 === count
                      ? 'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                      : 'bg-black/50 text-zinc-400 border-white/10 hover:border-white/40 hover:text-white'
                  }`}
                >
                  {count === 0 ? '0 (OFF)' : `${count} CLIP`}
                </button>
              ))}
            </div>

            <div className="p-2 border border-white/10 bg-black/40 text-[10px] text-zinc-400 flex justify-between">
              <span>CENTRIFUGAL FORCE:</span>
              <strong className="text-white">
                {(clipsF1 * 0.45 * Math.pow((hk.rpmKalman * 2 * Math.PI) / 60, 2) * 0.0325).toFixed(2)} mN
              </strong>
            </div>
          </div>

          {/* F2: Bearing Friction */}
          <div className="bg-zinc-950/80 border border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-bold uppercase tracking-wider text-white">
                F2: BEARING FRICTION
              </span>
              <span className="text-[10px] text-zinc-500">SG90 SERVO WIPER</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Commands SG90 micro-servo wiper arm to contact tire rubber with progressive friction pressure, causing motor current increase & droop.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {(['NONE', 'L1_10PCT', 'L2_25PCT', 'L3_50PCT'] as FrictionLevel[]).map((level) => {
                const labelMap = {
                  NONE: 'L0: NONE',
                  L1_10PCT: 'L1: +10% ΔI',
                  L2_25PCT: 'L2: +25% ΔI',
                  L3_50PCT: 'L3: +50% STALL'
                };
                return (
                  <button
                    key={level}
                    onClick={() => setFrictionF2(level)}
                    className={`py-2 text-xs font-bold uppercase transition border ${
                      frictionF2 === level
                        ? 'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                        : 'bg-black/50 text-zinc-400 border-white/10 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    {labelMap[level]}
                  </button>
                );
              })}
            </div>

            <div className="p-2 border border-white/10 bg-black/40 text-[10px] text-zinc-400 flex justify-between">
              <span>SERVO WIPER POSITION:</span>
              <strong className="text-white">
                {frictionF2 === 'NONE' ? 'DISENGAGED (1000μs)' : `${frictionF2} ENGAGED`}
              </strong>
            </div>
          </div>

          {/* F3: Virtual Harness Resistance */}
          <div className="bg-zinc-950/80 border border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-bold uppercase tracking-wider text-white">
                F3: VIRTUAL HARNESS DROOP
              </span>
              <span className="text-[10px] text-zinc-500">OHMIC DROP INJECTION</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Triggers virtual series harness resistance on MCU #1, causing DC bus voltage droop and PWM saturation under load.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2">
              {([0.0, 2.2, 4.7] as HarnessFaultOhms[]).map((ohms) => (
                <button
                  key={ohms}
                  onClick={() => setHarnessF3(ohms)}
                  className={`py-2 text-xs font-bold uppercase transition border ${
                    harnessF3 === ohms
                      ? 'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                      : 'bg-black/50 text-zinc-400 border-white/10 hover:border-white/40 hover:text-white'
                  }`}
                >
                  {ohms === 0.0 ? '0.0 Ω' : `${ohms} Ω`}
                </button>
              ))}
            </div>

            <div className="p-2 border border-white/10 bg-black/40 text-[10px] text-zinc-400 flex justify-between">
              <span>ESTIMATED VOLTAGE DROP:</span>
              <strong className="text-white">
                {(harnessF3 * (hk.currentMa / 1000.0)).toFixed(2)} V DROOP
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
