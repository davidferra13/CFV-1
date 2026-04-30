# ChefFlow Off-Site Backup Sync (FREE via Cloudflare R2 free tier)
# Uploads the latest local backup to Cloudflare R2 for off-site redundancy
# Runs daily after the backup task (3:30 AM)
#
# SETUP (one-time):
#   1. Install rclone: winget install Rclone.Rclone
#   2. Create Cloudflare R2 bucket "chefflow-backups" (free tier: 10GB, zero egress)
#   3. Generate R2 API token (S3 compatible)
#   4. Configure rclone:
#      rclone config
#        name: r2
#        type: s3
#        provider: Cloudflare
#        access_key_id: <your R2 access key>
#        secret_access_key: <your R2 secret key>
#        endpoint: https://<account-id>.r2.cloudflarestorage.com
#   5. Test: rclone ls r2:chefflow-backups
#
# This script syncs generated database backups to R2.

$projectDir = "C:\Users\david\Documents\CFv1"
$logFile    = "$projectDir\logs\offsite-backup.log"
$backupDir  = "$projectDir\backups"
$baseBackupDir = "$backupDir\basebackups"
$hostConfigDir = "$backupDir\host-config"
$walArchiveDir = "$backupDir\wal_archive"
$r2Bucket   = "r2:chefflow-backups"

if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Check if rclone is available
$rclonePath = Get-Command rclone -ErrorAction SilentlyContinue
if (-not $rclonePath) {
    Add-Content -Path $logFile -Value "[$timestamp] FAIL: rclone not installed. Run: winget install Rclone.Rclone"
    exit 1
}

# Check if R2 remote is configured
$remotes = rclone listremotes 2>&1
if ($remotes -notmatch "r2:") {
    Add-Content -Path $logFile -Value "[$timestamp] FAIL: rclone 'r2' remote not configured. Run: rclone config"
    exit 1
}

Add-Content -Path $logFile -Value "[$timestamp] Starting off-site backup sync..."

# Prefer encrypted automated backups. Fall back to unencrypted automated backups,
# then legacy SQL backups so older restore points are still protected.
$latestBackups = @()
foreach ($pattern in @("chefflow-*.dump.gpg", "chefflow-*.dump", "backup-*.sql.gpg", "backup-*.sql")) {
    $latestBackups = @(Get-ChildItem "$backupDir\$pattern" -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 1000 } | Sort-Object LastWriteTime -Descending)
    if ($latestBackups.Count -gt 0) {
        break
    }
}

if ($latestBackups.Count -eq 0) {
    Add-Content -Path $logFile -Value "[$timestamp] FAIL: No valid backup files to sync"
    exit 1
}

if ($latestBackups[0].Name -notlike "*.gpg") {
    Add-Content -Path $logFile -Value "[$timestamp] WARN: Latest selected backups are not encrypted. Configure BACKUP_PASSPHRASE and rerun daily backup."
}

$synced = 0
foreach ($backup in ($latestBackups | Select-Object -First 30)) {
    try {
        # Only upload if it doesn't already exist on R2 (or local is newer)
        $result = rclone copy $backup.FullName "$r2Bucket/" --no-traverse --s3-no-check-bucket 2>&1
        if ($LASTEXITCODE -ne 0) {
            Add-Content -Path $logFile -Value "[$timestamp] FAIL syncing $($backup.Name): $result"
        } else {
            $synced++
            Add-Content -Path $logFile -Value "[$timestamp] Synced: $($backup.Name) ($([math]::Round($backup.Length / 1MB, 1)) MB)"

            $manifestPath = "$($backup.FullName).manifest.json"
            if (Test-Path $manifestPath) {
                $manifestResult = rclone copy $manifestPath "$r2Bucket/" --no-traverse --s3-no-check-bucket 2>&1
                if ($LASTEXITCODE -ne 0) {
                    Add-Content -Path $logFile -Value "[$timestamp] WARN syncing manifest for $($backup.Name): $manifestResult"
                } else {
                    Add-Content -Path $logFile -Value "[$timestamp] Synced manifest: $($backup.Name).manifest.json"
                }
            } else {
                Add-Content -Path $logFile -Value "[$timestamp] WARN: Missing manifest for $($backup.Name)"
            }
        }
    } catch {
        Add-Content -Path $logFile -Value "[$timestamp] FAIL syncing $($backup.Name): $($_.Exception.Message)"
    }
}

if (Test-Path $baseBackupDir) {
    $baseBackups = Get-ChildItem "$baseBackupDir\chefflow-basebackup-*.tar.gz.gpg" -ErrorAction SilentlyContinue |
        Where-Object { $_.Length -gt 1000 } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 8

    foreach ($baseBackup in $baseBackups) {
        $baseResult = rclone copy $baseBackup.FullName "$r2Bucket/basebackups/" --no-traverse --s3-no-check-bucket 2>&1
        if ($LASTEXITCODE -ne 0) {
            Add-Content -Path $logFile -Value "[$timestamp] WARN syncing physical base backup $($baseBackup.Name): $baseResult"
        } else {
            Add-Content -Path $logFile -Value "[$timestamp] Synced physical base backup: $($baseBackup.Name)"
        }

        $baseManifestPath = "$($baseBackup.FullName).manifest.json"
        if (Test-Path $baseManifestPath) {
            $baseManifestResult = rclone copy $baseManifestPath "$r2Bucket/basebackups/" --no-traverse --s3-no-check-bucket 2>&1
            if ($LASTEXITCODE -ne 0) {
                Add-Content -Path $logFile -Value "[$timestamp] WARN syncing physical base backup manifest for $($baseBackup.Name): $baseManifestResult"
            }
        }
    }
}

if (Test-Path $hostConfigDir) {
    $hostBackups = Get-ChildItem "$hostConfigDir\chefflow-host-config-*.zip.gpg" -ErrorAction SilentlyContinue |
        Where-Object { $_.Length -gt 1000 } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 12

    foreach ($hostBackup in $hostBackups) {
        $hostResult = rclone copy $hostBackup.FullName "$r2Bucket/host-config/" --no-traverse --s3-no-check-bucket 2>&1
        if ($LASTEXITCODE -ne 0) {
            Add-Content -Path $logFile -Value "[$timestamp] WARN syncing host config backup $($hostBackup.Name): $hostResult"
        } else {
            Add-Content -Path $logFile -Value "[$timestamp] Synced host config backup: $($hostBackup.Name)"
        }

        $hostManifestPath = "$($hostBackup.FullName).manifest.json"
        if (Test-Path $hostManifestPath) {
            $hostManifestResult = rclone copy $hostManifestPath "$r2Bucket/host-config/" --no-traverse --s3-no-check-bucket 2>&1
            if ($LASTEXITCODE -ne 0) {
                Add-Content -Path $logFile -Value "[$timestamp] WARN syncing host config manifest for $($hostBackup.Name): $hostManifestResult"
            }
        }
    }
} else {
    Add-Content -Path $logFile -Value "[$timestamp] WARN: Host config backup directory not found."
}

if (Test-Path $walArchiveDir) {
    $walResult = rclone copy $walArchiveDir "$r2Bucket/wal_archive/" --ignore-existing --s3-no-check-bucket 2>&1
    if ($LASTEXITCODE -ne 0) {
        Add-Content -Path $logFile -Value "[$timestamp] WARN syncing WAL archive: $walResult"
    } else {
        Add-Content -Path $logFile -Value "[$timestamp] Synced WAL archive files."
    }
} else {
    Add-Content -Path $logFile -Value "[$timestamp] WARN: WAL archive directory not found. PITR is not active until PostgreSQL is restarted with WAL archiving enabled."
}

# Clean up old files on R2. Keep 54 restore points, enough for roughly
# 30 daily, 12 weekly, and 12 monthly checkpoints when filenames sort by date.
try {
    $r2Files = rclone lsf "$r2Bucket/" --files-only 2>&1
    $r2Backups = $r2Files | Where-Object { $_ -notlike "*.manifest.json" } | Sort-Object -Descending
    if ($r2Backups.Count -gt 54) {
        $toDelete = $r2Backups | Select-Object -Skip 54
        foreach ($old in $toDelete) {
            rclone deletefile "$r2Bucket/$old" 2>&1 | Out-Null
            Add-Content -Path $logFile -Value "[$timestamp] R2 cleanup: removed $old"

            $oldManifest = "$old.manifest.json"
            if ($r2Files -contains $oldManifest) {
                rclone deletefile "$r2Bucket/$oldManifest" 2>&1 | Out-Null
                Add-Content -Path $logFile -Value "[$timestamp] R2 cleanup: removed $oldManifest"
            }
        }
    }
} catch {
    Add-Content -Path $logFile -Value "[$timestamp] WARN: R2 cleanup failed: $($_.Exception.Message)"
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "[$timestamp] Off-site sync complete. $synced files synced."
Add-Content -Path $logFile -Value "=========================================="

if ($synced -eq 0) {
    exit 1
}
