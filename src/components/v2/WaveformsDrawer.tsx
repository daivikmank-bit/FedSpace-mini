// src/components/v2/WaveformsDrawer.tsx
// SpaceX-styled High-Rate Real-Time Waveforms & Phasors Dropdown Drawer

import React from 'react';
import { useStationStore } from '../../store/useStationStore';
import { HighRatePlots } from '../telemetry/HighRatePlots';
import { Activity, Radio, BarChart2 } from 'lucide-react';

interface WaveformsDrawerProps {
  onClose: () => void;
}

export const WaveformsDrawer: React.FC<WaveformsDrawerProps> = ({ onClose }) => {
  const store = useStationStore();
  const activeTab = store.activeChartTab;

  return (
    <div className="w-full bg-black/94 backdrop-blur-2xl border-b border-white/20 text-white font-mono p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95)] select-none">
      <div className="max-w-7xl mx-auto flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
              // 05 60 FPS ZERO-ALLOCATION TELEMETRY WAVEFORMS
            </h3>
            <span className="text-[10px] text-zinc-400 border border-white/10 px-2 py-0.5">
              1.6 kHz ADXL345 &bull; 100 Hz SPEED &bull; RING BUFFERS ACTIVE
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Chart Channel Switcher Tabs */}
            <div className="flex items-center space-x-1 border border-white/10 p-0.5 bg-black/50 text-xs">
              <button
                onClick={() => store.setActiveChartTab('control')}
                className={`px-3 py-1 text-xs font-bold uppercase transition ${
                  activeTab === 'control'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                SPEED &amp; CURRENT
              </button>
              <button
                onClick={() => store.setActiveChartTab('repf')}
                className={`px-3 py-1 text-xs font-bold uppercase transition ${
                  activeTab === 'repf'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                REP-F AUTOENCODER
              </button>
              <button
                onClick={() => store.setActiveChartTab('reps')}
                className={`px-3 py-1 text-xs font-bold uppercase transition ${
                  activeTab === 'reps'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                1.6 kHz FFT SPECTRUM
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-xs uppercase tracking-widest px-3 py-1 bg-white/5 hover:bg-white text-zinc-400 hover:text-black transition-all border border-white/10"
            >
              [CLOSE ✕]
            </button>
          </div>
        </div>

        {/* 60 FPS High-Rate Canvas Container */}
        <div className="h-72 w-full bg-black/80 border border-white/10 overflow-hidden relative">
          <HighRatePlots />
        </div>
      </div>
    </div>
  );
};
