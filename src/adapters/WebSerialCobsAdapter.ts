// src/adapters/WebSerialCobsAdapter.ts
// Direct Browser WebSerial Hardware Adapter for MCU #2 USB-UART @ 921,600 Baud with Real-Time Diagnostics

import {
  ITelemetryAdapter,
  TelemetryPolicy,
  FrictionLevel,
  HarnessFaultOhms,
  BinderClipCount,
  HousekeepingPacket,
  HealthDigestPacket,
  FdirEventPacket,
  StageEnergyProfile,
  OrbitalState,
  DspFeaturesData
} from '../types/telemetry';
import { CcsdsBinaryParser } from './ccsdsBinaryParser';
import { globalRingBuffers } from '../store/ringBuffers';

export interface HardwareDiagnostics {
  isConnected: boolean;
  portName: string;
  baudRate: number;
  rxBytes: number;
  txBytes: number;
  packetsDecoded: number;
  crcErrors: number;
  droppedBytes: number;
  lastPacketTimestampMs: number;
  recentFrames: { time: string; streamId: string; apid?: string; length: number; crcOk: boolean }[];
}

export class WebSerialCobsAdapter implements ITelemetryAdapter {
  private port: any = null;
  private reader: any = null;
  private keepReading = false;
  private rxBuffer = new Uint8Array(8192);
  private rxHead = 0;
  private baudRate = 921600;

  public diagnostics: HardwareDiagnostics = {
    isConnected: false,
    portName: 'Unknown',
    baudRate: 921600,
    rxBytes: 0,
    txBytes: 0,
    packetsDecoded: 0,
    crcErrors: 0,
    droppedBytes: 0,
    lastPacketTimestampMs: 0,
    recentFrames: []
  };

  private orbitalCbs: ((orbit: OrbitalState) => void)[] = [];
  private hkCbs: ((hk: HousekeepingPacket) => void)[] = [];
  private digestCbs: ((digest: HealthDigestPacket) => void)[] = [];
  private fdirCbs: ((evt: FdirEventPacket) => void)[] = [];
  private dspCbs: ((features: DspFeaturesData) => void)[] = [];
  private stageCbs: ((profile: StageEnergyProfile) => void)[] = [];
  private diagCbs: ((diag: HardwareDiagnostics) => void)[] = [];

  constructor(baudRate: number = 921600) {
    this.baudRate = baudRate;
    this.diagnostics.baudRate = baudRate;
  }

  public async connect(): Promise<void> {
    if (!('serial' in navigator)) {
      throw new Error('WebSerial API is not supported in this browser. Please use Chrome/Edge or the Python WebSocket bridge (ws://localhost:8765).');
    }

    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: this.baudRate });
      this.keepReading = true;
      this.diagnostics.isConnected = true;
      this.diagnostics.portName = 'ESP32 USB-UART (MCU #2)';
      this.notifyDiagnostics();
      this.readSerialLoop();
    } catch (err: any) {
      this.diagnostics.isConnected = false;
      this.notifyDiagnostics();
      throw new Error(`Failed to open serial port: ${err.message}`);
    }
  }

  public disconnect(): void {
    this.keepReading = false;
    this.diagnostics.isConnected = false;
    this.notifyDiagnostics();

    if (this.reader) {
      this.reader.cancel().catch(() => {});
    }
    if (this.port) {
      this.port.close().catch(() => {});
      this.port = null;
    }
  }

  public onDiagnostics(cb: (diag: HardwareDiagnostics) => void): void {
    this.diagCbs.push(cb);
  }

  private notifyDiagnostics(): void {
    for (const cb of this.diagCbs) {
      cb({ ...this.diagnostics });
    }
  }

  private async readSerialLoop(): Promise<void> {
    while (this.port && this.port.readable && this.keepReading) {
      this.reader = this.port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            this.diagnostics.rxBytes += value.length;
            this.handleIncomingBytes(value);
          }
        }
      } catch (err) {
        console.error('Serial read error:', err);
      } finally {
        this.reader.releaseLock();
      }
    }
  }

  private handleIncomingBytes(chunk: Uint8Array): void {
    for (let i = 0; i < chunk.length; i++) {
      const b = chunk[i];
      if (b === 0x00) {
        // Frame boundary found: decode COBS
        if (this.rxHead > 1) {
          const cobsPacket = this.rxBuffer.subarray(0, this.rxHead);
          const decoded = CcsdsBinaryParser.cobsDecode(cobsPacket);
          this.processDecodedFrame(decoded);
        }
        this.rxHead = 0;
      } else {
        if (this.rxHead < this.rxBuffer.length) {
          this.rxBuffer[this.rxHead++] = b;
        } else {
          // Overflow protection
          this.diagnostics.droppedBytes += this.rxHead;
          this.rxHead = 0;
        }
      }
    }
  }

  private processDecodedFrame(frame: Uint8Array): void {
    if (frame.length < 2) return;
    this.diagnostics.packetsDecoded++;
    this.diagnostics.lastPacketTimestampMs = Date.now();

    const streamId = frame[0];
    const payload = frame.subarray(1);
    const nowStr = new Date().toLocaleTimeString();

    if (streamId === 0x01) {
      // Sat A Forwarded CCSDS Packet (Primary Header: APID at bytes 0..1)
      const apid = (payload[0] << 8) | payload[1];
      const apidHex = `0x${apid.toString(16).toUpperCase()}`;

      if (apid === 0x10) {
        // Housekeeping (28 bytes)
        const hk = CcsdsBinaryParser.parseHousekeeping(payload);
        if (hk) {
          globalRingBuffers.timeMs.push(hk.timestampMs);
          globalRingBuffers.rpmKalman.push(hk.rpmKalman);
          globalRingBuffers.rpmOpticalRaw.push(hk.rpmOpticalRaw);
          globalRingBuffers.currentMa.push(hk.currentMa);
          globalRingBuffers.pwmApplied.push(hk.pwmApplied);
          globalRingBuffers.windingTempC.push(hk.windingTempEstC);
          for (const cb of this.hkCbs) cb(hk);
          this.logFrame(nowStr, '0x01 (Sat A)', apidHex, payload.length, true);
        } else {
          this.diagnostics.crcErrors++;
          this.logFrame(nowStr, '0x01 (Sat A)', apidHex, payload.length, false);
        }
      } else if (apid === 0x12) {
        // FDIR Event (26 bytes)
        const evt = CcsdsBinaryParser.parseFdirEvent(payload);
        if (evt) {
          globalRingBuffers.whitenedScore.push(evt.whitenedScoreEma);
          for (const cb of this.fdirCbs) cb(evt);
          this.logFrame(nowStr, '0x01 (Sat A)', apidHex, payload.length, true);
        }
      }
    } else if (streamId === 0x02) {
      // MCU #2 Hardware Stage Profiler Packet
      const stage = CcsdsBinaryParser.parseStageProfiler(payload);
      if (stage) {
        for (const cb of this.stageCbs) cb(stage);
        this.logFrame(nowStr, '0x02 (Profiler)', 'Stage Timer', payload.length, true);
      }
    } else if (streamId === 0x03) {
      // MCU #2 EGSE Ground Truth Injection Log
      this.logFrame(nowStr, '0x03 (EGSE)', 'Fault GT', payload.length, true);
    }

    if (this.diagnostics.packetsDecoded % 10 === 0) {
      this.notifyDiagnostics();
    }
  }

  private logFrame(time: string, streamId: string, apid: string, length: number, crcOk: boolean): void {
    this.diagnostics.recentFrames.unshift({ time, streamId, apid, length, crcOk });
    if (this.diagnostics.recentFrames.length > 8) {
      this.diagnostics.recentFrames.pop();
    }
  }

  private async sendCommandPacket(cmdByte: number, paramVal: number): Promise<void> {
    if (!this.port || !this.port.writable) return;
    const raw = new Uint8Array([0x80, cmdByte, paramVal & 0xff, (paramVal >> 8) & 0xff]);
    const encoded = CcsdsBinaryParser.cobsEncode(raw);
    const framed = new Uint8Array(encoded.length + 1);
    framed.set(encoded);
    framed[encoded.length] = 0x00;

    const writer = this.port.writable.getWriter();
    await writer.write(framed);
    writer.releaseLock();
    this.diagnostics.txBytes += framed.length;
    this.notifyDiagnostics();
  }

  // Subscriptions
  public onOrbitalTick(cb: (orbit: OrbitalState) => void): void { this.orbitalCbs.push(cb); }
  public onHousekeeping(cb: (hk: HousekeepingPacket) => void): void { this.hkCbs.push(cb); }
  public onHealthDigest(cb: (digest: HealthDigestPacket) => void): void { this.digestCbs.push(cb); }
  public onFdirEvent(cb: (evt: FdirEventPacket) => void): void { this.fdirCbs.push(cb); }
  public onDspFeatures(cb: (features: DspFeaturesData) => void): void { this.dspCbs.push(cb); }
  public onStageProfile(cb: (profile: StageEnergyProfile) => void): void { this.stageCbs.push(cb); }

  // Actuation Commands
  public async setRpmSetpoint(rpm: number): Promise<void> { await this.sendCommandPacket(0x01, rpm); }
  public async setBinderClipsF1(clips: BinderClipCount): Promise<void> { await this.sendCommandPacket(0x02, clips); }
  public async setServoFrictionF2(friction: FrictionLevel): Promise<void> {
    const val = friction === 'NONE' ? 0 : friction === 'L1_10PCT' ? 1 : friction === 'L2_25PCT' ? 2 : 3;
    await this.sendCommandPacket(0x03, val);
  }
  public async setVirtualHarnessF3(ohms: HarnessFaultOhms): Promise<void> {
    const val = ohms === 0 ? 0 : ohms === 2.2 ? 22 : 47;
    await this.sendCommandPacket(0x04, val);
  }
  public async setTelemetryPolicy(policy: TelemetryPolicy): Promise<void> {
    const pVal = policy === 'P0_RAW' ? 0 : policy === 'P1_1HZ_HK' ? 1 : policy === 'P2_EDGE_FDIR' ? 2 : 3;
    await this.sendCommandPacket(0x05, pVal);
  }
  public async setDetectorConfig(detectorId: string, fftSize: 512 | 1024 | 2048, clockMhz: 80 | 160 | 240): Promise<void> {
    await this.sendCommandPacket(0x06, (fftSize & 0x0fff) | ((clockMhz === 80 ? 0 : clockMhz === 160 ? 1 : 2) << 12));
  }
  public async triggerEmergencyBrake(): Promise<void> { await this.sendCommandPacket(0x0F, 0); }
  public async resetFdir(): Promise<void> { await this.sendCommandPacket(0x0E, 0); }
}
