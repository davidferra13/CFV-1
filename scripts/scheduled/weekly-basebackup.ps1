# ChefFlow Weekly Physical Base Backup (FREE - no AI, no API cost)
# Creates an encrypted physical base backup for point-in-time recovery.
# Runs weekly after the logical backup and before weekly integrity checks.

$projectDir = "C:\Users\david\Documents\CFv1"
$logFile    = "$projectDir\logs\weekly-basebackup.log"

if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "[$timestamp] Starting weekly physical base backup..."

try {
    $result = & "C:\Program Files\Git\bin\bash.exe" -c "cd /c/Users/david/Documents/CFv1 && bash scripts/backup-db-basebackup.sh" 2>&1
    $exitCode = $LASTEXITCODE
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    if ($exitCode -eq 0) {
        Add-Content -Path $logFile -Value "[$timestamp] Physical base backup completed successfully."
    } else {
        Add-Content -Path $logFile -Value "[$timestamp] Physical base backup FAILED (exit code $exitCode): $result"
        exit $exitCode
    }
} catch {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] ERROR: $($_.Exception.Message)"
    exit 1
}
