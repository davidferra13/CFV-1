# ChefFlow Daily Pipeline Audit (FREE - no AI, no API cost)
# Checks OpenClaw sync pipeline status vs targets
# Runs daily at 7:00 AM (after sync check, before workday)

$projectDir = "C:\Users\david\Documents\CFv1"
$logFile    = "$projectDir\logs\pipeline-audit.log"

if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
}

# Rotate log at 1 MB
if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 1MB) {
    Remove-Item "$logFile.old" -ErrorAction SilentlyContinue
    Rename-Item  $logFile "$logFile.old" -ErrorAction SilentlyContinue
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "[$timestamp] Running pipeline audit..."

try {
    Set-Location $projectDir
    $result = node scripts/pipeline-audit.mjs 2>&1
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value $result
    Add-Content -Path $logFile -Value "[$timestamp] Pipeline audit complete."
} catch {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] ERROR: $($_.Exception.Message)"
}
Add-Content -Path $logFile -Value "=========================================="
