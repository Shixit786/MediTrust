"""
main.py - FastAPI application for MediTrust Synthetic-Voice Risk Service.
Handles multipart streaming uploads, audio decoding, concurrency limiting, and error handling.
"""

import os
import shutil
import tempfile
import threading
import subprocess
import logging
from typing import Tuple, Dict, Any

from fastapi import FastAPI, UploadFile, File, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import soundfile as sf
import librosa
import numpy as np

from config import (
    TARGET_SAMPLE_RATE,
    MIN_DURATION_SEC,
    MAX_DURATION_SEC,
    ANALYZE_MAX_DURATION_SEC,
    MAX_FILE_SIZE_BYTES,
    SEMAPHORE_TIMEOUT_SEC,
    FFMPEG_TIMEOUT_SEC,
    CONCURRENCY_LIMIT,
    ALLOWED_EXTENSIONS,
)
from analyzer import analyze_audio

# Configure logging: log only size in KB, duration, processing time, and result code.
# Never log audio contents, file names, or prompts.
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [audio_service] %(message)s",
)
logger = logging.getLogger("audio_service.main")

app = FastAPI(
    title="MediTrust Synthetic-Voice Risk Service",
    description="Heuristic audio risk indicator built from acoustic feature extraction.",
    version="1.0.0",
)

# Concurrency semaphore: at most 2 simultaneous analyze requests in worker threads
analysis_semaphore = threading.BoundedSemaphore(CONCURRENCY_LIMIT)


class AppException(Exception):
    """Structured application exception with HTTP status, code, and error message."""
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)


@app.exception_handler(AppException)
def app_exception_handler(_: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "code": exc.code},
    )


@app.exception_handler(RequestValidationError)
def validation_exception_handler(_: Request, __: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "Invalid request parameter or file", "code": "INVALID_REQUEST"},
    )


@app.exception_handler(Exception)
def general_exception_handler(_: Request, exc: Exception):
    logger.error(f"Internal server error: {type(exc).__name__}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal processing error occurred", "code": "INTERNAL_ERROR"},
    )


def is_ffmpeg_installed() -> bool:
    """Checks whether ffmpeg is available in system PATH."""
    return shutil.which("ffmpeg") is not None


def decode_with_ffmpeg(input_path: str) -> Tuple[np.ndarray, int, float]:
    """
    Decodes audio to 16 kHz mono float32 using ffmpeg via subprocess.
    Uses argument list, no shell=True, and a 20-second timeout.
    """
    if not is_ffmpeg_installed():
        raise AppException(
            415,
            "UNSUPPORTED_AUDIO",
            "ffmpeg is required to decode this audio format (.m4a/.webm). Please install ffmpeg or upload WAV/MP3.",
        )

    # Probe original sample rate and duration first if ffprobe is present, or parse from ffmpeg output
    temp_wav = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
            temp_wav = tf.name

        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            input_path,
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(TARGET_SAMPLE_RATE),
            "-f",
            "wav",
            temp_wav,
        ]

        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=FFMPEG_TIMEOUT_SEC,
            check=False,
        )

        if result.returncode != 0:
            raise AppException(
                422,
                "DECODE_FAILED",
                "ffmpeg failed to decode the audio stream.",
            )

        data, sr = sf.read(temp_wav, dtype="float32")
        duration = len(data) / float(sr)
        return data, TARGET_SAMPLE_RATE, duration
    except subprocess.TimeoutExpired:
        raise AppException(
            504,
            "DECODE_FAILED",
            "ffmpeg decoding timed out after 20 seconds.",
        )
    finally:
        if temp_wav and os.path.exists(temp_wav):
            try:
                os.unlink(temp_wav)
            except Exception:
                pass


def decode_audio_file(file_path: str, ext: str) -> Tuple[np.ndarray, int, float]:
    """
    Decodes audio file into 16 kHz mono float32 numpy array.
    Decoding order:
      1. soundfile (supports wav, flac, ogg, mp3 with modern libsndfile)
      2. librosa.load fallback
      3. ffmpeg subprocess (required for m4a and webm)
    Returns: (audio_mono_16k, original_sample_rate, original_duration_sec)
    """
    # Attempt 1: soundfile
    try:
        data, orig_sr = sf.read(file_path, dtype="float32")
        if data.ndim > 1:
            data = np.mean(data, axis=1)
        orig_duration = len(data) / float(orig_sr)

        if orig_sr != TARGET_SAMPLE_RATE:
            data_16k = librosa.resample(
                data, orig_sr=orig_sr, target_sr=TARGET_SAMPLE_RATE
            )
        else:
            data_16k = data

        return data_16k, orig_sr, orig_duration
    except Exception:
        pass

    # Attempt 2: librosa.load
    try:
        data, orig_sr = librosa.load(file_path, sr=None, mono=True)
        orig_duration = len(data) / float(orig_sr)

        if orig_sr != TARGET_SAMPLE_RATE:
            data_16k = librosa.resample(
                data, orig_sr=orig_sr, target_sr=TARGET_SAMPLE_RATE
            )
        else:
            data_16k = data

        return data_16k, orig_sr, orig_duration
    except Exception:
        pass

    # Attempt 3: ffmpeg via subprocess
    if is_ffmpeg_installed():
        try:
            return decode_with_ffmpeg(file_path)
        except AppException:
            raise
        except Exception:
            pass

    # If format needs ffmpeg (.m4a, .webm) and ffmpeg is missing
    if ext in {".m4a", ".webm"}:
        raise AppException(
            415,
            "UNSUPPORTED_AUDIO",
            f"ffmpeg is required to decode {ext} audio files. Please install ffmpeg or upload WAV/MP3.",
        )

    # For wav, mp3, flac, ogg: decode failed due to invalid / corrupted data
    raise AppException(
        422,
        "DECODE_FAILED",
        f"Failed to decode audio file. The {ext} file may be corrupted, invalid, or empty.",
    )


@app.get("/health")
def health_endpoint():
    """
    Health check returning status, librosa version, ffmpeg availability flag,
    and configured audio limits.
    """
    return {
        "status": "ok",
        "librosa": librosa.__version__,
        "ffmpeg": is_ffmpeg_installed(),
        "maxMb": 10,
        "maxSeconds": int(MAX_DURATION_SEC),
    }


@app.post("/analyze")
def analyze_endpoint(file: UploadFile = File(...)):
    """
    Synchronous analysis endpoint running in threadpool with BoundedSemaphore(2).
    Streams upload to temp file up to 10 MB, decodes, checks duration limits,
    and runs the 9-feature risk analysis.
    """
    # 1. Acquire concurrency semaphore with 10s timeout
    acquired = analysis_semaphore.acquire(timeout=SEMAPHORE_TIMEOUT_SEC)
    if not acquired:
        logger.warning("Analyze request rejected: concurrency slot busy")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"error": "Audio service is currently busy. Please retry shortly.", "code": "BUSY"},
        )

    temp_path: Optional[str] = None
    start_time = os.times().elapsed

    try:
        # 2. Check extension
        filename = file.filename or ""
        _, raw_ext = os.path.splitext(filename)
        ext = raw_ext.lower()

        if ext not in ALLOWED_EXTENSIONS:
            logger.info("Rejected request: unsupported file extension")
            raise AppException(
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                "UNSUPPORTED_AUDIO",
                f"Unsupported audio format '{raw_ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )

        # 3. Stream upload in chunks to temp file with 10 MB hard limit
        total_bytes = 0
        chunk_size = 64 * 1024  # 64 KB

        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tf:
            temp_path = tf.name
            while True:
                chunk = file.file.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_SIZE_BYTES:
                    tf.close()
                    try:
                        os.unlink(temp_path)
                    except Exception:
                        pass
                    temp_path = None
                    logger.info(f"Rejected request: file too large ({total_bytes / 1024:.1f} KB)")
                    raise AppException(
                        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        "FILE_TOO_LARGE",
                        "Uploaded audio file exceeds the maximum 10 MB limit.",
                    )
                tf.write(chunk)

        size_kb = round(total_bytes / 1024.0, 1)

        # 4. Decode audio
        y_16k, orig_sr, orig_duration = decode_audio_file(temp_path, ext)

        # 5. Check duration limits
        if orig_duration < MIN_DURATION_SEC:
            logger.info(f"Rejected request: duration too short ({orig_duration:.2f}s, size={size_kb}KB)")
            raise AppException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "TOO_SHORT",
                f"Audio duration ({orig_duration:.1f}s) is below the minimum required 2.0 seconds.",
            )

        if orig_duration > MAX_DURATION_SEC:
            logger.info(f"Rejected request: duration too long ({orig_duration:.2f}s, size={size_kb}KB)")
            raise AppException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "TOO_LONG",
                f"Audio duration ({orig_duration:.1f}s) exceeds the maximum allowed 60.0 seconds.",
            )

        # 6. Cap analysis to at most the first 30 seconds
        if len(y_16k) > int(ANALYZE_MAX_DURATION_SEC * TARGET_SAMPLE_RATE):
            y_analyzed = y_16k[: int(ANALYZE_MAX_DURATION_SEC * TARGET_SAMPLE_RATE)]
        else:
            y_analyzed = y_16k

        # 7. Analyze acoustic features
        try:
            result = analyze_audio(y_analyzed, sr=TARGET_SAMPLE_RATE, original_sr=orig_sr)
        except ValueError as ve:
            if "silent" in str(ve).lower():
                raise AppException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "DECODE_FAILED",
                    "Audio is silent (zero acoustic energy detected).",
                )
            raise AppException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "DECODE_FAILED",
                f"Audio processing error: {ve}",
            )

        elapsed = round(os.times().elapsed - start_time, 3)
        logger.info(
            f"Success: size={size_kb}KB, duration={orig_duration:.1f}s, time={elapsed}s, code=200, score={result['overall_score']}"
        )

        return JSONResponse(status_code=200, content=result)

    except AppException:
        raise
    except Exception as exc:
        elapsed = round(os.times().elapsed - start_time, 3)
        logger.error(f"Processing error: time={elapsed}s, error={type(exc).__name__}")
        raise AppException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "INTERNAL_ERROR",
            "An error occurred while processing the audio.",
        )
    finally:
        # ALWAYS delete temp file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception:
                pass
        # ALWAYS release concurrency semaphore
        analysis_semaphore.release()
