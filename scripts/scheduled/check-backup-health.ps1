# ChefFlow Backup Health Sentinel (FREE - no AI, no API cost)
# Checks backup freshness evidence and alerts when the recovery chain is stale.

$projectDir = "C:\Users\david\Documents\CFv1"
$backupDir = "$projectDir\backups"
$logFile = "$projectDir\logs\backup-health.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] $Message"
}

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

function Get-LatestFile {
    param([string]$Pattern)

    Get-ChildItem $Pattern -ErrorAction SilentlyContinue |
        Where-Object { $_.Length -gt 1000 } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
}

function Assert-FreshFile {
    param(
        [string]$Label,
        [System.IO.FileInfo]$File,
        [int]$MaxAgeHours,
        [switch]$WarnOnly
    )

    if (-not $File) {
        if ($WarnOnly) {
            $script:warnings += "$Label missing"
        } else {
            $script:failures += "$Label missing"
        }
        return
    }

    $ageHours = ((Get-Date) - $File.LastWriteTime).TotalHours
    if ($ageHours -gt $MaxAgeHours) {
        $message = "$Label stale: $([math]::Round($ageHours, 1))h old, max ${MaxAgeHours}h"
        if ($WarnOnly) {
            $script:warnings += $message
        } else {
            $script:failures += $message
        }
    }

    $manifestPath = "$($File.FullName).manifest.json"
    if (-not (Test-Path $manifestPath)) {
        $script:warnings += "$Label manifest missing for $($File.Name)"
    }
}

function Send-BackupAlert {
    param([string]$Message)

    $secret = Get-EnvFileValue -Name "CRON_SECRET"
    if (-not $secret) {
        Write-Log "WARN: CRON_SECRET missing, cannot send backup alert"
        return
    }

    $baseUrl = Get-EnvFileValue -Name "BACKUP_APP_BASE_URL"
    if (-not $baseUrl) {
        $baseUrl = "http://localhost:3300"
    }
    $baseUrl = $baseUrl.TrimEnd("/")

    try {
        Invoke-RestMethod -Method Post -Uri "$baseUrl/api/admin/backup-alert" `
            -Headers @{ Authorization = "Bearer $secret" } `
            -ContentType "application/json" `
            -Body (@{ error = $Message; timestamp = (Get-Date).ToString("o") } | ConvertTo-Json -Compress) `
            -TimeoutSec 10 | Out-Null
    } catch {
        Write-Log "WARN: Failed to send backup alert: $($_.Exception.Message)"
    }
}

New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 1MB) {
    Remove-Item "$logFile.old" -ErrorAction SilentlyContinue
    Rename-Item $logFile "$logFile.old" -ErrorAction SilentlyContinue
}

$failures = @()
$warnings = @()

$latestLogical = $null
foreach ($pattern in @("$backupDir\chefflow-*.dump.gpg", "$backupDir\chefflow-*.dump", "$backupDir\backup-*.sql")) {
    $latestLogical = Get-LatestFile -Pattern $pattern
    if ($latestLogical) { break }
}

$latestBase = Get-LatestFile -Pattern "$backupDir\basebackups\chefflow-basebackup-*.tar.gz.gpg"
$latestHost = Get-LatestFile -Pattern "$backupDir\host-config\chefflow-host-config-*.zip.gpg"
$latestWal = Get-ChildItem "$backupDir\wal_archive\*" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

Assert-FreshFile -Label "logical backup" -File $latestLogical -MaxAgeHours 26
Assert-FreshFile -Label "physical base backup" -File $latestBase -MaxAgeHours 200 -WarnOnly
Assert-FreshFile -Label "host config backup" -File $latestHost -MaxAgeHours 200 -WarnOnly

if ($latestWal) {
    $walAgeHours = ((Get-Date) - $latestWal.LastWriteTime).TotalHours
    if ($walAgeHours -gt 8) {
        $warnings += "WAL archive stale: $([math]::Round($walAgeHours, 1))h old"
    }
} else {
    $warnings += "WAL archive empty or inactive"
}

$offsiteLog = "$projectDir\logs\offsite-backup.log"
if (Test-Path $offsiteLog) {
    $offsiteAgeHours = ((Get-Date) - (Get-Item $offsiteLog).LastWriteTime).TotalHours
    if ($offsiteAgeHours -gt 30) {
        $failures += "offsite sync log stale: $([math]::Round($offsiteAgeHours, 1))h old"
    }
    $tail = Get-Content $offsiteLog -Tail 30
    if ($tail -match "FAIL") {
        $failures += "recent offsite sync log contains FAIL"
    }
} else {
    $failures += "offsite sync log missing"
}

$restoreLog = "$projectDir\logs\restore-test.log"
if (Test-Path $restoreLog) {
    $restoreAgeDays = ((Get-Date) - (Get-Item $restoreLog).LastWriteTime).TotalDays
    if ($restoreAgeDays -gt 35) {
        $warnings += "restore test stale: $([math]::Round($restoreAgeDays, 1))d old"
    }
} else {
    $warnings += "restore test log missing"
}

$logicalName = if ($latestLogical) { $latestLogical.Name } else { "missing" }
$baseName = if ($latestBase) { $latestBase.Name } else { "missing" }
$hostName = if ($latestHost) { $latestHost.Name } else { "missing" }
$walName = if ($latestWal) { $latestWal.Name } else { "missing" }
$summary = "logical=$logicalName | base=$baseName | host=$hostName | wal=$walName"

if ($failures.Count -gt 0) {
    $message = "Backup health FAILED. $summary. Failures: $($failures -join '; '). Warnings: $($warnings -join '; ')"
    Write-Log $message
    Send-BackupAlert -Message $message
    exit 1
}

if ($warnings.Count -gt 0) {
    $message = "Backup health warning. $summary. Warnings: $($warnings -join '; ')"
    Write-Log $message
    Send-BackupAlert -Message $message
    exit 0
}

Write-Log "Backup health OK. $summary"
