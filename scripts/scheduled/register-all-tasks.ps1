# Register all ChefFlow scheduled tasks in Windows Task Scheduler
# Run once: powershell -ExecutionPolicy Bypass -File scripts\scheduled\register-all-tasks.ps1

$base = "C:\Users\david\Documents\CFv1\scripts\scheduled"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# ── FREE TIER (deterministic scripts, $0 cost) ──────────────────────

# 1. Production Health Check - every 15 minutes
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\prod-health-check.ps1`"" -WorkingDirectory "C:\Users\david\Documents\CFv1"
$trigger = New-ScheduledTaskTrigger -Once -At "00:00" -RepetitionInterval (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName "ChefFlow-HealthCheck" -Action $action -Trigger $trigger -Settings $settings -Description "Every 15 min: prod, dev, DB, Ollama, tunnel health (FREE)" -Force

# 2. Daily Database Backup - 3:00 AM
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\daily-backup.ps1`"" -WorkingDirectory "C:\Users\david\Documents\CFv1"
$trigger = New-ScheduledTaskTrigger -Daily -At "3:00AM"
Register-ScheduledTask -TaskName "ChefFlow-DailyBackup" -Action $action -Trigger $trigger -Settings $settings -Description "Daily 3 AM: PostgreSQL custom dump with verification, encryption, heartbeat, and tiered retention (FREE)" -Force

# 3. Daily Pipeline Audit - 7:00 AM
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\daily-pipeline-audit.ps1`"" -WorkingDirectory "C:\Users\david\Documents\CFv1"
$trigger = New-ScheduledTaskTrigger -Daily -At "7:00AM"
Register-ScheduledTask -TaskName "ChefFlow-PipelineAudit" -Action $action -Trigger $trigger -Settings $settings -Description "Daily 7 AM: OpenClaw sync pipeline vs targets (FREE)" -Force

# 4. Daily Stale Artifact Cleanup - 2:00 AM
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\daily-stale-cleanup.ps1`"" -WorkingDirectory "C:\Users\david\Documents\CFv1"
$trigger = New-ScheduledTaskTrigger -Daily -At "2:00AM"
Register-ScheduledTask -TaskName "ChefFlow-StaleCleanup" -Action $action -Trigger $trigger -Settings $settings -Description "Daily 2 AM: clean test artifacts, old screenshots, probes (FREE)" -Force

# 5. Weekly DB Integrity Audit - Sunday 4:00 AM
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\weekly-db-integrity.ps1`"" -WorkingDirectory "C:\Users\david\Documents\CFv1"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "4:00AM"
Register-ScheduledTask -TaskName "ChefFlow-WeeklyDBIntegrity" -Action $action -Trigger $trigger -Settings $settings -Description "Sunday 4 AM: full DB integrity audit against business rules (FREE)" -Force

# 6. Weekly Secret Scan - Monday 5:00 AM
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\weekly-secret-scan.ps1`"" -WorkingDirectory "C:\Users\david\Documents\CFv1"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At "5:00AM"
Register-ScheduledTask -TaskName "ChefFlow-WeeklySecretScan" -Action $action -Trigger $trigger -Settings $settings -Description "Monday 5 AM: scan codebase for exposed secrets (FREE)" -Force

# 7. Weekly Ingredient Price Sync - Saturday 4:30 AM
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\weekly-ingredient-price-sync.ps1`"" -WorkingDirectory "C:\Users\david\Documents\CFv1"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At "4:30AM"
Register-ScheduledTask -TaskName "ChefFlow-IngredientPriceSync" -Action $action -Trigger $trigger -Settings $settings -Description "Saturday 4:30 AM: bridge OpenClaw prices to system_ingredients for costing (FREE)" -Force

# 8. Monthly Restore Test - every 4th Sunday, 4:30 AM
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\monthly-restore-test.ps1`"" -WorkingDirectory "C:\Users\david\Documents\CFv1"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -WeeksInterval 4 -At "4:30AM"
Register-ScheduledTask -TaskName "ChefFlow-MonthlyRestoreTest" -Action $action -Trigger $trigger -Settings $settings -Description "Monthly: restore backup to temp DB, validate, drop (FREE)" -Force

# 8. Daily Off-Site Backup Sync - 3:30 AM
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\offsite-backup-sync.ps1`"" -WorkingDirectory "C:\Users\david\Documents\CFv1"
$trigger = New-ScheduledTaskTrigger -Daily -At "3:30AM"
Register-ScheduledTask -TaskName "ChefFlow-OffsiteBackup" -Action $action -Trigger $trigger -Settings $settings -Description "Daily 3:30 AM: sync encrypted database backups to Cloudflare R2 (FREE, fails if unconfigured)" -Force

# 9. Live Ops Guardian - every hour
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\live-ops-guardian.ps1`"" -WorkingDirectory "C:\Users\david\Documents\CFv1"
$trigger = New-ScheduledTaskTrigger -Once -At "12:15AM" -RepetitionInterval (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "ChefFlow-LiveOpsGuardian" -Action $action -Trigger $trigger -Settings $settings -Description "Hourly: health probes + targeted public/auth sweeps when new changes are detected (FREE)" -Force

# 10. Daily Platform Observability Digest - 7:10 AM
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\platform-observability-digest.ps1`"" -WorkingDirectory "C:\Users\david\Documents\CFv1"
$trigger = New-ScheduledTaskTrigger -Daily -At "7:10AM"
Register-ScheduledTask -TaskName "ChefFlow-PlatformObservabilityDigest" -Action $action -Trigger $trigger -Settings $settings -Description "Daily 7:10 AM: send developer platform observability digest email" -Force

# ── Summary ──────────────────────────────────────────────────────────

Write-Host ""
Write-Host "============================================"
Write-Host "  All tasks registered successfully"
Write-Host "============================================"
Write-Host ""
Write-Host "FREE tier (deterministic, zero API cost):"
Write-Host "  ChefFlow-HealthCheck         - every 15 min (prod, dev, DB, Ollama, tunnel, disk, mem, CPU)"
Write-Host "  ChefFlow-DailyBackup         - daily 3:00 AM (verified encrypted pg_dump, tiered retention)"
Write-Host "  ChefFlow-OffsiteBackup       - daily 3:30 AM (R2 sync, fails if unconfigured)"
Write-Host "  ChefFlow-LiveOpsGuardian     - hourly (health probes + targeted verification on new changes)"
Write-Host "  ChefFlow-PlatformObservabilityDigest - daily 7:10 AM"
Write-Host "  ChefFlow-StaleCleanup        - daily 2:00 AM"
Write-Host "  ChefFlow-PipelineAudit       - daily 7:00 AM"
Write-Host "  ChefFlow-WeeklyDBIntegrity   - Sunday 4:00 AM"
Write-Host "  ChefFlow-WeeklySecretScan    - Monday 5:00 AM"
Write-Host "  ChefFlow-IngredientPriceSync - Saturday 4:30 AM"
Write-Host "  ChefFlow-MonthlyRestoreTest  - every 4th Sunday 4:30 AM"
Write-Host ""
Write-Host "PAID tier (Claude Code Haiku, ~`$0.03/run):"
Write-Host "  ChefFlow-DailySyncCheck      - daily 6:30 AM"
Write-Host ""
Write-Host "Pre-existing:"
Write-Host "  ChefFlow-Watchdog            - on logon"
Write-Host "  ChefFlow-Ollama              - on logon"
Write-Host "  OpenClaw-Pull                - 5x daily (6/10/14/18/22)"
Write-Host "  OpenClaw Session Capture     - daily 6:00 AM"
Write-Host "  PiTether                     - on logon"
Write-Host ""
