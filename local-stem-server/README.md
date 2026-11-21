# SonicForge AI — Local Demucs Neural Stem Engine
### Beginner-Friendly Windows Guide (Meta AI Demucs HTDemucs v4)

---

## 1. Quick Start Guide (Windows PowerShell / CMD)

### If your terminal is in the project root (`C:\Users\RONAK\New folder (16)`):
```powershell
cd local-stem-server
.\start.ps1
```

### If your terminal is already inside `local-stem-server`:
```powershell
.\start.ps1
```

*(Alternatively, open File Explorer and double-click `start.bat`).*

---

## 2. Manual Startup Command

To run the backend directly with Uvicorn on port **8765**:

```powershell
# 1. Make sure you are in the local-stem-server folder:
# Check your path:
pwd

# If you see "New folder (16)\local-stem-server", run:
python -m uvicorn server:app --host 127.0.0.1 --port 8765

# If you see "New folder (16)", first enter the folder:
cd local-stem-server
python -m uvicorn server:app --host 127.0.0.1 --port 8765
```

---

## 3. Verifying the Server in Your Browser

When Uvicorn is running, open these URLs in your web browser:

| Endpoint | URL | Expected Response |
|---|---|---|
| **Root Status** | `http://127.0.0.1:8765/` | JSON status confirming `"status": "online"` with service details. |
| **Health Check** | `http://127.0.0.1:8765/health` | `{"status": "ok", "service": "SonicForge Local Demucs Engine", "device": "cpu"}` |
| **Interactive Docs** | `http://127.0.0.1:8765/docs` | FastAPI Swagger UI showing all endpoints (`/separate`, `/status`, `/stems`). |

> [!NOTE]
> Previously, visiting `http://127.0.0.1:8765/` returned `{"detail": "Not Found"}` because FastAPI only had `/health` and `/docs` defined. We have now added a proper root index `/` that displays full server status.

---

## 4. Troubleshooting Windows Socket Errors

### Error: `[WinError 10013] An attempt was made to access a socket in a way forbidden by its access permissions`

**What it means:**
Port 8000 or 8765 is already in use by another process or reserved by Windows.

**How to fix:**
1. Check which process is using the port:
   ```powershell
   Get-NetTCPConnection -LocalPort 8765 -State Listen
   ```
2. Stop the conflicting process:
   ```powershell
   Stop-Process -Id (Get-NetTCPConnection -LocalPort 8765 -State Listen).OwningProcess -Force
   ```
3. Or specify a different port using the environment variable:
   ```powershell
   $env:LOCAL_STEM_PORT="8766"
   python -m uvicorn server:app --host 127.0.0.1 --port 8766
   ```
   *(SonicForge AI automatically probes ports 8765, 8766, and 8000 to find your active server!)*

---

## 5. How SonicForge AI Connects

- The Next.js frontend (`http://localhost:3000/stems`) uses an internal proxy under `/api/stems/local/*`.
- It probes `http://127.0.0.1:8765/health` every 8 seconds.
- When the local engine is detected, the UI displays a green badge: **"Demucs Engine Online"**.
- Audio files are processed locally on your CPU/GPU at zero cost with no cloud quotas.
