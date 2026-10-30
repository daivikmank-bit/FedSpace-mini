// src/components/v2/SubsystemsDrawer.tsx
// SpaceX-styled Subsystems & Sensor Telemetry Dropdown Drawer

import React, { useState } from 'react';
import { useStationStore } from '../../store/useStationStore';
import { ChevronRight, ChevronDown, Cpu, Satellite, Radio, Zap, Activity } from 'lucide-react';

interface SubsystemsDrawerProps {
  onClose: () => void;
}

export const SubsystemsDrawer: React.FC<SubsystemsDrawerProps> = ({ onClose }) => {
  const store = useStationStore();
  const { hk, fdirLayer } = store;

  const [selectedNode, setSelectedNode] = useState<string>('wheel-assembly');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'sat-a': true,
    'wheel-assembly': true,
    'sat-b': false
  });

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full bg-black/92 backdrop-blur-2xl border-b border-white/20 text-white font-mono p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95)] select-none">
      <div className="max-w-7xl mx-auto flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
              // 01 SUBSYSTEM HIERARCHY & SENSOR TELEMETRY
            </h3>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest border border-white/10 px-2 py-0.5">
              2 NODES // 8 SENSORS ONLINE
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-xs uppercase tracking-widest px-3 py-1 bg-white/5 hover:bg-white text-zinc-400 hover:text-black transition-all border border-white/10"
          >
            [CLOSE ✕]
          </button>
        </div>

        {/* Content Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
          {/* Left Column: Subsystem Tree (5 cols) */}
          <div className="md:col-span-5 bg-zinc-950/80 border border-white/10 p-4 space-y-2 text-xs">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-2">
              CONSTELLATION NODES & BUS ASSETS
            </span>

            {/* Sat A Node */}
            <div className="space-y-1">
              <div
                onClick={() => toggleNode('sat-a')}
                className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 cursor-pointer border border-transparent hover:border-white/20 transition"
              >
                <div className="flex items-center space-x-2">
                  {expandedNodes['sat-a'] ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                  <Satellite className="w-3.5 h-3.5 text-white" />
                  <span className="font-bold tracking-wider text-white">SAT A (DUT CUBESAT)</span>
                </div>
                <span className="text-[10px] text-zinc-400">LEO 520KM</span>
              </div>

              {expandedNodes['sat-a'] && (
                <div className="pl-6 space-y-1 border-l border-white/10 ml-3">
                  {/* Wheel Assembly */}
                  <div
                    onClick={() => setSelectedNode('wheel-assembly')}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${
                      selectedNode === 'wheel-assembly' ? 'bg-white text-black font-bold' : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    <span>RW-01 REACTION WHEEL</span>
                    <span className="text-[10px]">{hk.rpmKalman.toFixed(0)} RPM</span>
                  </div>

                  {/* LM393 Optical Sensor */}
                  <div
                    onClick={() => setSelectedNode('lm393')}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${
                      selectedNode === 'lm393' ? 'bg-white text-black font-bold' : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    <span>LM393 OPTICAL PCNT (GPIO 32)</span>
                    <span className="text-[10px]">{((hk.rpmKalman * 20) / 60).toFixed(0)} HZ</span>
                  </div>

                  {/* ADXL345 SPI IMU */}
                  <div
                    onClick={() => setSelectedNode('adxl345')}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${
                      selectedNode === 'adxl345' ? 'bg-white text-black font-bold' : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    <span>ADXL345 SPI FIFO (1.6 kHz)</span>
                    <span className="text-[10px]">RADIAL AX/AY</span>
                  </div>

                  {/* INA219 Current / Voltage */}
                  <div
                    onClick={() => setSelectedNode('ina219')}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${
                      selectedNode === 'ina219' ? 'bg-white text-black font-bold' : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    <span>INA219 I2C BUS MONITOR</span>
                    <span className="text-[10px]">{hk.currentMa.toFixed(0)} mA</span>
                  </div>
                </div>
              )}
            </div>

            {/* Sat B Node */}
            <div className="space-y-1 pt-2">
              <div
                onClick={() => toggleNode('sat-b')}
                className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 cursor-pointer border border-transparent hover:border-white/20 transition"
              >
                <div className="flex items-center space-x-2">
                  {expandedNodes['sat-b'] ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                  <Radio className="w-3.5 h-3.5 text-zinc-300" />
                  <span className="font-bold tracking-wider text-white">SAT B (ISL RELAY NODE)</span>
                </div>
                <span className="text-[10px] text-zinc-400">HIGH-GAIN</span>
              </div>

              {expandedNodes['sat-b'] && (
                <div className="pl-6 space-y-1 border-l border-white/10 ml-3">
                  <div
                    onClick={() => setSelectedNode('isl-terminal')}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${
                      selectedNode === 'isl-terminal' ? 'bg-white text-black font-bold' : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    <span>OPTICAL LASER TRANSCEIVER</span>
                    <span className="text-[10px]">100 MBPS</span>
                  </div>
                  <div
                    onClick={() => setSelectedNode('egse-bridge')}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${
                      selectedNode === 'egse-bridge' ? 'bg-white text-black font-bold' : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    <span>USB-UART EGSE LINK</span>
                    <span className="text-[10px]">921.6K BAUD</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Telemetry Gauge Inspector (7 cols) */}
          <div className="md:col-span-7 bg-zinc-950/80 border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs uppercase tracking-widest text-zinc-400">
                ACTIVE TELEMETRY CHANNEL // <strong className="text-white">{selectedNode.toUpperCase()}</strong>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                fdirLayer === 'NOMINAL' ? 'border-white/30 text-white' : 'border-red-500 bg-red-950/50 text-red-400 animate-pulse'
              }`}>
                STATUS: {fdirLayer}
              </span>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-black/60 border border-white/10 p-3">
                <span className="text-[10px] uppercase text-zinc-500 block mb-1">ROTOR KALMAN</span>
                <span className="text-lg font-bold text-white tracking-wider">{hk.rpmKalman.toFixed(1)}</span>
                <span className="text-[10px] text-zinc-500 block">RPM</span>
              </div>

              <div className="bg-black/60 border border-white/10 p-3">
                <span className="text-[10px] uppercase text-zinc-500 block mb-1">TARGET SETPOINT</span>
                <span className="text-lg font-bold text-zinc-300 tracking-wider">{hk.rpmSetpoint.toFixed(0)}</span>
                <span className="text-[10px] text-zinc-500 block">RPM (PI CLOSED)</span>
              </div>

              <div className="bg-black/60 border border-white/10 p-3">
                <span className="text-[10px] uppercase text-zinc-500 block mb-1">CURRENT DRAW</span>
                <span className="text-lg font-bold text-white tracking-wider">{hk.currentMa.toFixed(1)}</span>
                <span className="text-[10px] text-zinc-500 block">mA DC</span>
              </div>

              <div className="bg-black/60 border border-white/10 p-3">
                <span className="text-[10px] uppercase text-zinc-500 block mb-1">WINDING TEMP</span>
                <span className="text-lg font-bold text-white tracking-wider">{hk.windingTempEstC.toFixed(1)}</span>
                <span className="text-[10px] text-zinc-500 block">°C (THERMAL ODE)</span>
              </div>
            </div>

            {/* Secondary Specifications */}
            <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
              <div className="p-2 border border-white/10 bg-black/40">
                <span className="text-[10px] text-zinc-500 block">BUS VOLTAGE</span>
                <strong className="text-white font-bold">{(hk.busVoltageV * 1000).toFixed(0)} mV</strong>
              </div>
              <div className="p-2 border border-white/10 bg-black/40">
                <span className="text-[10px] text-zinc-500 block">PWM DUTY</span>
                <strong className="text-white font-bold">{(hk.pwmApplied * 100).toFixed(1)}%</strong>
              </div>
              <div className="p-2 border border-white/10 bg-black/40">
                <span className="text-[10px] text-zinc-500 block">OPTICAL RAW SLOTS</span>
                <strong className="text-white font-bold">{hk.pcntRaw} TICKS</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
