# ChefFlow Weekly DB Integrity Audit (FREE - no AI, no API cost)
# Runs the full database integrity audit against business rules
# Runs every Sunday at 4:00 AM

$projectDir = "C:\Users\david\Documents\CFv1"
$logFile    = "$projectDir\logs\db-integrity.log"

if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "[$timestamp] Starting weekly DB integrity audit..."

try {
    Set-Location $projectDir
    $result = node scripts/db-integrity-audit.mjs 2>&1
    $exitCode = $LASTEXITCODE
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    if ($exitCode -eq 0) {
        Add-Content -Path $logFile -Value "[$timestamp] DB integrity audit passed."
    } else {
        Add-Content -Path $logFile -Value "[$timestamp] DB integrity audit found issues (exit $exitCode):"
        Add-Content -Path $logFile -Value $result
    }
} catch {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] ERROR: $($_.Exception.Message)"
}
Add-Content -Path $logFile -Value "=========================================="
