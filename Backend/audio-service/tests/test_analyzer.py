"""
test_analyzer.py - Pytest suite for synthetic-voice feature analysis and FastAPI endpoints.
Uses synthesized audio signals (sine, white noise, speech-like) for fast, self-contained testing.
"""

import io
import json
import os
import sys
import numpy as np
import pytest
import soundfile as sf
from fastapi import UploadFile

# Ensure audio-service directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import TARGET_SAMPLE_RATE, PEAKS_COUNT
from analyzer import analyze_audio
from main import app, health_endpoint, analyze_endpoint, AppException


def synthesize_sine_wave(freq: float = 440.0, duration: float = 3.0, sr: int = TARGET_SAMPLE_RATE) -> np.ndarray:
    """Synthesizes a pure sine wave tone."""
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    return 0.5 * np.sin(2.0 * np.pi * freq * t).astype(np.float32)


def synthesize_white_noise(duration: float = 3.0, sr: int = TARGET_SAMPLE_RATE) -> np.ndarray:
    """Synthesizes uniform white noise."""
    return (np.random.uniform(-0.5, 0.5, int(sr * duration))).astype(np.float32)


def synthesize_speech_like(duration: float = 4.0, sr: int = TARGET_SAMPLE_RATE) -> np.ndarray:
    """
    Synthesizes a speech-like proxy signal:
    Amplitude-modulated harmonic series with wandering pitch, formant-like filtering, and breath noise.
    """
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)

    # Wandering fundamental pitch (120 Hz with 15 Hz vibrato)
    f0 = 120.0 + 15.0 * np.sin(2.0 * np.pi * 2.5 * t)
    phase = 2.0 * np.pi * np.cumsum(f0) / sr

    # Harmonic series (fundamentals + 4 harmonics)
    signal = 0.4 * np.sin(phase)
    signal += 0.25 * np.sin(2 * phase)
    signal += 0.15 * np.sin(3 * phase)
    signal += 0.10 * np.sin(4 * phase)
    signal += 0.05 * np.sin(5 * phase)

    # Syllabic amplitude envelope (2.0 Hz modulation)
    envelope = 0.5 * (1.0 + np.sin(2.0 * np.pi * 2.0 * t))
    signal *= envelope

    # Low additive noise (breath / consonants)
    noise = 0.02 * np.random.randn(len(t))
    signal += noise

    return signal.astype(np.float32)


def audio_to_wav_bytes(y: np.ndarray, sr: int = TARGET_SAMPLE_RATE) -> bytes:
    """Encodes float numpy array into WAV bytes."""
    buf = io.BytesIO()
    sf.write(buf, y, sr, format="WAV")
    buf.seek(0)
    return buf.read()


# ==============================================================================
# ANALYZER UNIT TESTS
# ==============================================================================

def test_speech_like_signal_feature_structure():
    """Asserts that exactly 9 features are returned with valid scores, units, and statuses."""
    y = synthesize_speech_like(duration=4.0)
    result = analyze_audio(y, sr=TARGET_SAMPLE_RATE, original_sr=TARGET_SAMPLE_RATE)

    assert "features" in result
    features = result["features"]
    assert len(features) == 9, f"Expected 9 features, got {len(features)}"

    expected_ids = [
        "mfcc_anomaly",
        "spectral_flux",
        "silence_purity",
        "highfreq_flatness",
        "harmonic_perfection",
        "energy_flatness",
        "pitch_variance",
        "zero_crossing_rate",
        "breathing_pattern",
    ]

    for idx, f in enumerate(features):
        assert f["id"] == expected_ids[idx]
        assert isinstance(f["name"], str) and len(f["name"]) > 0
        assert isinstance(f["value"], float)
        assert isinstance(f["unit"], str)
        assert isinstance(f["score"], int)
        assert 0 <= f["score"] <= 100
        assert f["status"] in ["NORMAL", "SUSPICIOUS", "ANOMALOUS"]
        assert isinstance(f["note"], str) and len(f["note"]) > 0

    assert isinstance(result["overall_score"], int)
    assert 0 <= result["overall_score"] <= 100
    assert result["verdict_hint"] in ["likely_human", "uncertain", "likely_synthetic"]
    assert 0.2 <= result["confidence"] <= 0.95


def test_peaks_120_length_and_normalization():
    """Asserts that peaks array contains exactly 120 floats bounded in 0-1."""
    y = synthesize_speech_like(duration=3.5)
    result = analyze_audio(y, sr=TARGET_SAMPLE_RATE)

    peaks = result["peaks"]
    assert len(peaks) == PEAKS_COUNT
    for p in peaks:
        assert isinstance(p, float)
        assert 0.0 <= p <= 1.0


def test_silent_audio_rejection():
    """Asserts that all-zero silent audio raises an error."""
    silent = np.zeros(TARGET_SAMPLE_RATE * 3, dtype=np.float32)
    with pytest.raises(ValueError, match="silent"):
        analyze_audio(silent, sr=TARGET_SAMPLE_RATE)


def test_sine_and_noise_signals_run_without_exception():
    """Asserts that pure sine and white noise extract features without runtime error."""
    sine = synthesize_sine_wave(duration=3.0)
    res_sine = analyze_audio(sine, sr=TARGET_SAMPLE_RATE)
    assert len(res_sine["features"]) == 9
    assert res_sine["overall_score"] >= 0

    noise = synthesize_white_noise(duration=3.0)
    res_noise = analyze_audio(noise, sr=TARGET_SAMPLE_RATE)
    assert len(res_noise["features"]) == 9
    assert res_noise["overall_score"] >= 0


# ==============================================================================
# HTTP ENDPOINT TESTS VIA DIRECT CALLS
# ==============================================================================

def test_health_endpoint():
    """Asserts GET /health returns 200 payload with required keys."""
    data = health_endpoint()
    assert data["status"] == "ok"
    assert "librosa" in data
    assert "ffmpeg" in data
    assert data["maxMb"] == 10
    assert data["maxSeconds"] == 60


def test_analyze_valid_wav_upload():
    """Asserts analyze_endpoint with valid WAV bytes returns 200 response."""
    y = synthesize_speech_like(duration=3.0)
    wav_bytes = audio_to_wav_bytes(y)

    upload = UploadFile(filename="test_speech.wav", file=io.BytesIO(wav_bytes))
    response = analyze_endpoint(upload)
    assert response.status_code == 200

    data = json.loads(response.body.decode("utf-8"))
    assert "overall_score" in data
    assert "verdict_hint" in data
    assert len(data["features"]) == 9
    assert len(data["peaks"]) == 120
    assert "disclaimer" in data


def test_duration_under_2s_returns_too_short():
    """Asserts audio under 2.0 seconds raises AppException with TOO_SHORT."""
    short_audio = synthesize_sine_wave(duration=1.0)
    wav_bytes = audio_to_wav_bytes(short_audio)

    upload = UploadFile(filename="short.wav", file=io.BytesIO(wav_bytes))
    with pytest.raises(AppException) as exc_info:
        analyze_endpoint(upload)
    assert exc_info.value.code == "TOO_SHORT"
    assert exc_info.value.status_code == 422


def test_duration_over_60s_returns_too_long():
    """Asserts audio over 60.0 seconds raises AppException with TOO_LONG."""
    long_audio = synthesize_sine_wave(duration=65.0)
    wav_bytes = audio_to_wav_bytes(long_audio)

    upload = UploadFile(filename="long.wav", file=io.BytesIO(wav_bytes))
    with pytest.raises(AppException) as exc_info:
        analyze_endpoint(upload)
    assert exc_info.value.code == "TOO_LONG"
    assert exc_info.value.status_code == 422


def test_corrupted_file_renamed_to_wav_returns_decode_failed():
    """Asserts text file renamed to .wav raises AppException with DECODE_FAILED."""
    fake_wav_bytes = b"This is not a real audio file header"

    upload = UploadFile(filename="fake.wav", file=io.BytesIO(fake_wav_bytes))
    with pytest.raises(AppException) as exc_info:
        analyze_endpoint(upload)
    assert exc_info.value.code == "DECODE_FAILED"
    assert exc_info.value.status_code == 422


def test_unsupported_extension_returns_unsupported():
    """Asserts unsupported extension raises AppException with UNSUPPORTED_AUDIO."""
    upload = UploadFile(filename="document.pdf", file=io.BytesIO(b"%PDF-1.4 ..."))
    with pytest.raises(AppException) as exc_info:
        analyze_endpoint(upload)
    assert exc_info.value.code == "UNSUPPORTED_AUDIO"
    assert exc_info.value.status_code == 415
