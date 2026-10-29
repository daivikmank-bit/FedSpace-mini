// src/components/v2/LeftTreeSidebar.tsx
// Subsystems Tree & Energy Balance card inspired by the reference design

import React, { useState } from 'react';
import { useStationStore } from '../../store/useStationStore';
import {
  Satellite,
  Cpu,
  ChevronDown,
  ChevronRight,
  Zap,
  Activity,
  Layers,
  Thermometer,
  ShieldAlert,
  Radio,
  ExternalLink
} from 'lucide-react';

interface LeftTreeSidebarProps {
  activeUnit: string;
  onSelectUnit: (unit: string) => void;
}

export const LeftTreeSidebar: React.FC<LeftTreeSidebarProps> = ({
  activeUnit,
  onSelectUnit
}) => {
  const store = useStationStore();
  const { hk, stage, orbital, fdirLayer } = store;

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'sat-a': true,
    'wheel-assembly': true,
    'sat-b': false
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const isWheelSelected = activeUnit === 'wheel-assembly' || activeUnit === 'tt-motor';

  return (
    <aside className="w-64 xl:w-72 bg-[#090e1a] border-r border-slate-800/80 flex flex-col justify-between select-none shrink-0 h-full overflow-hidden text-xs">
      {/* 1. Header: Subsystem Tree (Ref: "Network  2 feeders / 24 homes") */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
        <span className="font-semibold text-slate-200 tracking-wide text-xs">Subsystems</span>
        <span className="text-[10px] text-slate-400 font-mono">2 nodes / 8 sensors</span>
      </div>

      {/* 2. Scrollable Tree View */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono">
        {/* Node 1: Sat A (DUT Node) */}
        <div>
          <div
            onClick={() => toggleNode('sat-a')}
            className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800/60 cursor-pointer text-slate-300"
          >
            <div className="flex items-center space-x-1.5">
              {expandedNodes['sat-a'] ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="text-slate-400">((o))</span>
              <span className="font-medium text-slate-200">Sat A (DUT Node)</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>

          {expandedNodes['sat-a'] && (
            <div className="pl-4 mt-0.5 space-y-0.5">
              {/* Power & Rail */}
              <div
                onClick={() => onSelectUnit('power-rail')}
                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer text-[11px] ${
                  activeUnit === 'power-rail'
                    ? 'bg-[#162a45] text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>INA219 Rail</span>
                </div>
                <span className="text-[10px] text-slate-400">5.0V • {hk.currentMa}mA</span>
              </div>

              {/* Reaction Wheel Assembly (ACTIVE SELECTION) */}
              <div>
                <div
                  onClick={() => {
                    toggleNode('wheel-assembly');
                    onSelectUnit('wheel-assembly');
                  }}
                  className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-[11px] font-medium transition ${
                    isWheelSelected
                      ? 'bg-[#14233c] text-white border border-blue-500/40 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    {expandedNodes['wheel-assembly'] ? (
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    )}
                    <span className="text-cyan-400">⚡</span>
                    <span>Reaction Wheel</span>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    fdirLayer === 'NOMINAL' ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'
                  }`} />
                </div>

                {/* Sub-items under Reaction Wheel (Ref: Meter 07, Meter 08...) */}
                {expandedNodes['wheel-assembly'] && (
                  <div className="pl-5 space-y-0.5 mt-0.5 text-[10px]">
                    <div
                      onClick={() => onSelectUnit('tt-motor')}
                      className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
                        activeUnit === 'tt-motor'
                          ? 'bg-[#1b2b48] text-cyan-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center space-x-1">
                        <span>⚙</span>
                        <span>TT Gearmotor</span>
                      </span>
                      <span className="text-cyan-400 font-mono font-bold">{hk.rpmKalman.toFixed(0)} RPM</span>
                    </div>

                    <div className="flex items-center justify-between px-2 py-0.5 text-slate-400">
                      <span className="flex items-center space-x-1">
                        <span>⏱</span>
                        <span>LM393 Optical</span>
                      </span>
                      <span className="text-slate-400 font-mono">20 slots (±8%)</span>
                    </div>

                    <div className="flex items-center justify-between px-2 py-0.5 text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Thermometer className="w-2.5 h-2.5 text-amber-400" />
                        <span>Winding Temp</span>
                      </span>
                      <span className="text-amber-300 font-mono">{hk.windingTempEstC.toFixed(1)}°C</span>
                    </div>

                    <div className="flex items-center justify-between px-2 py-0.5 text-slate-400">
                      <span className="flex items-center space-x-1">
                        <span>🪢</span>
                        <span>Virtual R (F3)</span>
                      </span>
                      <span className={`${store.harnessF3 > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                        {store.harnessF3} Ω
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ADXL345 Radial IMU */}
              <div
                onClick={() => onSelectUnit('imu')}
                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer text-[11px] ${
                  activeUnit === 'imu'
                    ? 'bg-[#162a45] text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Activity className="w-3 h-3 text-sky-400" />
                  <span>ADXL345 IMU</span>
                </div>
                <span className="text-[10px] text-slate-400">1.6 kHz SPI</span>
              </div>

              {/* INT8 Edge AI Detector */}
              <div
                onClick={() => onSelectUnit('edge-ai')}
                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer text-[11px] ${
                  activeUnit === 'edge-ai'
                    ? 'bg-[#162a45] text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Cpu className="w-3 h-3 text-purple-400" />
                  <span>INT8 Autoencoder</span>
                </div>
                <span className="text-[10px] text-purple-300 font-mono">{store.detectorId}</span>
              </div>
            </div>
          )}
        </div>

        {/* Node 2: Sat B (ISL Relay Node) */}
        <div>
          <div
            onClick={() => toggleNode('sat-b')}
            className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800/60 cursor-pointer text-slate-300 mt-1"
          >
            <div className="flex items-center space-x-1.5">
              {expandedNodes['sat-b'] ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="text-slate-400">((o))</span>
              <span className="font-medium text-slate-200">Sat B (ISL Relay)</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </div>

          {expandedNodes['sat-b'] && (
            <div className="pl-4 mt-0.5 space-y-0.5 text-[11px]">
              <div className="flex items-center justify-between px-2 py-1 text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Radio className="w-3 h-3 text-cyan-400" />
                  <span>ESP-NOW Link</span>
                </span>
                <span className="text-[10px] text-slate-300">
                  {orbital.satARadioAwake ? 'Awake' : 'Sleep'}
                </span>
              </div>

              <div className="flex items-center justify-between px-2 py-1 text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <span>📦</span>
                  <span>ISL Store Queue</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-bold">
                  {orbital.islQueueDepthPackets} pkts
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Energy Balance Card (Ref: "Energy balance  kWh / 15 min") */}
      <div className="p-3 bg-[#0d1527] border-t border-slate-800/80 flex flex-col space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-200">Energy balance</span>
          <span className="text-[10px] text-slate-400 font-mono">mJ / 1.0s hop</span>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex items-center justify-between text-slate-400">
            <span>Input (Total)</span>
            <span className="text-slate-200 font-bold">{(stage.energyMicroJoules.total / 1000).toFixed(3)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Idle / Acq (00)</span>
            <span className="text-slate-300">{(stage.energyMicroJoules.acq / 1000).toFixed(3)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>DSP FFT (01)</span>
            <span className="text-sky-300">{(stage.energyMicroJoules.dsp / 1000).toFixed(3)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>INT8 NN (10)</span>
            <span className="text-amber-300 font-bold">
              {(stage.energyMicroJoules.nn / 1000).toFixed(3)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Radio TX (11)</span>
            <span className="text-emerald-300">{(stage.energyMicroJoules.radio / 1000).toFixed(3)}</span>
          </div>
        </div>

        {/* Mini Hypothesis Tabs (Ref: "#2 -0.1%  #3 0.0%  #4 0.1%") */}
        <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800 text-[10px] font-mono text-center">
          <div className="bg-[#141e33] py-1 rounded text-slate-300" title="Claim C1: 37x Bandwidth Reduction">
            <span className="text-slate-500 block text-[8px]">#1 C1</span>
            <strong className="text-cyan-400">37.3x</strong>
          </div>
          <div className="bg-[#141e33] py-1 rounded text-slate-300" title="Hypothesis H4: NN Energy < 20%">
            <span className="text-slate-500 block text-[8px]">#2 H4</span>
            <strong className="text-emerald-400">2.1%</strong>
          </div>
          <div className="bg-[#141e33] py-1 rounded text-slate-300" title="Hypothesis H7: Rule of Three False Alarm Rate">
            <span className="text-slate-500 block text-[8px]">#3 H7</span>
            <strong className="text-slate-300">0.0 FA</strong>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer">
          <span>OBC slice budget</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </div>
      </div>
    </aside>
  );
};

