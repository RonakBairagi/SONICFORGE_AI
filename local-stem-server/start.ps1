# SonicForge AI - Local Demucs Engine Startup Script (PowerShell)
$Host.UI.RawUI.WindowTitle = "SonicForge AI - Local Demucs Engine"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " SONICFORGE AI - FREE LOCAL NEURAL STEM ENGINE" -ForegroundColor Yellow
Write-Host " Powered by Meta AI Demucs (HTDemucs v4)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ensure current directory is local-stem-server regardless of starting directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptDir -and (Test-Path $scriptDir)) {
    Set-Location $scriptDir
}

$port = if ($env:LOCAL_STEM_PORT) { $env:LOCAL_STEM_PORT } else { "8765" }

# 2. Check Python
Write-Host "[1/4] Checking Python installation..." -ForegroundColor Green
try {
    $pyVer = & python --version 2>&1
    Write-Host "Found: $pyVer" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Python was not found in PATH." -ForegroundColor Red
    Write-Host "Please install Python 3.10+ and add it to PATH." -ForegroundColor Yellow
    exit 1
}

# 3. Check dependencies
Write-Host "[2/4] Verifying dependencies..." -ForegroundColor Green
& python -m pip install -r requirements.txt --quiet

# 4. Check port availability
Write-Host "[3/4] Checking port $port..." -ForegroundColor Green
$occupied = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($occupied) {
    Write-Host "[NOTICE] Port $port is already in use by process ID $($occupied.OwningProcess)." -ForegroundColor Yellow
    Write-Host "If this is an existing SonicForge backend, it is already active!" -ForegroundColor Yellow
    Write-Host "To kill and restart it, run: Stop-Process -Id $($occupied.OwningProcess) -Force" -ForegroundColor Yellow
}

# 5. Launch Uvicorn
Write-Host "[4/4] Starting Demucs Local Engine on http://127.0.0.1:$port ..." -ForegroundColor Green
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Local Demucs AI is ONLINE! Keep this window open." -ForegroundColor Green
Write-Host " Root Status:      http://127.0.0.1:$port/" -ForegroundColor Cyan
Write-Host " Health Check:     http://127.0.0.1:$port/health" -ForegroundColor Yellow
Write-Host " Interactive Docs: http://127.0.0.1:$port/docs" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

& python -m uvicorn server:app --host 127.0.0.1 --port $port
