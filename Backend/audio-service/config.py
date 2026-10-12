"""
config.py - Tunable parameters, feature thresholds, weights, and audio limits for MediTrust Audio Service.
Every tunable constant and threshold lives in this file.
"""

from typing import Dict, Any

# ==============================================================================
# AUDIO PROCESSING & SYSTEM CONSTRAINTS
# ==============================================================================
TARGET_SAMPLE_RATE: int = 16000
MIN_DURATION_SEC: float = 2.0
MAX_DURATION_SEC: float = 60.0
ANALYZE_MAX_DURATION_SEC: float = 30.0

MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB limit
SEMAPHORE_TIMEOUT_SEC: float = 10.0
FFMPEG_TIMEOUT_SEC: float = 20.0
CONCURRENCY_LIMIT: int = 2

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac"}

# Frame / Hop parameters at 16 kHz
FRAME_LENGTH: int = 1024
HOP_LENGTH: int = 256

# Frontend outputs
PEAKS_COUNT: int = 120
SLIDING_WINDOW_SEC: float = 1.5
SLIDING_STEP_SEC: float = 0.75
MAX_ANOMALIES_COUNT: int = 6

# ==============================================================================
# FEATURE WEIGHTS (must sum to 1.0)
# ==============================================================================
WEIGHTS: Dict[str, float] = {
    "mfcc_anomaly": 0.14,
    "spectral_flux": 0.10,
    "silence_purity": 0.12,
    "highfreq_flatness": 0.10,
    "harmonic_perfection": 0.10,
    "energy_flatness": 0.12,
    "pitch_variance": 0.14,
    "zero_crossing_rate": 0.06,
    "breathing_pattern": 0.12,
}

# Agreement bonus settings
AGREEMENT_BONUS_5_FEATURES: int = 5
AGREEMENT_BONUS_7_FEATURES: int = 10
ANOMALOUS_FEATURE_THRESHOLD: int = 65

# Verdict boundaries
VERDICT_HUMAN_THRESHOLD: int = 35
VERDICT_SYNTHETIC_THRESHOLD: int = 65

# Status thresholds for individual features
STATUS_NORMAL_MAX: int = 34
STATUS_SUSPICIOUS_MAX: int = 64

# ==============================================================================
# FEATURE THRESHOLDS FOR PIECEWISE-LINEAR SCORING (0-100)
#
# Each entry defines:
#   - natural: value corresponding to score 0 (typical organic human voice)
#   - synthetic: value corresponding to score 100 (synthetic/vocoded artifact)
#   - ascending: if True, higher raw value -> higher anomaly score;
#                if False, lower raw value -> higher anomaly score.
# ==============================================================================
THRESHOLDS: Dict[str, Dict[str, Any]] = {
    "mfcc_anomaly": {
        "name": "MFCC ANOMALY",
        "unit": "delta_std",
        "natural": 1.70,
        "synthetic": 0.45,
        "ascending": False,
        "neutral_score": 40,
    },
    "spectral_flux": {
        "name": "SPECTRAL FLUX CONSISTENCY",
        "unit": "cv",
        "natural": 0.90,
        "synthetic": 0.22,
        "ascending": False,
        "neutral_score": 40,
    },
    "silence_purity": {
        "name": "SILENCE PURITY",
        "unit": "dB_std",
        "natural": 4.5,
        "synthetic": 0.4,
        "ascending": False,
        "neutral_score": 40,
    },
    "highfreq_flatness": {
        "name": "HIGH-FREQ FLATNESS",
        "unit": "flatness_std",
        "natural": 0.14,
        "synthetic": 0.02,
        "ascending": False,
        "neutral_score": 40,
    },
    "harmonic_perfection": {
        "name": "HARMONIC PERFECTION",
        "unit": "ratio",
        "natural": 0.55,
        "synthetic": 0.92,
        "ascending": True,
        "neutral_score": 40,
    },
    "energy_flatness": {
        "name": "ENERGY FLATNESS",
        "unit": "dB_range",
        "natural": 24.0,
        "synthetic": 5.5,
        "ascending": False,
        "neutral_score": 40,
    },
    "pitch_variance": {
        "name": "PITCH VARIANCE",
        "unit": "semitones_std",
        "natural": 4.8,
        "synthetic": 0.9,
        "ascending": False,
        "neutral_score": 40,
    },
    "zero_crossing_rate": {
        "name": "ZERO CROSSING RATE",
        "unit": "zcr_std",
        "natural": 0.080,
        "synthetic": 0.018,
        "ascending": False,
        "neutral_score": 40,
    },
    "breathing_pattern": {
        "name": "BREATHING PATTERN",
        "unit": "breaths/min",
        "natural": 12.0,
        "synthetic": 0.0,
        "ascending": False,
        "neutral_score": 40,
    },
}

# Disclaimer string required in all responses
DISCLAIMER_TEXT: str = "Heuristic risk indicator, not proof. A low score does not guarantee a voice is real."
