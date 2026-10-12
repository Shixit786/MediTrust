# MediTrust Audio Service

> **Important Honesty Note:**
> This service generates a **heuristic risk indicator**, **NOT a trained deepfake detector and NOT definitive proof**. It extracts 9 deterministic acoustic features using `librosa` to measure anomalies commonly associated with synthetic voice generation, vocoding, and digital speech synthesis. A low risk score does not guarantee that a voice is human, and an elevated score serves as an early-warning indicator to prompt verification.

---

## 1. System Requirements & Architecture

- **Runtime:** Python 3.10 – 3.13 (64-bit)
- **Framework:** FastAPI running synchronously on a threadpool with `threading.BoundedSemaphore(2)`
- **Binding:** `127.0.0.1:8000` (Localhost loopback only; called exclusively by the Node backend)
- **Audio Standards:** Internal processing resamples all audio to mono 16 kHz float32
- **Duration Limits:** 2.0s to 60.0s (analyzes up to the first 30.0s)
- **Size Limit:** 10 MB maximum upload (streamed in chunks, aborted with `413 FILE_TOO_LARGE`)

---

## 2. Windows Setup & Installation

Follow these PowerShell steps. These commands are formatted to work seamlessly even when your path contains spaces (such as `D:\MediTrust AI\Backend\audio-service`).

### Step A: Install FFmpeg (Recommended for .m4a and .webm formats)
FFmpeg is required to decode `.m4a` and `.webm` files. If you only analyze `.wav` or `.mp3` files, `soundfile` decodes natively.

Run in an administrative PowerShell terminal:
```powershell
winget install Gyan.FFmpeg
```
*(Alternatively, download a build from [ffmpeg.org](https://ffmpeg.org/download.html) and add `bin` to your system `PATH`.)*

> **Note:** Close and reopen your terminal after installing FFmpeg so that PowerShell registers the updated `PATH`.

### Step B: Create and Activate Virtual Environment
Navigate to the `audio-service` folder:
```powershell
Set-Location -LiteralPath "D:\MediTrust AI\Backend\audio-service"
python -m venv venv
```

Activate the virtual environment:
```powershell
& ".\venv\Scripts\Activate.ps1"
```
*(If script execution is restricted on your machine, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

### Step C: Install Dependencies
```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip check
```

---

## 3. Running the Service

Start the local development server:
```powershell
Set-Location -LiteralPath "D:\MediTrust AI\Backend\audio-service"
& ".\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Or run via the Node backend root using npm:
```powershell
Set-Location -LiteralPath "D:\MediTrust AI\Backend"
npm run dev:audio
```

Interactive API documentation will be available locally at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

---

## 4. API Endpoints

### `GET /health`
Returns service availability, librosa version, FFmpeg flag, and operational limits.
```json
{
  "status": "ok",
  "librosa": "0.10.2",
  "ffmpeg": true,
  "maxMb": 10,
  "maxSeconds": 60
}
```

### `POST /analyze`
Accepts multipart form upload (`file`).

**Allowed extensions:** `.wav`, `.mp3`, `.m4a`, `.ogg`, `.webm`, `.flac`.

**Output Schema:**
```json
{
  "overall_score": 72,
  "verdict_hint": "likely_synthetic",
  "confidence": 0.88,
  "features": [
    {
      "id": "mfcc_anomaly",
      "name": "MFCC ANOMALY",
      "value": 0.382,
      "unit": "delta_std",
      "score": 85,
      "status": "ANOMALOUS",
      "note": "Mean delta MFCC std: 0.382 (unusually smooth vocoder trajectories)"
    }
  ],
  "anomalies": [
    {
      "t_start": 4.5,
      "t_end": 6.8,
      "feature": "energy_flatness",
      "reason": "Abnormally compressed energy range (4.8 dB)"
    }
  ],
  "peaks": [0.12, 0.45, ...],
  "quality": {
    "duration_sec": 14.2,
    "original_sample_rate": 44100,
    "clipping_ratio": 0.0002,
    "low_bandwidth": false,
    "warnings": []
  },
  "disclaimer": "Heuristic risk indicator, not proof. A low score does not guarantee a voice is real."
}
```

---

## 5. Offline Tuning Utility

To evaluate feature separation across sample files:
```powershell
& ".\venv\Scripts\python.exe" tune.py
```

To evaluate the holdout set:
```powershell
& ".\venv\Scripts\python.exe" tune.py --holdout
```

---

## 6. Running Tests

Run the self-contained pytest suite:
```powershell
& ".\venv\Scripts\python.exe" -m pytest -v
```
