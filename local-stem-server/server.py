"""
SonicForge AI - Free Local Neural Stem Separation Engine
Powered by Meta AI Demucs (Hybrid Transformer v4)
Provides free, unlimited 4-stem and 2-stem separation running locally on the user's machine.
"""

import os
import sys
import uuid
import shutil
import asyncio
import subprocess
import re
import wave
import struct
import math
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

# Base storage directories
BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"
JOBS_DIR = STORAGE_DIR / "jobs"
JOBS_DIR.mkdir(parents=True, exist_ok=True)

# Detect computation device
try:
    import torch
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    DEVICE_NAME = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "Host CPU"
except Exception:
    DEVICE = "cpu"
    DEVICE_NAME = "Host CPU"

app = FastAPI(
    title="SonicForge AI - Neural Stem Separation Engine",
    description="Dual-environment music separation server running Demucs (HTDemucs v4) for local or hosted cloud deployment",
    version="1.1.0",
)

# Optional API key protection for hosted production environments
STEM_API_KEY = os.environ.get("STEM_API_KEY", "").strip()

def verify_stem_auth(request: Request):
    """
    Validates API key when running on a hosted/production server.
    When STEM_API_KEY is not configured (e.g. local development), authentication is skipped.
    """
    if not STEM_API_KEY:
        return True

    auth_header = request.headers.get("Authorization", "").strip()
    x_api_key = request.headers.get("X-API-Key", "").strip()

    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif x_api_key:
        token = x_api_key

    if token != STEM_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid or missing STEM_API_KEY for this hosted Demucs engine."
        )
    return True

# Configurable CORS origins for local dev, custom domains, and Vercel deployments
custom_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "*"
    ] + custom_origins,
    allow_origin_regex=r"^(https://.*\.vercel\.app|http://(localhost|127\.0\.0\.1)(:\d+)?)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory thread-safe job registry
# Format: job_id -> { id, status, preset, fileName, createdAt, statusDetails, progress, stems, error }
job_registry: Dict[str, Dict[str, Any]] = {}
registry_lock = asyncio.Lock()

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac", ".ogg", ".m4a"}
MAX_FILE_SIZE_MB = 100
DEFAULT_PORT = int(os.environ.get("PORT", os.environ.get("LOCAL_STEM_PORT", "8765")))


@app.get("/")
async def root_index(request: Request):
    """
    Root status and navigation endpoint.
    Dynamically renders endpoints using the actual incoming host/protocol.
    """
    base_url = str(request.base_url).rstrip('/')
    return {
        "status": "online",
        "service": "SonicForge AI - Demucs Neural Stem Engine",
        "version": "1.1.0",
        "device": DEVICE,
        "deviceName": DEVICE_NAME,
        "port": DEFAULT_PORT,
        "endpoints": {
            "health": f"{base_url}/health",
            "docs": f"{base_url}/docs",
            "separate": f"{base_url}/separate",
            "jobs": f"{base_url}/jobs",
        },
        "authRequired": bool(STEM_API_KEY),
        "message": "Demucs AI is operational and ready to process stems."
    }


@app.get("/health")
async def health_check():
    """Health status and hardware probe"""
    return {
        "status": "ok",
        "service": "SonicForge Demucs Engine",
        "version": "1.1.0",
        "port": DEFAULT_PORT,
        "device": DEVICE,
        "deviceName": DEVICE_NAME,
        "defaultModel": "htdemucs",
        "authRequired": bool(STEM_API_KEY),
        "supportedPresets": ["4_tracks", "2_tracks"],
        "activeJobs": len(job_registry),
    }


@app.get("/jobs", dependencies=[Depends(verify_stem_auth)])
async def list_jobs():
    """Returns active job registry"""
    async with registry_lock:
        return {"jobs": list(job_registry.values())}


@app.get("/status/{job_id}", dependencies=[Depends(verify_stem_auth)])
async def get_job_status(job_id: str):
    """Poll job status for frontend progress updates"""
    async with registry_lock:
        job = job_registry.get(job_id)

    if not job:
        # Check if job folder exists on disk (recovery from server restart)
        job_dir = JOBS_DIR / job_id
        if job_dir.exists():
            stems = scan_completed_stems(job_id, job_dir)
            if stems:
                recovered_job = {
                    "id": job_id,
                    "status": "completed",
                    "isComplete": True,
                    "isFailed": False,
                    "statusDetails": "Separation complete! Lossless stems ready.",
                    "progress": 100,
                    "stems": stems,
                    "error": None,
                }
                async with registry_lock:
                    job_registry[job_id] = recovered_job
                return recovered_job

        raise HTTPException(status_code=404, detail="Job not found")

    return job


def get_audio_diagnostics(wav_path: Path) -> dict:
    """Computes audio signal measurements for quality and silence detection"""
    try:
        with wave.open(str(wav_path), 'rb') as w:
            channels = w.getnchannels()
            sample_rate = w.getframerate()
            frames = w.getnframes()
            duration = frames / sample_rate if sample_rate > 0 else 0
            size = wav_path.stat().st_size

            # Sample slice across audio to measure real signal levels
            start_pos = min(frames // 4, max(0, frames - sample_rate * 10))
            w.setpos(start_pos)
            read_frames = min(sample_rate * 10, frames - start_pos)
            raw = w.readframes(read_frames)

            if len(raw) >= 2:
                fmt = '<' + 'h' * (len(raw) // 2)
                samples = struct.unpack(fmt, raw)
                peak = max(abs(s) for s in samples) / 32768.0
                rms = math.sqrt(sum(s * s for s in samples) / len(samples)) / 32768.0
            else:
                peak, rms = 0.0, 0.0

            return {
                "file_size_bytes": size,
                "duration_seconds": round(duration, 2),
                "sample_rate": sample_rate,
                "channels": channels,
                "sample_count": frames * channels,
                "is_finite": True,
                "peak_amplitude": round(peak, 4),
                "rms_amplitude": round(rms, 4),
                "is_silent": peak < 0.0005,
            }
    except Exception as e:
        return {
            "file_size_bytes": wav_path.stat().st_size if wav_path.exists() else 0,
            "error": str(e),
            "is_silent": False,
        }


def scan_completed_stems(job_id: str, job_dir: Path) -> list:
    """Scans the output directory to find generated WAV stems"""
    stems = []
    output_dir = job_dir / "output"
    if not output_dir.exists():
        return stems

    # Look for Demucs model outputs (typically under output/htdemucs/{track_name}/)
    wav_files = list(output_dir.rglob("*.wav"))
    for wav_file in wav_files:
        stem_name = wav_file.stem.lower()
        display_name = {
            "vocals": "Vocals",
            "drums": "Drums",
            "bass": "Bass",
            "other": "Other Instruments",
            "no_vocals": "Instrumental",
        }.get(stem_name, stem_name.capitalize())

        diag = get_audio_diagnostics(wav_file)

        stems.append({
            "stem_id": f"{job_id}_{stem_name}",
            "stem": stem_name,
            "name": display_name,
            "filename": wav_file.name,
            "download_url": f"/stems/{job_id}/{wav_file.name}",
            "downloadUrl": f"/api/stems/local/download/{job_id}/{wav_file.name}",
            "status": "completed",
            "size_bytes": wav_file.stat().st_size if wav_file.exists() else 0,
            "diagnostics": diag,
        })
    return stems


async def run_demucs_subprocess(job_id: str, input_path: Path, preset: str):
    """Executes Demucs separation in a subprocess with real-time progress parsing"""
    job_dir = input_path.parent
    output_dir = job_dir / "output"
    output_dir.mkdir(exist_ok=True)

    async with registry_lock:
        if job_id in job_registry:
            job_registry[job_id]["status"] = "processing"
            job_registry[job_id]["statusDetails"] = f"Initializing Demucs AI on {DEVICE_NAME}..."

    # Build demucs CLI arguments
    # -n htdemucs : default high-quality 4-stem Hybrid Transformer
    # -d cpu / cuda : device
    cmd = [
        sys.executable,
        "-m",
        "demucs.separate",
        "-n",
        "htdemucs",
        "-d",
        DEVICE,
        "-o",
        str(output_dir),
    ]

    if preset == "2_tracks":
        cmd.extend(["--two-stems", "vocals"])

    cmd.append(str(input_path))

    try:
        # Run subprocess asynchronously
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        async with registry_lock:
            if job_id in job_registry:
                job_registry[job_id]["statusDetails"] = f"Separating audio stems using Demucs ({DEVICE.upper()})..."

        # Read stderr line-by-line to parse Demucs tqdm progress bar
        while True:
            line = await process.stderr.readline()
            if not line:
                break
            text = line.decode("utf-8", errors="replace").strip()

            # Detect tqdm percentage e.g. "45%|████▍     |"
            pct_match = re.search(r"(\d{1,3})%", text)
            if pct_match:
                pct = int(pct_match.group(1))
                async with registry_lock:
                    if job_id in job_registry:
                        job_registry[job_id]["progress"] = pct
                        job_registry[job_id]["statusDetails"] = f"Demucs neural inference: {pct}% complete..."

        await process.wait()

        if process.returncode != 0:
            stderr_out = await process.stderr.read()
            err_msg = stderr_out.decode("utf-8", errors="replace")
            raise RuntimeError(f"Demucs process exited with code {process.returncode}: {err_msg[:300]}")

        # Scan generated stems
        stems = scan_completed_stems(job_id, job_dir)
        if not stems:
            raise RuntimeError("Demucs execution finished but no stem WAV files were found in the output folder.")

        async with registry_lock:
            if job_id in job_registry:
                job_registry[job_id]["status"] = "completed"
                job_registry[job_id]["isComplete"] = True
                job_registry[job_id]["isFailed"] = False
                job_registry[job_id]["progress"] = 100
                job_registry[job_id]["statusDetails"] = "Separation complete! Lossless stems ready."
                job_registry[job_id]["stems"] = stems

    except Exception as e:
        err_text = str(e)
        async with registry_lock:
            if job_id in job_registry:
                job_registry[job_id]["status"] = "failed"
                job_registry[job_id]["isComplete"] = False
                job_registry[job_id]["isFailed"] = True
                job_registry[job_id]["error"] = err_text
                job_registry[job_id]["statusDetails"] = f"Local processing error: {err_text[:120]}"


@app.post("/separate", dependencies=[Depends(verify_stem_auth)])
async def create_separation_job(
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
    preset: str = Form("4_tracks"),
):
    """
    Accepts audio file upload and initiates local Demucs stem separation.
    Preset: '4_tracks' (vocals, drums, bass, other) or '2_tracks' (vocals, instrumental).
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    file_ext = Path(audio.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{file_ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    job_id = str(uuid.uuid4())
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    # Save uploaded file
    safe_name = f"input{file_ext}"
    input_path = job_dir / safe_name

    try:
        content = await audio.read()
        if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_MB} MB."
            )
        with open(input_path, "wb") as f:
            f.write(content)
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {e}")

    # Register job initial state
    job_record = {
        "id": job_id,
        "creationId": job_id,
        "status": "queued",
        "isComplete": False,
        "isFailed": False,
        "preset": preset,
        "fileName": audio.filename,
        "fileSizeBytes": len(content),
        "statusDetails": "Queued for Demucs local inference...",
        "progress": 0,
        "stems": [],
        "error": None,
    }

    async with registry_lock:
        job_registry[job_id] = job_record

    # Dispatch background Demucs task
    background_tasks.add_task(run_demucs_subprocess, job_id, input_path, preset)

    return {
        "success": True,
        "creationId": job_id,
        "jobId": job_id,
        "status": "queued",
        "preset": preset,
        "fileName": audio.filename,
        "message": "Audio accepted. Demucs processing started in background.",
    }


@app.get("/stems/{job_id}/{stem_filename}", dependencies=[Depends(verify_stem_auth)])
async def download_stem(job_id: str, stem_filename: str):
    """Streams a generated stem WAV file with range support for audio player seeking"""
    # Sanitize path
    clean_filename = Path(stem_filename).name
    job_dir = JOBS_DIR / job_id

    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job directory not found")

    # Locate stem file in job output using flexible matchers:
    # 1. Exact filename match (e.g. vocals.wav)
    # 2. Match with .wav extension (e.g. vocals -> vocals.wav)
    # 3. Match normalized aliases (e.g. "other instruments" -> "other.wav", "instrumental" -> "no_vocals.wav")
    found_file: Optional[Path] = None

    # Step 1: exact match
    for p in job_dir.rglob(clean_filename):
        if p.is_file():
            found_file = p
            break

    # Step 2: append .wav if missing
    if not found_file and not clean_filename.lower().endswith(".wav"):
        for p in job_dir.rglob(f"{clean_filename}.wav"):
            if p.is_file():
                found_file = p
                break

    # Step 3: normalized stem alias resolution
    if not found_file:
        normalized = clean_filename.lower().replace(".wav", "").strip()
        alias_map = {
            "other instruments": "other.wav",
            "other_instruments": "other.wav",
            "other": "other.wav",
            "instrumental": "no_vocals.wav",
            "no_vocals": "no_vocals.wav",
            "backing": "no_vocals.wav",
            "lead vocals": "vocals.wav",
            "lead_vocals": "vocals.wav",
            "vocals": "vocals.wav",
            "drums": "drums.wav",
            "bass": "bass.wav",
        }
        target_name = alias_map.get(normalized)
        if target_name:
            for p in job_dir.rglob(target_name):
                if p.is_file():
                    found_file = p
                    break

    if not found_file or not found_file.exists():
        raise HTTPException(status_code=404, detail=f"Stem file '{clean_filename}' not found in job output")

    return FileResponse(
        path=str(found_file),
        media_type="audio/wav",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Disposition": f'inline; filename="{found_file.name}"',
            "Cache-Control": "public, max-age=86400",
        },
    )


@app.delete("/jobs/{job_id}", dependencies=[Depends(verify_stem_auth)])
async def delete_job(job_id: str):
    """Deletes job artifacts from disk and registry"""
    job_dir = JOBS_DIR / job_id
    shutil.rmtree(job_dir, ignore_errors=True)

    async with registry_lock:
        job_registry.pop(job_id, None)

    return {"success": True, "message": f"Job {job_id} artifacts purged."}


if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", os.environ.get("LOCAL_STEM_PORT", "8765")))
    print(f"[*] Starting SonicForge Demucs Engine on http://{host}:{port} (Device: {DEVICE_NAME})")
    uvicorn.run("server:app", host=host, port=port, reload=True if host == "127.0.0.1" else False)
