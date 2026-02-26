@echo off
echo === ChefFlow Status ===
curl -s http://localhost:41937/api/status
echo.
pause
