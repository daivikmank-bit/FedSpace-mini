# FedSpace-Mini v2: Hardware Integration & Pinout Guide
**Simulate Now, Plug Hardware Later** • Single-USB Multiplexed Architecture

This guide covers everything needed to connect, wire, flash, and operate physical hardware with the FedSpace-Mini Ground Station.

---

## 1. System Architecture Overview

The system employs a **Dual-ESP32 architecture** to maintain an air-gapped ground truth environment:

```text
 ┌──────────────────────────┐                      ┌──────────────────────────┐
 │    MCU #1: Sat A DUT     │                      │   MCU #2: EGSE & Relay   │
 │   (CubeSat Flight OBC)   │                      │  (Fault Injector + ISL)  │
 │                          │                      │                          │
 │ • TT Motor Speed PI Loop │  ESP-NOW (2.4 GHz)   │ • 1 Hz PPS Generator     │
 │ • LM393 Optical PCNT     ├─────────────────────►│ • Microsecond Profiler   │
 │ • INA219 Current / Volt  │                      │ • SG90 Servo Wiper (F2)  │
 │ • ADXL345 SPI IMU        │                      │ • Virtual Harness (F3)   │
 │ • Edge AI Inference      │                      │ • USB-UART Gateway       │
 └─────────────▲────────────┘                      └────────────┬─────────────┘
               │                                                │
               │ Stage Bus: GPIO 16/17 (1us Codes)              │ USB-UART
               │ 1 Hz PPS Pulse: GPIO 35                        │ 921,600 Baud
               │ Virtual Ohmic Drop (F3): GPIO 33               │ COBS Frames
               └────────────────────────────────────────────────┘
                                                                │
                                                                ▼
                                                   ┌──────────────────────────┐
                                                   │   Ground Station Host    │
                                                   │ (Web Browser / Dashboard)│
                                                   │                          │
                                                   │ • Direct WebSerial API   │
                                                   │ • or Python cobs_daemon  │
                                                   └──────────────────────────┘
```

---

## 2. Complete Interconnect & Pinout Table

### MCU #1 (Sat A DUT - Flight Computer & Reaction Wheel Payload)
| Signal / Function | ESP32 GPIO | Connected To | Notes / Electrical Spec |
| :--- | :--- | :--- | :--- |
| **Motor PWM Drive** | **GPIO 4** | Gate of MOSFET / PWM Input | 20 kHz LEDC PWM, 0–100% duty cycle |
| **LM393 Optical Sensor** | **GPIO 32** | LM393 Digital Out (D0) | Hardware PCNT counter, 20 slots/rev |
| **INA219 I2C SDA** | **GPIO 21** | INA219 SDA | 400 kHz Fast-Mode I2C, 3.3V pull-ups |
| **INA219 I2C SCL** | **GPIO 22** | INA219 SCL | 400 kHz Fast-Mode I2C |
| **ADXL345 SPI CS** | **GPIO 5** | ADXL345 CS | SPI Active Low Chip Select |
| **ADXL345 SPI SCK** | **GPIO 18** | ADXL345 SCL / SCK | 5 MHz Hardware SPI Clock |
| **ADXL345 SPI MISO** | **GPIO 19** | ADXL345 SDO / MISO | SPI Data In |
| **ADXL345 SPI MOSI** | **GPIO 23** | ADXL345 SDA / MOSI | SPI Data Out |
| **ADXL345 FIFO INT** | **GPIO 34** | ADXL345 INT1 | Watermark Interrupt (1.6 kHz burst) |
| **Stage Profiler Bit 0** | **GPIO 16** | MCU #2 GPIO 32 | High-speed GPIO output (`00`=Idle, `01`=DSP, |
| **Stage Profiler Bit 1** | **GPIO 17** | MCU #2 GPIO 33 | `10`=NN Inference, `11`=Radio Transmit) |
| **1 Hz PPS Input** | **GPIO 35** | MCU #2 GPIO 27 | Rising-edge ISR for sub-ms timeline sync |
| **F3 Virtual Harness** | **GPIO 33** | MCU #2 GPIO 26 | Input line; activates virtual ohmic droop |

---

### MCU #2 (EGSE Controller & ISL Relay Node)
| Signal / Function | ESP32 GPIO | Connected To | Notes / Electrical Spec |
| :--- | :--- | :--- | :--- |
| **USB-UART TX** | **GPIO 1** | Laptop Ground Host | Built-in CP2102/CH340 chip @ 921,600 baud |
| **USB-UART RX** | **GPIO 3** | Laptop Ground Host | Commands from Ground Station |
| **1 Hz PPS Output** | **GPIO 27** | MCU #1 GPIO 35 | 50ms active-high pulse every 1.000s |
| **Stage Profiler Bit 0** | **GPIO 32** | MCU #1 GPIO 16 | Hardware edge-capture interrupt (1μs) |
| **Stage Profiler Bit 1** | **GPIO 33** | MCU #1 GPIO 17 | Hardware edge-capture interrupt (1μs) |
| **SG90 Servo PWM (F2)** | **GPIO 25** | SG90 Control Wire (Orange) | 50 Hz PWM, 1000μs (off) to 1800μs (stall) |
| **F3 Fault Output** | **GPIO 26** | MCU #1 GPIO 33 | Digital logic output for harness resistance |

---

## 3. Quick Flashing Instructions

Both targets are configured in `firmware/platformio.ini`.

### Option A: PlatformIO (Recommended)
```bash
# 1. Flash MCU #1 (Sat A DUT)
pio run -e mcu1_sat_a_dut -t upload --upload-port /dev/ttyUSB1

# 2. Flash MCU #2 (EGSE Relay)
pio run -e mcu2_egse_relay -t upload --upload-port /dev/ttyUSB0
```

### Option B: Arduino IDE
1. Open `firmware/mcu1_sat_a_dut/main.c` (rename to `.ino` if using Arduino IDE).
2. Select Board: **ESP32 Dev Module**, Upload Speed: **921600**.
3. Flash MCU #1.
4. Repeat for `firmware/mcu2_egse_relay/main.c` on MCU #2.

---

## 4. Connecting to the Ground Station

### Method 1: Direct WebSerial (Chrome / Edge / Opera) — Zero Setup
1. Plug **MCU #2** into your computer via USB.
2. In the Ground Station UI, click the **[🔌 Hardware Link]** pill in the top bar.
3. Select **921,600 Baud** and click **Connect USB Hardware**.
4. Select your ESP32's COM port in the browser prompt.
5. Telemetry streams immediately at 60 FPS! Click the **Packet Diagnostics** tab to see live frame throughput, packet counts, and CRC verification.

### Method 2: Python Serial Bridge (`cobs_daemon.py`) — Firefox / Safari / Headless
For environments where WebSerial is unavailable or to log raw data to disk:

```bash
# 1. Install prerequisites (if not already present)
pip install pyserial websockets

# 2. Start the daemon (auto-detects ESP32 USB port)
make daemon
# Or specify port manually:
python3 base_station/ingestion/cobs_daemon.py --port /dev/ttyUSB0 --baud 921600

# 3. In the UI, open Hardware Manager -> Enter ws://localhost:8765 -> Click Connect WebSocket Bridge
```

### Method 3: Hardware-Free Mock Streamer
To test the entire hardware pipeline before physical boards are assembled:

```bash
# Runs the synthetic hardware streamer on ws://localhost:8765
make mock-hardware
```

---

## 5. Packet Format Reference (ICD)

Every packet over USB uses **Consistent Overhead Byte Stuffing (COBS)** and terminates with a `0x00` delimiter:

```text
[Stream ID (1 Byte)] [Payload (N Bytes)] [CRC-16-CCITT (2 Bytes)] [0x00 Delimiter]
```

* **Stream `0x01`**: Sat A CCSDS Telemetry
  * APID `0x10`: 28-Byte Housekeeping (RPM, current, voltage, PWM, temperature, status)
  * APID `0x11`: 40-Byte Health Digest (Min/Mean/Max window summaries)
  * APID `0x12`: 26-Byte FDIR Event (Fault classification, whitened score, Top-4 explainability)
  * APID `0x13`: Raw 1.6 kHz Vibration Burst
* **Stream `0x02`**: MCU #2 Stage Profiler (Idle, DSP, NN, Radio microsecond timers)
* **Stream `0x03`**: MCU #2 EGSE Ground Truth (Active fault, severity, servo angle)
* **Stream `0x80`**: Host-to-EGSE Command (Inject fault, adjust friction, trigger pass)

---

## 6. Hardware Troubleshooting Checklist

- **Port Permission Denied (Linux):** Run `sudo usermod -a -G dialout $USER` and log back in.
- **Baud Rate Clock Drift:** Ensure both boards use official 40 MHz or 26 MHz XTAL crystals. If characters appear corrupt, test at `460,800` baud.
- **Common Ground:** Ensure Ground (GND) is shared between MCU #1, MCU #2, the motor driver, and the sensors to prevent false edge triggers on the Stage Profiler.
- **Optical Sensor Noise:** Add a $0.1\ \mu\text{F}$ ceramic capacitor between LM393 D0 and GND to suppress mechanical switch chatter.

