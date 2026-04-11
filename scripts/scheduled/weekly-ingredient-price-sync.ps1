# ChefFlow - Weekly System Ingredient Price Sync
# Bridges OpenClaw store prices to system_ingredients via FTS matching.
# Grows the 22% -> higher price coverage for costing features.
# Logs to logs/ingredient-price-sync.log with 2 MB rotation.

$logFile = "C:\Users\david\Documents\CFv1\logs\ingredient-price-sync.log"
$maxLogBytes = 2MB
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Rotate log if over limit
if (Test-Path $logFile) {
    if ((Get-Item $logFile).Length -gt $maxLogBytes) {
        Move-Item $logFile "$logFile.bak" -Force
    }
}

Add-Content $logFile "[$timestamp] === Ingredient Price Sync starting ==="

try {
    $result = & "node" "scripts/sync-system-ingredient-prices.mjs" 2>&1
    $exitCode = $LASTEXITCODE
    Add-Content $logFile ($result | Out-String)
    if ($exitCode -eq 0) {
        Add-Content $logFile "[$timestamp] Completed OK (exit 0)"
    } else {
        Add-Content $logFile "[$timestamp] ERROR: exit code $exitCode"
    }
} catch {
    Add-Content $logFile "[$timestamp] EXCEPTION: $_"
}
