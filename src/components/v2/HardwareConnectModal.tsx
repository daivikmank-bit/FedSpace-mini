// src/components/v2/HardwareConnectModal.tsx
// Comprehensive Hardware Integration Cockpit, Serial Diagnostics & Pinout Guide

import React, { useState, useEffect } from 'react';
import { useStationStore, stationStore } from '../../store/useStationStore';
import { WebSerialCobsAdapter, HardwareDiagnostics } from '../../adapters/WebSerialCobsAdapter';
import { WebSocketBridgeAdapter } from '../../adapters/WebSocketBridgeAdapter';
import {
  Usb,
  X,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Cpu,
  RefreshCw,
  Terminal,
  Activity,
  Zap,
  Sliders,
  ExternalLink
} from 'lucide-react';

interface HardwareConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HardwareConnectModal: React.FC<HardwareConnectModalProps> = ({
  isOpen,
  onClose
}) => {
  const store = useStationStore();
  const { connectionMode, isConnected } = store;

  const [activeTab, setActiveTab] = useState<'connect' | 'diagnostics' | 'wiring'>('connect');
  const [selectedBaud, setSelectedBaud] = useState<number>(921600);
  const [wsUrl, setWsUrl] = useState<string>('ws://localhost:8765');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const [diagnostics, setDiagnostics] = useState<HardwareDiagnostics>({
    isConnected: false,
    portName: 'None',
    baudRate: 921600,
    rxBytes: 0,
    txBytes: 0,
    packetsDecoded: 0,
    crcErrors: 0,
    droppedBytes: 0,
    lastPacketTimestampMs: 0,
    recentFrames: []
  });

  // Connect via Direct WebSerial
  const handleConnectWebSerial = async () => {
    setIsConnecting(true);
    setStatusMessage('Requesting WebSerial USB port from browser...');

    try {
      if (store.adapter) {
        store.adapter.disconnect();
      }

      const serial = new WebSerialCobsAdapter(selectedBaud);
      serial.onDiagnostics((diag) => setDiagnostics(diag));

      await serial.connect();
      serial.onHousekeeping((hk) => stationStore.updateHk(hk));
      serial.onFdirEvent((evt) => stationStore.updateFdir(evt));
      serial.onStageProfile((stg) => stationStore.updateStage(stg));
      serial.onOrbitalTick((orb) => stationStore.updateOrbital(orb));

      stationStore.setAdapter(serial, true);
      stationStore.setConnectionMode('WEBSERIAL_COBS');
      setStatusMessage('Connected successfully via WebSerial @ 921,600 baud!');
    } catch (err: any) {
      setStatusMessage(`WebSerial Error: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Connect via Python WebSocket Bridge
  const handleConnectWebSocket = async () => {
    setIsConnecting(true);
    setStatusMessage(`Connecting to Python WebSocket Bridge at ${wsUrl}...`);

    try {
      if (store.adapter) {
        store.adapter.disconnect();
      }

      const wsAdapter = new WebSocketBridgeAdapter(wsUrl);
      await wsAdapter.connect();

      wsAdapter.onHousekeeping((hk) => stationStore.updateHk(hk));
      wsAdapter.onFdirEvent((evt) => stationStore.updateFdir(evt));
      wsAdapter.onStageProfile((stg) => stationStore.updateStage(stg));
      wsAdapter.onOrbitalTick((orb) => stationStore.updateOrbital(orb));

      stationStore.setAdapter(wsAdapter, true);
      stationStore.setConnectionMode('FASTAPI_WS');
      setStatusMessage(`Connected to Python bridge at ${wsUrl}!`);
    } catch (err: any) {
      setStatusMessage(`WebSocket Bridge Error: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect & Return to Simulator
  const handleDisconnect = async () => {
    if (store.adapter) {
      store.adapter.disconnect();
    }
    const evt = new CustomEvent('switch-adapter', { detail: 'MOCK_SIMULATOR' });
    window.dispatchEvent(evt);
    setStatusMessage('Switched to internal flight physics simulator.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-[#0b1325] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#0e1930] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Usb className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
                <span>Hardware Connection Manager</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                  isConnected && connectionMode !== 'MOCK_SIMULATOR'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                }`}>
                  {connectionMode === 'MOCK_SIMULATOR' ? 'SIMULATION MODE' : 'LIVE HARDWARE LINK'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Single-USB COBS Serial Interface (921,600 Baud) • Dual-ESP32
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pt-2 bg-[#0c162b] border-b border-slate-800 flex items-center space-x-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('connect')}
            className={`px-3 py-2 border-b-2 font-medium transition ${
              activeTab === 'connect'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Connection Setup
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3 py-2 border-b-2 font-medium transition flex items-center space-x-1.5 ${
              activeTab === 'diagnostics'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Packet Diagnostics</span>
          </button>

          <button
            onClick={() => setActiveTab('wiring')}
            className={`px-3 py-2 border-b-2 font-medium transition flex items-center space-x-1.5 ${
              activeTab === 'wiring'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Pinout & Wiring Guide</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono flex-1">
          {activeTab === 'connect' && (
            <div className="space-y-4">
              {/* Option A: Direct WebSerial */}
              <div className="bg-[#080d1a] border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span className="font-bold text-slate-200 text-sm font-sans">
                      Option A: Direct Browser WebSerial (Chrome / Edge)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    Recommended • Zero Setup
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  Direct hardware access over Chrome/Edge WebSerial API. Connects to MCU #2 (EGSE + ISL Relay) at 921,600 baud with hardware COBS framing and CRC-16 validation.
                </p>

                <div className="flex items-center space-x-3 pt-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-400">Baud Rate:</span>
                    <select
                      value={selectedBaud}
                      onChange={(e) => setSelectedBaud(Number(e.target.value))}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none"
                    >
                      <option value="921600">921,600 (Nominal PRD)</option>
                      <option value="460800">460,800</option>
                      <option value="115200">115,200</option>
                    </select>
                  </div>

                  <button
                    onClick={handleConnectWebSerial}
                    disabled={isConnecting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg flex items-center space-x-2 transition disabled:opacity-50"
                  >
                    <Usb className="w-4 h-4" />
                    <span>{isConnecting ? 'Connecting...' : 'Connect USB Hardware'}</span>
                  </button>
                </div>
              </div>

              {/* Option B: Python WebSocket Bridge */}
              <div className="bg-[#080d1a] border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    <span className="font-bold text-slate-200 text-sm font-sans">
                      Option B: Python Serial Daemon (`cobs_daemon.py`)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    Firefox / Safari / Linux
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  For browsers without WebSerial or headless setups. Run the included Python daemon to ingest the serial stream, write Parquet logs, and bridge over WebSocket:
                </p>

                <div className="bg-[#040711] p-2.5 rounded border border-slate-800 text-cyan-300 text-[11px]">
                  <code>python3 base_station/ingestion/cobs_daemon.py --port /dev/ttyUSB0 --baud 921600</code>
                </div>

                <div className="flex items-center space-x-3 pt-1">
                  <input
                    type="text"
                    value={wsUrl}
                    onChange={(e) => setWsUrl(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 w-52 focus:outline-none"
                    placeholder="ws://localhost:8765"
                  />

                  <button
                    onClick={handleConnectWebSocket}
                    disabled={isConnecting}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg shadow-lg flex items-center space-x-2 transition disabled:opacity-50"
                  >
                    <Radio className="w-4 h-4" />
                    <span>Connect WebSocket Bridge</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {statusMessage && (
                <div className="p-3 bg-[#0d172e] rounded-lg border border-slate-700/80 text-cyan-300 text-xs flex items-center justify-between">
                  <span>{statusMessage}</span>
                  {isConnected && connectionMode !== 'MOCK_SIMULATOR' && (
                    <button
                      onClick={handleDisconnect}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              {/* Live Metric Counters */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-[#080d1a] border border-slate-800 p-2.5 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">RX BYTES</span>
                  <strong className="text-sm text-cyan-400 font-mono">
                    {(diagnostics.rxBytes / 1024).toFixed(1)} kB
                  </strong>
                </div>

                <div className="bg-[#080d1a] border border-slate-800 p-2.5 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">PACKETS DECODED</span>
                  <strong className="text-sm text-emerald-400 font-mono">
                    {diagnostics.packetsDecoded}
                  </strong>
                </div>

                <div className="bg-[#080d1a] border border-slate-800 p-2.5 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">CRC ERRORS</span>
                  <strong className={`text-sm font-mono ${
                    diagnostics.crcErrors > 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {diagnostics.crcErrors}
                  </strong>
                </div>

                <div className="bg-[#080d1a] border border-slate-800 p-2.5 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">BAUD RATE</span>
                  <strong className="text-sm text-slate-200 font-mono">
                    {diagnostics.baudRate}
                  </strong>
                </div>
              </div>

              {/* Live Frame Traffic Log */}
              <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px]">
                  <span className="text-slate-300 font-bold">Live Incoming CCSDS / COBS Frames</span>
                  <span className="text-slate-500 text-[10px]">Auto-Refreshed</span>
                </div>

                {diagnostics.recentFrames.length > 0 ? (
                  <div className="space-y-1">
                    {diagnostics.recentFrames.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-800/40">
                        <span className="text-slate-500">{f.time}</span>
                        <span className="text-cyan-300 font-bold">{f.streamId}</span>
                        <span className="text-slate-300">{f.apid || '-'}</span>
                        <span className="text-slate-400">{f.length} B</span>
                        <span className={`text-[10px] font-bold ${f.crcOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {f.crcOk ? 'CRC OK' : 'CRC FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No hardware frames received yet. Connect USB hardware or start the Python bridge.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'wiring' && (
            <div className="space-y-4">
              <div className="bg-[#080d1a] border border-slate-800 p-3 rounded-lg">
                <span className="text-slate-200 font-bold text-sm block mb-1 font-sans">
                  Dual-ESP32 Hardware Interconnect Pinout (PRD Spec)
                </span>
                <p className="text-[11px] text-slate-400 leading-normal font-sans">
                  The architecture uses two ESP32s: MCU #1 (Sat A - DUT) for real-time control, sensing, and Edge AI, and MCU #2 (EGSE + ISL Relay) for air-gapped fault injection and profiling.
                </p>
              </div>

              {/* Pinout Table */}
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#0e172e] border-b border-slate-800 text-slate-300">
                      <th className="p-2">Signal / Function</th>
                      <th className="p-2">MCU #1 (Sat A DUT)</th>
                      <th className="p-2">MCU #2 (EGSE & ISL)</th>
                      <th className="p-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="p-2 font-bold text-cyan-300">Stage Profiler Bus</td>
                      <td className="p-2">GPIO 16 / 17 (Output)</td>
                      <td className="p-2">GPIO 32 / 33 (Edge ISR)</td>
                      <td className="p-2 text-slate-400">1μs state codes: 00, 01, 10, 11</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-emerald-300">1Hz PPS Time Sync</td>
                      <td className="p-2">GPIO 35 (Input ISR)</td>
                      <td className="p-2">GPIO 27 (1Hz Timer Pulse)</td>
                      <td className="p-2 text-slate-400">Sub-ms timeline alignment</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-amber-300">F3 Virtual Harness</td>
                      <td className="p-2">GPIO 33 (Input)</td>
                      <td className="p-2">GPIO 26 (Output)</td>
                      <td className="p-2 text-slate-400">Zero-leakage ohmic fault trigger</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-purple-300">SG90 Servo Friction (F2)</td>
                      <td className="p-2">None (Air-Gapped)</td>
                      <td className="p-2">GPIO 25 (50Hz PWM)</td>
                      <td className="p-2 text-slate-400">Wiper arm touches tire for L1..L3</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-200">ADXL345 Radial IMU</td>
                      <td className="p-2">SPI (MOSI 23, MISO 19, SCK 18, CS 5, INT 34)</td>
                      <td className="p-2">-</td>
                      <td className="p-2 text-slate-400">1.6 kHz FIFO burst read</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-200">INA219 Current / Voltage</td>
                      <td className="p-2">I2C (SDA 21, SCL 22 @ 400kHz)</td>
                      <td className="p-2">-</td>
                      <td className="p-2 text-slate-400">500 Hz oversampled current I(t)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-200">LM393 20-Slot Optical</td>
                      <td className="p-2">GPIO 32 (PCNT Hardware Timer)</td>
                      <td className="p-2">-</td>
                      <td className="p-2 text-slate-400">Inter-pulse period captures</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-white">Laptop Ground Host</td>
                      <td className="p-2">Air-gapped (ESP-NOW)</td>
                      <td className="p-2">USB-UART @ 921,600 Baud</td>
                      <td className="p-2 text-slate-400">Single USB COBS multiplexed link</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0e1930] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0 font-mono">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <span>Link: {connectionMode.replace('_', ' ')}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium text-xs transition font-sans"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

