# FedSpace-Mini v2 🛰️
**Edge-AI Reaction Wheel FDIR, 3D Digital Twin & Mission Control Ground Station**

[![Build & Parity](https://img.shields.io/badge/Build%20%26%20Parity-Passing-emerald)](https://github.com/)
[![Three.js](https://img.shields.io/badge/3D%20Engine-Three.js%20WebGL-blue)](https://threejs.org/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20TS-61dafb)](https://reactjs.org/)
[![Hardware](https://img.shields.io/badge/Hardware-Dual--ESP32%20%40%20921.6k-orange)](HARDWARE_INTEGRATION.md)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

FedSpace-Mini v2 is a complete flight-software, 3D simulation, and Mission Control Ground Station platform designed for federated satellite constellations. It demonstrates real-time **Fault Detection, Isolation & Recovery (FDIR)** for CubeSat reaction wheels using low-cost commercial off-the-shelf (COTS) hardware, coupled with high-fidelity orbital mechanics, procedural photorealistic rendering, and mathematical parity gates.

---

## 🌟 Key Highlights

- **"Simulate Now, Plug Hardware Later":** Runs completely in-browser on day one with an embedded Web Worker flight-physics ODE engine, and connects seamlessly to physical microcontrollers over a single USB cable using native **WebSerial** or a **Python WebSocket gateway**.
- **Hero 3D Digital Twin:** 
  - **Full-Screen Cinematic Viewport:** The 3D space simulation occupies 100% of the screen edge-to-edge. No cramped static sidebars!
  - **Sat A (DUT CubeSat):** Centered hero view with wrinkled gold Kapton thermal MLI, deployable solar wings, ADXL345 radial accelerometer, and optical pulse counter.
  - **Sat B (ISL Relay Node):** High-gain communications satellite with parabolic mesh reflector dish, silver beta-cloth MLI, and animated inter-satellite laser link (ISL) photon packets.
  - **Photorealistic Earth Globe:** $23.44^\circ$ axial tilt, specular ocean reflections catching solar glints, dynamic atmospheric Rayleigh glow, glowing night city clusters, procedural clouds, and line-of-sight (LoS) ground station contact passes.
  - **True Physical Revolutions:** Wheel rotates at exact mathematical angular velocity ($\omega(t) = 2\pi \cdot \text{RPM} / 60$) independent of screen refresh rate.
  - **Camera Orbit Presets:** Four cinematic viewpoints (`[HERO CHASE]`, `[ORBITAL CONSTELLATION]`, `[CAPE CANAVERAL PASS]`, `[RW-01 MACRO INSPECT]`) with full 360° mouse drag orbit controls.
- **Picture-in-Picture (PiP) Reaction Wheel Twin:** Floating aerospace gimbal inspection feed (`CAM 02 // RW-01 CUTAWAY`) showing the TT gearmotor, 65mm rubber tire, 20-slot optical disc, flashing LM393 IR LED, snap-on clips ($F_1$), SG90 servo friction wiper ($F_2$), virtual harness ($F_3$), and real-time 3D phasor vectors ($Z_0, Z_{1\times}$).
- **SpaceX-Inspired Monochromatic Cockpit & Dropdown Drawers:** 
  - Minimalist, high-contrast, black-and-white theme (`#000000` pitch black, stark white typography, wide letter tracking).
  - Floating top HUD with interactive dropdown triggers that slide down on click without obstructing space:
    - `01 SUBSYSTEMS ▾`: Hierarchical constellation tree & sensor telemetries.
    - `02 FDIR DIAGNOSTICS ▾`: 3-of-5 persistence, anomaly score gauge, Top-4 explainability residuals.
    - `03 EGSE FAULT DOCK ▾`: One-click fault injection controls for $F_1$, $F_2$, and $F_3$.
    - `04 ENERGY CLOSURE ▾`: Microjoule stage breakdown & P2 radio sleep metrics ($\le 2\%$ closure error).
    - `05 WAVEFORMS ▾`: 60 FPS Canvas waveforms (Speed, Current, Score, 1.6 kHz Vibration, 1x Phasor Polar Plot).
  - Bottom SpaceX telemetry strip displaying live stage, altitude, velocity, RPM, current, temperature, and ground pass countdown.
- **Scientific Rigor & Parity Certification:** 
  - Bit-accuracy parity gate verified ($< 10^{-3}$ relative error).
  - Programmatic verification suite for all 8 scientific hypotheses (H1–H8).

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Python**: 3.10+ (Standard library only; zero mandatory pip dependencies for parity and evaluation!)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/FedSpace-mini.git
cd FedSpace-mini

# Install web dependencies
npm install
```

### 3. Start Development Server
```bash
make dev
# or
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in Google Chrome or Microsoft Edge.

### 4. Run Full Verification Suite
```bash
make all
```
Executes:
1. `npm run build`: Production TypeScript & Vite bundle compilation.
2. `python3 base_station/dsp_parity/verify_parity.py`: Verifies DSP FFT and phasor runout subtraction against reference math ($< 10^{-3}$ relative error threshold).
3. `python3 base_station/evaluation/evaluate_hypotheses.py`: Programmatically grades and certifies scientific hypotheses H1 through H8.
4. `check-firmware`: Compiles core C firmware modules (`cobs.c`, `crc16.c`) with zero warnings.

---

## 🔌 Hardware Integration ("Plug Later")

The platform connects to physical Dual-ESP32 setups via a single USB-UART connection at **921,600 baud**:

```text
 ┌──────────────────────────┐                      ┌──────────────────────────┐
 │    MCU #1: Sat A DUT     │                      │   MCU #2: EGSE & Relay   │
 │   (CubeSat Flight OBC)   │  ESP-NOW (2.4 GHz)   │  (Fault Injector + ISL)  │
 │                          ├─────────────────────►│                          │
 │ • TT Motor Speed PI Loop │                      │ • 1 Hz PPS Generator     │
 │ • LM393 Optical PCNT     │                      │ • Microsecond Profiler   │
 │ • INA219 Current / Volt  │                      │ • SG90 Servo Wiper (F2)  │
 │ • ADXL345 SPI IMU        │                      │ • Virtual Harness (F3)   │
 │ • Edge AI Inference      │                      │ • USB-UART Gateway       │
 └──────────────────────────┘                      └────────────┬─────────────┘
                                                                │ USB-UART @ 921,600 Baud
                                                                ▼
                                                   ┌──────────────────────────┐
                                                   │ Ground Station Dashboard │
                                                   │ • Direct WebSerial (Web) │
                                                   │ • or Python cobs_daemon  │
                                                   └──────────────────────────┘
```

### Connection Options:
1. **Direct WebSerial (Chrome / Edge):** Click the **[🔌 Hardware Link]** pill in the top navigation bar $\rightarrow$ Select your ESP32's COM port $\rightarrow$ Streams live binary telemetry with hardware COBS framing and CRC-16 checks.
2. **Python Daemon (`cobs_daemon.py`):** For Firefox, Safari, or headless rigs:
   ```bash
   make daemon
   # Or run synthetic streamer without physical boards:
   make mock-hardware
   ```

Complete wiring schematics, pinout tables, and flashing guides are detailed in **[`HARDWARE_INTEGRATION.md`](HARDWARE_INTEGRATION.md)**.

---

## 📊 Telemetry & Fault Injection Matrix

| Fault ID | Physical Realization | Primary Sensor Signature | Edge Detection Method |
| :--- | :--- | :--- | :--- |
| **$F_0$ (Nominal)** | Baseline clean wheel | Steady 200 RPM, baseline current ($145\text{ mA}$) | Normal Reconstruction ($S_t \le \tau$) |
| **$F_1$ (Mass Imbalance)** | 1 to 3 metallic clips on rim | Radial $1\times$ vibration acceleration ($a_x, a_y$) | Synchronous Phasor Runout Subtraction ($Z_{1\times} - Z_0$) |
| **$F_2$ (Bearing Friction)**| SG90 servo wiper against tire ($L_1..L_3$) | Step increase in motor DC current ($I$), PWM duty cycle | Current / PWM anomaly residuals & speed droop |
| **$F_3$ (Virtual Harness)**| High-side series ohmic drop ($2.2\ \Omega..4.7\ \Omega$)| Voltage drop ($V_{\text{bus}}$), duty saturation | Cross-correlation of $V_{\text{bus}}$ vs. $I$ |

### Telemetry Policies (PRD Spec)
- **Policy P0 (Raw 1.6 kHz):** Continuous uncompressed vibration stream ($1.6\text{ kHz}$ ADXL345 samples).
- **Policy P1 (1 Hz HK):** 28-Byte standard housekeeping packet (RPM, current, voltage, PWM, temperature).
- **Policy P2 (Edge FDIR):** 40-Byte Health Digest (1/60 Hz) + immediate 26-Byte FDIR Event on persistent alert.
- **Policy P3 (ISL Relay):** Store-and-forward out-of-pass orbits via Sat B high-gain antenna during ground pass windows.

---

## 📂 Project Structure

```text
FedSpace-mini/
├── Makefile                        # Top-level commands: build, dev, parity, evaluate, daemon
├── HARDWARE_INTEGRATION.md         # Complete pinout tables, wiring guides, and flashing steps
├── base_station/                   # Ground Station algorithms & verification
│   ├── dsp_parity/
│   │   ├── reference_dsp.py        # Bit-accurate radix-2 FFT & 1x phasor subtraction
│   │   └── verify_parity.py        # Day 4 Parity Gate verifier (< 1e-3 relative error)
│   ├── evaluation/
│   │   └── evaluate_hypotheses.py  # Scientific grading suite for hypotheses H1 through H8
│   └── ingestion/
│       ├── cobs_daemon.py          # Python USB-UART serial gateway & WebSocket bridge
│       └── mock_serial_streamer.py # Synthetic hardware streamer for testing
├── config/
│   ├── obc_slice_esp32.yaml        # Microcontroller resource budget (80MHz, <=48KB RAM)
│   └── campaign_schedule.yaml      # Automated fault injection test schedules
├── firmware/                       # Embedded C firmware for Dual-ESP32 setup
│   ├── include/
│   │   ├── telemetry_packets.h     # Byte-packed CCSDS (APID 0x10..0x13) & COBS structs
│   │   ├── cobs.h                  # Zero-allocation COBS framing
│   │   └── crc16.h                 # CRC-16-CCITT implementation
│   ├── src/
│   │   ├── cobs.c                  # Core C COBS encoder/decoder
│   │   └── crc16.c                 # Fast CRC-16 computation
│   ├── mcu1_sat_a_dut/             # Sat A CubeSat flight code (PI loop, Kalman, ESP-NOW)
│   ├── mcu2_egse_relay/            # EGSE & ISL Relay node (1us profiler, servo, USB link)
│   └── platformio.ini              # Multi-environment PlatformIO build configuration
└── src/                            # Web Mission Control Application (React + Vite + TS)
    ├── adapters/                   # Telemetry adapters (Mock, WebSerial, WebSocket)
    ├── components/
    │   ├── space3d/                # Three.js photorealistic satellites, Earth globe & PiP
    │   ├── telemetry/              # 60 FPS lock-free Canvas waveform plots
    │   └── v2/                     # Vidyut Drishti inspired cockpit views & modals
    ├── store/                      # Zustand station state & zero-allocation ring buffers
    └── workers/                    # 100 Hz physics ODE, Kalman observer & orbit worker
```

---

## 🛠️ Verification Suite Commands

| Command | Action |
| :--- | :--- |
| `make build` | Compiles the web application into production bundle (`dist/`). |
| `make parity` | Runs Day 4 bit-accuracy parity test on vibration features. |
| `make evaluate` | Evaluates all 8 hypotheses (H1–H8) with statistical pass/fail assertions. |
| `make check-firmware` | Compiles core C firmware with `gcc` to verify zero syntax/link warnings. |
| `make daemon` | Launches the Python USB serial ingestion gateway at 921,600 baud. |
| `make mock-hardware`| Launches the synthetic hardware streamer on `ws://localhost:8765`. |

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

