"""
tune.py - Offline tuning report over samples/ directory.
Evaluates synthetic-voice acoustic features on samples/ai and samples/human.
Read-only: never modifies config.py or audio files.

Usage:
    python tune.py            # Evaluates samples/ai and samples/human
    python tune.py --holdout  # Evaluates samples/holdout/ai and samples/holdout/human
"""

import os
import sys
import argparse
from typing import List, Dict, Any, Tuple
import numpy as np

# Ensure audio-service directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (
    ALLOWED_EXTENSIONS,
    TARGET_SAMPLE_RATE,
    ANALYZE_MAX_DURATION_SEC,
    WEIGHTS,
)
from main import decode_audio_file
from analyzer import analyze_audio


def find_audio_files(directory: str) -> List[str]:
    """Recursively searches for supported audio files, ignoring .gitkeep."""
    audio_paths = []
    if not os.path.exists(directory):
        return []

    for root, _, files in os.walk(directory):
        for f in files:
            if f.lower() == ".gitkeep":
                continue
            ext = os.path.splitext(f)[1].lower()
            if ext in ALLOWED_EXTENSIONS:
                audio_paths.append(os.path.join(root, f))
            else:
                print(f"[WARN] Skipping unsupported file: {f}")
    return sorted(audio_paths)


def process_file(file_path: str, label: str) -> Dict[str, Any]:
    """Decodes and analyzes an audio file, returning its score breakdown."""
    ext = os.path.splitext(file_path)[1].lower()
    y, orig_sr, orig_dur = decode_audio_file(file_path, ext)

    if len(y) > int(ANALYZE_MAX_DURATION_SEC * TARGET_SAMPLE_RATE):
        y = y[: int(ANALYZE_MAX_DURATION_SEC * TARGET_SAMPLE_RATE)]

    analysis = analyze_audio(y, sr=TARGET_SAMPLE_RATE, original_sr=orig_sr)

    feature_scores = {f["id"]: f["score"] for f in analysis["features"]}

    return {
        "basename": os.path.basename(file_path),
        "label": label,
        "duration": round(orig_dur, 1),
        "overall_score": analysis["overall_score"],
        "verdict_hint": analysis["verdict_hint"],
        "confidence": analysis["confidence"],
        "feature_scores": feature_scores,
    }


def main():
    parser = argparse.ArgumentParser(description="MediTrust Audio Tuning Report")
    parser.add_argument(
        "--holdout",
        action="store_true",
        help="Evaluate holdout samples without tuning suggestions",
    )
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    if args.holdout:
        ai_dir = os.path.join(base_dir, "samples", "holdout", "ai")
        human_dir = os.path.join(base_dir, "samples", "holdout", "human")
        mode_title = "HOLDOUT EVALUATION REPORT"
    else:
        ai_dir = os.path.join(base_dir, "samples", "ai")
        human_dir = os.path.join(base_dir, "samples", "human")
        mode_title = "TUNING SAMPLES REPORT"

    print("=" * 80)
    print(f" MEDITRUST AUDIO SERVICE - {mode_title}")
    print("=" * 80)

    ai_files = find_audio_files(ai_dir)
    human_files = find_audio_files(human_dir)

    all_results: List[Dict[str, Any]] = []
    ai_results: List[Dict[str, Any]] = []
    human_results: List[Dict[str, Any]] = []

    # Process AI samples
    for f in ai_files:
        try:
            res = process_file(f, "AI")
            ai_results.append(res)
            all_results.append(res)
        except Exception as e:
            print(f"[ERROR] Failed to process AI sample {os.path.basename(f)}: {e}")

    # Process Human samples
    for f in human_files:
        try:
            res = process_file(f, "HUMAN")
            human_results.append(res)
            all_results.append(res)
        except Exception as e:
            print(f"[ERROR] Failed to process Human sample {os.path.basename(f)}: {e}")

    # Print breakdown table
    feat_keys = list(WEIGHTS.keys())
    short_feats = [k[:6].upper() for k in feat_keys]

    header = f"{'FILENAME':<24} {'CLS':<5} {'DUR':<5} {'SCORE':<6} " + " ".join(f"{h:<6}" for h in short_feats)
    print("\n" + header)
    print("-" * len(header))

    if not all_results:
        print("(No valid audio samples found in target directories)")
    else:
        for r in all_results:
            scores_str = " ".join(f"{r['feature_scores'].get(k, 0):<6}" for k in feat_keys)
            print(
                f"{r['basename'][:23]:<24} {r['label']:<5} {r['duration']:<5.1f} {r['overall_score']:<6} {scores_str}"
            )

    n_ai = len(ai_results)
    n_human = len(human_results)

    # Statistical Evaluation
    if n_ai < 3 or n_human < 3:
        print(f"\nsample set too small for separation statistics (n_ai={n_ai}, n_human={n_human})")
        return

    # Print summary statistics
    ai_scores = [r["overall_score"] for r in ai_results]
    human_scores = [r["overall_score"] for r in human_results]

    print("\n" + "=" * 80)
    print(" SUMMARY STATISTICS")
    print("=" * 80)
    print(
        f"AI Samples (n={n_ai}):    mean={np.mean(ai_scores):.1f}, min={np.min(ai_scores)}, max={np.max(ai_scores)}"
    )
    print(
        f"Human Samples (n={n_human}): mean={np.mean(human_scores):.1f}, min={np.min(human_scores)}, max={np.max(human_scores)}"
    )

    if not args.holdout:
        print("\n" + "-" * 80)
        print(" PER-FEATURE SEPARATION & TUNING SUGGESTIONS")
        print("-" * 80)

        for fid in feat_keys:
            ai_feat = [r["feature_scores"][fid] for r in ai_results]
            human_feat = [r["feature_scores"][fid] for r in human_results]

            mean_ai = float(np.mean(ai_feat))
            mean_human = float(np.mean(human_feat))
            diff = abs(mean_ai - mean_human)

            status = "GOOD" if diff >= 15 else "MODERATE" if diff >= 10 else "POOR"
            print(f"Feature: {fid:<20} | AI mean: {mean_ai:<5.1f} | Human mean: {mean_human:<5.1f} | Diff: {diff:<4.1f} [{status}]")

            if diff < 10:
                if mean_ai <= mean_human:
                    suggestion = "AI scores lower than/equal to human. Invert or adjust synthetic threshold towards AI values."
                else:
                    suggestion = "Separation margin < 10. Consider widening gap between natural and synthetic thresholds in config.py."
                print(f"  --> SUGGESTION: {suggestion}")


if __name__ == "__main__":
    main()
