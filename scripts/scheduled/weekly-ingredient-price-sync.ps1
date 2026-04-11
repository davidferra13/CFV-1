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

# Step 1: bridge OpenClaw prices to system_ingredients
try {
    $result = & "node" "scripts/sync-system-ingredient-prices.mjs" 2>&1
    $exitCode = $LASTEXITCODE
    Add-Content $logFile ($result | Out-String)
    if ($exitCode -eq 0) {
        Add-Content $logFile "[$timestamp] sync-system-ingredient-prices OK"
    } else {
        Add-Content $logFile "[$timestamp] ERROR: sync-system-ingredient-prices exit $exitCode"
    }
} catch {
    Add-Content $logFile "[$timestamp] EXCEPTION (sync-system-ingredient-prices): $_"
}

# Step 2: backfill normalization_map for any new canonical ingredients
try {
    $result2 = & "node" "scripts/backfill-normalization-map.mjs" 2>&1
    $exitCode2 = $LASTEXITCODE
    Add-Content $logFile ($result2 | Out-String)
    if ($exitCode2 -eq 0) {
        Add-Content $logFile "[$timestamp] backfill-normalization-map OK"
    } else {
        Add-Content $logFile "[$timestamp] ERROR: backfill-normalization-map exit $exitCode2"
    }
} catch {
    Add-Content $logFile "[$timestamp] EXCEPTION (backfill-normalization-map): $_"
}
