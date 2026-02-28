# Beta Deploy Infrastructure Improvements

**Date:** 2026-02-28
**Branch:** `feature/risk-gap-closure`

## What Changed

### 1. Zero-Downtime Deploys

**Before:** PM2 was stopped for the entire build (~8-10 minutes). `beta.cheflowhq.com` was completely down during every deploy.

**After:** The build runs into `.next-staging/` while the live server keeps serving from `.next/`. After the build succeeds, directories are swapped atomically and PM2 restarts. Downtime drops from ~10 minutes to ~2 seconds.

**How it works:**

- `next.config.js` now supports `NEXT_DIST_DIR` env var to override the output directory
- Deploy script sets `NEXT_DIST_DIR=.next-staging` during build
- On success: `.next` → `.next.backup`, `.next-staging` → `.next`, PM2 restart
- On failure: `.next-staging` is deleted, live server is untouched

**Memory safety:** The script checks available RAM before building. If less than 2GB available (meaning PM2 + build might OOM), it falls back to stopping PM2 first — same behavior as the old script.

### 2. Build Caching

**Before:** Every deploy nuked `.next/` entirely (`rm -rf .next`) and rebuilt from scratch. This was done to avoid `next-flight-client-entry-loader` errors from stale build output when switching branches.

**After:** The `.next/cache` directory (webpack + Next.js incremental compilation cache) is seeded into `.next-staging/cache` before building. This preserves incremental compilation across deploys while still getting a clean build output directory.

**Branch safety:** The cache is only reused if the deploy is on the same branch as the previous deploy. The branch name is stamped in `.next/cache/.branch`. If the branch changed, the cache is not seeded (full rebuild).

**Expected impact:** Same-branch deploys should drop from 8-10 minutes to 3-5 minutes.

### 3. PM2 Ecosystem Config (`ecosystem.config.cjs`)

**Before:** The deploy script checked for `ecosystem.config.cjs` but it didn't exist. It fell back to manual PM2 commands.

**After:** `ecosystem.config.cjs` lives in the repo root and gets synced to the Pi via `git fetch/reset`. It defines:

- 1.5GB heap max (`--max-old-space-size=1536`)
- 1.8GB RSS auto-restart (`max_memory_restart: '1800M'`)
- 5s graceful shutdown timeout (`kill_timeout: 5000`)
- 10s listen timeout for port binding (`listen_timeout: 10000`)
- Structured log paths and timestamps

### 4. PM2 Log Rotation (`scripts/setup-pi-logrotate.sh`)

**Before:** PM2 logs grew unbounded on the Pi's 128GB microSD.

**After:** One-time setup script installs `pm2-logrotate` on the Pi:

- Max 10MB per log file
- 5 rotated files kept (50MB per log type)
- Compression enabled
- ~100MB total max log footprint
- Rotates at midnight daily

Run once: `bash scripts/setup-pi-logrotate.sh`

### 5. Deploy Timing

Build time and total deploy time are tracked and displayed at the end of every deploy. Helps verify that build caching is actually working.

### 6. SSH Connection Pooling

All SSH connections in the deploy script (and globally for the `pi` host) are multiplexed over a single TCP socket via `ControlMaster`. Saves ~1-2 seconds per SSH step (7-8 steps per deploy).

### 7. Auto-Rollback on Health Check Failure

**Before:** If the health check failed after deploy, the script printed a warning and exited. You had to manually run `bash scripts/rollback-beta.sh`.

**After:** The script automatically restores `.next.backup`, restarts PM2, and logs the failure. No manual intervention needed.

### 8. Deploy History Log

Every deploy (success or failure) appends a timestamped line to `~/apps/deploy-history.log` on the Pi:

```
2026-02-28T15:30:00Z | branch=feature/foo | commit=8c209e0e | build=abc123 | build_time=4m12s | total=5m38s
```

View with: `ssh pi 'cat ~/apps/deploy-history.log'`

### 9. Pre-Deploy Database Backup

Every deploy now runs `scripts/backup-db.sh` before pushing code. Non-blocking — if the backup fails (Supabase CLI offline), the deploy continues.

Backups are saved to `backups/` with 7-day retention.

### 10. Standalone Database Backup Script (`scripts/backup-db.sh`)

Independent of Mission Control. Can be run manually or via cron/Task Scheduler.

```bash
bash scripts/backup-db.sh           # interactive
bash scripts/backup-db.sh --quiet   # cron-friendly
```

7-day retention, verifies dump isn't empty, auto-cleans old backups.

### 11. Uptime Watchdog (`scripts/uptime-watchdog.sh`)

Lightweight standalone monitor that pings beta, production, and Pi SSH every 5 minutes. Sends Windows desktop notifications on state changes (down/recovered). Runs independently of Mission Control.

```bash
bash scripts/uptime-watchdog.sh              # foreground
bash scripts/uptime-watchdog.sh --daemon &   # background
```

## Files Changed

| File                             | Change                                                  |
| -------------------------------- | ------------------------------------------------------- |
| `next.config.js`                 | Added `NEXT_DIST_DIR` env var override for `distDir`    |
| `.gitignore`                     | Added `.next-staging/`                                  |
| `ecosystem.config.cjs`           | Created — PM2 config for Pi                             |
| `scripts/deploy-beta.sh`         | Rewritten — 10-step zero-downtime pipeline              |
| `scripts/rollback-beta.sh`       | Added `.next-staging` cleanup                           |
| `scripts/setup-pi-logrotate.sh`  | Created — one-time Pi log rotation setup                |
| `scripts/backup-db.sh`           | Created — standalone database backup with retention     |
| `scripts/uptime-watchdog.sh`     | Created — standalone uptime monitor with desktop alerts |
| `~/.ssh/config`                  | Added `ControlMaster` for SSH connection pooling        |
| `docs/separate-beta-database.md` | Created — guide for separating dev/beta databases       |

## Revised Deploy Pipeline (10 steps)

```
[ 0/10] Pre-flight — verify SSH works
[ 1/10] Database backup (non-blocking)
[ 2/10] Push to GitHub
[ 3/10] Stop Ollama (safety — it's masked anyway)
[ 4/10] Sync code to Pi (git fetch + reset)
[ 5/10] Copy .env.local.beta → Pi
[ 6/10] Check memory — decide if PM2 stays running or stops
[ 7/10] Seed cache + build into .next-staging (6GB heap)
        ↑ LIVE SERVER STAYS RUNNING during this step
[ 8/10] Atomic swap: .next → .next.backup, .next-staging → .next
[ 9/10] Restart PM2 via ecosystem.config.cjs (~2s downtime)
[10/10] Health check — auto-rollback if failed
```

## Post-Deploy Checklist

After the first deploy with these changes:

1. Verify `ssh pi 'pm2 list'` shows ecosystem config loaded
2. Verify `https://beta.cheflowhq.com` works
3. Run `bash scripts/setup-pi-logrotate.sh` (one-time)
4. Verify `ssh pi 'pm2 list'` shows pm2-logrotate module
5. Check deploy log: `ssh pi 'cat ~/apps/deploy-history.log'`
6. Optionally start watchdog: `bash scripts/uptime-watchdog.sh --daemon &`

## Still TODO (not code changes)

1. **Separate beta database** — See `docs/separate-beta-database.md` for step-by-step guide
2. **UptimeRobot** — Free external monitoring (signup at uptimerobot.com, add the two health URLs)
