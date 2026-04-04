# ChefFlow Weekly Secret Scan (FREE - no AI, no API cost)
# Scans codebase for accidentally committed secrets
# Runs every Monday at 5:00 AM

$projectDir = "C:\Users\david\Documents\CFv1"
$logFile    = "$projectDir\logs\secret-scan.log"

if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "[$timestamp] Running weekly secret scan..."

try {
    Set-Location $projectDir
    $result = npm run verify:secrets 2>&1
    $exitCode = $LASTEXITCODE
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    if ($exitCode -eq 0) {
        Add-Content -Path $logFile -Value "[$timestamp] Secret scan: CLEAN"
    } else {
        Add-Content -Path $logFile -Value "[$timestamp] SECRET SCAN WARNING - potential exposure detected:"
        Add-Content -Path $logFile -Value $result
    }
} catch {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] ERROR: $($_.Exception.Message)"
}
Add-Content -Path $logFile -Value "=========================================="
