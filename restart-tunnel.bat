@echo off
net stop cloudflared
net start cloudflared
echo.
echo Tunnel restarted. You can close this window.
pause
