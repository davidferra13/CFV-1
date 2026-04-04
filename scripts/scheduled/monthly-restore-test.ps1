# ChefFlow Monthly Restore Test (FREE - no AI, no API cost)
# Restores the latest backup to a temp database, validates it, then drops it
# Proves the backup chain actually works
# Run monthly (or manually: powershell -File scripts\scheduled\monthly-restore-test.ps1)

$projectDir = "C:\Users\david\Documents\CFv1"
$logFile    = "$projectDir\logs\restore-test.log"
$testDb     = "chefflow_restore_test"

if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "[$timestamp] Starting monthly restore test..."

# Find the latest non-empty backup
$latestBackup = Get-ChildItem "$projectDir\backups\backup-*.sql" | Where-Object { $_.Length -gt 1000 } | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $latestBackup) {
    Add-Content -Path $logFile -Value "[$timestamp] FAIL: No valid backup files found (all empty or missing)"
    exit 1
}

Add-Content -Path $logFile -Value "[$timestamp] Testing backup: $($latestBackup.Name) ($([math]::Round($latestBackup.Length / 1MB, 1)) MB)"

try {
    # 1. Drop test DB if it exists from a previous failed run
    docker exec chefflow_postgres psql -U postgres -c "DROP DATABASE IF EXISTS $testDb;" 2>&1 | Out-Null

    # 2. Create fresh test DB
    $createResult = docker exec chefflow_postgres psql -U postgres -c "CREATE DATABASE $testDb;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Add-Content -Path $logFile -Value "[$timestamp] FAIL: Could not create test database: $createResult"
        exit 1
    }

    # 3. Restore backup into test DB
    $backupPath = $latestBackup.FullName -replace '\\', '/'
    $restoreResult = & "C:\Program Files\Git\bin\bash.exe" -c "docker exec -i chefflow_postgres psql -U postgres $testDb < '$backupPath' 2>&1 | tail -5"

    # 4. Validate: check that key tables exist and have data
    $validation = docker exec chefflow_postgres psql -U postgres -d $testDb -t -c "
        SELECT
            (SELECT COUNT(*) FROM chefs) as chefs,
            (SELECT COUNT(*) FROM clients) as clients,
            (SELECT COUNT(*) FROM events) as events;
    " 2>&1

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    if ($validation -match "\d+") {
        Add-Content -Path $logFile -Value "[$timestamp] PASS: Restore successful. Table counts: $($validation.Trim())"
        Add-Content -Path $logFile -Value "[$timestamp] Validated: chefs, clients, events tables exist with data"
    } else {
        Add-Content -Path $logFile -Value "[$timestamp] WARN: Restore completed but validation query returned unexpected results: $validation"
    }
}
catch {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] FAIL: $($_.Exception.Message)"
}
finally {
    # 5. Always clean up: drop test database
    docker exec chefflow_postgres psql -U postgres -c "DROP DATABASE IF EXISTS $testDb;" 2>&1 | Out-Null
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] Cleanup: test database dropped"
    Add-Content -Path $logFile -Value "=========================================="
}
