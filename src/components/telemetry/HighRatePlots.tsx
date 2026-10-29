// src/components/telemetry/HighRatePlots.tsx
// Zero-Allocation 60 FPS Canvas Waveforms & Spectral Analyzers

import React, { useEffect, useRef } from 'react';
import { useStationStore } from '../../store/useStationStore';
import { globalRingBuffers } from '../../store/ringBuffers';
import { Activity, BarChart2, Radio } from 'lucide-react';

export const HighRatePlots: React.FC = () => {
  const store = useStationStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeTab = store.activeChartTab;

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      const w = canvas.width = canvas.clientWidth;
      const h = canvas.height = canvas.clientHeight;

      // Dark background
      ctx.fillStyle = '#070d1e';
      ctx.fillRect(0, 0, w, h);

      // Grid Lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let y = 30; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(w - 10, y);
        ctx.stroke();
      }

      if (activeTab === 'control') {
        renderControlTraces(ctx, w, h);
      } else if (activeTab === 'repf') {
        renderRepFReconstruction(ctx, w, h);
      } else if (activeTab === 'reps') {
        renderRepSSpectrum(ctx, w, h);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [activeTab]);

  // Tab 1: Control Loop, Kalman RPM & Virtual Harness Drop
  const renderControlTraces = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const rawRpm = globalRingBuffers.rpmOpticalRaw.getLatest(150);
    const kalmanRpm = globalRingBuffers.rpmKalman.getLatest(150);
    const targetRpm = globalRingBuffers.rpmSetpoint.getLatest(150);
    const pwmPi = globalRingBuffers.pwmPi.getLatest(150);
    const pwmApp = globalRingBuffers.pwmApplied.getLatest(150);
    const count = kalmanRpm.length;
    if (count < 2) return;

    const plotX = 45;
    const plotW = w - plotX - 10;
    const splitY = h * 0.58;

    // Y Axis Labels for Speed (0 - 320 RPM)
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('300 RPM', 2, 25);
    ctx.fillText('150 RPM', 2, splitY / 2);
    ctx.fillText('0 RPM', 8, splitY - 5);

    // 1. Trace Target RPM (Dashed Amber)
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const x = plotX + (i / (count - 1)) * plotW;
      const y = splitY - (targetRpm[i] / 320.0) * (splitY - 30);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Trace Raw Optical RPM (Red dots showing slot width jitter)
    ctx.fillStyle = '#ef4444';
    for (let i = 0; i < count; i += 2) {
      const x = plotX + (i / (count - 1)) * plotW;
      const y = splitY - (rawRpm[i] / 320.0) * (splitY - 30);
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }

    // 3. Trace 1-D Kalman Filter RPM (Smooth Cyan Line)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const x = plotX + (i / (count - 1)) * plotW;
      const y = splitY - (kalmanRpm[i] / 320.0) * (splitY - 30);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Bottom Subplot: PWM_PI vs PWM_applied (Showing F3 Ohmic Drop)
    const subH = h - splitY - 15;
    ctx.fillText('100% PWM', 2, splitY + 20);
    ctx.fillText('0%', 12, h - 10);

    // Divider
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, splitY);
    ctx.lineTo(w - 10, splitY);
    ctx.stroke();

    // PWM PI Command (White line)
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const x = plotX + (i / (count - 1)) * plotW;
      const y = h - 10 - pwmPi[i] * subH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // PWM Applied Duty (Orange line - drops when F3 is active)
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const x = plotX + (i / (count - 1)) * plotW;
      const y = h - 10 - pwmApp[i] * subH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  // Tab 2: Rep F 23 Features (Input Targets vs Autoencoder Reconstruction)
  const renderRepFReconstruction = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const repF = globalRingBuffers.repF;
    const recon = globalRingBuffers.repFRecon;
    const barCount = 20;
    const plotX = 35;
    const plotW = w - plotX - 15;
    const barWidth = (plotW / barCount) - 4;

    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('Target vs INT8 AE Recon (Rep F)', plotX, 18);

    for (let i = 0; i < barCount; i++) {
      const x = plotX + i * (barWidth + 4);
      const valInput = Math.min(2.0, Math.max(0, repF[i]));
      const valRecon = Math.min(2.0, Math.max(0, recon[i]));

      const hInput = (valInput / 2.0) * (h - 60);
      const hRecon = (valRecon / 2.0) * (h - 60);

      // Input Target (Blue)
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x, h - 30 - hInput, barWidth / 2, hInput);

      // INT8 Reconstruction (Amber/Rose if mismatch)
      const diff = Math.abs(valInput - valRecon);
      ctx.fillStyle = diff > 0.15 ? '#f43f5e' : '#fbbf24';
      ctx.fillRect(x + barWidth / 2, h - 30 - hRecon, barWidth / 2, hRecon);

      // Label
      ctx.fillStyle = '#475569';
      ctx.fillText(`${i}`, x + 2, h - 15);
    }
  };

  // Tab 3: Rep S 131 Log-Spaced Order Spectrum (0.25x to 40x orders)
  const renderRepSSpectrum = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const repS = globalRingBuffers.repS;
    const plotX = 35;
    const plotW = w - plotX - 15;
    const barCount = 128;
    const barW = Math.max(1.5, plotW / barCount);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('Rep S: 128 Harmonic Order Bands (0.25x - 40x)', plotX, 18);

    for (let i = 0; i < barCount; i++) {
      const x = plotX + (i / barCount) * plotW;
      const amp = Math.min(1.0, Math.max(0, repS[i]));
      const barH = amp * (h - 55);

      // Highlight 1x and 2x imbalance orders
      const isHarmonic = i === 16 || i === 32;
      ctx.fillStyle = isHarmonic ? '#ff007f' : '#00f0ff';
      ctx.fillRect(x, h - 25 - barH, barW, barH);
    }

    ctx.fillStyle = '#ff007f';
    ctx.fillText('1x Imbalance Spike (Slot 16)', plotX + (16 / 128) * plotW, h - 8);
  };

  return (
    <div className="w-full h-full bg-space-900/90 border border-slate-800 rounded-lg flex flex-col overflow-hidden select-none">
      {/* Top Navigation Tabs & Legend */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-space-950/60 text-xs font-mono">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => store.setActiveChartTab('control')}
            className={`px-2.5 py-1 rounded flex items-center space-x-1.5 transition ${
              activeTab === 'control'
                ? 'bg-space-accent/20 text-space-accent font-bold border border-space-accent/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>SPEED & CONTROL (100Hz)</span>
          </button>

          <button
            onClick={() => store.setActiveChartTab('repf')}
            className={`px-2.5 py-1 rounded flex items-center space-x-1.5 transition ${
              activeTab === 'repf'
                ? 'bg-space-accent/20 text-space-accent font-bold border border-space-accent/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>REP F (23 DIMS)</span>
          </button>

          <button
            onClick={() => store.setActiveChartTab('reps')}
            className={`px-2.5 py-1 rounded flex items-center space-x-1.5 transition ${
              activeTab === 'reps'
                ? 'bg-space-accent/20 text-space-accent font-bold border border-space-accent/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>REP S ORDER SPECTRUM (131)</span>
          </button>
        </div>

        {/* Dynamic Legend */}
        <div className="flex items-center space-x-3 text-[10px] text-slate-400">
          {activeTab === 'control' && (
            <>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
                <span>Kalman RPM</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                <span>Optical Jitter</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#f8fafc]" />
                <span>PWM PI</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#f97316]" />
                <span>PWM Applied (F3)</span>
              </span>
            </>
          )}

          {activeTab === 'repf' && (
            <>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-[#38bdf8]" />
                <span>Input Target x</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-[#fbbf24]" />
                <span>INT8 Recon x̂</span>
              </span>
            </>
          )}

          {activeTab === 'reps' && (
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-[#ff007f]" />
              <span>Harmonic 1x Imbalance</span>
            </span>
          )}
        </div>
      </div>

      {/* 60 FPS Canvas Area */}
      <div className="flex-1 w-full h-full relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
