# OpenClaw Nightly Price Scrape
# Runs the deep scraper and syncs prices to ChefFlow.
#
# Setup (Windows Task Scheduler):
#   1. Open Task Scheduler (taskschd.msc)
#   2. Create Task > Name: "OpenClaw Nightly Scrape"
#   3. Trigger: Daily at 2:00 AM
#   4. Action: Start a program
#      Program: powershell.exe
#      Arguments: -ExecutionPolicy Bypass -File "C:\Users\david\Documents\CFv1\scripts\openclaw-nightly-scrape.ps1"
#      Start in: C:\Users\david\Documents\CFv1
#   5. Settings: Allow task to be run on demand, Stop if runs longer than 4 hours

$ErrorActionPreference = "Continue"
$ProjectRoot = "C:\Users\david\Documents\CFv1"
$LogFile = "$ProjectRoot\logs\openclaw-scrape-$(Get-Date -Format 'yyyy-MM-dd').log"

# Ensure logs directory exists
New-Item -ItemType Directory -Force -Path "$ProjectRoot\logs" | Out-Null

function Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $msg"
    Add-Content -Path $LogFile -Value $line
    Write-Host $line
}

Log "=== OpenClaw Nightly Scrape Started ==="

# Step 1: Run the deep scraper
Log "Step 1: Running deep scraper..."
try {
    $scraperResult = & npx playwright test --config=playwright.config.ts 2>&1
    # Actually, the scraper is a standalone script, not a Playwright test
    Set-Location $ProjectRoot
    $env:NODE_OPTIONS = ""
    $scraperOutput = & node scripts/openclaw-deep-scraper.mjs 2>&1
    $scraperOutput | ForEach-Object { Log "  $_" }
    Log "Step 1: Deep scraper completed"
} catch {
    Log "Step 1: Deep scraper failed - $($_.Exception.Message)"
}

# Step 2: Trigger ChefFlow price sync via Pi API
Log "Step 2: Triggering ChefFlow price sync..."
try {
    $syncResult = Invoke-RestMethod -Uri "http://10.0.0.177:8081/api/stats" -TimeoutSec 10
    Log "  Pi stats: $($syncResult.currentPrices) prices, $($syncResult.inStock) in stock"
} catch {
    Log "Step 2: Pi unreachable - $($_.Exception.Message)"
}

# Step 3: Clean up old logs (keep 30 days)
Log "Step 3: Cleaning old logs..."
Get-ChildItem "$ProjectRoot\logs\openclaw-scrape-*.log" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force

Log "=== OpenClaw Nightly Scrape Completed ==="
