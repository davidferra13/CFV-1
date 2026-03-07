# =============================================================================
# ChefFlow Beta Server - Auto-Start Script (Windows)
# =============================================================================
# Starts the beta production server on port 3200.
# Designed to be run by Windows Task Scheduler on login.
#
# Usage (manual):   pwsh scripts/start-beta.ps1
# Usage (auto):     Task Scheduler > On login > pwsh -File scripts/start-beta.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$BetaDir = "C:\Users\david\Documents\CFv1-beta"
$Port = 3200
$LogFile = "$BetaDir\beta-server.log"

# Verify beta directory exists and has a build
if (-not (Test-Path "$BetaDir\.next\BUILD_ID")) {
    Write-Host "ERROR: No beta build found at $BetaDir\.next" -ForegroundColor Red
    Write-Host "Run 'npm run beta:deploy' first to create a build." -ForegroundColor Yellow
    exit 1
}

# Kill any existing beta server on this port
$existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
if ($existing) {
    foreach ($pid in $existing) {
        Write-Host "Stopping existing process on port $Port (PID: $pid)..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

# Start the beta server
Write-Host ""
Write-Host "  ChefFlow Beta Server" -ForegroundColor Cyan
Write-Host "  Port: $Port" -ForegroundColor Cyan
Write-Host "  Dir:  $BetaDir" -ForegroundColor Cyan
Write-Host "  Log:  $LogFile" -ForegroundColor Cyan
Write-Host ""

Set-Location $BetaDir

# Start Next.js production server (blocks - Task Scheduler keeps it alive)
$env:NODE_ENV = "production"
$env:PORT = $Port
npx next start -p $Port 2>&1 | Tee-Object -FilePath $LogFile -Append
