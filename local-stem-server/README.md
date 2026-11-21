# SonicForge AI — Demucs Neural Stem Engine
### Dual-Environment Architecture: Local PC & Hosted Cloud GPU/CPU

---

## 1. Architecture Overview

SonicForge AI provides two execution modes for AI stem separation:
1. **Local Development (Your PC):**
   - The Next.js frontend runs on `http://localhost:3000`.
   - The Python Demucs engine runs on `http://127.0.0.1:8765`.
   - SonicForge AI probes port 8765 (with fallback to 8000) and processes audio files offline on your computer.

2. **Production Deployment (Vercel):**
   - The Next.js frontend runs on Vercel (`https://your-domain.vercel.app`).
   - Because Vercel serverless functions run in the cloud, **they cannot reach `127.0.0.1` on your local PC**.
   - For public stem separation on the live site, the Python backend is deployed to a public HTTPS cloud provider (such as Hugging Face Spaces, Render, or RunPod).
   - The frontend reads `NEXT_PUBLIC_STEM_API_URL` to route requests securely.
   - If `NEXT_PUBLIC_STEM_API_URL` is not configured in production, the UI displays a clear explanation rather than attempting to connect to localhost.

---

## 2. Local Development Quick Start (Windows)

### If your terminal is in the project root (`C:\Users\RONAK\New folder (16)`):
```powershell
cd local-stem-server
.\start.ps1
```

### If your terminal is already inside `local-stem-server`:
```powershell
.\start.ps1
```

*(Alternatively, double-click `start.bat` in File Explorer).*

### Manual Startup:
```powershell
python -m uvicorn server:app --host 127.0.0.1 --port 8765
```

### Local URLs:
| Endpoint | URL | Description |
|---|---|---|
| **Root Status** | `http://127.0.0.1:8765/` | JSON status confirming `"status": "online"` with service details. |
| **Health Check** | `http://127.0.0.1:8765/health` | `{"status": "ok", "service": "SonicForge Demucs Engine", "device": "cpu"}` |
| **Interactive Docs** | `http://127.0.0.1:8765/docs` | FastAPI Swagger UI showing all endpoints (`/separate`, `/status`, `/stems`). |

---

## 3. Deploying a Hosted Backend for Production (Vercel)

To enable stem separation on your deployed Vercel website, deploy this folder (`local-stem-server`) to a cloud host.

### Option A: Hugging Face Spaces (Recommended — Free 16GB CPU or T4 GPU)
1. Go to [huggingface.co/spaces](https://huggingface.co/spaces) and click **Create new Space**.
2. Select **Space SDK: Docker** (Blank).
3. Clone the Space repository and copy the contents of `local-stem-server/` into it (including `Dockerfile`, `server.py`, `requirements.txt`).
4. Commit and push:
   ```bash
   git add .
   git commit -m "Deploy SonicForge Demucs Engine"
   git push
   ```
5. Hugging Face builds the Docker container and exposes a public HTTPS URL (e.g. `https://username-space-name.hf.space`).
6. In your Vercel Project Settings -> **Environment Variables**:
   - Key: `NEXT_PUBLIC_STEM_API_URL`
   - Value: `https://username-space-name.hf.space`

---

### Option B: Render.com (Web Service)
1. In Render, select **New -> Web Service**.
2. Connect your repository and select the `local-stem-server` directory (or use Dockerfile).
3. Environment: `Docker` (or Python 3.10).
4. Render automatically assigns a public HTTPS URL (e.g. `https://sonicforge-demucs.onrender.com`).
5. In your Vercel Project Settings:
   - Key: `NEXT_PUBLIC_STEM_API_URL`
   - Value: `https://sonicforge-demucs.onrender.com`

---

### Option C: RunPod / Modal / AWS EC2 (Dedicated GPU)
1. Build and run the included `Dockerfile` on any GPU instance:
   ```bash
   docker build -t sonicforge-demucs .
   docker run -d --gpus all -p 7860:7860 sonicforge-demucs
   ```
2. Configure your reverse proxy (Nginx or Cloudflare Tunnel) with SSL/HTTPS.
3. Add `NEXT_PUBLIC_STEM_API_URL` to Vercel.

---

## 4. Backend Interface & API Contract

The Python FastAPI backend implements the following standardized endpoints:

### `GET /health`
* **Response (HTTP 200):**
  ```json
  {
    "status": "ok",
    "service": "SonicForge Demucs Engine",
    "version": "1.1.0",
    "port": 8765,
    "device": "cpu",
    "deviceName": "Host CPU",
    "defaultModel": "htdemucs",
    "authRequired": false,
    "supportedPresets": ["4_tracks", "2_tracks"],
    "activeJobs": 0
  }
  ```

### `POST /separate`
* **Content-Type:** `multipart/form-data`
* **Fields:**
  - `audio`: Audio file binary (MP3, WAV, FLAC, OGG, M4A — max 100 MB).
  - `preset`: `"4_tracks"` (Vocals, Drums, Bass, Other) or `"2_tracks"` (Vocals, Instrumental).
* **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "creationId": "uuid-v4",
    "jobId": "uuid-v4",
    "status": "queued",
    "preset": "4_tracks",
    "fileName": "song.mp3",
    "message": "Audio accepted. Demucs processing started in background."
  }
  ```

### `GET /status/{job_id}`
* **Response (HTTP 200):**
  ```json
  {
    "id": "uuid-v4",
    "status": "completed",
    "isComplete": true,
    "isFailed": false,
    "progress": 100,
    "statusDetails": "Separation complete! Lossless stems ready.",
    "stems": [
      {
        "stem_id": "uuid-v4_vocals",
        "stem": "vocals",
        "name": "Vocals",
        "download_url": "/stems/uuid-v4/vocals.wav",
        "status": "completed"
      }
    ]
  }
  ```

### `GET /stems/{job_id}/{stem_filename}`
* Streams the 24-bit PCM WAV audio file with byte-range (`Accept-Ranges: bytes`) support.

---

## 5. Security & Authentication

* **Optional API Key Protection:**
  To prevent unauthorized access to your hosted GPU, configure `STEM_API_KEY` on your backend.
  When set, requests must pass:
  - `Authorization: Bearer <STEM_API_KEY>` OR `X-API-Key: <STEM_API_KEY>`
* **Vercel Configuration:**
  In your Vercel Project Settings, add:
  - `STEM_API_KEY`: Kept **server-side only** (never exposed to browser JavaScript).
  - The Next.js API routes forward this key automatically when contacting the backend.
* **CORS:**
  The backend includes regex support for all Vercel domains (`https://.*\.vercel\.app`) and custom domains configured via `ALLOWED_ORIGINS`.

---

## 6. Environment Variables Summary

| Variable | Environment | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_STEM_API_URL` | Vercel & Local | Public URL of the Demucs backend. In local dev: `http://127.0.0.1:8765`. In production: your hosted URL. | `https://username-demucs.hf.space` |
| `STEM_API_URL` | Vercel (Server-side) | Optional server-side override if internal URL differs from public. | `https://internal-service.local` |
| `STEM_API_KEY` | Vercel & Backend | Optional secret key for hosted backend authorization. | `sf_live_abc123...` |
| `LOCAL_STEM_PORT` | Local | Custom port for local development (defaults to `8765`). | `8765` |
| `ALLOWED_ORIGINS` | Backend | Comma-separated list of additional CORS origins. | `https://sonicforge.ai` |
