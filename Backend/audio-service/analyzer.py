"""
analyzer.py - Feature extraction and heuristic scoring for synthetic voice risk.
Computes 9 acoustic features using librosa, maps each to an anomaly score (0-100),
detects temporal anomaly windows, builds 120-bin peaks, and evaluates confidence.

Pure signal analysis: no web framework code.
"""

import time
import logging
import numpy as np
import librosa
from typing import Dict, Any, List, Tuple, Optional

from config import (
    TARGET_SAMPLE_RATE,
    FRAME_LENGTH,
    HOP_LENGTH,
    THRESHOLDS,
    WEIGHTS,
    AGREEMENT_BONUS_5_FEATURES,
    AGREEMENT_BONUS_7_FEATURES,
    ANOMALOUS_FEATURE_THRESHOLD,
    VERDICT_HUMAN_THRESHOLD,
    VERDICT_SYNTHETIC_THRESHOLD,
    PEAKS_COUNT,
    SLIDING_WINDOW_SEC,
    SLIDING_STEP_SEC,
    MAX_ANOMALIES_COUNT,
    DISCLAIMER_TEXT,
)

logger = logging.getLogger("audio_service.analyzer")


def map_piecewise_linear(val: float, cfg: Dict[str, Any]) -> int:
    """Maps a raw feature value to an anomaly score 0-100 (clamped)."""
    if np.isnan(val) or np.isinf(val):
        return int(cfg.get("neutral_score", 40))

    natural = float(cfg["natural"])
    synthetic = float(cfg["synthetic"])
    ascending = bool(cfg["ascending"])

    if ascending:
        if val <= natural:
            score = 0.0
        elif val >= synthetic:
            score = 100.0
        else:
            score = ((val - natural) / (synthetic - natural)) * 100.0
    else:
        if val >= natural:
            score = 0.0
        elif val <= synthetic:
            score = 100.0
        else:
            score = ((natural - val) / (natural - synthetic)) * 100.0

    return int(round(max(0.0, min(100.0, score))))


def get_feature_status(score: int) -> str:
    """Classifies an individual feature score into NORMAL, SUSPICIOUS, or ANOMALOUS."""
    if score < 35:
        return "NORMAL"
    elif score <= 64:
        return "SUSPICIOUS"
    else:
        return "ANOMALOUS"


def build_fallback_feature(fid: str, note_msg: str = "could not be measured") -> Dict[str, Any]:
    """Returns a neutral fallback feature dictionary on computation failure or insufficient data."""
    cfg = THRESHOLDS[fid]
    score = int(cfg.get("neutral_score", 40))
    return {
        "id": fid,
        "name": cfg["name"],
        "value": 0.0,
        "unit": cfg["unit"],
        "score": score,
        "status": get_feature_status(score),
        "note": f"{cfg['name']}: {note_msg}",
    }


def compute_rms_envelope(y: np.ndarray) -> np.ndarray:
    """Computes frame-level RMS energy envelope."""
    return librosa.feature.rms(y=y, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH)[0]


# ==============================================================================
# INDIVIDUAL FEATURE EXTRACTORS
# ==============================================================================

def extract_mfcc_anomaly(y: np.ndarray, sr: int) -> Tuple[float, int, str]:
    """
    1. MFCC ANOMALY: 13 MFCCs plus deltas.
    Measures frame-to-frame variability (mean std of delta MFCCs).
    Very low variability indicates synthetic / vocoded smoothness.
    """
    cfg = THRESHOLDS["mfcc_anomaly"]
    mfccs = librosa.feature.mfcc(
        y=y, sr=sr, n_mfcc=13, n_fft=FRAME_LENGTH, hop_length=HOP_LENGTH
    )
    delta_mfccs = librosa.feature.delta(mfccs)
    stds = np.std(delta_mfccs, axis=1)
    raw_val = float(np.mean(stds))

    score = map_piecewise_linear(raw_val, cfg)
    note = (
        f"Mean delta MFCC std: {raw_val:.3f} "
        f"({'natural dynamic articulatory transitions' if score < 50 else 'unusually smooth vocoder trajectories'})"
    )
    return round(raw_val, 3), score, note


def extract_spectral_flux(
    y: np.ndarray, sr: int, rms: np.ndarray
) -> Tuple[float, int, str]:
    """
    2. SPECTRAL FLUX CONSISTENCY: Spectral flux per frame;
    Coefficient of variation (std/mean) over voiced frames.
    Unnaturally stable flux (low CV) -> higher anomaly.
    """
    cfg = THRESHOLDS["spectral_flux"]
    S = np.abs(librosa.stft(y, n_fft=FRAME_LENGTH, hop_length=HOP_LENGTH))
    diff = np.diff(S, axis=1)
    flux = np.sqrt(np.sum(np.maximum(0, diff) ** 2, axis=0))

    voiced_threshold = max(0.005, float(np.percentile(rms, 25)))
    voiced_mask = rms[1:] > voiced_threshold

    if np.sum(voiced_mask) >= 10:
        flux_voiced = flux[voiced_mask[:len(flux)]]
    else:
        flux_voiced = flux

    mean_flux = float(np.mean(flux_voiced))
    std_flux = float(np.std(flux_voiced))
    raw_val = float(std_flux / (mean_flux + 1e-9))

    score = map_piecewise_linear(raw_val, cfg)
    note = (
        f"Voiced spectral flux CV: {raw_val:.3f} "
        f"({'expected organic acoustic variation' if score < 50 else 'unusually consistent frame spectra'})"
    )
    return round(raw_val, 3), score, note


def extract_silence_purity(
    y: np.ndarray, sr: int, rms: np.ndarray
) -> Tuple[float, int, str, bool]:
    """
    3. SILENCE PURITY: Low-energy frames (percentile-based threshold).
    Measures noise floor (RMS in dBFS) and its variation.
    Near-digital silence (flat zero noise floor) -> higher anomaly.
    No silent frames -> neutral score 40 and note 'no pauses to measure'.
    """
    cfg = THRESHOLDS["silence_purity"]
    p15 = float(np.percentile(rms, 15))
    silence_mask = (rms <= p15) & (rms < 0.04)

    if np.sum(silence_mask) < 6:
        return 0.0, 40, "No pauses to measure background noise floor", True

    silence_rms = rms[silence_mask]
    db_silence = 20.0 * np.log10(np.maximum(silence_rms, 1e-9))
    raw_val = float(np.std(db_silence))

    score = map_piecewise_linear(raw_val, cfg)
    note = (
        f"Pause noise floor std: {raw_val:.3f} dB "
        f"({'natural acoustic room tone' if score < 50 else 'near-digital synthetic pause gating'})"
    )
    return round(raw_val, 3), score, note, False


def extract_highfreq_flatness(
    y: np.ndarray, sr: int, rms: np.ndarray
) -> Tuple[float, int, str]:
    """
    4. HIGH-FREQ FLATNESS: Spectral flatness in the 4-8 kHz band over speech frames,
    plus variability (fricatives s/f/sh are chaotic in real speech).
    Unusually smooth or very weak high band -> higher anomaly.
    """
    cfg = THRESHOLDS["highfreq_flatness"]
    S = np.abs(librosa.stft(y, n_fft=FRAME_LENGTH, hop_length=HOP_LENGTH))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=FRAME_LENGTH)

    hf_mask = (freqs >= 4000) & (freqs <= 8000)
    S_hf = S[hf_mask, :]

    if S_hf.shape[0] < 2:
        return 0.0, 40, "Insufficient sample rate for 4-8 kHz analysis"

    # Per-frame spectral flatness: geometric mean / arithmetic mean
    safe_S = np.maximum(S_hf, 1e-12)
    geom_mean = np.exp(np.mean(np.log(safe_S), axis=0))
    arith_mean = np.mean(safe_S, axis=0) + 1e-12
    flatness = geom_mean / arith_mean

    speech_threshold = max(0.008, float(np.percentile(rms, 25)))
    speech_mask = rms[:len(flatness)] > speech_threshold

    if np.sum(speech_mask) >= 10:
        flatness_speech = flatness[speech_mask]
    else:
        flatness_speech = flatness

    raw_val = float(np.std(flatness_speech))
    score = map_piecewise_linear(raw_val, cfg)
    note = (
        f"4-8 kHz band flatness std: {raw_val:.3f} "
        f"({'turbulent natural consonant dispersion' if score < 50 else 'flat or truncated high-frequency energy'})"
    )
    return round(raw_val, 3), score, note


def extract_harmonic_perfection(y: np.ndarray, sr: int) -> Tuple[float, int, str]:
    """
    5. HARMONIC PERFECTION: librosa.effects.hpss, ratio of harmonic energy to total.
    Overly clean harmonics (near 1.0) -> higher anomaly.
    """
    cfg = THRESHOLDS["harmonic_perfection"]
    y_harm, _ = librosa.effects.hpss(y)
    harm_energy = float(np.sum(y_harm ** 2))
    total_energy = float(np.sum(y ** 2)) + 1e-12
    raw_val = float(harm_energy / total_energy)

    score = map_piecewise_linear(raw_val, cfg)
    note = (
        f"Harmonic energy ratio: {raw_val:.3f} "
        f"({'organic mix of breath and consonant turbulence' if score < 50 else 'sterile, synthetic pitch-locked harmonics'})"
    )
    return round(raw_val, 3), score, note


def extract_energy_flatness(
    y: np.ndarray, sr: int, rms: np.ndarray
) -> Tuple[float, int, str]:
    """
    6. ENERGY FLATNESS: RMS envelope over voiced frames;
    Dynamic range (dB between 10th and 90th percentile).
    Robot-flat energy (very narrow dynamic range) -> higher anomaly.
    """
    cfg = THRESHOLDS["energy_flatness"]
    voiced_thresh = max(0.005, float(np.percentile(rms, 25)))
    voiced_rms = rms[rms > voiced_thresh]

    if len(voiced_rms) < 10:
        voiced_rms = rms

    p10 = float(np.percentile(voiced_rms, 10))
    p90 = float(np.percentile(voiced_rms, 90))
    raw_val = float(20.0 * np.log10(max(p90, 1e-9) / max(p10, 1e-9)))

    score = map_piecewise_linear(raw_val, cfg)
    note = (
        f"Voiced dynamic range: {raw_val:.3f} dB "
        f"({'expressive vocal intensity variance' if score < 50 else 'unnaturally uniform compressed energy'})"
    )
    return round(raw_val, 3), score, note


def extract_pitch_variance(
    y: np.ndarray, sr: int, rms: np.ndarray
) -> Tuple[float, int, str, bool]:
    """
    7. PITCH VARIANCE: f0 with librosa.yin (fmin 65, fmax 400) on voiced frames.
    Standard deviation in SEMITONES.
    Fewer than 20 voiced frames -> neutral score 40 and note.
    """
    cfg = THRESHOLDS["pitch_variance"]
    try:
        f0 = librosa.yin(
            y,
            fmin=65,
            fmax=400,
            sr=sr,
            frame_length=FRAME_LENGTH,
            hop_length=HOP_LENGTH,
        )
    except Exception:
        return 0.0, 40, "Pitch extraction could not identify stable f0 contour", True

    min_len = min(len(f0), len(rms))
    f0 = f0[:min_len]
    energy_mask = rms[:min_len] > max(0.008, float(np.percentile(rms[:min_len], 20)))
    valid_mask = (f0 >= 65.0) & (f0 <= 400.0) & energy_mask

    voiced_count = int(np.sum(valid_mask))
    if voiced_count < 20:
        return (
            0.0,
            40,
            f"Fewer than 20 voiced frames ({voiced_count} found) to evaluate pitch",
            True,
        )

    voiced_f0 = f0[valid_mask]
    semitones = 12.0 * np.log2(np.maximum(voiced_f0, 1e-6) / 65.0)
    raw_val = float(np.std(semitones))

    score = map_piecewise_linear(raw_val, cfg)
    note = (
        f"Pitch variation: {raw_val:.3f} semitones std across {voiced_count} voiced frames "
        f"({'natural expressive intonation' if score < 50 else 'monotone or robotic pitch lock'})"
    )
    return round(raw_val, 3), score, note, False


def extract_zero_crossing_rate(
    y: np.ndarray, sr: int, rms: np.ndarray
) -> Tuple[float, int, str]:
    """
    8. ZERO CROSSING RATE: Mean and std of ZCR over speech frames.
    Unusually low std -> higher anomaly.
    """
    cfg = THRESHOLDS["zero_crossing_rate"]
    zcr = librosa.feature.zero_crossing_rate(
        y, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH
    )[0]

    speech_mask = rms[:len(zcr)] > max(0.008, float(np.percentile(rms, 25)))
    if np.sum(speech_mask) >= 10:
        zcr_speech = zcr[speech_mask]
    else:
        zcr_speech = zcr

    raw_val = float(np.std(zcr_speech))
    zcr_mean = float(np.mean(zcr_speech))

    score = map_piecewise_linear(raw_val, cfg)
    note = (
        f"ZCR std: {raw_val:.3f} (mean: {zcr_mean:.3f}) "
        f"({'healthy vowel-fricative alternation' if score < 50 else 'depressed consonant articulation'})"
    )
    return round(raw_val, 3), score, note


def extract_breathing_pattern(
    y: np.ndarray, sr: int, rms: np.ndarray, duration: float
) -> Tuple[float, int, str, bool]:
    """
    9. BREATHING PATTERN: Low-energy gaps of 0.15 - 1.5 s between speech.
    Checks whether gaps exhibit breath characteristics (spectral centroid 500-3500 Hz).
    Count breath-like events per minute of speech.
    Clips under 6 s -> neutral score with note 'clip too short to judge breathing'.
    """
    cfg = THRESHOLDS["breathing_pattern"]
    if duration < 6.0:
        return 0.0, 40, "Clip too short to judge breathing (requires at least 6s)", True

    dt_frame = HOP_LENGTH / float(sr)
    speech_threshold = max(0.010, float(np.percentile(rms, 30)))
    is_low = (rms < speech_threshold).astype(int)

    # Identify continuous low energy segments
    diffs = np.diff(np.pad(is_low, (1, 1), 'constant'))
    starts = np.where(diffs == 1)[0]
    ends = np.where(diffs == -1)[0]

    breath_count = 0
    deepest_floor = float(np.min(rms)) if len(rms) > 0 else 0.001

    for s_idx, e_idx in zip(starts, ends):
        gap_duration = (e_idx - s_idx) * dt_frame
        if 0.15 <= gap_duration <= 1.5:
            start_sample = int(s_idx * HOP_LENGTH)
            end_sample = min(len(y), int(e_idx * HOP_LENGTH))
            gap_audio = y[start_sample:end_sample]

            if len(gap_audio) > FRAME_LENGTH:
                gap_rms = float(np.mean(rms[s_idx:e_idx]))
                # Check breath criteria: slightly above absolute silence
                if gap_rms > deepest_floor * 1.2:
                    centroids = librosa.feature.spectral_centroid(
                        y=gap_audio, sr=sr, n_fft=FRAME_LENGTH, hop_length=HOP_LENGTH
                    )[0]
                    mean_cent = float(np.mean(centroids))
                    # Breath acoustic noise profile: moderate centroid
                    if 500.0 <= mean_cent <= 3500.0:
                        breath_count += 1

    duration_min = max(0.1, duration / 60.0)
    raw_val = float(breath_count / duration_min)

    # For 10s+ clips with 0 breaths, apply higher anomaly score directly
    if duration >= 10.0 and breath_count == 0:
        score = 85
    else:
        score = map_piecewise_linear(raw_val, cfg)

    note = (
        f"Breaths detected: {breath_count} ({raw_val:.3f} breaths/min over {duration:.1f}s) "
        f"({'natural respiratory pauses' if score < 50 else 'conspicuous absence of inhalation acoustics'})"
    )
    return round(raw_val, 3), score, note, False


# ==============================================================================
# SLIDING WINDOW ANOMALIES & PEAKS
# ==============================================================================

def detect_temporal_anomalies(
    y: np.ndarray, sr: int, rms: np.ndarray
) -> List[Dict[str, Any]]:
    """
    Slides 1.5 s windows with 0.75 s step to compute localized anomaly scores
    for flux CV, energy dynamic range, pitch variance, and ZCR std.
    Merges adjacent flagged windows (local score >= 65) and returns up to 6 items.
    """
    window_samples = int(SLIDING_WINDOW_SEC * sr)
    step_samples = int(SLIDING_STEP_SEC * sr)
    total_samples = len(y)

    flagged_windows = []

    for start in range(0, max(1, total_samples - window_samples + 1), step_samples):
        end = min(total_samples, start + window_samples)
        y_win = y[start:end]
        if len(y_win) < FRAME_LENGTH * 2:
            continue

        t_start = round(start / float(sr), 1)
        t_end = round(end / float(sr), 1)

        win_rms = librosa.feature.rms(
            y=y_win, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH
        )[0]
        if np.max(win_rms) < 0.005:
            continue

        # 1. Local spectral flux CV
        S = np.abs(librosa.stft(y_win, n_fft=FRAME_LENGTH, hop_length=HOP_LENGTH))
        diff = np.diff(S, axis=1)
        flux = np.sqrt(np.sum(np.maximum(0, diff) ** 2, axis=0))
        mean_flux = float(np.mean(flux))
        flux_cv = float(np.std(flux) / (mean_flux + 1e-9)) if mean_flux > 0 else 1.0
        score_flux = map_piecewise_linear(flux_cv, THRESHOLDS["spectral_flux"])

        # 2. Local energy dynamic range
        p10 = float(np.percentile(win_rms, 10))
        p90 = float(np.percentile(win_rms, 90))
        dr = float(20.0 * np.log10(max(p90, 1e-9) / max(p10, 1e-9)))
        score_energy = map_piecewise_linear(dr, THRESHOLDS["energy_flatness"])

        # 3. Local ZCR std
        zcr = librosa.feature.zero_crossing_rate(
            y_win, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH
        )[0]
        zcr_std = float(np.std(zcr))
        score_zcr = map_piecewise_linear(zcr_std, THRESHOLDS["zero_crossing_rate"])

        # Compare candidates
        candidates = [
            (score_flux, "spectral_flux", f"Unnaturally rigid spectral flux (CV {flux_cv:.2f})"),
            (score_energy, "energy_flatness", f"Abnormally compressed energy range ({dr:.1f} dB)"),
            (score_zcr, "zero_crossing_rate", f"Flat consonant zero-crossing rate (std {zcr_std:.3f})"),
        ]
        max_score, max_feature, max_reason = max(candidates, key=lambda c: c[0])

        if max_score >= ANOMALOUS_FEATURE_THRESHOLD:
            flagged_windows.append({
                "t_start": t_start,
                "t_end": t_end,
                "feature": max_feature,
                "score": max_score,
                "reason": max_reason,
            })

    if not flagged_windows:
        return []

    # Merge adjacent overlapping flagged windows
    merged: List[Dict[str, Any]] = []
    current = flagged_windows[0].copy()

    for nxt in flagged_windows[1:]:
        if nxt["t_start"] <= current["t_end"] + 0.1:
            # Overlaps or touches
            current["t_end"] = nxt["t_end"]
            if nxt["score"] > current["score"]:
                current["feature"] = nxt["feature"]
                current["score"] = nxt["score"]
                current["reason"] = nxt["reason"]
        else:
            merged.append(current)
            current = nxt.copy()

    merged.append(current)

    # Return top items up to MAX_ANOMALIES_COUNT without internal score field
    result = []
    for item in merged[:MAX_ANOMALIES_COUNT]:
        result.append({
            "t_start": round(item["t_start"], 1),
            "t_end": round(item["t_end"], 1),
            "feature": item["feature"],
            "reason": item["reason"],
        })
    return result


def extract_peaks_120(rms: np.ndarray) -> List[float]:
    """
    Interpolates the RMS envelope into exactly 120 points normalized by max in range 0-1.
    """
    if len(rms) == 0:
        return [0.0] * PEAKS_COUNT

    x_orig = np.linspace(0, 1, len(rms))
    x_target = np.linspace(0, 1, PEAKS_COUNT)
    interpolated = np.interp(x_target, x_orig, rms)

    max_val = float(np.max(interpolated))
    if max_val > 1e-9:
        normalized = interpolated / max_val
    else:
        normalized = np.zeros(PEAKS_COUNT)

    return [round(float(max(0.0, min(1.0, val))), 3) for val in normalized]


# ==============================================================================
# MAIN ANALYSIS ENTRY POINT
# ==============================================================================

def analyze_audio(
    y: np.ndarray,
    sr: int = TARGET_SAMPLE_RATE,
    original_sr: int = TARGET_SAMPLE_RATE,
) -> Dict[str, Any]:
    """
    Analyzes an audio array and returns synthetic-voice risk indicators.
    Must finish within seconds on 30s clips.
    """
    start_time = time.time()
    duration_sec = round(float(len(y) / float(sr)), 2)

    # Guard against NaN/inf
    if np.isnan(y).any() or np.isinf(y).any():
        y = np.nan_to_num(y, nan=0.0, posinf=0.0, neginf=0.0)

    # Guard against all-zero audio
    peak_amp = float(np.max(np.abs(y))) if len(y) > 0 else 0.0
    if peak_amp < 1e-6:
        raise ValueError("Audio is silent (zero energy)")

    # Pre-compute shared RMS envelope
    rms = compute_rms_envelope(y)

    neutral_fallbacks = 0
    features: List[Dict[str, Any]] = []

    # 1. MFCC Anomaly
    try:
        val, score, note = extract_mfcc_anomaly(y, sr)
        features.append({
            "id": "mfcc_anomaly",
            "name": THRESHOLDS["mfcc_anomaly"]["name"],
            "value": val,
            "unit": THRESHOLDS["mfcc_anomaly"]["unit"],
            "score": score,
            "status": get_feature_status(score),
            "note": note,
        })
    except Exception as e:
        logger.warning(f"Feature mfcc_anomaly failed: {e}")
        neutral_fallbacks += 1
        features.append(build_fallback_feature("mfcc_anomaly"))

    # 2. Spectral Flux
    try:
        val, score, note = extract_spectral_flux(y, sr, rms)
        features.append({
            "id": "spectral_flux",
            "name": THRESHOLDS["spectral_flux"]["name"],
            "value": val,
            "unit": THRESHOLDS["spectral_flux"]["unit"],
            "score": score,
            "status": get_feature_status(score),
            "note": note,
        })
    except Exception as e:
        logger.warning(f"Feature spectral_flux failed: {e}")
        neutral_fallbacks += 1
        features.append(build_fallback_feature("spectral_flux"))

    # 3. Silence Purity
    try:
        val, score, note, is_fb = extract_silence_purity(y, sr, rms)
        if is_fb:
            neutral_fallbacks += 1
        features.append({
            "id": "silence_purity",
            "name": THRESHOLDS["silence_purity"]["name"],
            "value": val,
            "unit": THRESHOLDS["silence_purity"]["unit"],
            "score": score,
            "status": get_feature_status(score),
            "note": note,
        })
    except Exception as e:
        logger.warning(f"Feature silence_purity failed: {e}")
        neutral_fallbacks += 1
        features.append(build_fallback_feature("silence_purity"))

    # 4. High-Freq Flatness
    try:
        val, score, note = extract_highfreq_flatness(y, sr, rms)
        features.append({
            "id": "highfreq_flatness",
            "name": THRESHOLDS["highfreq_flatness"]["name"],
            "value": val,
            "unit": THRESHOLDS["highfreq_flatness"]["unit"],
            "score": score,
            "status": get_feature_status(score),
            "note": note,
        })
    except Exception as e:
        logger.warning(f"Feature highfreq_flatness failed: {e}")
        neutral_fallbacks += 1
        features.append(build_fallback_feature("highfreq_flatness"))

    # 5. Harmonic Perfection
    try:
        val, score, note = extract_harmonic_perfection(y, sr)
        features.append({
            "id": "harmonic_perfection",
            "name": THRESHOLDS["harmonic_perfection"]["name"],
            "value": val,
            "unit": THRESHOLDS["harmonic_perfection"]["unit"],
            "score": score,
            "status": get_feature_status(score),
            "note": note,
        })
    except Exception as e:
        logger.warning(f"Feature harmonic_perfection failed: {e}")
        neutral_fallbacks += 1
        features.append(build_fallback_feature("harmonic_perfection"))

    # 6. Energy Flatness
    try:
        val, score, note = extract_energy_flatness(y, sr, rms)
        features.append({
            "id": "energy_flatness",
            "name": THRESHOLDS["energy_flatness"]["name"],
            "value": val,
            "unit": THRESHOLDS["energy_flatness"]["unit"],
            "score": score,
            "status": get_feature_status(score),
            "note": note,
        })
    except Exception as e:
        logger.warning(f"Feature energy_flatness failed: {e}")
        neutral_fallbacks += 1
        features.append(build_fallback_feature("energy_flatness"))

    # 7. Pitch Variance
    try:
        val, score, note, is_fb = extract_pitch_variance(y, sr, rms)
        if is_fb:
            neutral_fallbacks += 1
        features.append({
            "id": "pitch_variance",
            "name": THRESHOLDS["pitch_variance"]["name"],
            "value": val,
            "unit": THRESHOLDS["pitch_variance"]["unit"],
            "score": score,
            "status": get_feature_status(score),
            "note": note,
        })
    except Exception as e:
        logger.warning(f"Feature pitch_variance failed: {e}")
        neutral_fallbacks += 1
        features.append(build_fallback_feature("pitch_variance"))

    # 8. Zero Crossing Rate
    try:
        val, score, note = extract_zero_crossing_rate(y, sr, rms)
        features.append({
            "id": "zero_crossing_rate",
            "name": THRESHOLDS["zero_crossing_rate"]["name"],
            "value": val,
            "unit": THRESHOLDS["zero_crossing_rate"]["unit"],
            "score": score,
            "status": get_feature_status(score),
            "note": note,
        })
    except Exception as e:
        logger.warning(f"Feature zero_crossing_rate failed: {e}")
        neutral_fallbacks += 1
        features.append(build_fallback_feature("zero_crossing_rate"))

    # 9. Breathing Pattern
    try:
        val, score, note, is_fb = extract_breathing_pattern(y, sr, rms, duration_sec)
        if is_fb:
            neutral_fallbacks += 1
        features.append({
            "id": "breathing_pattern",
            "name": THRESHOLDS["breathing_pattern"]["name"],
            "value": val,
            "unit": THRESHOLDS["breathing_pattern"]["unit"],
            "score": score,
            "status": get_feature_status(score),
            "note": note,
        })
    except Exception as e:
        logger.warning(f"Feature breathing_pattern failed: {e}")
        neutral_fallbacks += 1
        features.append(build_fallback_feature("breathing_pattern"))

    # Overall score calculation
    weighted_sum = sum(WEIGHTS[f["id"]] * f["score"] for f in features)
    anomalous_count = sum(1 for f in features if f["score"] >= ANOMALOUS_FEATURE_THRESHOLD)

    agreement_bonus = 0
    if anomalous_count >= 7:
        agreement_bonus = AGREEMENT_BONUS_7_FEATURES
    elif anomalous_count >= 5:
        agreement_bonus = AGREEMENT_BONUS_5_FEATURES

    overall_score = int(round(max(0.0, min(100.0, weighted_sum + agreement_bonus))))

    # Verdict hint
    if overall_score < VERDICT_HUMAN_THRESHOLD:
        verdict_hint = "likely_human"
    elif overall_score <= VERDICT_SYNTHETIC_THRESHOLD - 1:
        verdict_hint = "uncertain"
    else:
        verdict_hint = "likely_synthetic"

    # Quality & Confidence calculation
    warnings: List[str] = []
    confidence = 0.90

    if duration_sec < 5.0:
        confidence -= 0.25
        warnings.append("Short clips are less reliable (< 5s analyzed)")
    elif duration_sec < 8.0:
        confidence -= 0.12
        warnings.append("Short clips are less reliable (< 8s analyzed)")

    # Bandwidth check
    low_bandwidth = False
    if original_sr <= 8000:
        low_bandwidth = True
        confidence -= 0.15
        warnings.append("Phone-quality audio can make real voices look synthetic")
    else:
        # Check high-frequency energy above 3.4 kHz
        freqs = librosa.fft_frequencies(sr=sr, n_fft=FRAME_LENGTH)
        S = np.abs(librosa.stft(y, n_fft=FRAME_LENGTH, hop_length=HOP_LENGTH))
        high_energy = float(np.sum(S[freqs > 3400, :]))
        total_energy = float(np.sum(S)) + 1e-9
        if (high_energy / total_energy) < 0.015:
            low_bandwidth = True
            confidence -= 0.15
            warnings.append("Phone-quality audio can make real voices look synthetic")

    # Clipping check
    clipping_ratio = round(float(np.mean(np.abs(y) >= 0.99)), 4)
    if clipping_ratio > 0.01:
        confidence -= 0.10
        warnings.append("Significant audio clipping detected (> 1%)")

    # Neutral fallbacks check
    if neutral_fallbacks > 3:
        confidence -= 0.10
        warnings.append("Multiple features lacked sufficient voice data for full analysis")

    confidence = round(max(0.2, min(0.95, confidence)), 2)

    quality = {
        "duration_sec": duration_sec,
        "original_sample_rate": original_sr,
        "clipping_ratio": clipping_ratio,
        "low_bandwidth": low_bandwidth,
        "warnings": warnings,
    }

    # Temporal anomalies
    try:
        anomalies = detect_temporal_anomalies(y, sr, rms)
    except Exception as e:
        logger.warning(f"Temporal anomaly detection failed: {e}")
        anomalies = []

    # Peaks (120 floats)
    peaks = extract_peaks_120(rms)

    elapsed_time = round(time.time() - start_time, 3)
    logger.info(
        f"Analyzed {duration_sec}s audio in {elapsed_time}s: score={overall_score}, verdict={verdict_hint}"
    )

    return {
        "overall_score": overall_score,
        "verdict_hint": verdict_hint,
        "confidence": confidence,
        "features": features,
        "anomalies": anomalies,
        "peaks": peaks,
        "quality": quality,
        "disclaimer": DISCLAIMER_TEXT,
    }
