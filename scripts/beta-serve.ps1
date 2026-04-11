# =============================================================================
# ChefFlow Beta Server — Production build + Cloudflare Tunnel (Windows)
# =============================================================================
# Usage:
#   npm run beta          → Quick tunnel (random URL, instant)
#   npm run beta:named    → Named tunnel (beta.cheflowhq.com, permanent)
# =============================================================================

param(
    [string]$Mode = "quick"
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Port = if ($env:PORT) { $env:PORT } else { "3200" }
$TunnelName = "chefflow-beta"

Set-Location $ProjectDir

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║       ChefFlow Beta Server                ║" -ForegroundColor Cyan
Write-Host "  ║       Ops for Artists                      ║" -ForegroundColor Cyan
Write-Host "  ╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# -------------------------------------------------------------------
# Step 1: Build the production app
# -------------------------------------------------------------------
Write-Host "[1/3] Building production app..." -ForegroundColor Yellow

if (Test-Path ".next") {
    Write-Host "  Cleaning previous build..." -ForegroundColor Gray
    Remove-Item -Recurse -Force ".next"
}

npx next build --no-lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Production build complete" -ForegroundColor Green

# -------------------------------------------------------------------
# Step 2: Start the production server in the background
# -------------------------------------------------------------------
Write-Host "[2/3] Starting production server on port $Port..." -ForegroundColor Yellow

$serverJob = Start-Job -ScriptBlock {
    param($dir, $port)
    Set-Location $dir
    npx next start -p $port
} -ArgumentList $ProjectDir, $Port

# Wait for server to be ready
Write-Host "  Waiting for server to start..." -ForegroundColor Gray
$ready = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 2
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    Write-Host "  Server failed to start after 30 seconds" -ForegroundColor Red
    Stop-Job $serverJob
    Remove-Job $serverJob
    exit 1
}
Write-Host "  ✓ Server running at http://localhost:$Port" -ForegroundColor Green

# -------------------------------------------------------------------
# Step 3: Start Cloudflare Tunnel
# -------------------------------------------------------------------
try {
    if ($Mode -eq "named") {
        Write-Host "[3/3] Starting named Cloudflare Tunnel → beta.cheflowhq.com" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Your beta testers can visit: https://beta.cheflowhq.com" -ForegroundColor Green
        Write-Host ""
        cloudflared tunnel --config "$ProjectDir\.cloudflared\config.yml" run $TunnelName
    } else {
        Write-Host "[3/3] Starting quick Cloudflare Tunnel..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Copy the URL below and send it to your testers!" -ForegroundColor Cyan
        Write-Host ""
        cloudflared tunnel --url "http://localhost:$Port"
    }
} finally {
    # Cleanup
    Write-Host "`nShutting down..." -ForegroundColor Yellow
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    Write-Host "Done." -ForegroundColor Green
}
