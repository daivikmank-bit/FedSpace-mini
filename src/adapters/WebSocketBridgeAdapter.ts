// src/adapters/WebSocketBridgeAdapter.ts
// WebSocket Bridge Adapter for Python Ingestion Daemon (ws://localhost:8765)

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
import { globalRingBuffers } from '../store/ringBuffers';

export class WebSocketBridgeAdapter implements ITelemetryAdapter {
  private ws: WebSocket | null = null;
  private url: string;

  private orbitalCbs: ((orbit: OrbitalState) => void)[] = [];
  private hkCbs: ((hk: HousekeepingPacket) => void)[] = [];
  private digestCbs: ((digest: HealthDigestPacket) => void)[] = [];
  private fdirCbs: ((evt: FdirEventPacket) => void)[] = [];
  private dspCbs: ((features: DspFeaturesData) => void)[] = [];
  private stageCbs: ((profile: StageEnergyProfile) => void)[] = [];

  constructor(url: string = 'ws://localhost:8765') {
    this.url = url;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log(`Connected to Hardware WebSocket Bridge at ${this.url}`);
          resolve();
        };

        this.ws.onerror = (err) => {
          reject(new Error(`WebSocket connection to ${this.url} failed. Ensure python cobs_daemon.py is running.`));
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleIncomingPayload(data);
          } catch (err) {
            console.error('Failed to parse WebSocket JSON payload', err);
          }
        };

        this.ws.onclose = () => {
          console.log('Hardware WebSocket Bridge disconnected.');
        };
      } catch (err: any) {
        reject(err);
      }
    });
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleIncomingPayload(msg: any): void {
    const { type, payload } = msg;

    if (type === 'HK_PACKET') {
      const hk = payload as HousekeepingPacket;
      globalRingBuffers.timeMs.push(hk.timestampMs);
      globalRingBuffers.rpmKalman.push(hk.rpmKalman);
      globalRingBuffers.rpmOpticalRaw.push(hk.rpmOpticalRaw);
      globalRingBuffers.currentMa.push(hk.currentMa);
      globalRingBuffers.pwmApplied.push(hk.pwmApplied);
      globalRingBuffers.windingTempC.push(hk.windingTempEstC);
      for (const cb of this.hkCbs) cb(hk);
    } else if (type === 'FDIR_EVENT') {
      const evt = payload as FdirEventPacket;
      globalRingBuffers.whitenedScore.push(evt.whitenedScoreEma);
      for (const cb of this.fdirCbs) cb(evt);
    } else if (type === 'STAGE_PROFILE') {
      const stage = payload as StageEnergyProfile;
      for (const cb of this.stageCbs) cb(stage);
    } else if (type === 'ORBITAL_TICK') {
      const orbit = payload as OrbitalState;
      for (const cb of this.orbitalCbs) cb(orbit);
    }
  }

  private sendCommand(cmd: string, args: any = {}): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ cmd, args }));
    }
  }

  // Subscriptions
  public onOrbitalTick(cb: (orbit: OrbitalState) => void): void { this.orbitalCbs.push(cb); }
  public onHousekeeping(cb: (hk: HousekeepingPacket) => void): void { this.hkCbs.push(cb); }
  public onHealthDigest(cb: (digest: HealthDigestPacket) => void): void { this.digestCbs.push(cb); }
  public onFdirEvent(cb: (evt: FdirEventPacket) => void): void { this.fdirCbs.push(cb); }
  public onDspFeatures(cb: (features: DspFeaturesData) => void): void { this.dspCbs.push(cb); }
  public onStageProfile(cb: (profile: StageEnergyProfile) => void): void { this.stageCbs.push(cb); }

  // Actuation Commands
  public async setRpmSetpoint(rpm: number): Promise<void> { this.sendCommand('SET_RPM', { rpm }); }
  public async setBinderClipsF1(clips: BinderClipCount): Promise<void> { this.sendCommand('SET_F1_CLIPS', { clips }); }
  public async setServoFrictionF2(friction: FrictionLevel): Promise<void> { this.sendCommand('SET_F2_FRICTION', { friction }); }
  public async setVirtualHarnessF3(ohms: HarnessFaultOhms): Promise<void> { this.sendCommand('SET_F3_HARNESS', { ohms }); }
  public async setTelemetryPolicy(policy: TelemetryPolicy): Promise<void> { this.sendCommand('SET_POLICY', { policy }); }
  public async setDetectorConfig(detectorId: string, fftSize: 512 | 1024 | 2048, clockMhz: 80 | 160 | 240): Promise<void> {
    this.sendCommand('SET_DETECTOR_CONFIG', { detectorId, fftSize, clockMhz });
  }
  public async triggerEmergencyBrake(): Promise<void> { this.sendCommand('EMERGENCY_BRAKE'); }
  public async resetFdir(): Promise<void> { this.sendCommand('RESET_FDIR'); }
}

