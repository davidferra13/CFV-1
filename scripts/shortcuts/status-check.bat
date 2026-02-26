@echo off
echo === ChefFlow Status ===
curl -s http://localhost:3200/api/status
echo.
pause
