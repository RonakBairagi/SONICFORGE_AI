@echo off
title SonicForge AI - Local Demucs Engine
echo ========================================================
echo  SONICFORGE AI - FREE LOCAL NEURAL STEM ENGINE
echo  Meta AI Demucs (HTDemucs v4)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from python.org or Microsoft Store.
    pause
    exit /b 1
)

echo [2/3] Checking & Installing dependencies...
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo [WARNING] Encountered an issue installing requirements. Proceeding with existing packages...
)

echo [3/3] Starting Local Demucs Server on http://127.0.0.1:8000 ...
echo.
echo ========================================================
echo  Engine online! Keep this terminal open while using
echo  SonicForge AI Neural Stem Lab in "Free Local Engine" mode.
echo ========================================================
echo.

python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
pause
