# MediTrust Voice Samples

This directory holds local test audio clips used by the MediTrust Voice Shield interface and local development smoke tests.

## Files

- `ai_deepfake.mp3`: Sample synthetic voice / AI-generated audio clip for deepfake risk evaluation.
- `real_human.m4a`: Sample authentic human speech audio clip for baseline testing.

## Usage & Replacement

- These files serve as default local test clips for client demonstrations and offline verification.
- You can replace these files with any custom `.wav`, `.mp3`, `.m4a`, `.ogg`, `.webm`, or `.flac` recordings.
- Keep the filenames matching what the frontend and test suite reference (`ai_deepfake.<ext>` and `real_human.<ext>`), with individual clip sizes under 10 MB and recommended durations between 8 and 30 seconds for optimal acoustic feature resolution.
