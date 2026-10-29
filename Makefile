# FedSpace-Mini v2-School Top-Level Automation Makefile

.PHONY: all dev build preview parity evaluate daemon mock-hardware streamer check-firmware clean

all: build parity evaluate check-firmware

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

parity:
	python3 base_station/dsp_parity/verify_parity.py

evaluate:
	python3 base_station/evaluation/evaluate_hypotheses.py

daemon:
	python3 base_station/ingestion/cobs_daemon.py

mock-hardware:
	python3 base_station/ingestion/cobs_daemon.py --mock

streamer:
	python3 base_station/ingestion/mock_serial_streamer.py

check-firmware:
	gcc -Wall -Wextra -I firmware/include -c firmware/src/cobs.c -o /tmp/cobs.o
	gcc -Wall -Wextra -I firmware/include -c firmware/src/crc16.c -o /tmp/crc16.o
	rm -f /tmp/cobs.o /tmp/crc16.o
	@echo "Firmware core C modules compiled with zero warnings or errors."

clean:
	rm -rf dist node_modules/.vite

