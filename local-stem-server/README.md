# SonicForge AI — Free Local Neural Stem Engine

This server provides **100% free, unlimited, offline AI audio stem separation** for SonicForge AI using Meta AI's open-source **Demucs (HTDemucs v4 Hybrid Transformer)**.

---

## Why Local Processing?

Cloud AI providers like Neural Analog enforce strict quotas (e.g., paid monthly credits, limited processing minutes). When cloud credits are depleted or when processing sensitive/long tracks without fees, SonicForge AI connects to this local engine running on your own hardware.

- **Cost:** \$0.00 / Free forever.
- **Hardware:** Runs on CPU or NVIDIA CUDA GPU automatically.
- **Privacy:** Audio never leaves your computer.
- **Outputs:** High-fidelity 4 stems (`Vocals`, `Drums`, `Bass`, `Other Instruments`) or 2 stems (`Vocals`, `Instrumental`).

---

## Quick Start (Windows)

### Option A: Double-Click
Double-click `start.bat` in this folder. It will verify Python, install dependencies, and launch the server on `http://127.0.0.1:8000`.

### Option B: PowerShell
```powershell
cd "local-stem-server"
.\start.ps1
```

### Option C: Manual Command
```bash
cd local-stem-server
pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

---

## API Contract

| Endpoint | Method | Description |
|---|---|---|
| `/health` | `GET` | Verifies server status, CUDA GPU availability, and model readiness. |
| `/separate` | `POST` | Uploads audio (`audio` file + `preset`) and enqueues Demucs inference. |
| `/status/{job_id}` | `GET` | Returns real-time progress percentage and completion status. |
| `/stems/{job_id}/{stem}` | `GET` | Streams separated lossless WAV stem file with HTTP range support. |
| `/jobs/{job_id}` | `DELETE` | Purges job audio artifacts from local disk. |

---

## Usage in SonicForge AI

1. Start this local engine (`start.bat`).
2. Open SonicForge AI (`http://localhost:3000/stems`).
3. Under **Engine**, select **"Free Local Engine (Demucs AI)"**.
4. Upload your song and click **"Separate Stems (Free Demucs)"**.
5. Once separation is complete, adjust volumes, solo/mute tracks in the multitrack mixer, or download stems as 24-bit WAVs.
