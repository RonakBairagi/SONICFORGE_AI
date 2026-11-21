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
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
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
    title="SonicForge AI - Local Neural Stem Engine",
    description="Local open-source music separation server running Demucs (HTDemucs v4)",
    version="1.0.0",
)

# Allow CORS for Next.js dev server & local interfaces
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*"
    ],
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


@app.get("/health")
async def health_check():
    """Health status and hardware probe"""
    return {
        "status": "ok",
        "service": "SonicForge Local Demucs Engine",
        "version": "1.0.0",
        "device": DEVICE,
        "deviceName": DEVICE_NAME,
        "defaultModel": "htdemucs",
        "supportedPresets": ["4_tracks", "2_tracks"],
        "activeJobs": len(job_registry),
    }


@app.get("/jobs")
async def list_jobs():
    """Returns active job registry"""
    async with registry_lock:
        return {"jobs": list(job_registry.values())}


@app.get("/status/{job_id}")
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

        stems.append({
            "stem_id": f"{job_id}_{stem_name}",
            "stem": stem_name,
            "name": display_name,
            "download_url": f"http://127.0.0.1:8000/stems/{job_id}/{wav_file.name}",
            "status": "completed",
            "size_bytes": wav_file.stat().st_size if wav_file.exists() else 0,
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


@app.post("/separate")
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


@app.get("/stems/{job_id}/{stem_filename}")
async def download_stem(job_id: str, stem_filename: str):
    """Streams a generated stem WAV file with range support for audio player seeking"""
    # Sanitize path
    clean_filename = Path(stem_filename).name
    job_dir = JOBS_DIR / job_id

    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job directory not found")

    # Locate stem file in job output
    found_file: Optional[Path] = None
    for p in job_dir.rglob(clean_filename):
        if p.is_file():
            found_file = p
            break

    if not found_file or not found_file.exists():
        raise HTTPException(status_code=404, detail=f"Stem file '{clean_filename}' not found")

    return FileResponse(
        path=str(found_file),
        media_type="audio/wav",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Disposition": f'inline; filename="{clean_filename}"',
            "Cache-Control": "public, max-age=86400",
        },
    )


@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Deletes job artifacts from disk and registry"""
    job_dir = JOBS_DIR / job_id
    shutil.rmtree(job_dir, ignore_errors=True)

    async with registry_lock:
        job_registry.pop(job_id, None)

    return {"success": True, "message": f"Job {job_id} artifacts purged."}


if __name__ == "__main__":
    import uvicorn
    print(f"[*] Starting SonicForge Local Demucs Engine on http://127.0.0.1:8000 (Device: {DEVICE_NAME})")
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
