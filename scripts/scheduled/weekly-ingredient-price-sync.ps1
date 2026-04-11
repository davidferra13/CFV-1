# ChefFlow - Daily System Ingredient Price Sync
# Bridges OpenClaw store prices to system_ingredients via FTS matching,
# then propagates those market prices to chef ingredient_price_history.
# This is the fully local pipeline - no Pi API call required.
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

# Step 3: propagate density from system_ingredients to chef ingredients + refresh baselines
try {
    $result3 = & "node" "scripts/propagate-ingredient-density.mjs" 2>&1
    $exitCode3 = $LASTEXITCODE
    Add-Content $logFile ($result3 | Out-String)
    if ($exitCode3 -eq 0) {
        Add-Content $logFile "[$timestamp] propagate-ingredient-density OK"
    } else {
        Add-Content $logFile "[$timestamp] ERROR: propagate-ingredient-density exit $exitCode3"
    }
} catch {
    Add-Content $logFile "[$timestamp] EXCEPTION (propagate-ingredient-density): $_"
}

# Step 4: propagate system_ingredient market prices to ingredient_price_history.
# This closes the pipeline loop: OpenClaw -> system prices -> chef ingredient prices.
# Purely local - no Pi API required.
try {
    $result4 = & "node" "scripts/propagate-market-prices-to-ingredients.mjs" 2>&1
    $exitCode4 = $LASTEXITCODE
    Add-Content $logFile ($result4 | Out-String)
    if ($exitCode4 -eq 0) {
        Add-Content $logFile "[$timestamp] propagate-market-prices-to-ingredients OK"
    } else {
        Add-Content $logFile "[$timestamp] ERROR: propagate-market-prices-to-ingredients exit $exitCode4"
    }
} catch {
    Add-Content $logFile "[$timestamp] EXCEPTION (propagate-market-prices-to-ingredients): $_"
}

$endTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content $logFile "[$endTime] === Ingredient Price Sync complete ==="
Add-Content $logFile ""
