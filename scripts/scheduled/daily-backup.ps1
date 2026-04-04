# ChefFlow Daily Database Backup (FREE - no AI, no API cost)
# Wraps scripts/backup-db.sh with logging
# Runs daily at 3:00 AM

$projectDir = "C:\Users\david\Documents\CFv1"
$logFile    = "$projectDir\logs\daily-backup.log"

if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "[$timestamp] Starting daily backup..."

try {
    $result = & "C:\Program Files\Git\bin\bash.exe" -c "cd /c/Users/david/Documents/CFv1 && bash scripts/backup-db.sh --quiet" 2>&1
    $exitCode = $LASTEXITCODE
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    if ($exitCode -eq 0) {
        Add-Content -Path $logFile -Value "[$timestamp] Backup completed successfully."
    } else {
        Add-Content -Path $logFile -Value "[$timestamp] Backup FAILED (exit code $exitCode): $result"
    }
} catch {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] ERROR: $($_.Exception.Message)"
}
