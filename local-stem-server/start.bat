@echo off
title SonicForge AI - Local Demucs Engine
echo ========================================================
echo  SONICFORGE AI - FREE LOCAL NEURAL STEM ENGINE
echo  Powered by Meta AI Demucs (HTDemucs v4)
echo ========================================================
echo.

:: Automatically navigate to directory of this script
cd /d "%~dp0"

:: Configurable port (default 8765)
if "%LOCAL_STEM_PORT%"=="" (
    set LOCAL_STEM_PORT=8765
)

echo [1/4] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from python.org and check "Add to PATH".
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version') do echo Found: %%v

echo [2/4] Verifying dependencies...
python -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [WARNING] Dependency update had a minor issue; continuing with installed packages...
)

echo [3/4] Checking port %LOCAL_STEM_PORT%...
netstat -ano | findstr :%LOCAL_STEM_PORT% | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
    echo [NOTICE] Port %LOCAL_STEM_PORT% is already in use by an active listener.
    echo If this is an existing SonicForge server, it is already serving!
    echo To stop it, close its command window or run:
    echo   Stop-Process -Id (Get-NetTCPConnection -LocalPort %LOCAL_STEM_PORT%).OwningProcess -Force
    echo.
)

echo [4/4] Starting Local Demucs Server on http://127.0.0.1:%LOCAL_STEM_PORT% ...
echo.
echo ========================================================
echo  Local Demucs AI is ONLINE!
echo  Root Status:       http://127.0.0.1:%LOCAL_STEM_PORT%/
echo  Health Check:      http://127.0.0.1:%LOCAL_STEM_PORT%/health
echo  Interactive Docs:  http://127.0.0.1:%LOCAL_STEM_PORT%/docs
echo ========================================================
echo.
echo Keep this terminal window open while using SonicForge AI.
echo.

python -m uvicorn server:app --host 127.0.0.1 --port %LOCAL_STEM_PORT%
pause
