// src/adapters/WebSerialCobsAdapter.ts
// Direct Browser WebSerial Hardware Adapter for MCU #2 USB-UART @ 921,600 Baud ("Plug Later")

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

export class WebSerialCobsAdapter implements ITelemetryAdapter {
  private port: any = null;
  private reader: any = null;
  private keepReading = false;
  private rxBuffer = new Uint8Array(4096);
  private rxHead = 0;

  private orbitalCbs: ((orbit: OrbitalState) => void)[] = [];
  private hkCbs: ((hk: HousekeepingPacket) => void)[] = [];
  private digestCbs: ((digest: HealthDigestPacket) => void)[] = [];
  private fdirCbs: ((evt: FdirEventPacket) => void)[] = [];
  private dspCbs: ((features: DspFeaturesData) => void)[] = [];
  private stageCbs: ((profile: StageEnergyProfile) => void)[] = [];

  public async connect(): Promise<void> {
    if (!('serial' in navigator)) {
      throw new Error('WebSerial API is not supported in this browser. Please use Chrome/Edge or the FastAPI WebSocket bridge.');
    }

    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: 921600 });
      this.keepReading = true;
      this.readSerialLoop();
    } catch (err: any) {
      throw new Error(`Failed to open serial port: ${err.message}`);
    }
  }

  public disconnect(): void {
    this.keepReading = false;
    if (this.reader) {
      this.reader.cancel().catch(() => {});
    }
    if (this.port) {
      this.port.close().catch(() => {});
      this.port = null;
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
          this.rxHead = 0;
        }
      }
    }
  }

  private processDecodedFrame(frame: Uint8Array): void {
    if (frame.length < 2) return;
    const streamId = frame[0];
    const payload = frame.subarray(1);

    if (streamId === 0x01) {
      // Sat A Forwarded CCSDS Packet
      const apid = (payload[0] << 8) | payload[1];
      if (apid === 0x10) {
        const hk = CcsdsBinaryParser.parseHousekeeping(payload);
        if (hk) {
          globalRingBuffers.timeMs.push(hk.timestampMs);
          globalRingBuffers.rpmKalman.push(hk.rpmKalman);
          globalRingBuffers.rpmOpticalRaw.push(hk.rpmOpticalRaw);
          globalRingBuffers.currentMa.push(hk.currentMa);
          globalRingBuffers.pwmApplied.push(hk.pwmApplied);
          globalRingBuffers.windingTempC.push(hk.windingTempEstC);
          for (const cb of this.hkCbs) cb(hk);
        }
      } else if (apid === 0x12) {
        const evt = CcsdsBinaryParser.parseFdirEvent(payload);
        if (evt) {
          globalRingBuffers.whitenedScore.push(evt.whitenedScoreEma);
          for (const cb of this.fdirCbs) cb(evt);
        }
      }
    } else if (streamId === 0x02) {
      // MCU #2 Stage Profiler Packet
      const stage = CcsdsBinaryParser.parseStageProfiler(payload);
      if (stage) {
        for (const cb of this.stageCbs) cb(stage);
      }
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

