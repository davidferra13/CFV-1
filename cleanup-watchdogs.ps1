$keepPid = 416220
$others = Get-Process -Name powershell -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $keepPid -and $_.Id -ne $PID }
Write-Host "Killing $($others.Count) duplicate PowerShell/watchdog processes (keeping PID $keepPid)..."
$others | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
$remaining = Get-Process -Name powershell -ErrorAction SilentlyContinue
Write-Host "Remaining PowerShell processes: $($remaining.Count)"
$remaining | Select-Object Id | Format-Table
