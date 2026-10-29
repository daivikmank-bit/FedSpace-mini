// src/adapters/MockSpacePhysicsAdapter.ts
// In-Browser High-Fidelity Physics & Orbital Worker Adapter ("Simulate Now")

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

export class MockSpacePhysicsAdapter implements ITelemetryAdapter {
  private worker: Worker | null = null;

  private orbitalCbs: ((orbit: OrbitalState) => void)[] = [];
  private hkCbs: ((hk: HousekeepingPacket) => void)[] = [];
  private digestCbs: ((digest: HealthDigestPacket) => void)[] = [];
  private fdirCbs: ((evt: FdirEventPacket) => void)[] = [];
  private dspCbs: ((features: DspFeaturesData) => void)[] = [];
  private stageCbs: ((profile: StageEnergyProfile) => void)[] = [];

  public async connect(): Promise<void> {
    if (this.worker) {
      this.worker.terminate();
    }

    this.worker = new Worker(
      new URL('../workers/physicsAndOrbit.worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (e: MessageEvent) => {
      const { type, payload, repFRecon } = e.data;

      switch (type) {
        case 'HK_PACKET': {
          const hk = payload as HousekeepingPacket;
          globalRingBuffers.timeMs.push(hk.timestampMs);
          globalRingBuffers.rpmKalman.push(hk.rpmKalman);
          globalRingBuffers.rpmOpticalRaw.push(hk.rpmOpticalRaw);
          globalRingBuffers.rpmSetpoint.push(hk.rpmSetpoint);
          globalRingBuffers.currentMa.push(hk.currentMa);
          globalRingBuffers.pwmPi.push(hk.pwmPiCommand);
          globalRingBuffers.pwmApplied.push(hk.pwmApplied);
          globalRingBuffers.windingTempC.push(hk.windingTempEstC);

          for (const cb of this.hkCbs) cb(hk);
          break;
        }

        case 'FDIR_EVENT': {
          const evt = payload as FdirEventPacket;
          globalRingBuffers.whitenedScore.push(evt.whitenedScoreEma);
          globalRingBuffers.thresholdTau.push(evt.thresholdTau);

          for (const cb of this.fdirCbs) cb(evt);
          break;
        }

        case 'HEALTH_DIGEST': {
          const digest = payload as HealthDigestPacket;
          for (const cb of this.digestCbs) cb(digest);
          break;
        }

        case 'DSP_FEATURES': {
          const dsp = payload as DspFeaturesData;
          globalRingBuffers.repF.set(dsp.repF);
          if (repFRecon) globalRingBuffers.repFRecon.set(repFRecon);
          globalRingBuffers.repS.set(dsp.repS);
          globalRingBuffers.z0Phasor = dsp.z0Phasor;
          globalRingBuffers.z1xPhasor = dsp.z1xPhasor;
          globalRingBuffers.zImbalance = dsp.zImbalance;

          for (const cb of this.dspCbs) cb(dsp);
          break;
        }

        case 'STAGE_PROFILE': {
          const stage = payload as StageEnergyProfile;
          for (const cb of this.stageCbs) cb(stage);
          break;
        }

        case 'ORBITAL_TICK': {
          const orbit = payload as OrbitalState;
          for (const cb of this.orbitalCbs) cb(orbit);
          break;
        }
      }
    };
  }

  public disconnect(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  // Subscriptions
  public onOrbitalTick(cb: (orbit: OrbitalState) => void): void {
    this.orbitalCbs.push(cb);
  }

  public onHousekeeping(cb: (hk: HousekeepingPacket) => void): void {
    this.hkCbs.push(cb);
  }

  public onHealthDigest(cb: (digest: HealthDigestPacket) => void): void {
    this.digestCbs.push(cb);
  }

  public onFdirEvent(cb: (evt: FdirEventPacket) => void): void {
    this.fdirCbs.push(cb);
  }

  public onDspFeatures(cb: (features: DspFeaturesData) => void): void {
    this.dspCbs.push(cb);
  }

  public onStageProfile(cb: (profile: StageEnergyProfile) => void): void {
    this.stageCbs.push(cb);
  }

  // Actuation Commands
  public async setRpmSetpoint(rpm: number): Promise<void> {
    this.worker?.postMessage({ command: 'SET_RPM', args: { rpm } });
  }

  public async setBinderClipsF1(clips: BinderClipCount): Promise<void> {
    this.worker?.postMessage({ command: 'SET_F1_CLIPS', args: { clips } });
  }

  public async setServoFrictionF2(friction: FrictionLevel): Promise<void> {
    this.worker?.postMessage({ command: 'SET_F2_FRICTION', args: { friction } });
  }

  public async setVirtualHarnessF3(ohms: HarnessFaultOhms): Promise<void> {
    this.worker?.postMessage({ command: 'SET_F3_HARNESS', args: { ohms } });
  }

  public async setTelemetryPolicy(policy: TelemetryPolicy): Promise<void> {
    this.worker?.postMessage({ command: 'SET_POLICY', args: { policy } });
  }

  public async setDetectorConfig(detectorId: string, fftSize: 512 | 1024 | 2048, clockMhz: 80 | 160 | 240): Promise<void> {
    this.worker?.postMessage({ command: 'SET_DETECTOR_CONFIG', args: { detectorId, fftSize, clockMhz } });
  }

  public async triggerEmergencyBrake(): Promise<void> {
    this.worker?.postMessage({ command: 'EMERGENCY_BRAKE', args: {} });
  }

  public async resetFdir(): Promise<void> {
    this.worker?.postMessage({ command: 'RESET_FDIR', args: {} });
  }
}
