# SonicForge AI - Local Demucs Engine Startup Script (PowerShell)
$Host.UI.RawUI.WindowTitle = "SonicForge AI - Local Demucs Engine"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " SONICFORGE AI - FREE LOCAL NEURAL STEM ENGINE" -ForegroundColor Yellow
Write-Host " Powered by Meta AI Demucs (HTDemucs v4)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# 1. Check Python
Write-Host "[1/3] Checking Python installation..." -ForegroundColor Green
try {
    $pyVer = & python --version 2>&1
    Write-Host "Found: $pyVer" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Python was not found in PATH." -ForegroundColor Red
    Write-Host "Please install Python 3.10+ and add it to PATH." -ForegroundColor Yellow
    exit 1
}

# 2. Check dependencies
Write-Host "[2/3] Checking dependencies..." -ForegroundColor Green
& python -m pip install -r requirements.txt

# 3. Launch Uvicorn
Write-Host "[3/3] Launching Demucs Local Engine on http://127.0.0.1:8000 ..." -ForegroundColor Green
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Engine is online! Keep this window open while separating" -ForegroundColor Green
Write-Host " stems in SonicForge AI." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

& python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
