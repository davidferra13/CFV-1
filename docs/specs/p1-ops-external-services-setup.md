# P1: Operations External Services Setup

> **Type:** Infrastructure setup (manual, requires account creation)
> **Priority:** P1
> **Cost:** $0-0.50/month total
> **Time:** ~2 hours
> **Prerequisites:** All scheduled tasks registered and working (done)
> **Source:** 5-perspective research synthesis (2026-04-03)

---

## Context

ChefFlow's scheduled task system achieves ~60-70% of enterprise ops capability at $0.90/month. Three free external services close the remaining gaps to ~85%, addressing the #1 finding across all research perspectives: no off-site backup, no external monitoring, and no dead-man's-switch for the scheduled tasks themselves.

---

## Task 1: Cloudflare R2 Off-Site Backup ($0/month on free tier)

**Why:** Every research perspective flagged this as P0. All 7 local backups die if the PC disk fails. The 3-2-1 backup rule requires at least one off-site copy.

**Steps:**

1. Log into Cloudflare dashboard (https://dash.cloudflare.com)
2. Go to R2 Object Storage
3. Create bucket: `chefflow-backups`
4. Generate R2 API token (Object Read & Write for this bucket only)
5. Install rclone: `winget install Rclone.Rclone`
6. Configure rclone remote:
   ```
   rclone config
   > n (new remote)
   > name: r2
   > type: s3
   > provider: Cloudflare
   > access_key_id: <from step 4>
   > secret_access_key: <from step 4>
   > endpoint: https://<account-id>.r2.cloudflarestorage.com
   ```
7. Test: `rclone ls r2:chefflow-backups`
8. The script `scripts/scheduled/offsite-backup-sync.ps1` is already written and will auto-detect when rclone + R2 are configured

**Register scheduled task:**

```powershell
$base = "C:\Users\david\Documents\CFv1\scripts\scheduled"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\offsite-backup-sync.ps1`"" -WorkingDirectory "C:\Users\david\Documents\CFv1"
$trigger = New-ScheduledTaskTrigger -Daily -At "3:30AM"
Register-ScheduledTask -TaskName "ChefFlow-OffsiteBackup" -Action $action -Trigger $trigger -Settings $settings -Description "Daily 3:30 AM: sync latest backup to Cloudflare R2 (FREE)" -Force
```

**Free tier limits:** 10GB storage, 10M class B ops/month, 1M class A ops/month, zero egress. Our backups are ~2.1GB each, 3 copies on R2 = ~6.3GB. Well within free tier.

**Verification:** After setup, check `logs/offsite-backup.log` the next morning.

---

## Task 2: UptimeRobot External Monitor ($0/month on free tier)

**Why:** Our health check runs on the same PC it monitors. If the PC is off, the health check is also off. UptimeRobot checks from external servers.

**Steps:**

1. Sign up at https://uptimerobot.com (free, no credit card)
2. Add monitor:
   - Type: HTTP(S)
   - URL: `https://app.cheflowhq.com/api/health/ping`
   - Interval: 5 minutes
   - Alert contacts: your email + (optional) phone/SMS
3. Add second monitor (optional):
   - Type: HTTP(S)
   - URL: `https://app.cheflowhq.com`
   - Interval: 5 minutes

**Free tier limits:** 50 monitors, 5-minute intervals. We need 1-2. Plenty of headroom.

**What it catches:** ISP outage, PC power loss, Cloudflare Tunnel disconnect, DNS issues. Everything the internal watchdog cannot see.

---

## Task 3: Healthchecks.io Dead-Man's-Switch ($0/month on free tier)

**Why:** If a scheduled task silently stops running (Task Scheduler bug, script error, disk full), nobody notices. Healthchecks.io alerts you when a ping doesn't arrive on time.

**Steps:**

1. Sign up at https://healthchecks.io (free, no credit card)
2. Create checks for critical tasks:
   - **HealthCheck** (expected every 15 min, grace 30 min)
   - **DailyBackup** (expected every 24h, grace 2h)
   - **DailySyncCheck** (expected every 24h, grace 2h)
   - **OpenClaw-Pull** (expected every 4h, grace 2h)
3. Copy the ping URL for the HealthCheck monitor
4. Add to `.env.local`:
   ```
   HEALTHCHECKS_PING_URL=https://hc-ping.com/your-uuid-here
   ```
5. The health check script already pings this URL if the env var is set

**For additional tasks**, add ping calls to each script. Pattern:

```powershell
# At the end of each script, after success:
if ($env:HEALTHCHECKS_BACKUP_URL) {
    Invoke-WebRequest -Uri $env:HEALTHCHECKS_BACKUP_URL -TimeoutSec 5 -UseBasicParsing | Out-Null
}
```

**Free tier limits:** 20 checks, unlimited pings. We need 4-6 checks.

---

## Completion Criteria

- [ ] R2 bucket created and rclone configured
- [ ] `rclone ls r2:chefflow-backups` returns without error
- [ ] Off-site backup task registered and first sync logged
- [ ] UptimeRobot monitoring `app.cheflowhq.com` with email alerts
- [ ] Healthchecks.io monitoring at least the health check task
- [ ] `HEALTHCHECKS_PING_URL` set in `.env.local`
- [ ] All log files show first successful run

---

## Cost Summary After Completion

| Component                      | Monthly Cost     |
| ------------------------------ | ---------------- |
| 13 scheduled tasks (free tier) | $0.00            |
| DailySyncCheck (Claude Haiku)  | ~$0.90           |
| Cloudflare R2 (free tier)      | $0.00            |
| UptimeRobot (free tier)        | $0.00            |
| Healthchecks.io (free tier)    | $0.00            |
| **Total**                      | **~$0.90/month** |

Enterprise equivalent: $700-3,000+/month. Capability coverage: ~85%.
