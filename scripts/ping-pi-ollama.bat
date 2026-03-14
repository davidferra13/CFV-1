@echo off
title ChefFlow — Ping Pi Ollama
echo ============================================
echo   ChefFlow — Raspberry Pi Ollama Trigger
echo ============================================
echo.
echo Pinging Ollama at 10.0.0.177:11434 ...
echo.

curl -s --max-time 10 http://10.0.0.177:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo [OFFLINE] Pi Ollama is NOT responding.
    echo   - Is the Raspberry Pi powered on?
    echo   - Is Ollama running?  SSH in and run: systemctl status ollama
    echo.
    pause
    exit /b 1
)

echo [ONLINE] Pi Ollama is responding. Sending a test prompt...
echo.

curl -s --max-time 60 http://10.0.0.177:11434/api/generate -d "{\"model\":\"qwen3:8b\",\"prompt\":\"Say hello in one sentence.\",\"stream\":false}" 2>nul | findstr /C:"response"
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Ollama responded to /api/tags but the generate call failed.
    echo   Model qwen3:8b may not be loaded. SSH in and run: ollama pull qwen3:8b
) else (
    echo.
    echo [OK] Pi Ollama generated a response successfully.
)

echo.
echo ============================================
pause
