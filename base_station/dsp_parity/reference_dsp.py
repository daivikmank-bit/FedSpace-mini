"""
base_station/dsp_parity/reference_dsp.py
Bit-Accurate Golden DSP Pipeline in Python (Standard Library + Optional NumPy)
Implements:
1. Precomputed Hann Windowing: z[n] = (ax[n]*w[n]) + j*(ay[n]*w[n])
2. Complex FFT Packing & Radix-2 FFT
3. Single-Pass Spectrum Separation using Conjugate Symmetry:
   X[k] = (Z[k] + Z*[N-k]) / 2,  Y[k] = (Z[k] - Z*[N-k]) / 2j
4. Synchronous 1x Phasor Runout Subtraction: E_1x_clean = |Z_1x - Z_0|^2
5. Feature Extraction: Rep F (23 dims) and Rep S (131 dims)
"""

import math
import cmath
from typing import List, Tuple, Dict, Any

def cooley_tukey_fft(x: List[complex]) -> List[complex]:
    """Pure-Python Radix-2 Cooley-Tukey FFT (O(N log N))."""
    N = len(x)
    if N <= 1:
        return x
    if (N & (N - 1)) != 0:
        raise ValueError("FFT size must be a power of 2")
    
    even = cooley_tukey_fft(x[0::2])
    odd = cooley_tukey_fft(x[1::2])
    
    T = [cmath.exp(-2j * cmath.pi * k / N) * odd[k] for k in range(N // 2)]
    return [even[k] + T[k] for k in range(N // 2)] + [even[k] - T[k] for k in range(N // 2)]

class ReferenceDsp:
    def __init__(self, fft_size: int = 1024, sample_rate: float = 1600.0):
        self.N = fft_size
        self.sample_rate = sample_rate
        # Precomputed Hann window
        self.hann = [0.5 * (1.0 - math.cos(2.0 * math.pi * n / (self.N - 1))) for n in range(self.N)]
        # Default learned baseline wobble phasor Z_0
        self.z0 = complex(0.35, 0.12)

    def pack_and_fft(self, ax: List[float], ay: List[float]) -> Tuple[List[float], List[float], complex]:
        """
        Packs radial axes into complex array, computes single-pass FFT,
        and unpacks individual power spectra via conjugate symmetry.
        """
        assert len(ax) >= self.N and len(ay) >= self.N, "Input must have at least N samples"

        # 1. Hann window & complex packing: z[n] = ax[n]*w[n] + j*ay[n]*w[n]
        z = [complex(ax[n] * self.hann[n], ay[n] * self.hann[n]) for n in range(self.N)]

        # 2. Complex FFT
        Z = cooley_tukey_fft(z)

        # 3. Single-Pass Spectrum Separation
        px = [0.0] * (self.N // 2)
        py = [0.0] * (self.N // 2)

        for k in range(self.N // 2):
            Z_k = Z[k]
            Z_sym = Z[0] if k == 0 else Z[self.N - k]
            Z_sym_conj = complex(Z_sym.real, -Z_sym.imag)

            # X[k] = (Z[k] + Z*[N-k]) / 2
            X_k = (Z_k + Z_sym_conj) / 2.0
            # Y[k] = (Z[k] - Z*[N-k]) / 2j
            Y_k = (Z_k - Z_sym_conj) / complex(0, 2)

            px[k] = abs(X_k) ** 2 / self.N
            py[k] = abs(Y_k) ** 2 / self.N

        # Extract 1x fundamental phasor (near shaft frequency, e.g. ~220 RPM / 60 = 3.67 Hz)
        k_1x = max(1, round((220.0 / 60.0) / (self.sample_rate / self.N)))
        z_1x = Z[k_1x] / (self.N / 2)

        return px, py, z_1x

    def compute_features(
        self,
        ax: List[float],
        ay: List[float],
        rpm: float,
        current_ma: float,
        pwm: float,
        temp_c: float,
        rpm_ref: float,
        time_since_cmd: float
    ) -> Dict[str, Any]:
        """
        Extracts Rep F (23 dims) and Rep S (131 dims).
        """
        px, py, z_1x = self.pack_and_fft(ax, ay)

        # Synchronous 1x Phasor Runout Subtraction:
        # E_1x_clean = |Z_1x - Z_0|^2
        dz = z_1x - self.z0
        e1x_clean = (dz.real ** 2) + (dz.imag ** 2)

        # Rep F (23 dims): 20 targets + 3 context
        rep_f = [0.0] * 23
        rep_f[0] = min(2.0, e1x_clean * 4.0)
        rep_f[1] = (current_ma - 80.0) / 60.0
        rep_f[2] = (rpm - rpm_ref) / 20.0

        # Harmonic energy bands (14 bands):
        for i in range(3, 17):
            idx = min(len(px) - 1, i * 4)
            rep_f[i] = px[idx] + py[idx]

        rep_f[17] = sum(px[:20]) / 20.0
        rep_f[18] = pwm
        rep_f[19] = 5.0 / 5.0 # bus voltage
        # 3 Context channels:
        rep_f[20] = rpm_ref / 300.0
        rep_f[21] = temp_c / 60.0
        rep_f[22] = min(60.0, time_since_cmd) / 60.0

        # Rep S (131 dims): 128 order bands + 3 context
        rep_s = [0.0] * 131
        for k in range(128):
            rep_s[k] = px[k % len(px)] + py[k % len(py)]
        rep_s[128] = rep_f[20]
        rep_s[129] = rep_f[21]
        rep_s[130] = rep_f[22]

        return {
            "rep_f": rep_f,
            "rep_s": rep_s,
            "z_1x": (z_1x.real, z_1x.imag),
            "z0": (self.z0.real, self.z0.imag),
            "e1x_clean": e1x_clean
        }

