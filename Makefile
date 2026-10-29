# FedSpace-Mini v2-School Top-Level Automation Makefile

.PHONY: all dev build preview parity evaluate clean

all: build parity evaluate

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

clean:
	rm -rf dist node_modules/.vite

