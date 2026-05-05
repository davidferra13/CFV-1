@echo off
schtasks /Create /TN "Hermes Watchdog" /TR "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Users\david\Documents\CFv1\scripts\hermes\hermes-watchdog.ps1" /SC MINUTE /MO 5 /F
if %ERRORLEVEL% EQU 0 (
    echo Hermes Watchdog scheduled task created successfully.
    schtasks /Query /TN "Hermes Watchdog" /V /FO LIST
) else (
    echo FAILED. Try running this script as Administrator.
)
pause
