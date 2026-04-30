# ChefFlow Monthly Restore Test (FREE - no AI, no API cost)
# Restores the latest backup to a temp database, validates it, then drops it.
# Supports encrypted automated custom-format dumps and legacy SQL backups.
# Run monthly (or manually: powershell -File scripts\scheduled\monthly-restore-test.ps1)

$projectDir = "C:\Users\david\Documents\CFv1"
$logFile    = "$projectDir\logs\restore-test.log"
$testDb     = "chefflow_restore_test"
$safeStamp  = Get-Date -Format "yyyyMMddHHmmss"
$tempFile   = Join-Path $env:TEMP "chefflow-restore-test-$safeStamp.dump"

if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "[$timestamp] Starting monthly restore test..."

function Get-EnvFileValue {
    param([string]$Name)

    $envValue = [Environment]::GetEnvironmentVariable($Name)
    if ($envValue) {
        return $envValue
    }

    $envFile = Join-Path $projectDir ".env.local"
    if (-not (Test-Path $envFile)) {
        return $null
    }

    $line = Get-Content $envFile | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
    if (-not $line) {
        return $null
    }

    return ($line -replace "^$Name=", "").Trim().Trim('"').Trim("'")
}

function Test-CustomDump {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return $false
    }

    $stream = [System.IO.File]::OpenRead($Path)
    try {
        if ($stream.Length -lt 5) {
            return $false
        }

        $bytes = New-Object byte[] 5
        [void]$stream.Read($bytes, 0, 5)
        $signature = [System.Text.Encoding]::ASCII.GetString($bytes, 0, 5)
        return $signature -eq "PGDMP"
    }
    finally {
        $stream.Dispose()
    }
}

function Test-BackupManifest {
    param([System.IO.FileInfo]$Backup)

    $manifestPath = "$($Backup.FullName).manifest.json"
    if (-not (Test-Path $manifestPath)) {
        if ($Backup.Name -like "chefflow-*") {
            Add-Content -Path $logFile -Value "[$timestamp] WARN: No checksum manifest found for $($Backup.Name)"
        }
        return
    }

    $manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
    $actualHash = (Get-FileHash -Algorithm SHA256 -Path $Backup.FullName).Hash.ToLowerInvariant()
    if ($manifest.fileName -and $manifest.fileName -ne $Backup.Name) {
        Add-Content -Path $logFile -Value "[$timestamp] FAIL: Manifest fileName mismatch for $($Backup.Name)"
        exit 1
    }
    if ([int64]$manifest.sizeBytes -ne $Backup.Length) {
        Add-Content -Path $logFile -Value "[$timestamp] FAIL: Manifest size mismatch for $($Backup.Name)"
        exit 1
    }
    if ($manifest.sha256 -ne $actualHash) {
        Add-Content -Path $logFile -Value "[$timestamp] FAIL: Manifest checksum mismatch for $($Backup.Name)"
        exit 1
    }

    Add-Content -Path $logFile -Value "[$timestamp] Manifest verified for $($Backup.Name)"
}

# Find the latest non-empty backup. Prefer encrypted automated backups.
$latestBackup = $null
foreach ($pattern in @("chefflow-*.dump.gpg", "chefflow-*.dump", "backup-*.sql.gpg", "backup-*.sql")) {
    $latestBackup = Get-ChildItem "$projectDir\backups\$pattern" -ErrorAction SilentlyContinue |
        Where-Object { $_.Length -gt 1000 } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if ($latestBackup) {
        break
    }
}

if (-not $latestBackup) {
    Add-Content -Path $logFile -Value "[$timestamp] FAIL: No valid backup files found (all empty or missing)"
    exit 1
}

Add-Content -Path $logFile -Value "[$timestamp] Testing backup: $($latestBackup.Name) ($([math]::Round($latestBackup.Length / 1MB, 1)) MB)"

$restoreFile = $latestBackup.FullName

try {
    Test-BackupManifest -Backup $latestBackup

    if ($latestBackup.Name -like "*.gpg") {
        $passphrase = Get-EnvFileValue -Name "BACKUP_PASSPHRASE"
        if (-not $passphrase) {
            Add-Content -Path $logFile -Value "[$timestamp] FAIL: Backup is encrypted but BACKUP_PASSPHRASE is missing"
            exit 1
        }

        $passphrase | & gpg --batch --yes --passphrase-fd 0 -o $tempFile -d $latestBackup.FullName 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $tempFile)) {
            Add-Content -Path $logFile -Value "[$timestamp] FAIL: Could not decrypt backup"
            exit 1
        }

        $restoreFile = $tempFile
        Add-Content -Path $logFile -Value "[$timestamp] Decrypted backup for restore test"
    }

    # 1. Drop test DB if it exists from a previous failed run
    docker exec chefflow_postgres psql -U postgres -c "DROP DATABASE IF EXISTS $testDb;" 2>&1 | Out-Null

    # 2. Create fresh test DB
    $createResult = docker exec chefflow_postgres psql -U postgres -c "CREATE DATABASE $testDb;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Add-Content -Path $logFile -Value "[$timestamp] FAIL: Could not create test database: $createResult"
        exit 1
    }

    # 3. Restore backup into test DB
    $backupPath = $restoreFile -replace '\\', '/'
    if (Test-CustomDump -Path $restoreFile) {
        $restoreResult = & "C:\Program Files\Git\bin\bash.exe" -c "set -o pipefail; docker exec -i chefflow_postgres pg_restore --no-owner --no-privileges -U postgres -d $testDb < '$backupPath' 2>&1 | tail -20"
    } else {
        $restoreResult = & "C:\Program Files\Git\bin\bash.exe" -c "set -o pipefail; docker exec -i chefflow_postgres psql -U postgres $testDb < '$backupPath' 2>&1 | tail -20"
    }

    if ($LASTEXITCODE -ne 0) {
        Add-Content -Path $logFile -Value "[$timestamp] FAIL: Restore command failed: $restoreResult"
        exit 1
    }

    # 4. Validate: check key tables and business invariants.
    $validationSql = @"
WITH required_tables(name) AS (
    VALUES
        ('chefs'),
        ('clients'),
        ('events'),
        ('ledger_entries'),
        ('recipes'),
        ('user_roles'),
        ('commerce_payments')
)
SELECT 'missing_tables=' || COUNT(*)
FROM required_tables
WHERE to_regclass('public.' || name) IS NULL;

SELECT 'chefs=' || COUNT(*) FROM chefs;
SELECT 'clients=' || COUNT(*) FROM clients;
SELECT 'events=' || COUNT(*) FROM events;
SELECT 'recipes=' || COUNT(*) FROM recipes;
SELECT 'user_roles=' || COUNT(*) FROM user_roles;
SELECT 'ledger_entries=' || COUNT(*) FROM ledger_entries;
SELECT 'commerce_payments=' || COUNT(*) FROM commerce_payments;

SELECT 'tenantless_events=' || COUNT(*) FROM events WHERE tenant_id IS NULL;
SELECT 'tenantless_clients=' || COUNT(*) FROM clients WHERE tenant_id IS NULL;
SELECT 'bad_event_statuses=' || COUNT(*) FROM events
WHERE status::text NOT IN ('draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress', 'completed', 'cancelled');
SELECT 'ledger_zero_amounts=' || COUNT(*) FROM ledger_entries WHERE amount_cents = 0;
SELECT 'ledger_bad_refund_signs=' || COUNT(*) FROM ledger_entries
WHERE (is_refund = true AND amount_cents >= 0) OR (is_refund = false AND amount_cents <= 0);
SELECT 'ledger_missing_tenant=' || COUNT(*) FROM ledger_entries WHERE tenant_id IS NULL;
SELECT 'ledger_duplicate_sequences=' || COUNT(*) FROM (
    SELECT ledger_sequence
    FROM ledger_entries
    GROUP BY ledger_sequence
    HAVING COUNT(*) > 1
) duplicates;
"@

    $validation = $validationSql | docker exec -i chefflow_postgres psql -U postgres -d $testDb -t -A -v ON_ERROR_STOP=1 2>&1

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    if ($LASTEXITCODE -ne 0) {
        Add-Content -Path $logFile -Value "[$timestamp] FAIL: Validation query failed: $validation"
        exit 1
    }

    $metrics = @{}
    foreach ($line in ($validation -split "`r?`n")) {
        if ($line -match "^([^=]+)=(\d+)$") {
            $metrics[$matches[1]] = [int]$matches[2]
        }
    }

    $failureKeys = @(
        "missing_tables",
        "tenantless_events",
        "tenantless_clients",
        "bad_event_statuses",
        "ledger_zero_amounts",
        "ledger_bad_refund_signs",
        "ledger_missing_tenant",
        "ledger_duplicate_sequences"
    )

    foreach ($key in $failureKeys) {
        if (-not $metrics.ContainsKey($key)) {
            Add-Content -Path $logFile -Value "[$timestamp] FAIL: Validation metric missing. $key"
            exit 1
        }

        if ($metrics[$key] -gt 0) {
            Add-Content -Path $logFile -Value "[$timestamp] FAIL: Validation invariant failed. $key=$($metrics[$key])"
            exit 1
        }
    }

    if (-not $metrics.ContainsKey("chefs")) {
        Add-Content -Path $logFile -Value "[$timestamp] FAIL: Validation metric missing. chefs"
        exit 1
    }

    if ($metrics["chefs"] -lt 1) {
        Add-Content -Path $logFile -Value "[$timestamp] FAIL: Restore completed but no chefs were restored"
        exit 1
    }

    Add-Content -Path $logFile -Value "[$timestamp] PASS: Restore successful. Metrics: $(($validation -split "`r?`n" | Where-Object { $_ }) -join '; ')"
    Add-Content -Path $logFile -Value "[$timestamp] Validated: required tables, tenant scope, event FSM states, ledger signs, ledger sequence uniqueness"
}
catch {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] FAIL: $($_.Exception.Message)"
    exit 1
}
finally {
    # 5. Always clean up: drop test database
    docker exec chefflow_postgres psql -U postgres -c "DROP DATABASE IF EXISTS $testDb;" 2>&1 | Out-Null
    if (Test-Path $tempFile) {
        Remove-Item -LiteralPath $tempFile -Force
    }
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] Cleanup: test database dropped"
    Add-Content -Path $logFile -Value "=========================================="
}
