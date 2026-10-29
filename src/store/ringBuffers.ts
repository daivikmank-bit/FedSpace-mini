// src/store/ringBuffers.ts
// Lock-free circular Float32Array ring buffers for zero-allocation 60 FPS Canvas rendering

export class CircularBuffer {
  public data: Float32Array;
  public capacity: number;
  public head: number = 0;
  public count: number = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.data = new Float32Array(capacity);
  }

  public push(value: number): void {
    this.data[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  public toArray(): Float32Array {
    const result = new Float32Array(this.count);
    if (this.count < this.capacity) {
      result.set(this.data.subarray(0, this.count));
    } else {
      const tailCount = this.capacity - this.head;
      result.set(this.data.subarray(this.head, this.capacity), 0);
      result.set(this.data.subarray(0, this.head), tailCount);
    }
    return result;
  }

  public getLatest(n: number): Float32Array {
    const k = Math.min(n, this.count);
    const out = new Float32Array(k);
    for (let i = 0; i < k; i++) {
      let idx = (this.head - 1 - i + this.capacity) % this.capacity;
      out[k - 1 - i] = this.data[idx];
    }
    return out;
  }
}

// Global shared ring buffers for high-rate telemetry traces (10 seconds @ 100 Hz = 1000 samples)
export const globalRingBuffers = {
  timeMs: new CircularBuffer(1000),
  rpmKalman: new CircularBuffer(1000),
  rpmOpticalRaw: new CircularBuffer(1000),
  rpmSetpoint: new CircularBuffer(1000),
  currentMa: new CircularBuffer(1000),
  pwmPi: new CircularBuffer(1000),
  pwmApplied: new CircularBuffer(1000),
  windingTempC: new CircularBuffer(1000),
  whitenedScore: new CircularBuffer(1000),
  thresholdTau: new CircularBuffer(1000),
  
  // Vibration waveform buffers (2048 samples @ 1600 Hz = ~1.28 s)
  vibAx: new CircularBuffer(2048),
  vibAy: new CircularBuffer(2048),

  // Latest spectral frames
  repF: new Float32Array(23),
  repFRecon: new Float32Array(20),
  repS: new Float32Array(131),
  z0Phasor: [0.35, 0.12] as [number, number],
  z1xPhasor: [0.35, 0.12] as [number, number],
  zImbalance: [0, 0] as [number, number],
};

