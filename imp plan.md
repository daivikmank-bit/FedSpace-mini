# FedSpace-Mini v2-School: Base Station Web Application & 3D Space Simulation Implementation Plan

* **Document ID:** FSM-WEB-PLAN-v2S-01
* **Scope:** Browser-Based 3D Space Constellation Simulator, Reaction Wheel Digital Twin, Real-Time FDIR Telemetry Dashboard, and Plug-and-Play Hardware Abstraction Layer (HAL).
* **Core Design Mandate:** **"Simulate Now, Plug Hardware Later"** — The web application operates immediately using an in-browser physics and orbital mechanics Web Worker, and switches seamlessly at runtime to live ESP32 USB-Serial COBS streams with zero UI or 3D scene refactoring.

---

## 1. System Architecture & "Plug-Later" Hardware Abstraction

To decouple the 3D space visualization and high-rate telemetry charts from the physical ESP32 hardware during early development, the frontend consumes all data through a unified **`ITelemetryAdapter`** interface.

```text
+---------------------------------------------------------------------------------------+
|                    FEDSPACE-MINI BASE STATION WEB APP (React + Three.js)              |
|                                                                                       |
|  +---------------------------------------+   +-------------------------------------+  |
|  |     3D SPACE & DIGITAL TWIN VIEW      |   |   REAL-TIME MISSION CONTROL HUD     |  |
|  | - 3D Earth, Starfield & 10x LEO Orbit |   | - L0-L3 FDIR & 3-of-5 Persistence   |  |
|  | - Sat A (DUT) & Sat B (ISL Relay)     |   | - Top-4 Residual Explainability     |  |
|  | - Live ESP-NOW & Ground Pass Beams    |   | - 131-Bin Order Spectrum (uPlot)    |  |
|  | - PiP Cutaway: TT Wheel, Clips, SG90  |   | - Stage 00..11 Energy Profiler (uJ) |  |
|  +-------------------+-------------------+   +------------------+------------------+  |
|                      |                                          |                     |
|                      +--------------------+---------------------+                     |
|                                           |                                           |
|                      +--------------------v---------------------+                     |
|                      |  Lock-Free Float32 RingBuffers & Zustand |                     |
|                      +--------------------+---------------------+                     |
|                                           |                                           |
|                      +--------------------v---------------------+                     |
|                      |    ITelemetryAdapter (Unified Contract)  |                     |
|                      +-----+------------------------------+-----+                     |
+----------------------------|------------------------------|---------------------------+
                             | (Runtime Hot-Swap Switch)    |
          +------------------+---+                      +---+------------------+
          | MODE 1: SIMULATE NOW |                      | MODE 2: PLUG LATER   |
+---------v----------------------+----+            +----v----------------------+--------+
| Browser Physics & Orbit Web Worker  |            | Hardware COBS Bridge (USB Serial)  |
| - 10x LEO Orbit Propagator          |            | - Option A: Direct WebSerial API   |
| - 100Hz PI Loop + Kalman Speed      |            | - Option B: FastAPI + pyserial WS  |
| - Synthesizes F1, F2, F3 & Thermal  |            | - Unpacks CCSDS 0x10..0x13 + CRC16 |
+-------------------------------------+            +------------------------------------+
```

---

## 2. Recommended Technology Stack

| Subsystem Layer | Technology Choice | Justification for Space Simulation & High-Rate Telemetry |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + TypeScript + Vite** | Strict byte-level typing for CCSDS packet structures (`0x10`–`0x13`) and instant HMR. |
| **3D Space Engine** | **Three.js + React Three Fiber (`@react-three/fiber`) + `@react-three/drei`** | Declarative 3D scene graph for Earth orbital mechanics, CubeSat attitude, and internal reaction wheel kinematics at $60\text{ FPS}$. |
| **3D Shaders & FX** | **`@react-three/postprocessing` + Custom GLSL** | Atmospheric Fresnel glow around Earth, selective bloom for ESP-NOW radio packet bursts, and thermal heat-map shaders on the motor casing. |
| **High-Rate Plotting** | **`uPlot` (Canvas 2D) / `WebGL-Plot`** | Renders $1.6\text{ kHz}$ vibration waveforms, $500\text{ Hz}$ current traces, and $128\text{-bin}$ order spectra at $60\text{ FPS}$ without React virtual-DOM overhead. |
| **State & Data Bus** | **`Zustand` + Shared `Float32Array` Ring Buffers** | `Zustand` holds low-rate UI state (active policy $P_0..P_3$, FDIR alarms); mutable ring buffers feed Three.js `useFrame` loops and `uPlot` canvases directly. |
| **Hardware Bridge** | **WebSerial API** *or* **Python FastAPI + `pyserial` + `cobs`** | Decodes the $921,600\text{ baud}$ `0x00`-delimited COBS stream from MCU #2 into structured JSON/Binary frames. |

---

## 3. 3D Space & Digital Twin Simulation Specification

The 3D workspace features a **Dual-Viewport Layout** (Main Orbital Space Canvas + Interactive Picture-in-Picture / Split Cutaway View) so operators can simultaneously monitor macro satellite constellation behavior and micro reaction wheel physics.

### 3.1 Viewport A: Macro 3D Space & Orbital Constellation Simulation
1. **3D Earth, Starfield & Ground Station Cone:**
   * Renders a textured 3D Earth with a custom atmospheric scattering rim shader, dynamic day/night terminator lighting, and a deep-space starfield skybox.
   * Places a 3D Ground Station beacon on Earth's surface projecting a translucent green **Line-of-Sight (LoS) Visibility Cone** into Low Earth Orbit (LEO).
2. **$10\times$ Scaled LEO Orbital Mechanics (Policy $P_3$):**
   * Propagates two 3D CubeSat models along an inclined LEO trajectory:
     * **Sat A (MCU #1 — DUT):** Houses the reaction wheel attitude control payload and on-board INT8 Edge AI detector.
     * **Sat B (MCU #2 — EGSE + ISL Relay):** Trails Sat A in the same orbital plane to act as the Inter-Satellite Link (ISL) store-and-forward relay node.
   * Implements the PRD's **$10\times$ scaled LEO pass timing**: one complete orbit takes $9.6\text{ minutes}$, with a **$48\text{-second}$ Ground Station contact pass window** occurring every orbit.
3. **3D Telemetry & Radio Power Visualizer (Policies $P_0, P_1, P_2, P_3$):**
   * **Sat A $\leftrightarrow$ Sat B ESP-NOW Link:**
     * **$P_0$ (Raw $\sim 11.8\text{ kB/s}$) & $P_1$ ($1\text{ Hz}$ HK $28\text{ B/s}$):** Emits a continuous stream of cyan packet particles between Sat A and Sat B. Sat A's 3D antenna aura remains continuously lit amber, visually demonstrating why $P_1$ saves bandwidth ($400\times$ fewer bytes) but fails to save radio idle power.
     * **$P_2$ (Edge FDIR $\sim 0.75\text{ B/s}$):** Sat A's antenna aura powers down (visualizing `esp_wifi_stop()` sleep). Every $60\text{ s}$, the radio wakes briefly to fire a single green `APID 0x11` ($40\text{ B}$ Health Digest) pulse. If an anomaly is detected, Sat A immediately fires a high-priority crimson `APID 0x12` ($26\text{ B}$ FDIR Event) pulse.
   * **Sat B $\leftrightarrow$ Ground Downlink ($P_3$ Store-and-Forward):**
     * While outside the Ground Station visibility cone, Sat B accumulates a floating 3D holographic queue counter of received $P_2$ packets.
     * The moment Sat B enters the $48\text{-second}$ Ground Station cone, a high-speed downlink beam locks onto the Ground Station and flushes the priority queue (Events $\rightarrow$ Digests $\rightarrow$ HK).
4. **3D Spacecraft Attitude Perturbation:**
   * When a severe reaction wheel fault occurs ($F_1$ imbalance or $L_0$ emergency brake trip), Sat A's 3D CubeSat body visibly experiences attitude jitter or momentum transfer until Layer-3 ($L_3$) recovery stabilizes the wheel.

### 3.2 Viewport B: Micro 3D Reaction Wheel & Fault Injection Cutaway Twin
An interactive 3D engineering cutaway of the physical school-level testbed inside Sat A:
1. **Yellow TT Gearmotor, $65\text{ mm}$ Wheel & $20\text{-Slot}$ Optical Disc:**
   * Rotates at the exact real-time angular velocity $\omega(t) = \frac{2\pi \cdot \text{RPM}_{\text{Kalman}}}{60}\text{ rad/s}$ inside Three.js `useFrame`.
   * The $20\text{-slot}$ encoder disc passes through a 3D **LM393 IR Optical Sensor** U-slot, flashing an LED indicator at pulse frequency $f_{\text{slot}} = \frac{20 \cdot \text{RPM}}{60}\text{ Hz}$.
2. **3D Synchronous $1\times$ Phasor Vectors ($Z_0$ vs. $Z_{1\times}$):**
   * Renders two 3D vectors rotating synchronously with the wheel shaft:
     * **Translucent White Vector ($Z_0$):** The learned baseline plastic wheel runout vector subtracted in software.
     * **Neon Magenta Vector ($Z_{1\times} - Z_0$):** The live phasor-subtracted centrifugal imbalance vector, whose length scales directly with residual $1\times$ energy.
3. **Interactive 3D Fault Twins ($F_1, F_2, F_3$) & Thermal Shader:**
   * **$F_1$ (Static Rotor Imbalance):** Clicking $1, 2,\text{ or }3$ binder clips snaps 3D metallic binder clips onto the outer rubber tire of the $65\text{ mm}$ wheel. The motor body (mounted on a 3D double-sided foam-tape spring base) exhibits physical radial oscillation proportional to $m \cdot r \cdot \omega^2$.
   * **$F_2$ (Graded Bearing Friction):** Renders the **SG90 Micro Servo** and its cardboard/eraser wiper arm beside the wheel. Commanding $L_1 (+10\%\ \Delta I)$, $L_2 (+25\%\ \Delta I)$, or $L_3 (+50\%\ \Delta I)$ rotates the 3D servo horn to press against the spinning tire with a glowing friction contact shader.
   * **$F_3$ (Software-Synthesized Harness Fault):** Renders the power wires linking the L298N/TB6612 driver and INA219/226 sensor to the motor. Activating $R_{\text{virtual}} \in \{2.2\ \Omega, 4.7\ \Omega\}$ turns the harness glowing orange with a floating 3D label displaying live ohmic drop:

$$
V_{\text{drop}}(t) = I_{\text{measured}}(t) \cdot R_{\text{virtual}}
$$

   * **Lumped Thermal Observer Shader:** The motor casing material interpolates from nominal blue ($25^\circ\text{C}$) to critical red ($60^\circ\text{C}$ $L_0$ trip limit) based on the $1\text{ Hz}$ thermal ODE state $\hat{T}(t)$.

---

## 4. Unified Data Contract (`ITelemetryAdapter.ts`)

Both the in-browser mock worker and the live hardware serial bridge implement this exact TypeScript contract:

```typescript
// src/types/telemetry.ts

export type TelemetryPolicy = 'P0_RAW' | 'P1_1HZ_HK' | 'P2_EDGE_FDIR' | 'P3_ISL_RELAY';
export type FaultClass = 'NORMAL' | 'F1_IMBALANCE' | 'F2_FRICTION' | 'F3_HARNESS' | 'SENSOR_FAULT';
export type FdirLayerState = 'NOMINAL' | 'L0_SAFE_TRIP' | 'L1_ALARM' | 'L2_ISOLATED' | 'L3_RECOVERED';

// Orbital & Link State for 3D Space View
export interface OrbitalState {
  orbitTimeSec: number;           // 576s (9.6 min) full period (10x LEO)
  satALatLonAlt: [number, number, number];
  satBLatLonAlt: [number, number, number];
  isGroundPassActive: boolean;    // True during 48s contact window every 9.6 min
  passCountdownSec: number;       // Seconds until next pass or pass end
  islQueueDepthPackets: number;   // Buffered packets on Sat B (MCU #2) in P3 mode
  satARadioAwake: boolean;        // Always true in P0/P1; pulsed in P2/P3
}

// Matches CCSDS APID 0x10 (28 Bytes Packed HK)
export interface HousekeepingPacket {
  apid: 0x10;
  timestampMs: number;            // PPS-aligned millisecond counter
  rpmKalman: number;              // 1-D Kalman Filter + 1x FFT fused RPM
  rpmOpticalRaw: number;          // Unfiltered 20-slot LM393 RPM (shows jitter)
  rpmSetpoint: number;            // Context 1: Target speed command
  timeSinceCmdSec: number;        // Context 3: Time since setpoint change (<= 60s)
  currentMa: number;              // 500 Hz INA219/226 motor current I(t)
  busVoltageV: number;            // Motor supply rail V_bus
  pwmPiCommand: number;           // Controller output PWM_PI before virtual drop
  pwmApplied: number;             // Actual LEDC duty: PWM_PI - (I * R_virt / V_bus)
  windingTempEstC: number;        // Context 2: Lumped thermal observer T_hat(t)
}

// Matches CCSDS APID 0x12 (26 Bytes Packed FDIR Event)
export interface FdirEventPacket {
  apid: 0x12;
  seqCount: number;
  timestampMs: number;
  fdirState: FdirLayerState;
  isolatedFault: FaultClass;
  whitenedScoreEma: number;       // EMA-smoothed whitened score S_t (beta = 0.7)
  thresholdTau: number;           // Calibrated N-val threshold tau
  persistenceWindow: boolean[];   // Last 5 hops (triggers at k = 3 of n = 5)
  rpmAtEvent: number;
  top4FeatureIndices: [number, number, number, number];
  top4QuantResiduals: [number, number, number, number]; // Signed INT8 residuals
  crc16Valid: boolean;
}

// Matches MCU #2 Hardware-Timer Stage Profiler (Pins 32/33 -> Sat A Pins 16/17)
export interface StageEnergyProfile {
  hopId: number;
  detectorId: string;             // e.g., 'B0', 'B1', 'B2', 'M-F-16', 'M-S-KD-32'
  clockMhz: 80 | 160 | 240;
  fftSize: 512 | 1024 | 2048;
  durationsUs: {
    stage00_IdleAcq: number;
    stage01_DspFft: number;
    stage10_Int8Nn: number;
    stage11_RadioTx: number;
  };
  energyMicroJoules: {
    acq: number;
    dsp: number;
    nn: number;
    radio: number;
  };
}

export interface ITelemetryAdapter {
  connect(mode: 'MOCK_SIMULATOR' | 'WEBSERIAL_COBS' | 'FASTAPI_WS', endpoint?: string): Promise<void>;
  disconnect(): void;

  // Subscriptions
  onOrbitalTick(cb: (orbit: OrbitalState) => void): void;
  onHousekeeping(cb: (hk: HousekeepingPacket) => void): void;
  onFdirEvent(cb: (evt: FdirEventPacket) => void): void;
  onDspFeatures(cb: (repF: Float32Array, repS: Float32Array, z0: [number, number], z1x: [number, number]) => void): void;
  onStageProfile(cb: (profile: StageEnergyProfile) => void): void;

  // Bi-Directional EGSE & Fleet Commands
  setRpmSetpoint(rpm: number): Promise<void>;
  setBinderClipsF1(clips: 0 | 1 | 2 | 3): Promise<void>;
  setServoFrictionF2(level: 'NONE' | 'L1_10PCT' | 'L2_25PCT' | 'L3_50PCT'): Promise<void>;
  setVirtualHarnessF3(ohms: 0 | 2.2 | 4.7): Promise<void>;
  setTelemetryPolicy(policy: TelemetryPolicy): Promise<void>;
  setDetectorConfig(detectorId: string, fftSize: 512 | 1024 | 2048, clockMhz: 80 | 160 | 240): Promise<void>;
}
```

---

## 5. Real-Time Data Monitoring & Mission Control UI Modules

Surrounding the 3D Space and Cutaway viewports are five specialized engineering panels:

1. **Four-Layer FDIR Status Banner & Persistence Register:**
   * Displays real-time status across **L0** (Hard safety trips: $I > 0.7\text{ A}$ in $<140\ \mu\text{s}$, $\vert\Delta\omega\vert > 30\%$, $\hat{T} > 60^\circ\text{C}$), **L1** (INT8 Conditional Autoencoder score $\tilde{S}_t$ vs. $\tau$ with a visual $5\text{-slot}$ LED shift register lighting up on $3\text{-of-}5$ persistence), **L2** (Fault isolation centroid on $(\Delta\text{PWM}, \Delta I, \Delta E_{1\times})$), and **L3** (Active autonomous recovery: $30\%$ speed derating on $F_1$, speed hold on $F_2$, or PWM cap on $F_3$).
2. **Edge Explainability Unpacker (`APID 0x12`):**
   * Decodes the $8\text{-byte}$ explainability field (`top-idx[4]` and `top-res[4]`) from every $26\text{-byte}$ FDIR event packet and renders a live horizontal bar chart showing the exact top 4 features driving the anomaly score (e.g., `Idx 0: Phasor-Subtracted 1x Energy`, `Idx 18: Closed-Loop PWM Duty`).
3. **High-Rate DSP & Order Spectrum Analyzer (`uPlot`):**
   * **Tab 1 (Time-Domain Control & Virtual Drop):** Plots $100\text{ Hz}$ Kalman RPM vs. noisy optical RPM, $500\text{ Hz}$ current $I(t)$, and $\text{PWM}_{\text{PI}}$ vs. $\text{PWM}_{\text{applied}}$ (revealing the software-synthesized $F_3$ voltage drop).
   * **Tab 2 (Rep F — $23$ Features):** Compares the $20$ normalized input targets $x_i$ against the INT8 autoencoder reconstruction $\hat{x}_i$, alongside the $3$ non-reconstructed context channels ($\omega_{\text{ref}}, \hat{T}, \Delta t_{\text{cmd}}$).
   * **Tab 3 (Rep S — $131$ Order Spectrum):** Renders the $128$ log-spaced harmonic order bins ($0.25\times\text{ to }40\times$ across radial axes $X$ and $Y$).
4. **Claims C1–C3 & Stage-Resolved Energy Scorecard:**
   * **C1 (Detectability vs. Bandwidth):** Tracks cumulative bytes transmitted and average node power ($\text{mW}$) across $P_0, P_1, P_2$, highlighting the $\sim 37\times$ byte reduction over $1\text{ Hz}$ HK and $\ge 25\%$ node power savings from Wi-Fi sleep cycling.
   * **C2 (Stage Energy Partitioning):** Stacked bar chart of microsecond duration and microjoules ($\mu\text{J}$) across GPIO stages `00` (Idle/Acq), `01` (DSP), `10` (INT8 NN), and `11` (Radio), verifying Hypothesis **H4** (NN incremental energy $< 20\%$ of $\text{Acq} + \text{DSP} + \text{NN}$).
   * **C3 (OBC Slice Compliance):** Gauges for Flash ($\le 32\text{ KB}$), RAM ($\le 48\text{ KB}$), and hop execution time ($\le 50\text{ ms}$ at $80\text{ MHz}$).
5. **Interactive EGSE Fault & Fleet Command Dock:**
   * Bottom control bar allowing one-click injection of $F_1$ ($0..3$ binder clips), $F_2$ ($L_1..L_3$ SG90 wiper friction), and $F_3$ ($0, 2.2\ \Omega, 4.7\ \Omega$ virtual resistance), RPM setpoint sliders, telemetry policy toggles ($P_0..P_3$), and a runtime data source selector (`[Simulated Space & Physics Twin]` $\leftrightarrow$ `[Live USB Hardware COBS]`).

---

## 6. Project Repository Structure

```text
fedspace-base-station-web/
├── public/
│   └── textures/                     # Earth albedo, normal, cloud & night-lights maps
├── src/
│   ├── adapters/                     # PLUG-LATER HARDWARE ABSTRACTION LAYER
│   │   ├── ITelemetryAdapter.ts      # Unified TypeScript interface
│   │   ├── MockSpacePhysicsAdapter.ts# Mode 1 (Now): Runs orbital + motor physics in browser
│   │   ├── WebSerialCobsAdapter.ts   # Mode 2A (Later): Direct Chrome/Edge WebSerial COBS
│   │   ├── FastApiWsAdapter.ts       # Mode 2B (Later): WebSocket bridge to Python runner
│   │   └── ccsdsBinaryParser.ts      # Unpacks APID 0x10..0x13 + CRC-16-CCITT verifier
│   ├── components/
│   │   ├── space3d/                  # 3D Space & Digital Twin Scenes (React Three Fiber)
│   │   │   ├── SpaceConstellationCanvas.tsx # 3D Earth, 10x LEO orbit, Sat A & Sat B, LoS cone
│   │   │   ├── CubeSatNode.tsx       # 3D satellite mesh, antenna bloom, attitude jitter
│   │   │   ├── IslPacketPulses.tsx   # Animated P0-P3 packet particles & pass downlink beam
│   │   │   ├── ReactionWheelCutaway.tsx # PiP 3D TT motor, 65mm wheel, 20-slot disc, F1 clips
│   │   │   ├── Sg90ServoWiper3D.tsx  # 3D servo horn rotating to rub tire for F2 fault
│   │   │   └── PhasorVectors3D.tsx   # Rotating Z_0 baseline & Z_1x residual arrows
│   │   ├── telemetry/                # High-Rate Engineering Charts & Panels
│   │   │   ├── FdirHierarchyStrip.tsx# L0-L3 status + 3-of-5 persistence shift register
│   │   │   ├── Top4Explainability.tsx# Unpacked APID 0x12 residual bar chart
│   │   │   ├── HighRateUplot.tsx     # 60fps Canvas charts for Rep F, Rep S & PI loop
│   │   │   ├── StageEnergyCard.tsx   # Stages 00..11 microjoule & latency breakdown
│   │   │   └── EgseControlBar.tsx    # Fault injection buttons, policy switch & HW connect
│   ├── store/
│   │   ├── useStationStore.ts        # Zustand store for UI state, alarms & active config
│   │   └── ringBuffers.ts            # Shared Float32Arrays for zero-lag 60fps rendering
│   ├── workers/
│   │   └── physicsAndOrbit.worker.ts # 100Hz PI loop, Kalman RPM, thermal ODE & 10x LEO pass
│   └── App.tsx
└── package.json
```

---

## 7. Phased Implementation Roadmap (7 Days)

### Phase 1: Telemetry Contract, Ring Buffers & Physics/Orbit Worker (Days 1–2)
* Implement `ITelemetryAdapter.ts` and `ringBuffers.ts`.
* Build `physicsAndOrbit.worker.ts` to simulate:
  * $10\times$ scaled LEO orbital mechanics ($576\text{ s}$ period with a $48\text{ s}$ Ground Station pass window).
  * $100\text{ Hz}$ closed-loop PI motor control, $20\text{-slot}$ optical jitter + 1-D Kalman speed observer, and virtual ohmic drop $\text{PWM}_{\text{applied}} = \text{PWM}_{\text{PI}} - \frac{I(t)R_{\text{virtual}}}{V_{\text{bus}}}$.
  * Centrifugal $1\times$ imbalance vibration ($\propto m \cdot r \cdot \omega^2$), synchronous phasor subtraction ($Z_{1\times} - Z_0$), lumped thermal ODE $\hat{T}(t)$, and whitened EMA scoring ($\beta = 0.7$) with $3\text{-of-}5$ persistence.

### Phase 2: 3D Space Constellation & Reaction Wheel Cutaway Scenes (Days 3–4)
* Build `SpaceConstellationCanvas.tsx` with a 3D Earth, atmosphere shader, inclined LEO orbit ring, Ground Station visibility cone, and orbiting **Sat A** and **Sat B** CubeSats.
* Add `IslPacketPulses.tsx` to animate ESP-NOW packet bursts ($P_0..P_2$), Sat A Wi-Fi sleep states, and Sat B store-and-forward queue flushing ($P_3$) during ground contact passes.
* Build the interactive Picture-in-Picture `ReactionWheelCutaway.tsx` featuring the spinning $65\text{ mm}$ wheel, $20\text{-slot}$ disc, 3D clip-on binder clips ($F_1$), rotating SG90 servo wiper ($F_2$), glowing virtual harness ($F_3$), and 3D phasor vectors ($Z_0, Z_{1\times}$).

### Phase 3: High-Rate Telemetry Charts & FDIR Explainability HUD (Days 5–6)
* Integrate `uPlot` in `HighRateUplot.tsx` for $60\text{ FPS}$ rendering of RPM, current, PWM duty, Rep F ($23$ features), and Rep S ($131$ spectral bins).
* Build `FdirHierarchyStrip.tsx`, `Top4Explainability.tsx` (`APID 0x12`), and `StageEnergyCard.tsx` (stages `00..11` latency and $\mu\text{J}$ breakdown).

### Phase 4: EGSE Control Dock & Plug-and-Play Hardware Cutover (Day 7)
* Build `EgseControlBar.tsx` to control $F_1, F_2, F_3$ fault levels, RPM setpoints, telemetry policies ($P_0..P_3$), and the 25 detector models.
* Implement `WebSerialCobsAdapter.ts` and `ccsdsBinaryParser.ts` (`0x00` COBS framing + `CRC-16-CCITT`) so plugging MCU #2 into the laptop USB port immediately drives the 3D satellites, reaction wheel twin, and telemetry charts from real hardware data.