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
# This script syncs the latest 3 backups to R2, keeping costs minimal.

$projectDir = "C:\Users\david\Documents\CFv1"
$logFile    = "$projectDir\logs\offsite-backup.log"
$backupDir  = "$projectDir\backups"
$r2Bucket   = "r2:chefflow-backups"

if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Check if rclone is available
$rclonePath = Get-Command rclone -ErrorAction SilentlyContinue
if (-not $rclonePath) {
    Add-Content -Path $logFile -Value "[$timestamp] SKIP: rclone not installed. Run: winget install Rclone.Rclone"
    exit 0
}

# Check if R2 remote is configured
$remotes = rclone listremotes 2>&1
if ($remotes -notmatch "r2:") {
    Add-Content -Path $logFile -Value "[$timestamp] SKIP: rclone 'r2' remote not configured. Run: rclone config"
    exit 0
}

Add-Content -Path $logFile -Value "[$timestamp] Starting off-site backup sync..."

# Find the 3 latest non-empty backups
$latestBackups = Get-ChildItem "$backupDir\backup-*.sql" | Where-Object { $_.Length -gt 1000 } | Sort-Object LastWriteTime -Descending | Select-Object -First 3

if ($latestBackups.Count -eq 0) {
    Add-Content -Path $logFile -Value "[$timestamp] WARN: No valid backup files to sync"
    exit 0
}

$synced = 0
foreach ($backup in $latestBackups) {
    try {
        # Only upload if it doesn't already exist on R2 (or local is newer)
        $result = rclone copy $backup.FullName "$r2Bucket/" --no-traverse --s3-no-check-bucket 2>&1
        $synced++
        Add-Content -Path $logFile -Value "[$timestamp] Synced: $($backup.Name) ($([math]::Round($backup.Length / 1MB, 1)) MB)"
    } catch {
        Add-Content -Path $logFile -Value "[$timestamp] FAIL syncing $($backup.Name): $($_.Exception.Message)"
    }
}

# Clean up old files on R2 (keep only latest 5)
try {
    $r2Files = rclone lsf "$r2Bucket/" --files-only 2>&1 | Sort-Object -Descending
    if ($r2Files.Count -gt 5) {
        $toDelete = $r2Files | Select-Object -Skip 5
        foreach ($old in $toDelete) {
            rclone deletefile "$r2Bucket/$old" 2>&1 | Out-Null
            Add-Content -Path $logFile -Value "[$timestamp] R2 cleanup: removed $old"
        }
    }
} catch {
    Add-Content -Path $logFile -Value "[$timestamp] WARN: R2 cleanup failed: $($_.Exception.Message)"
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "[$timestamp] Off-site sync complete. $synced files synced."
Add-Content -Path $logFile -Value "=========================================="
