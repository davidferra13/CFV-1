# ChefFlow Scheduled Tasks - Master Reference

> Last updated: 2026-04-03

## Architecture

Two machines, one scheduler (Windows Task Scheduler on PC), three cost tiers:

| Tier          | What runs                         | Cost per run | When to use                                                 |
| ------------- | --------------------------------- | ------------ | ----------------------------------------------------------- |
| **Free**      | Node.js, PowerShell, Bash scripts | $0.00        | Everything deterministic (health, backup, audit, cleanup)   |
| **Cheap**     | Claude Code CLI with Haiku model  | ~$0.01-0.05  | AI reasoning needed (environment sync analysis)             |
| **Expensive** | Claude Code CLI with Opus/Sonnet  | ~$0.50-2.00  | Complex multi-step reasoning (manual only, never scheduled) |

**Rule: If a formula, script, or query can do it, never use AI.** AI is the fallback, not the default.

---

## Complete Schedule

### Overnight Window (2:00 - 5:00 AM)

| Time         | Task                            | Script                                       | Cost | What it does                                                           |
| ------------ | ------------------------------- | -------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| 2:00 AM      | **ChefFlow-StaleCleanup**       | `scripts/scheduled/daily-stale-cleanup.ps1`  | Free | Cleans test artifacts, old screenshots, probe dirs                     |
| 3:00 AM      | **ChefFlow-DailyBackup**        | `scripts/scheduled/daily-backup.ps1`         | Free | PostgreSQL dump via Docker, 7-day rotation                             |
| 3:30 AM      | **ChefFlow-OffsiteBackup**      | `scripts/scheduled/offsite-backup-sync.ps1`  | Free | Sync latest 3 backups to Cloudflare R2 (graceful skip if unconfigured) |
| 4:00 AM Sun  | **ChefFlow-WeeklyDBIntegrity**  | `scripts/scheduled/weekly-db-integrity.ps1`  | Free | Full DB audit against business rules                                   |
| ~monthly Sun | **ChefFlow-MonthlyRestoreTest** | `scripts/scheduled/monthly-restore-test.ps1` | Free | Restore backup to temp DB, validate key tables, drop                   |
| 5:00 AM Mon  | **ChefFlow-WeeklySecretScan**   | `scripts/scheduled/weekly-secret-scan.ps1`   | Free | Scan codebase for exposed credentials                                  |

### Morning Window (6:00 - 7:00 AM)

| Time    | Task                         | Script                                       | Cost   | What it does                                     |
| ------- | ---------------------------- | -------------------------------------------- | ------ | ------------------------------------------------ |
| 6:00 AM | **OpenClaw Session Capture** | `.openclaw-deploy/auto-capture-session.sh`   | Free   | Capture OpenClaw session data                    |
| 6:00 AM | **OpenClaw-Pull** (1st of 5) | `scripts/openclaw-pull/pull.mjs`             | Free   | Pi SQLite -> local openclaw.\* tables            |
| 6:30 AM | **ChefFlow-DailySyncCheck**  | `scripts/daily-sync-check.ps1`               | ~$0.03 | Claude Haiku: full environment sync verification |
| 7:00 AM | **ChefFlow-PipelineAudit**   | `scripts/scheduled/daily-pipeline-audit.ps1` | Free   | OpenClaw pipeline status vs targets              |

### All Day

| Frequency     | Task                     | Script                                    | Cost | What it does                                                                                  |
| ------------- | ------------------------ | ----------------------------------------- | ---- | --------------------------------------------------------------------------------------------- |
| Every 15 min  | **ChefFlow-HealthCheck** | `scripts/scheduled/prod-health-check.ps1` | Free | Prod, dev, DB, Ollama, tunnel, disk, mem, CPU. Desktop alert on failure. Healthchecks.io ping |
| Every 4 hours | **OpenClaw-Pull**        | `scripts/openclaw-pull/pull.mjs`          | Free | 6/10/14/18/22: price sync from Pi                                                             |

### On Logon

| Task                  | Script                            | What it does                                       |
| --------------------- | --------------------------------- | -------------------------------------------------- |
| **ChefFlow-Watchdog** | `chefflow-watchdog.ps1` (via VBS) | Auto-restarts prod server, Ollama, Mission Control |
| **ChefFlow-Ollama**   | `ollama.exe serve`                | Keeps AI runtime alive                             |
| **PiTether**          | `pi-tether.ps1`                   | Keeps Pi network connection alive                  |

---

## Logs

All scheduled task logs write to `logs/` in the project root:

| Log file                         | Written by                          |
| -------------------------------- | ----------------------------------- |
| `logs/health-check.log`          | HealthCheck (every 15 min)          |
| `logs/daily-backup.log`          | DailyBackup                         |
| `logs/daily-sync-check.log`      | DailySyncCheck (Claude Haiku)       |
| `logs/pipeline-audit.log`        | PipelineAudit                       |
| `logs/db-integrity.log`          | WeeklyDBIntegrity                   |
| `logs/secret-scan.log`           | WeeklySecretScan                    |
| `logs/cleanup.log`               | StaleCleanup                        |
| `logs/offsite-backup.log`        | OffsiteBackup                       |
| `logs/restore-test.log`          | MonthlyRestoreTest                  |
| `chefflow-watchdog.log`          | Watchdog (root level, pre-existing) |
| `.openclaw-deploy/logs/pull.log` | OpenClaw-Pull (pre-existing)        |

---

## Monthly Estimated Cost

| Component              | Runs/month | Cost/run | Monthly total    |
| ---------------------- | ---------- | -------- | ---------------- |
| Free tier scripts      | ~3,000+    | $0.00    | **$0.00**        |
| DailySyncCheck (Haiku) | 30         | ~$0.03   | **~$0.90**       |
| **Total**              |            |          | **~$0.90/month** |

---

## Managing Tasks

**Register all tasks:**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\scheduled\register-all-tasks.ps1
```

**List all project tasks:**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\scheduled\list-project-tasks.ps1
```

**View a specific task:**

```powershell
Get-ScheduledTask -TaskName "ChefFlow-HealthCheck" | Get-ScheduledTaskInfo
```

**Disable/enable a task:**

```powershell
Disable-ScheduledTask -TaskName "ChefFlow-HealthCheck"
Enable-ScheduledTask -TaskName "ChefFlow-HealthCheck"
```

**Run a task manually:**

```powershell
Start-ScheduledTask -TaskName "ChefFlow-DailyBackup"
```

---

## Adding New Scheduled Tasks

1. Create script in `scripts/scheduled/` (PowerShell preferred for Windows Task Scheduler)
2. Add registration to `scripts/scheduled/register-all-tasks.ps1`
3. Follow cost tier rules: deterministic script if possible, Haiku if AI needed
4. Always log to `logs/` with timestamp prefix
5. Include log rotation (1-2 MB max)
6. Update this document

---

## Research-Driven Improvements (2026-04-03)

Based on 5-perspective research (Chef, Consumer, Dev, Entrepreneur, Business/Corp):

### Applied (2026-04-03)

- Health check monitors **disk space, memory, CPU** (Google's Four Golden Signals)
- Health check pings **Healthchecks.io** dead-man's-switch (set `HEALTHCHECKS_PING_URL` env var)
- Health check log includes mem% and cpu% for trend analysis
- Daily sync check uses **Haiku model** with **$2 budget cap** (~95% cost reduction)
- **Backup script fixed** (was producing 0-byte files since mid-March; now uses Docker pg_dump)
- **Monthly restore test** scheduled and verified (9 chefs, 18 clients, 21 events restored successfully)
- **Off-site backup script** ready (`scripts/scheduled/offsite-backup-sync.ps1`), rclone installed, task registered (graceful skip until R2 configured)
- **Emergency runbook** written (`docs/emergency-runbook.md`, 8 recovery scenarios)
- **Pre-commit secret scanner** installed (`.git/hooks/pre-commit`, catches API keys/tokens/passwords)
- **OpenClaw pipeline validation** added (post-sync SQLite vs PostgreSQL record count comparison)
- **Builder spec** for external service setup (`docs/specs/p1-ops-external-services-setup.md`)

### Remaining (requires browser-based account signups, ~30 min total)

| Priority | Action                                                                   | Cost | Time   |
| -------- | ------------------------------------------------------------------------ | ---- | ------ |
| **P1**   | Create Cloudflare R2 bucket + configure rclone remote                    | $0   | 15 min |
| **P1**   | Sign up for UptimeRobot, add `app.cheflowhq.com` monitor                 | $0   | 10 min |
| **P1**   | Sign up for Healthchecks.io, set `HEALTHCHECKS_PING_URL` in `.env.local` | $0   | 10 min |

See `docs/specs/p1-ops-external-services-setup.md` for step-by-step instructions.

### Future (low priority, no urgency)

| Priority | Action                                              | Cost |
| -------- | --------------------------------------------------- | ---- |
| **P2**   | Add Cloudflare maintenance page (free Workers rule) | $0   |
| **P3**   | Complete Stripe SAQ-A self-assessment               | $0   |
| **P3**   | Formalize incident response procedure               | $0   |

### Key Research Numbers

- **$0.90/month** achieves ~60-70% of what enterprises pay **$700+/month** for
- Closing all gaps brings us to ~85% of enterprise capability for **~$1.40/month**
- Chefs' typical SaaS stack costs **$358-409/month** (HoneyBook + QuickBooks + Google Workspace + misc)
- **78% of clients** book with the first business that responds
- **74% of consumers** worry about data security with food services
- Private chef market: **$16.6B** (2024), growing to **$21-31B** by 2030-2034
