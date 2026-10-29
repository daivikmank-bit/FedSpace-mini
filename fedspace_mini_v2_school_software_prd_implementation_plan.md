# FedSpace-Mini v2-School: Software Product Requirements Document (SW-PRD) & Implementation Plan

* **Document ID:** FSM-SW-PRD-v2S-01
* **Target Architecture:** Dual-ESP32 Embedded Nodes (ESP-IDF 5.x) + Laptop Base Station (Python 3.11+)
* **Core Philosophy:** Compensating for ₹1,550 school-level hardware tolerances using advanced control theory, digital signal processing, and INT8 Edge AI.

---

## PART 1: SOFTWARE PRODUCT REQUIREMENTS DOCUMENT (SW-PRD)

### 1. System Software Architecture Overview
The software architecture is strictly bifurcated into two decoupled domains communicating exclusively via a single USB-Serial COBS (Consistent Overhead Byte Stuffing) physical link:
1. **Embedded Edge Domain (ESP32 Firmware in C/C++):** Divided across **MCU #1 (Sat A - Device Under Test)** for high-rate sensing, control, DSP, and Edge AI, and **MCU #2 (Combined EGSE + ISL Relay)** for air-gapped fault orchestration, stage-resolved microsecond power profiling, and store-and-forward telemetry multiplexing.
2. **Base Station Domain (Laptop Host in Python):** Handles offline DSP parity verification, Autoencoder training, Knowledge Distillation (KD), Post-Training Quantization (PTQ), automated hardware-in-the-loop (HIL) campaign orchestration, LEO pass scheduling, and real-time visualization.

---

### 2. Track A: Edge AI & Embedded Firmware Requirements (ESP32)

#### 2.1 Toolchain & Resource Constraints
* **Framework:** Native ESP-IDF v5.x utilizing `esp-tflite-micro`, `esp-dsp`, `driver/pcnt`, `driver/ledc`, `driver/spi_master`, `driver/i2c`, and `esp_wifi` (ESP-NOW).
* **OBC Resource Slice Budget (`obc-slice-esp32`):**
  * **Clock Frequency:** Configurable across $\{80, 160, 240\}\text{ MHz}$ (Nominal budget evaluated at $80\text{ MHz}$).
  * **CPU Utilization:** $\le 5\%$ duty cycle ($\le 50\text{ ms}$ total execution time per $1.0\text{ s}$ decision hop).
  * **Memory Ceiling:** $\le 32\text{ KB}$ Flash (model weights + code) and $\le 48\text{ KB}$ RAM (TFLM tensor arena + DSP ring buffers).
* **Fallback Kernel Requirement:** Firmware must include a standalone 30-line pure-C `int8` matrix-multiplication fallback (`cmsis_nn` style dense layer loop) to guarantee compilation and deterministic execution if `esp-tflite-micro` operator registration fails or exceeds flash limits.

#### 2.2 MCU #1 (Sat A - DUT) Dual-Core FreeRTOS Task Architecture
To prevent Wi-Fi/ESP-NOW radio interrupts from corrupting $1.6\text{ kHz}$ vibration sampling jitter, tasks are strictly pinned by CPU core:

##### Core 1: Real-Time Sensing, Control, DSP & Edge AI
* **`acq-task` (Priority 22 - Highest):**
  * Triggered via GPIO 34 hardware interrupt from the ADXL345/MPU6050 watermark FIFO every $10\text{ ms}$.
  * Executes SPI burst reads ($1.6\text{ kHz}$ effective sampling rate) of 16 XYZ samples into a lock-free $2,048$-sample ping-pong/ring buffer ($12\text{ KB}$ RAM).
* **`ctrl-task` (Priority 20 - $100\text{ Hz}$ Hard Real-Time Timer):**
  * Polls INA219/INA226 over $\text{I}^2\text{C}$ ($400\text{ kHz}$ bus) at $500\text{ Hz}$ (oversampled 5x per tick) for motor current $I(t)$ and bus voltage $V_{\text{bus}}(t)$.
  * Reads hardware `PCNT` unit on GPIO 32 + edge-timestamp ISR from the 20-slot LM393 optical sensor.
  * Executes the **1-D Kalman Speed Observer**, **PI Speed Controller**, **Software-Synthesized Harness Fault ($F_3$)**, and **Layer-0 (L0) Safety Trips**.
  * Outputs $20\text{ kHz}$ PWM via `LEDC` on GPIO 25.
* **`dsp-task` (Priority 15 - $1.0\text{ s}$ Hop Trigger):**
  * Asserts GPIO Stage Code `01` (`GPIO 16 = 1, GPIO 17 = 0`).
  * Packs radial accelerometer axes into a complex array, executes a radix-2 complex FFT, performs **Synchronous $1\times$ Phasor Runout Subtraction**, and extracts feature representations **Rep F** ($23$ dims) or **Rep S** ($131$ dims).
* **`infer-task` (Priority 12 - Immediately follows `dsp-task`):**
  * Asserts GPIO Stage Code `10` (`GPIO 16 = 0, GPIO 17 = 1`).
  * Applies Median/IQR scaling and quantizes features to `int8`.
  * Invokes the Conditional Autoencoder (or B0/B2 baseline), computes variance-whitened reconstruction error $S_t$, updates the Exponential Moving Average ($\beta = 0.7$), and evaluates the $3\text{-of-}5$ persistence logic.
* **`fdir-task` (Priority 10 - Immediately follows `infer-task`):**
  * Arbitrates Layer-0 through Layer-3 FDIR policies, isolates fault classes ($F_1, F_2, F_3$, Sensor), extracts Top-4 explainability residuals, and pushes packet structs to the Core 0 transmit queue. Returns GPIO Stage Code to `00` (Idle).

##### Core 0: Radio Communications, Thermal Modeling & Serial Logging
* **`temp-task` (Priority 5 - $1.0\text{ Hz}$):**
  * Integrates the **Lumped-Parameter Winding Thermal Observer** differential equation using measured current $I(t)$ to output estimated motor temperature $\hat{T}(t)$.
* **`comm-task` (Priority 8 - Event / Schedule Driven):**
  * Asserts GPIO Stage Code `11` (`GPIO 16 = 1, GPIO 17 = 1`) during active radio transmission.
  * Packages telemetry into CCSDS-style frames (`APID 0x10..0x13`) with CRC-16-CCITT and transmits via ESP-NOW to MCU #2.
  * Implements telemetry policies **P0** (Raw), **P1** ($1\text{ Hz}$ HK), and **P2** (Edge FDIR with `esp_wifi_stop()` / `esp_wifi_start()` sleep cycling between $60\text{ s}$ digests).

#### 2.3 Four High-Complexity Compensating Software Algorithms (MCU #1)
1. **1-D Kalman Filter Speed Observer + Harmonic PLL:**
   * Compensates for physical slot-width jitter in the ₹25 20-slot plastic optical disc.
   * State vector: $\mathbf{x}_k = [\omega_k, \dot{\omega}_k]^T$.
   * **Prediction ($100\text{ Hz}$):** Driven by motor torque constant $k_t I(t)$ and viscous friction.
   * **Update 1 (Optical):** Inter-pulse period $\Delta t_{\text{slot}}$ from `PCNT` + `esp_timer` edge capture.
   * **Update 2 (Harmonic PLL - $1.0\text{ Hz}$):** Updates measurement bias using the $1\times$ shaft harmonic peak frequency from the accelerometer FFT.
2. **Synchronous $1\times$ Phasor Runout Subtraction:**
   * Compensates for factory mechanical wobble of the press-fit ₹60 plastic TT wheel.
   * Tracks instantaneous rotor phase $\theta(t) = \frac{2\pi (\text{slot\_count} \pmod{20})}{20}$.
   * Computes the complex $1\times$ Fourier coefficient $Z_{1\times}$ at the shaft fundamental frequency $f_1 = \frac{\text{RPM}}{60}\text{ Hz}$ and subtracts the static baseline phasor $Z_0$ calibrated during normal training (`N-train`):
     $$E_{1\times,\text{clean}} = |Z_{1\times} - Z_0|^2$$
3. **Software-Synthesized Harness Voltage-Drop Emulation ($F_3$):**
   * Eliminates physical relays and power resistors. When GPIO 33 is pulled high by MCU #2 (or triggered via internal campaign schedule), `ctrl-task` modifies the PI controller output $\text{PWM}_{\text{PI}} \in [0, 1]$ before writing to the hardware timer:
     $$\text{PWM}_{\text{applied}}(t) = \text{clip}\left(\text{PWM}_{\text{PI}}(t) - \frac{I_{\text{measured}}(t) \cdot R_{\text{virtual}}}{V_{\text{bus}}(t)}, 0.0, 1.0\right)$$
   * Supports virtual resistance levels $R_{\text{virtual}} \in \{2.2\ \Omega, 4.7\ \Omega\}$. The PI loop naturally increases $\text{PWM}_{\text{PI}}$ to maintain target RPM while steady-state motor current $I(t)$ remains constant.
4. **Lumped-Parameter Winding Thermal Observer:**
   * Eliminates the external DS18B20 temperature sensor. Integrates at $1\text{ Hz}$ using forward Euler:
     $$\hat{T}_{k+1} = \hat{T}_k + \frac{\Delta t}{C_{\text{th}}} \left( I_k^2 R_{\text{winding}} - \frac{\hat{T}_k - T_{\text{amb}}}{R_{\text{th}}} \right)$$

#### 2.4 On-Device DSP & Feature Extraction Specifications
* **Complex FFT Packing:** Radial accelerometer axes $a_x[n]$ and $a_y[n]$ ($N \in \{512, 1024, 2048\}$) are multiplied by a pre-computed Hann window $w[n]$ and packed into a single complex buffer:
  $$z[n] = a_x[n]w[n] + j \cdot a_y[n]w[n]$$
* **Single-Pass Spectrum Separation:** Executed via `dsps_fft2r_fc32`. Individual power spectra $P_x[k]$ and $P_y[k]$ are unpacked in $O(N)$ using complex conjugate symmetry:
  $$X[k] = \frac{Z[k] + Z^*[N-k]}{2}, \quad Y[k] = \frac{Z[k] - Z^*[N-k]}{2j}$$
* **Feature Representations:**
  * **Rep F ($23$ Inputs $\rightarrow 20$ Reconstructed):** Phasor-subtracted $1\times$ energy, RMS, and harmonic band energies ($14$); time-domain kurtosis and crest factor ($2$); mean/std of speed, current, PWM duty, and bus voltage ($4$) $\rightarrow 20$ reconstructed targets. Concatenated with $3$ **Context Inputs** (Speed Setpoint $\omega_{\text{ref}}$, Estimated Temp $\hat{T}$, Time since last setpoint change $\Delta t_{\text{cmd}}$ clipped at $60\text{ s}$).
  * **Rep S ($131$ Inputs $\rightarrow 128$ Reconstructed):** $64$ log-spaced harmonic order bands from $0.25\times$ to $40\times$ per radial axis ($128$ spectral targets) + $3$ context inputs.

#### 2.5 On-Board Anomaly Detection, Scoring & FDIR Hierarchy
* **Compiled Detector Suite (Single 4 MB Flash Image):**
  * `B0`: $1\text{ Hz}$ Limit Check (8 scalar bounds on $I, \Delta\omega, \hat{T}, V_{\text{bus}}$).
  * `B2`: On-board Mahalanobis Distance on Rep F ($23 \times 23$ inverse covariance matrix, $\sim 2.1\text{ KB}$).
  * `M-F`: Conditional Autoencoder on Rep F ($23 \rightarrow h \rightarrow z(4) \rightarrow h \rightarrow 20$, $h \in \{8, 16, 32\}$).
  * `M-S`: Direct & Knowledge-Distilled Student Conditional Autoencoders on Rep S ($131 \rightarrow h \rightarrow z \rightarrow h \rightarrow 128$, $h \in \{16..128\}, z \in \{6..12\}$).
* **Variance-Whitened Anomaly Scoring & Persistence:**
  * Reconstruction residual for target $i \in \{1..D\}$: $r_{t,i} = x_{t,i} - \hat{x}_{t,i}$.
  * Whitened score using validation variance $\sigma_i^2$:
    $$S_t = \frac{1}{D} \sum_{i=1}^D \frac{r_{t,i}^2}{\sigma_i^2}$$
  * Smoothed via EMA: $\tilde{S}_t = \beta \tilde{S}_{t-1} + (1 - \beta) S_t$ ($\beta = 0.7$).
  * **Alarm Persistence:** Triggers when $k = 3$ out of the last $n = 5$ hops exceed threshold $\tau$. Clears after $10$ consecutive hops below $0.8\tau$.
* **Edge Explainability:** Sorts $|r_{t,i}|/\sigma_i$ in descending order and packs the top-4 feature indices (`uint8[4]`) and signed quantized residuals (`int8[4]`) into the event packet.
* **4-Layer FDIR Hierarchy:**
  * **L0 (Hard Rules):** Immediate motor stop/brake if $I > 0.7\text{ A}$ ($<140\ \mu\text{s}$ INA alert), $|\Delta\omega| > 30\%$ for $3\text{ s}$, or $\hat{T} > 60^\circ\text{C}$.
  * **L1 (Detection):** Conditional AE + $3\text{-of-}5$ persistence alarm.
  * **L2 (Isolation):** Nearest-centroid classifier on residual signature $(\Delta\text{PWM}, \Delta I, \Delta E_{1\times})$ to isolate $F_1$ (Imbalance), $F_2$ (Friction), $F_3$ (Harness), or Sensor Fault.
  * **L3 (Autonomous Recovery):** $F_1 \rightarrow$ Derate speed setpoint by $30\%$; $F_2 \rightarrow$ Hold current speed and elevate downlink priority; $F_3 \rightarrow$ Cap maximum PWM duty cycle.

#### 2.6 MCU #2 (Combined EGSE + ISL Relay) Firmware Requirements
* **Core 0 (`isl-relay-task`):**
  * Receives ESP-NOW frames from Sat A.
  * Under Policy **P3 (ISL Store-and-Forward)**, buffers packets in a priority ring queue (Events > Digests > HK) and flushes them over USB Serial only when the Laptop Base Station asserts an active LEO contact pass window.
* **Core 1 (`egse-ctrl-task` & `stage-profiler-isr`):**
  * Generates a $1\text{ Hz}$ Pulse-Per-Second (PPS) sync signal on GPIO 27 wired to Sat A GPIO 35 for sub-millisecond timeline alignment.
  * Controls the SG90 Servo Wiper ($F_2$ Bearing Friction fault) via $50\text{ Hz}$ `LEDC` PWM on GPIO 25, executing automated binary-search angle calibration at campaign startup to lock in $L_1 (+10\%\ \Delta I)$, $L_2 (+25\%\ \Delta I)$, and $L_3 (+50\%\ \Delta I)$.
  * Toggles GPIO 26 (wired to Sat A GPIO 33) to inject scheduled $F_3$ virtual harness faults with zero label leakage into Sat A's telemetry stream.
  * **Hardware-Timer Stage Profiler:** Attaches GPIO edge ISRs on pins 32/33 (connected to Sat A Stage pins 16/17). Uses `esp_timer_get_time()` ($1\ \mu\text{s}$ resolution) to accumulate exact microsecond residency $\Delta t_s$ in states `00` (Idle), `01` (DSP), `10` (NN), and `11` (Radio) per $1.0\text{ s}$ hop.
  * **COBS USB Multiplexer:** Encodes all Sat A telemetry packets, EGSE ground-truth fault labels, and stage timing structs into unified COBS-framed packets (`0x00` delimiter) over the single USB-UART interface at $921,600\text{ baud}$.

---

### 3. Track B: Base Station Software Requirements (Laptop Host)

#### 3.1 Software Stack & Modularity
* **Language & Environment:** Python 3.11+ managed via `poetry` or `conda`, with a top-level `Makefile` automating every pipeline stage (`make parity`, `make train`, `make sweep`, `make plots`, `make demo`).
* **Core Libraries:** `pyserial`, `cobs`, `numpy`, `scipy`, `torch` / `tensorflow` (for TFLite INT8 export), `scikit-learn`, `pandas`, `matplotlib` / `seaborn`, and `streamlit` or `PyQt6` (for the live telemetry dashboard).

#### 3.2 Module B1: COBS Serial Ingestion, Demultiplexer & LEO Pass Scheduler
* **Asynchronous Serial Daemons:** Reads $921,600\text{ baud}$ byte streams from MCU #2, strips `0x00` framing, decodes COBS payloads, and validates 16-bit CCITT CRCs.
* **Stream Demultiplexing:** Splits incoming packets by stream ID into:
  1. Sat A CCSDS Telemetry (`0x10` HK, `0x11` Digest, `0x12` FDIR Event, `0x13` Raw Vibration Chunk).
  2. MCU #2 EGSE Ground-Truth Injection Logs (PPS timestamp, active fault class $F_1..F_3$, severity level, servo angle) stored in an air-gapped SQLite/Parquet table to prevent label leakage.
  3. MCU #2 Stage Residency Profiling Logs ($\Delta t_{00}, \Delta t_{01}, \Delta t_{10}, \Delta t_{11}$ in $\mu\text{s}$).
* **10x Scaled LEO Contact Pass Scheduler:** Simulates orbital visibility windows ($48\text{ s}$ active pass every $9.6\text{ min}$) by sending `PASS_OPEN` / `PASS_CLOSE` command frames to MCU #2 during Policy P3 evaluations.

#### 3.3 Module B2: Offline DSP Reference & Day 4 Parity Verifier
* **Bit-Accurate Golden Pipeline:** Implements the exact mathematical equivalent of Sat A's complex FFT, Hann windowing, synchronous $1\times$ phasor subtraction, and harmonic order binning in Python (`numpy` / `scipy`).
* **Automated Gate Verifier (`verify_parity.py`):** Streams golden raw accelerometer dumps (`APID 0x13`) through both the C firmware (`dsp-task`) and the Python reference, asserting a maximum relative error $< 10^{-3}$ across all $23$ (Rep F) and $131$ (Rep S) features.

#### 3.4 Module B3: ML Training, Knowledge Distillation (KD) & INT8 PTQ Pipeline
* **Anti-Leakage Dataset Manager:** Enforces strict session/calendar-day splits (`N-train`, `N-val`, `F-campaign-1`, `N-test`, `F-test`). Never splits by random time windows.
* **Normal-Only Preprocessing:** Computes feature-wise Median and Interquartile Range (IQR) on `N-train` ($\ge 5\text{ h}$) and exports C header arrays (`norm_params.h`). Adds Gaussian input noise ($\sigma = 0.02$) during training.
* **Baseline & Neural Model Zoo Generator:**
  * Fits `B1` ($5 \times 5$ setpoint-conditioned Mahalanobis covariance on $1\text{ Hz}$ HK) and `B2` ($23 \times 23$ inverse covariance on Rep F).
  * Trains Conditional Autoencoders (`M-F` and `M-S` Teacher: $131 \rightarrow 192 \rightarrow 96 \rightarrow 12 \rightarrow 96 \rightarrow 192 \rightarrow 128$, $\sim 77\text{K}$ params).
  * **Knowledge Distillation (KD) Ablation Engine:** For every `M-S` student architecture ($h \in \{16..128\}, z \in \{6..12\}$), trains one model directly on target $\mathbf{X}$ and one via blended KD loss against teacher reconstruction $\hat{\mathbf{X}}_{\text{teacher}}$:
    $$\mathbf{Y}_{\text{KD}} = (1 - \alpha)\mathbf{X} + \alpha \hat{\mathbf{X}}_{\text{teacher}} \quad (\alpha = 0.5, \text{Adam } 10^{-3}, \text{patience } 8)$$
* **Full INT8 Post-Training Quantization (PTQ) & C-Array Exporter:**
  * Quantizes all models to full `int8` weights and activations (`TFLITE_BUILTINS_INT8`) using a 1,000-sample representative calibration dataset spanning all RPM setpoints and thermal warmup states.
  * Validates $\text{FP32} \leftrightarrow \text{INT8}$ alarm agreement $\ge 98\%$ and $\Delta\text{AUROC} \le 0.02$.
  * Automatically generates `models_zoo.h` containing all ~25 compiled TFLM flatbuffers, validation residual variances $\sigma_i^2$, and calibrated thresholds $\tau$ (set on `N-val` for $\le 1$ false alarm per $10\text{ h}$).

#### 3.5 Module B4: Hardware-Aware Selection Sweep & Empirical Power Profiler
* **Automated HIL Sweep Runner (`run_sweep.py`):** Steps Sat A through all $\sim 25$ detector models $\times$ FFT sizes $N \in \{512, 1024, 2048\}$ $\times$ CPU clocks $\{80, 160, 240\}\text{ MHz}$ via UART commands ($1,000\text{ hops}$ per config).
* **Cycle-Accurate Power State Machine & Energy Closure:**
  * Combines MCU #2 stage microsecond durations $\Delta t_s$ with calibrated ESP32 state power constants ($P_{\text{idle}}, P_{\text{dsp}}, P_{\text{nn}}, P_{\text{radio}}$ at each clock frequency) to compute gross energy $E_{\text{gross}, s} = E_s / n$ and incremental energy above idle:
    $$E_{\text{incr}, s} = \frac{(P_s - P_{\text{idle}}) T_s}{n}$$
  * Validates stage energy closure within $\le 2\%$ of total integrated power $\int P(t)\,dt$ and computes Spearman rank correlation $\rho$ between analytical proxies (MACs, parameter count) and measured p99 latency/energy.

#### 3.6 Module B5: Campaign Evaluator, Hypothesis Verifier & Live Dashboard
* **Event-Level Metric Engine:** Evaluates Event Recall (alarm within $30\text{ s}$ of PPS fault onset), Detection Delay (median/p90), Minimum Detectable Severity (MDS), and False Alarm Rate ($\text{FAR/hr}$) using the statistical Rule of Three on the $\ge 8\text{ h}$ `N-test` run.
* **Automated Hypothesis Grader (`evaluate_hypotheses.py`):** Programmatically verifies Hypotheses **H1 through H8** and outputs publication-ready PDF/PNG figures (8 core plots).
* **Real-Time Ground Station GUI (`dashboard.py`):** Displays live rotor RPM (Kalman vs. raw optical), $1\times$ phasor polar plot, whitened anomaly score $\tilde{S}_t$ vs. threshold $\tau$, Top-4 explainability bar chart, cumulative bytes transmitted (P0 vs. P1 vs. P2), and microjoule stage breakdown.

---

## PART 2: INTERFACE CONTROL DOCUMENT (ICD) — EDGE TO BASE STATION

### 1. CCSDS-Style Air/Relay Packet Formats (Sat A $\rightarrow$ MCU #2 $\rightarrow$ Laptop)
All packets transmitted by Sat A begin with a 6-byte CCSDS-style Primary Header, followed by a 4-byte PPS-aligned millisecond timestamp (`t_ms`), payload, and a 2-byte `CRC-16-CCITT`.

| APID | Packet Name | Total Size | Rate / Trigger | Payload Structure (Packed Little-Endian) |
| :--- | :--- | :--- | :--- | :--- |
| `0x10` | **Housekeeping (HK)** | $28\text{ B}$ | $1.0\text{ Hz}$ (Policy P1) | `uint16 rpm`, `uint16 rpm_setpoint`, `int16 current_mA`, `uint16 vbus_mV`, `uint16 pwm_duty_q15`, `int16 temp_est_c_q8`, `uint16 pcnt_raw`, `uint16 flags` |
| `0x11` | **Health Digest** | $40\text{ B}$ | $1 / 60\text{ s}$ (Policy P2) | Min/Mean/Max of RPM, Current, PWM ($18\text{ B}$), `uint16 max_score_q8_8`, `uint16 e1x_mean_q8_8`, `uint32 hop_count`, `uint16 fdir_state` |
| `0x12` | **FDIR Event** | $26\text{ B}$ | On Alarm / Recovery | `uint8 event_kind`, `uint8 fault_class_iso`, `uint16 score_q8_8`, `uint16 rpm`, `uint8 top_idx[4]`, `int8 top_res[4]` |
| `0x13` | **Raw Vib Chunk** | $\le 250\text{ B}$ | Streamed (Policy P0 / Parity) | `uint16 chunk_seq`, `uint16 sample_rate`, `int16 ax_ay_samples[116]` |

### 2. COBS Multiplexed USB Frame Format (MCU #2 $\leftrightarrow$ Laptop)
Every frame over the $921,600\text{ baud}$ USB-UART link is COBS-encoded and terminated by `0x00`:
* **Byte 0 (`stream_id`):**
  * `0x01`: Forwarded Sat A CCSDS Packet (`APID 0x10..0x13`)
  * `0x02`: MCU #2 Stage Profiler Packet (`uint32 hop_id`, `uint32 dt_idle_us`, `uint32 dt_dsp_us`, `uint32 dt_nn_us`, `uint32 dt_radio_us`, `uint16 ina_mean_mW`)
  * `0x03`: MCU #2 EGSE Ground-Truth Label Packet (`uint32 pps_ms`, `uint8 active_fault_id`, `uint8 severity_lvl`, `uint16 servo_pwm_us`, `uint8 f3_pin_state`)
  * `0x80`: Host-to-EGSE Command Packet (Set Servo Angle, Toggle $F_3$, Pass Open/Close, Select Model/FFT/Clock)

---

## PART 3: TOTAL SOFTWARE IMPLEMENTATION PLAN (18-DAY DUAL-TRACK ROADMAP)

### Repository Directory Structure
```text
fedspace-mini-v2/
├── Makefile                        # Single-command build, parity, train, sweep, plots
├── config/
│   ├── obc_slice_esp32.yaml        # 80MHz, <=32KB Flash, <=48KB RAM constraints
│   └── campaign_schedule.yaml      # Anti-leakage N-train, N-val, F-test schedules
├── firmware_sat_a/                 # Track A1: MCU #1 (DUT) ESP-IDF v5.x Project
│   ├── main/
│   │   ├── main.c                  # Dual-core task pinning & init
│   │   ├── acq_task.c              # 1.6kHz SPI FIFO burst & ring buffer
│   │   ├── ctrl_task.c             # 100Hz Kalman RPM, PI loop, Virtual R_harness, L0 trips
│   │   ├── dsp_task.c              # Complex FFT, 1x phasor subtraction, Rep F & Rep S
│   │   ├── infer_task.c            # TFLM INT8 wrapper + 30-line pure-C INT8 fallback
│   │   ├── fdir_task.c             # Whitened EMA, 3-of-5 persistence, Top-4 explainability
│   │   ├── comm_task.c             # CCSDS framing, ESP-NOW TX, P0/P1/P2 Wi-Fi sleep
│   │   └── include/
│   │       ├── models_zoo.h        # Auto-generated 25 INT8 models + thresholds
│   │       └── norm_params.h       # Auto-generated Median/IQR & phasor baseline Z0
├── firmware_egse_isl/              # Track A2: MCU #2 (EGSE + ISL Relay) ESP-IDF Project
│   ├── main/
│   │   ├── egse_main.c             # SG90 auto-calibrator, F3 trigger, 1Hz PPS generator
│   │   ├── stage_profiler.c        # 1us GPIO 32/33 edge capture ISRs
│   │   └── cobs_mux.c              # ESP-NOW RX priority queue & USB COBS multiplexer
└── base_station/                   # Track B: Laptop Ground Host (Python 3.11+)
    ├── ingestion/
    │   ├── cobs_daemon.py          # Async 921600 baud demux & CRC-16 validator
    │   └── pass_scheduler.py       # 10x scaled LEO pass controller (Policy P3)
    ├── dsp_parity/
    │   ├── reference_dsp.py        # Numpy complex FFT & phasor subtraction
    │   └── verify_parity.py        # Day 4 Gate: asserts < 1e-3 relative error
    ├── ml_pipeline/
    │   ├── train_ae_kd.py          # Conditional AE, Teacher-Student KD ablation
    │   ├── quantize_ptq.py         # Full INT8 PTQ + C header code generator
    │   └── baselines.py            # B0, B1, B2 Mahalanobis fitting
    ├── evaluation/
    │   ├── run_sweep.py            # Automated 25-model x 3-FFT x 3-clock profiler
    │   ├── power_model.py          # Stage energy closure (<=2%) & Spearman rho
    │   ├── evaluate_hypotheses.py  # H1-H8 statistical grading & Rule-of-Three FAR
    │   └── generate_plots.py       # 8 publication plots generator
    └── dashboard/
        └── app.py                  # Live Streamlit/PyQt6 Ground Station UI
```

---

### Phase 1: Bring-Up, Control Loops & DSP Parity (Days 1–4)

#### Day 1: Toolchain Burn-Down & Dual-Core Skeleton
* **Track A (ESP32):** Initialize `firmware_sat_a` and `firmware_egse_isl` on ESP-IDF 5.x. Compile a dummy INT8 model using `esp-tflite-micro`, implement the 30-line pure-C INT8 matrix-multiply fallback, and run a 1024-point complex FFT via `esp-dsp` (`dsps_fft2r_fc32`) on Core 1 to verify memory ceilings ($\le 48\text{ KB}$ RAM) on Day 1.
* **Track B (Laptop):** Set up Python virtual environment, implement `cobs_daemon.py` with `CRC-16-CCITT` verification, and verify bidirectional `0x00`-framed COBS loopback with MCU #2 at $921,600\text{ baud}$.

#### Day 2: High-Rate Sensing, Kalman Speed Observer & PI Loop
* **Track A (ESP32):**
  * Implement `acq-task` on Sat A Core 1 (ADXL345 $1.6\text{ kHz}$ watermark IRQ $\rightarrow$ $2048$-sample ring buffer) and $500\text{ Hz}$ INA219/226 $\text{I}^2\text{C}$ polling.
  * Implement `PCNT` optical slot counting + edge microsecond capture on GPIO 32.
  * Code the $100\text{ Hz}$ **1-D Kalman Speed Observer** and tune the $20\text{ kHz}$ `LEDC` PI speed controller across setpoints ($150\text{ to }280\text{ RPM}$).
  * Implement Layer-0 hardware/software safety trips ($I > 0.7\text{ A}$ breaker).
* **Track B (Laptop):** Build real-time telemetry logger saving incoming `APID 0x10` (HK) and `APID 0x13` (Raw Vib) streams into timestamped Parquet files.

#### Day 3: Compensating Algorithms & EGSE Automation
* **Track A (ESP32):**
  * Implement **Software-Synthesized Harness Fault ($F_3$)** inside `ctrl-task` triggered by GPIO 33 ($R_{\text{virtual}} \in \{2.2\ \Omega, 4.7\ \Omega\}$).
  * Implement the $1\text{ Hz}$ **Lumped-Parameter Winding Thermal Observer** on Core 0.
  * On MCU #2, implement the $1\text{ Hz}$ PPS sync generator, GPIO 32/33 $1\ \mu\text{s}$ Stage Profiler ISRs, and the SG90 servo binary-search auto-calibration routine for $F_2$ friction levels ($L_1=+10\%, L_2=+25\%, L_3=+50\%\ \Delta I$).
* **Track B (Laptop):** Implement `egse_controller.py` to command MCU #2 fault schedules and log air-gapped ground-truth labels (`stream_id 0x03`).

#### Day 4: On-Device DSP, Phasor Subtraction & Parity Gate
* **Track A (ESP32):** Implement `dsp-task` on Sat A: Hann windowing, complex FFT packing, conjugate symmetry unpacking, **Synchronous $1\times$ Phasor Runout Subtraction**, and feature assembly for **Rep F** ($23$ dims) and **Rep S** ($131$ dims).
* **Track B (Laptop):** Implement `reference_dsp.py` and `verify_parity.py`.
* **HARD GATE (Day 4 Parity):** Stream 100 golden vibration dumps through Sat A and Python reference; verify maximum relative feature discrepancy $< 10^{-3}$.

---

### Phase 2: Data Campaigns, Model Zoo & Single-Image Integration (Days 5–8)

#### Day 5: Gate G1 (Physics Validation) & Normal Training Data (`N-train`)
* **Track A & B Joint Execution:**
  * Run graded binder-clip imbalance tests ($F_1$), servo friction tests ($F_2$), and virtual harness resistance tests ($F_3$).
  * **HARD GATE G1 (Day 5):** Verify physical hypotheses — $1\times$ vibration energy scales linearly with clip mass ($R^2 > 0.95$) and $\propto \omega^2$ (slope $2.0 \pm 0.4$); $F_1$ leaves $1\text{ Hz}$ mean current flat while $F_3$ increases PWM duty with flat current.
  * Execute overnight **$\ge 5\text{ h}$ `N-train`** normal campaign (spanning multiple setpoints and sham servo movements).

#### Day 6: Validation Campaign (`N-val`) & Baseline Detectors (`B0`, `B1`, `B2`)
* **Track B (Laptop):**
  * Compute Median/IQR scalers and baseline wobble phasor $Z_0$ from `N-train`.
  * Fit `B0` (scalar bounds), `B1` (Laptop $5 \times 5$ setpoint-conditioned Mahalanobis on $1\text{ Hz}$ HK), and `B2` (On-board $23 \times 23$ inverse covariance on Rep F).
  * Execute overnight **$\ge 3\text{ h}$ `N-val`** normal campaign + graded fault campaign **`F-campaign-1`** ($\sim 6\text{ h}$ across $F_1, F_2, F_3$).

#### Day 7: Conditional Autoencoders, KD Ablation & INT8 Quantization
* **Track B (Laptop):**
  * Train `M-F` Conditional AEs ($h \in \{8, 16, 32\}$) and `M-S` Teacher ($77\text{K}$ params) on `N-train`.
  * Train `M-S` Student grid ($h \in \{16..128\}, z \in \{6..12\}$) comparing direct training vs. Knowledge Distillation ($\alpha = 0.5$).
  * Execute full `int8` Post-Training Quantization (`quantize_ptq.py`), verify $\ge 98\%$ alarm agreement and $\Delta\text{AUROC} \le 0.02$ against FP32 on `F-campaign-1`.
  * Calibrate variance-whitened EMA thresholds $\tau$ on `N-val` ($\le 1\text{ FA} / 10\text{ h}$) and export `models_zoo.h` and `norm_params.h`.

#### Day 8: Single-Image Firmware Compilation & Telemetry Policies (`P0–P2`)
* **Track A (ESP32):**
  * Compile all ~25 detector variants (`B0`, `B2`, `M-F`, `M-S` Direct/KD, plus winning student in `FP32`) into Sat A's single 4 MB flash image.
  * Implement `infer-task` and `fdir-task` (whitened scoring, $3\text{-of-}5$ persistence, Top-4 explainability sorting, CCSDS `0x12` event packing).
  * Implement `comm-task` telemetry policies **P0**, **P1**, and **P2** (with `esp_wifi_stop()` sleep cycling).

---

### Phase 3: Hardware-Aware Profiling, Core Freeze & Hypotheses Testing (Days 9–12)

#### Day 9: Automated 225-Configuration Bench Sweep
* **Track A & B Joint Execution:**
  * Run `run_sweep.py` on Laptop to step Sat A through ~25 models $\times$ $3$ FFT sizes $\times$ $3$ CPU clocks ($1,000\text{ hops}$ per point) while MCU #2 records $1\ \mu\text{s}$ GPIO stage durations (`00`, `01`, `10`, `11`) and INA power measurements.

#### Day 10: Gate G2 (Energy Closure & Hardware-Aware Selection) + Overnight `N-test`
* **Track B (Laptop):**
  * Run `power_model.py` to partition latency and microjoules per decision across Acquisition, DSP, INT8 Inference, and Radio.
  * **HARD GATE G2 (Day 10):** Verify stage energy closure within $\le 2\%$ of total integrated power; compute Spearman $\rho$ between MACs/params and p99 latency/energy; lock in the winning budget-feasible configuration (`obc-slice-esp32`).
  * Launch live deployed **$\ge 8\text{ h}$ overnight `N-test`** normal run.

#### Day 11: Fresh Held-Out Fault Campaign (`F-test`)
* **Track A & B Joint Execution:**
  * Analyze `N-test` log to verify $\le 1$ false alarm over $\ge 8\text{ h}$ (Rule-of-Three $95\%$ upper bound).
  * Recalibrate SG90 wiper and run a fresh $3\text{ h}$ **`F-test`** campaign using held-out binder-clip positions and held-out RPM setpoints.

#### Day 12: Hypothesis Grading (`H1–H8`), Core Plots & Gate G3 (Core Freeze)
* **Track B (Laptop):**
  * Execute `evaluate_hypotheses.py` and `generate_plots.py` to generate all 8 publication figures (Detectability-vs.-Bandwidth Pareto, Stage Energy Breakdown, KD vs. Direct Ablation, Proxy Fidelity Scatter, etc.).
  * **HARD GATE G3 (Day 12):** Tag repository release `v1.0-core` with all hypotheses H1–H8 verified.

---

### Phase 4: Extensions, Stretch Goals & Reproducible Demo (Days 13–18)

* **Day 13 (Extension E1 - Second Hardware Profile):** Flash the identical sweep firmware onto an **ESP32-S3-DevKitC-1** (`obc_slice_esp32s3.yaml`), benchmark `esp-nn` SIMD vector acceleration, and evaluate whether the optimal student shifts toward a wider Rep S architecture.
* **Day 14 (Extension E2 - ISL Store-and-Forward Relay `P3`):** Enable MCU #2 priority contact queue and Laptop `pass_scheduler.py` ($48\text{ s}$ LEO pass every $9.6\text{ min}$) to evaluate event delivery latency vs. buffer overflow.
* **Day 15 (Extension E3 - Closed-Loop L2 Isolation & L3 Recovery):** Activate nearest-centroid L2 fault isolation and L3 autonomous derating/PWM-capping on Sat A; quantify survival time and vibration reduction during active faults.
* **Day 16 (Extensions E4/E5 - Compound Faults & Duty-Cycled Sensing):** Test simultaneous $F_1 + F_3$ faults and evaluate intermittent DSP/NN duty-cycling ($1\text{ hop every } 5\text{ s}$).
* **Day 17 (Buffer / Stretch Goals S1/S2):** Reserved for schedule slip recovery or optional Stretch Goals if G1–G3 passed on schedule.
* **Day 18 (Live 3-Minute Demo & One-Command Reproducibility):** Finalize `dashboard/app.py` for live fault-injection demonstrations (clipping a binder clip $\rightarrow$ instant $1\times$ phasor spike $\rightarrow$ Top-4 explainability alarm $\rightarrow$ L3 speed derating) and verify full pipeline reproducibility via `make all`.

---

## PART 4: SOFTWARE VERIFICATION & ACCEPTANCE MATRIX

| Gate / Hypothesis ID | Software Verification Target | Acceptance Criterion | Verification Script / Module |
| :--- | :--- | :--- | :--- |
| **Day 1 Burn-Down** | TFLM INT8 + `esp-dsp` FFT + C Fallback | Compiles cleanly; Arena + Buffers $\le 48\text{ KB}$ RAM | `firmware_sat_a` build log |
| **Day 4 Parity Gate** | On-device C DSP vs. Laptop Python DSP | Max relative feature error $< 10^{-3}$ on golden dumps | `base_station/dsp_parity/verify_parity.py` |
| **Gate G1 (Day 5)** | Compensating Algorithms ($1\times$ Phasor, Kalman, $F_3$) | $1\times$ vs. $m \cdot r$ $R^2 > 0.95$; speed slope $2.0 \pm 0.4$ (**H8**) | `base_station/evaluation/evaluate_hypotheses.py` |
| **H1 (Bandwidth Gap)** | Edge Rep F/S vs. Laptop `B1` ($1\text{ Hz}$ HK) | `B1` recall $< 30\%$ on $F_1$; Edge recall $\ge 90\%$ at $37\times$ fewer bytes | `evaluate_hypotheses.py --claim C1` |
| **H2 (Friction MDS)** | Edge AE vs. `B0` Limit Check on $F_2$ | Edge MDS $\le L_1 (+10\%\ \Delta I)$, beating `B0` ($\ge L_2$) | `evaluate_hypotheses.py --claim C1` |
| **H3 (Quantization)** | Full INT8 PTQ vs. FP32 Baseline | Alarm agreement $\ge 98\%$; $\Delta\text{AUROC} \le 0.02$ | `base_station/ml_pipeline/quantize_ptq.py` |
| **Gate G2 / H4 & H5** | Stage Energy Closure & Radio Sleep (`P2`) | Closure error $\le 2\%$; NN energy $< 20\%$ of total; `P2` power $\ge 25\%$ below `P1` | `base_station/evaluation/power_model.py` |
| **H6 (Proxy Fidelity)** | Analytical MACs/Params vs. Measured p99 | Spearman $\rho(\text{params}, \text{p99 latency}) < 0.8$ | `base_station/evaluation/run_sweep.py` |
| **Gate G3 / H7 (FAR)** | $\ge 8\text{ h}$ Live Deployed Normal Run (`N-test`) | $\le 1$ false alarm in $\ge 8\text{ h}$ ($95\%$ bound $\le 0.6/\text{hr}$) | `evaluate_hypotheses.py --freeze v1.0` |