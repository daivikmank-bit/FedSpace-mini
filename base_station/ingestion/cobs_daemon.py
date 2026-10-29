#!/usr/bin/env python3
"""
base_station/ingestion/cobs_daemon.py
FedSpace-Mini v2 Ground Station - COBS Serial Ingestion Gateway & WebSocket Bridge

Functionality:
1. Opens USB-UART port connected to MCU #2 (EGSE & ISL Relay) at 921,600 baud.
2. Ingests raw serial byte stream and delimits packets on 0x00 bytes.
3. Decodes COBS frames and verifies 16-bit CRC-CCITT (poly 0x1021, init 0xFFFF).
4. Routes decoded multiplexed streams:
   - Stream 0x01: Sat A CCSDS Telemetry Packets (APID 0x10, 0x11, 0x12, 0x13)
   - Stream 0x02: MCU #2 Stage Profiler Packets (Idle, DSP, NN, Radio microsecond timers)
   - Stream 0x03: MCU #2 EGSE Ground-Truth Packets (Active fault, severity, servo angle)
   - Stream 0x80: Command packets from Host to EGSE
5. Bridges binary frames over a local WebSocket server (ws://0.0.0.0:8765) for the web UI.
6. Logs packets to a timestamped JSONL/Parquet telemetry record.
7. Supports --mock mode to generate synthetic frames if hardware is not yet attached.
"""

import sys
import os
import time
import struct
import argparse
import asyncio
import threading
import json
from typing import Set, Optional

# --- CRC-16-CCITT (Polynomial 0x1021, Initial 0xFFFF) ---
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

# --- COBS Decode ---
def cobs_decode(data: bytes) -> bytes:
    out = bytearray()
    idx = 0
    length = len(data)
    while idx < length:
        code = data[idx]
        idx += 1
        if code == 0:
            break
        for _ in range(1, code):
            if idx >= length:
                break
            out.append(data[idx])
            idx += 1
        if code < 0xFF and idx < length:
            out.append(0)
    return bytes(out)

# --- COBS Encode ---
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

# --- Serial Port Scanner ---
def find_esp32_port() -> Optional[str]:
    try:
        import serial.tools.list_ports
        ports = serial.tools.list_ports.comports()
        for p in ports:
            desc = (p.description or '').lower()
            hwid = (p.hwid or '').lower()
            # Common USB-UART bridge chips used on ESP32 boards
            if any(k in desc or k in hwid for k in ['cp210', 'ch340', 'ch9102', 'ftdi', 'usb-serial', 'esp32']):
                return p.device
        if ports:
            return ports[0].device
    except ImportError:
        pass
    return None

class CobsDaemon:
    def __init__(self, port: Optional[str], baud: int = 921600, ws_port: int = 8765, mock: bool = False, log_dir: str = "base_station/logs"):
        self.port = port
        self.baud = baud
        self.ws_port = ws_port
        self.mock = mock
        self.log_dir = log_dir
        self.running = True
        self.ws_clients: Set[any] = set()
        self.rx_bytes = 0
        self.packets_decoded = 0
        self.crc_errors = 0
        self.log_file = None

        os.makedirs(self.log_dir, exist_ok=True)
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        self.log_path = os.path.join(self.log_dir, f"telemetry_{timestamp}.jsonl")

    def log_packet(self, stream_id: int, payload: bytes, info: dict):
        if not self.log_file:
            self.log_file = open(self.log_path, "a", encoding="utf-8")
        entry = {
            "wall_time": time.time(),
            "stream_id": stream_id,
            "len": len(payload),
            "info": info
        }
        self.log_file.write(json.dumps(entry) + "\n")
        self.log_file.flush()

    def process_frame(self, raw_frame: bytes, loop: asyncio.AbstractEventLoop):
        if not raw_frame:
            return
        
        decoded = cobs_decode(raw_frame)
        if len(decoded) < 3:
            return

        stream_id = decoded[0]
        payload = decoded[1:]

        # Check CRC-16 if CCSDS packet (stream 0x01)
        crc_ok = True
        info = {}
        if stream_id == 0x01 and len(payload) >= 8:
            pkt_data = payload[:-2]
            received_crc = struct.unpack(">H", payload[-2:])[0]
            calc_crc = crc16_ccitt(pkt_data)
            if received_crc != calc_crc:
                # Try little-endian if sender formatted LE
                received_crc_le = struct.unpack("<H", payload[-2:])[0]
                if received_crc_le == calc_crc:
                    crc_ok = True
                else:
                    crc_ok = False
                    self.crc_errors += 1
            
            # Primary header decode
            if len(payload) >= 6:
                pri_hdr = struct.unpack(">H", payload[0:2])[0]
                apid = pri_hdr & 0x07FF
                info["apid"] = f"0x{apid:02X}"

        self.packets_decoded += 1
        info["crc_ok"] = crc_ok
        self.log_packet(stream_id, payload, info)

        # Broadcast raw COBS-delimited frame to connected WebSockets
        if self.ws_clients:
            wire_frame = raw_frame + b"\x00"
            for client in list(self.ws_clients):
                try:
                    asyncio.run_coroutine_threadsafe(client.send(wire_frame), loop)
                except Exception:
                    pass

    def run_serial_reader(self, loop: asyncio.AbstractEventLoop):
        try:
            import serial
        except ImportError:
            print("[WARN] pyserial not installed. Falling back to synthetic mock mode.")
            self.run_mock_generator(loop)
            return

        target_port = self.port or find_esp32_port()
        if not target_port:
            print("[ERROR] No USB-UART serial port found. Re-run with --mock or specify --port <device>")
            return

        print(f"[INFO] Connecting to MCU #2 on {target_port} @ {self.baud} baud...")
        try:
            ser = serial.Serial(target_port, self.baud, timeout=0.1)
        except Exception as e:
            print(f"[ERROR] Could not open port {target_port}: {e}")
            return

        print(f"[INFO] Serial link established. Ingesting telemetry packets...")
        buf = bytearray()

        while self.running:
            try:
                data = ser.read(1024)
                if data:
                    self.rx_bytes += len(data)
                    buf.extend(data)
                    while b"\x00" in buf:
                        zero_idx = buf.index(b"\x00")
                        frame = bytes(buf[:zero_idx])
                        del buf[:zero_idx + 1]
                        if frame:
                            self.process_frame(frame, loop)
            except Exception as e:
                print(f"[WARN] Serial read error: {e}")
                time.sleep(0.5)

    def run_mock_generator(self, loop: asyncio.AbstractEventLoop):
        """Generates synthetic COBS-encoded CCSDS packets for hardware-free testing."""
        print("[INFO] Starting Synthetic Hardware Mock Streamer (100 Hz HK, 1 Hz Digest, Profiler)...")
        t_ms = 0
        hop_id = 0
        base_rpm = 200.0

        while self.running:
            time.sleep(0.01) # 100 Hz loop
            t_ms += 10

            # 1. Housekeeping Packet (APID 0x10, 28 bytes total)
            if t_ms % 100 == 0: # 10 Hz HK stream
                # CCSDS Primary Header: APID 0x10, seq
                pri_hdr = 0x0810 # version 0, sec hdr present, apid 0x10
                seq_ctrl = 0xC000 | (hop_id & 0x3FFF)
                pkt_len = 28 - 7 # total - 7
                
                payload = struct.pack(
                    ">HHHIhhHHH",
                    pri_hdr,
                    seq_ctrl,
                    pkt_len,
                    t_ms,
                    int(base_rpm),
                    200, # setpoint
                    145, # current mA
                    5020, # vbus mV
                    16384 # pwm duty Q15
                ) + struct.pack("<hhH", 24 * 256, 120, 0)
                
                # Append CRC-16
                crc = crc16_ccitt(payload)
                full_pkt = payload + struct.pack(">H", crc)
                
                # Stream ID 0x01 + full_pkt -> COBS
                frame = bytes([0x01]) + full_pkt
                cobs_framed = cobs_encode(frame)
                self.process_frame(cobs_framed, loop)

            # 2. Stage Profiler Packet (Stream 0x02, 22 bytes)
            if t_ms % 1000 == 0:
                hop_id += 1
                stage_payload = struct.pack(
                    ">IIIIIH",
                    hop_id,
                    850000, # dt_idle_us
                    42000,  # dt_dsp_us
                    28000,  # dt_nn_us
                    80000,  # dt_radio_us
                    380     # ina_mean_mW
                )
                frame = bytes([0x02]) + stage_payload
                cobs_framed = cobs_encode(frame)
                self.process_frame(cobs_framed, loop)

    async def ws_handler(self, websocket):
        print(f"[INFO] New Ground Station client connected from {websocket.remote_address}")
        self.ws_clients.add(websocket)
        try:
            async for message in websocket:
                # Handle command from host to EGSE (e.g., inject fault, set servo)
                if isinstance(message, bytes) and len(message) > 0:
                    if message[0] == 0x80:
                        print(f"[CMD] Received Host-to-EGSE Command ({len(message)} bytes)")
        except Exception:
            pass
        finally:
            self.ws_clients.remove(websocket)
            print("[INFO] Ground Station client disconnected")

    async def start_server(self):
        try:
            import websockets
        except ImportError:
            print("[ERROR] 'websockets' library is required to bridge serial to browser.")
            print("Install it with: pip install websockets pyserial")
            return

        print(f"[INFO] WebSocket Bridge serving at ws://0.0.0.0:{self.ws_port}")
        loop = asyncio.get_running_loop()

        # Start serial reader or mock generator in background thread
        if self.mock:
            thread = threading.Thread(target=self.run_mock_generator, args=(loop,), daemon=True)
        else:
            thread = threading.Thread(target=self.run_serial_reader, args=(loop,), daemon=True)
        thread.start()

        async with websockets.serve(self.ws_handler, "0.0.0.0", self.ws_port):
            while self.running:
                await asyncio.sleep(1.0)
                if self.packets_decoded > 0 and self.packets_decoded % 50 == 0:
                    print(f"[STATUS] Decoded {self.packets_decoded} packets | RX: {self.rx_bytes / 1024:.1f} kB | CRC Errs: {self.crc_errors}")

def main():
    parser = argparse.ArgumentParser(description="FedSpace-Mini COBS Serial Gateway & WebSocket Bridge")
    parser.add_argument("--port", type=str, default=None, help="Serial port (e.g., /dev/ttyUSB0, COM3). Auto-detected if omitted.")
    parser.add_argument("--baud", type=int, default=921600, help="Baud rate (default: 921600)")
    parser.add_argument("--ws-port", type=int, default=8765, help="WebSocket port (default: 8765)")
    parser.add_argument("--mock", action="store_true", help="Run synthetic hardware streamer (no physical board needed)")
    args = parser.parse_args()

    daemon = CobsDaemon(port=args.port, baud=args.baud, ws_port=args.ws_port, mock=args.mock)
    try:
        asyncio.run(daemon.start_server())
    except KeyboardInterrupt:
        print("\n[INFO] Shutting down COBS Daemon...")

if __name__ == "__main__":
    main()

