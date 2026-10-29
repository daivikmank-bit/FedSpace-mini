#!/usr/bin/env python3
"""
base_station/ingestion/mock_serial_streamer.py
Synthetic Hardware Streamer for FedSpace-Mini v2

Allows verifying Ground Station Web UI and hardware ingestion pipeline
without requiring a physical ESP32 or FTDI cable plugged in.
"""

import sys
import time
import struct
import math
import random

def crc16_ccitt(data: bytes) -> int:
    crc = 0xFFFF
    for byte in data:
        crc ^= (byte << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return crc

def cobs_encode(data: bytes) -> bytes:
    out = bytearray()
    code_idx = 0
    out.append(1)
    code = 1
    for byte in data:
        if byte == 0:
            out[code_idx] = code
            code_idx = len(out)
            out.append(1)
            code = 1
        else:
            out.append(byte)
            code += 1
            if code == 0xFF:
                out[code_idx] = code
                code_idx = len(out)
                out.append(1)
                code = 1
    out[code_idx] = code
    return bytes(out)

def generate_hk_packet(t_ms: int, rpm: float, setpoint: float, current_mA: float, temp_c: float) -> bytes:
    """Creates a 28-byte CCSDS APID 0x10 Housekeeping Packet"""
    pri_hdr = 0x0810  # Ver 0, Sec Hdr present, APID 0x10
    seq_ctrl = 0xC000 | ((t_ms // 10) & 0x3FFF)
    data_len = 28 - 7  # 21

    payload = struct.pack(
        ">HHHIhhHHH",
        pri_hdr,
        seq_ctrl,
        data_len,
        t_ms,
        int(rpm),
        int(setpoint),
        int(current_mA),
        5020,  # 5.02V
        int((rpm / setpoint) * 16384) if setpoint > 0 else 0
    ) + struct.pack("<hhH", int(temp_c * 256), int(rpm * 20 / 60), 0)

    crc = crc16_ccitt(payload)
    return payload + struct.pack(">H", crc)

def generate_stage_profiler(hop_id: int) -> bytes:
    """Creates MCU #2 Stage Profiler Packet (Stream 0x02)"""
    return struct.pack(
        ">IIIIIH",
        hop_id,
        845000 + random.randint(-5000, 5000),  # Idle us
        41500 + random.randint(-1000, 1000),   # DSP us
        27800 + random.randint(-500, 500),     # NN us
        85700 + random.randint(-2000, 2000),   # Radio us
        375 + random.randint(-10, 10)          # Mean mW
    )

def main():
    print("===================================================================")
    print("FedSpace-Mini v2: Mock Serial Streamer")
    print("Streams COBS-delimited CCSDS frames into stdout or named pipe")
    print("===================================================================")

    t_ms = 0
    hop_id = 0
    rpm = 200.0

    while True:
        time.sleep(0.01)  # 100 Hz loop
        t_ms += 10

        # Simulate physics
        noise = random.gauss(0, 0.8)
        rpm = 200.0 + noise + 3.0 * math.sin(t_ms / 1000.0)

        # Emit Housekeeping at 10 Hz
        if t_ms % 100 == 0:
            hk = generate_hk_packet(t_ms, rpm, 200.0, 142.0 + random.gauss(0, 3), 24.5)
            frame = bytes([0x01]) + hk
            cobs = cobs_encode(frame) + b"\x00"
            sys.stdout.buffer.write(cobs)
            sys.stdout.buffer.flush()

        # Emit Profiler at 1 Hz
        if t_ms % 1000 == 0:
            hop_id += 1
            prof = generate_stage_profiler(hop_id)
            frame = bytes([0x02]) + prof
            cobs = cobs_encode(frame) + b"\x00"
            sys.stdout.buffer.write(cobs)
            sys.stdout.buffer.flush()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass

