# Hermes Watchdog - runs via Windows Task Scheduler every 5 minutes
# Checks if Hermes cron is alive in WSL2, restarts if not
# Also ensures WSL2 Ubuntu distro is running (cron needs it)

$AlertsFile = "C:\Users\david\Documents\CFv1\docs\hermes\ALERTS.md"
$LogFile = "C:\Users\david\Documents\CFv1\docs\hermes\watchdog.log"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"

# Ensure output directory exists
$HermesDir = "C:\Users\david\Documents\CFv1\docs\hermes"
if (-not (Test-Path $HermesDir)) {
    New-Item -ItemType Directory -Path $HermesDir -Force | Out-Null
}

# Check if WSL Ubuntu is running
$wslRunning = wsl -l --running 2>$null | Select-String "Ubuntu"

if (-not $wslRunning) {
    # Start Ubuntu WSL distro (this starts cron too)
    Add-Content $LogFile "[$Timestamp] WSL Ubuntu not running. Starting..."
    wsl -d Ubuntu -e bash -c "echo 'WSL started'" 2>$null
    Start-Sleep -Seconds 3
}

# Check if cron is running inside WSL
$cronRunning = wsl -d Ubuntu -e bash -c "pgrep cron" 2>$null

if (-not $cronRunning) {
    Add-Content $LogFile "[$Timestamp] Cron not running in WSL. Starting..."
    wsl -d Ubuntu -e bash -c "sudo service cron start" 2>$null
    $cronCheck = wsl -d Ubuntu -e bash -c "pgrep cron" 2>$null
    if ($cronCheck) {
        Add-Content $LogFile "[$Timestamp] Cron restarted successfully (PID: $cronCheck)"
        Add-Content $AlertsFile "- **$Timestamp** - Hermes cron was dead, watchdog restarted it"
    } else {
        Add-Content $LogFile "[$Timestamp] FAILED to restart cron!"
        Add-Content $AlertsFile "- **$Timestamp** - CRITICAL: Hermes cron restart FAILED"
    }
} else {
    # Silent success - only log every hour to avoid spam
    $minute = (Get-Date).Minute
    if ($minute -lt 5) {
        Add-Content $LogFile "[$Timestamp] Cron alive (PID: $cronRunning)"
    }
}
