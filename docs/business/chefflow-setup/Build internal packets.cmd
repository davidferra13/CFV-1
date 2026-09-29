@echo off
cd /d "%~dp0..\..\.."
if errorlevel 1 exit /b 1
node scripts\setup-service\cli.mjs build
if errorlevel 1 goto failed
echo Internal packets generated. No outreach was performed.
pause
exit /b 0
:failed
echo Build stopped. Existing files were preserved.
pause
exit /b 1
