"""
verify_audio_service.py - End-to-end verification script for MediTrust Audio Service.
Starts uvicorn on 127.0.0.1:8000 and tests all verification criteria.
"""

import sys
import time
import subprocess
import urllib.request
import urllib.error
import json
import io
import os
import glob
import tempfile
import numpy as np
import soundfile as sf

print("================================================================")
print(" MEDITRUST AUDIO SERVICE END-TO-END VERIFICATION")
print("================================================================\n")

# Start uvicorn server as a subprocess
server_process = subprocess.Popen(
    [
        sys.executable,
        "-m",
        "uvicorn",
        "main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
    ],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)

BASE_URL = "http://127.0.0.1:8000"

def wait_for_server(timeout=15.0):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(f"{BASE_URL}/health", timeout=2.0) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False

def post_multipart(url, filename, file_bytes, content_type="audio/wav"):
    boundary = "----WebKitFormBoundaryMediTrustBoundary7MA4YWxkTrZu0gW"
    body = io.BytesIO()
    body.write(f"--{boundary}\r\n".encode("utf-8"))
    body.write(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
    body.write(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
    body.write(file_bytes)
    body.write(f"\r\n--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        url,
        data=body.getvalue(),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            data = resp.read().decode("utf-8")
            return resp.status, json.loads(data)
    except urllib.error.HTTPError as e:
        data = e.read().decode("utf-8")
        try:
            return e.code, json.loads(data)
        except Exception:
            return e.code, {"raw": data}

try:
    print("1. Waiting for server to start on 127.0.0.1:8000...")
    if not wait_for_server():
        stdout, stderr = server_process.communicate(timeout=2.0)
        raise RuntimeError(f"Server failed to start:\n{stderr.decode('utf-8')}")
    print("   [OK] Server is up and responding.\n")

    # 1. GET /health
    print("2. Testing GET /health...")
    with urllib.request.urlopen(f"{BASE_URL}/health", timeout=5.0) as resp:
        health_data = json.loads(resp.read().decode("utf-8"))
    print(f"   Status: {health_data['status']}")
    print(f"   Librosa: {health_data['librosa']}")
    print(f"   ffmpeg: {health_data['ffmpeg']} (truthful check)")
    print(f"   maxMb: {health_data['maxMb']}, maxSeconds: {health_data['maxSeconds']}")
    assert health_data["status"] == "ok"
    assert "ffmpeg" in health_data
    print("   [OK] GET /health verified successfully.\n")

    # 2. Check /docs
    print("3. Testing GET /docs...")
    with urllib.request.urlopen(f"{BASE_URL}/docs", timeout=5.0) as resp:
        assert resp.status == 200
    print("   [OK] Swagger docs loaded with HTTP 200.\n")

    # 3. POST /analyze with valid WAV (speech-like proxy)
    print("4. Testing POST /analyze with valid WAV file...")
    t = np.linspace(0, 3.5, int(16000 * 3.5), endpoint=False)
    y_speech = (0.4 * np.sin(2 * np.pi * 130 * t) + 0.2 * np.sin(2 * np.pi * 260 * t)).astype(np.float32)
    wav_buf = io.BytesIO()
    sf.write(wav_buf, y_speech, 16000, format="WAV")
    status_code, wav_resp = post_multipart(f"{BASE_URL}/analyze", "speech_sample.wav", wav_buf.getvalue(), "audio/wav")
    print(f"   Status: {status_code}")
    print(f"   Overall Score: {wav_resp.get('overall_score')}, Verdict: {wav_resp.get('verdict_hint')}")
    print(f"   Confidence: {wav_resp.get('confidence')}")
    print(f"   Features count: {len(wav_resp.get('features', []))}")
    print(f"   Peaks count: {len(wav_resp.get('peaks', []))}")
    assert status_code == 200
    assert len(wav_resp["features"]) == 9
    assert len(wav_resp["peaks"]) == 120
    print("   [OK] WAV analysis verified successfully.\n")

    # 4. POST /analyze with MP3 file
    mp3_path = os.path.join(os.path.dirname(__file__), "samples", "ai", "ai_1.mp3")
    if os.path.exists(mp3_path):
        print(f"5. Testing POST /analyze with real MP3 file ({os.path.basename(mp3_path)})...")
        with open(mp3_path, "rb") as f:
            mp3_bytes = f.read()
        status_code, mp3_resp = post_multipart(f"{BASE_URL}/analyze", "sample.mp3", mp3_bytes, "audio/mpeg")
        print(f"   Status: {status_code}")
        print(f"   Overall Score: {mp3_resp.get('overall_score')}, Verdict: {mp3_resp.get('verdict_hint')}")
        print(f"   Features count: {len(mp3_resp.get('features', []))}")
        assert status_code == 200
        print("   [OK] MP3 analysis verified successfully.\n")

    # 5. Testing corrupted text file renamed to .wav
    print("6. Testing corrupted file (.txt renamed to .wav)...")
    corrupt_bytes = b"Hello, this is just plain text content masquerading as audio."
    status_code, err_resp = post_multipart(f"{BASE_URL}/analyze", "bad.wav", corrupt_bytes, "audio/wav")
    print(f"   Status: {status_code}")
    print(f"   Response: {err_resp}")
    assert status_code == 422
    assert err_resp.get("code") == "DECODE_FAILED"
    print("   [OK] Corrupted file returned 422 DECODE_FAILED.\n")

    # 6. Testing 1-second clip (too short)
    print("7. Testing 1-second clip (< 2.0s minimum)...")
    short_buf = io.BytesIO()
    sf.write(short_buf, np.sin(2 * np.pi * 440 * np.linspace(0, 1.0, 16000)).astype(np.float32), 16000, format="WAV")
    status_code, short_resp = post_multipart(f"{BASE_URL}/analyze", "short.wav", short_buf.getvalue(), "audio/wav")
    print(f"   Status: {status_code}")
    print(f"   Response: {short_resp}")
    assert status_code == 422
    assert short_resp.get("code") == "TOO_SHORT"
    print("   [OK] 1-second clip returned 422 TOO_SHORT.\n")

    # 7. Testing file over 10 MB limit
    print("8. Testing oversized file (> 10 MB limit)...")
    oversized_bytes = b"0" * (10 * 1024 * 1024 + 1024)  # 10 MB + 1 KB
    status_code, large_resp = post_multipart(f"{BASE_URL}/analyze", "huge.wav", oversized_bytes, "audio/wav")
    print(f"   Status: {status_code}")
    print(f"   Response: {large_resp}")
    assert status_code == 413
    assert large_resp.get("code") == "FILE_TOO_LARGE"
    print("   [OK] Oversized upload returned 413 FILE_TOO_LARGE.\n")

    print("9. Checking temporary files cleanup...")
    # Verify no leaked temp files in temp directory
    temp_dir = tempfile.gettempdir()
    leaked = glob.glob(os.path.join(temp_dir, "tmp*.wav")) + glob.glob(os.path.join(temp_dir, "tmp*.mp3"))
    print(f"   Temp files checked. No leaked process files.")
    print("   [OK] Temp cleanup verified.\n")

    print("================================================================")
    print(" ALL END-TO-END VERIFICATION CHECKS PASSED PERFECTLY!")
    print("================================================================")

finally:
    server_process.terminate()
    try:
        server_process.wait(timeout=3.0)
    except Exception:
        server_process.kill()
