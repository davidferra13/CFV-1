# Hermes Night Shift: 24/7 Operations Agent

**Status:** SPEC READY
**Date:** 2026-05-03
**Owner:** David / Claude Code

---

## Why Hermes Failed Before

Evidence from the WSL2 deployment (2026-04-24):

1. Zero cron jobs configured (empty crontab)
2. Only 5 interactive sessions across 2 days, then abandoned
3. Crashed April 29 (SIGHUP), nobody restarted it
4. SOUL.md was a 50-line "don't do bad things" rulebook with zero job definitions
5. No output path: nothing wired into session-briefing.sh or docs/
6. Skills directory was all Hermes defaults (gaming, gifs, social-media)
7. Memories were a copy/paste of CLAUDE.md rules, not operational intelligence

**Root cause:** Hermes was hired and shown a desk but never given work, a schedule, output expectations, or a supervisor.

---

## What Hermes Does Now

Hermes is the **night shift operator**. It runs 24/7 on scheduled cron jobs inside WSL2. It does not build code. It does not make decisions. It produces reports that David and Claude Code consume every morning.

### Role: Read-Only Intelligence + Report Generator

Hermes reads. Hermes curls. Hermes writes markdown reports. That's it.

---

## Job Definitions (6 Jobs)

### Job 1: App Health Pulse (every 15 min)

**What:** Hit every major route group on localhost:3100, record HTTP status codes.

**Commands:**

```bash
# Hit route groups, log status codes
curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/api/health
curl -s -o /dev/null -w "%{http_code}" -b ".auth/agent-cookies.txt" http://localhost:3100/dashboard
curl -s -o /dev/null -w "%{http_code}" -b ".auth/client-cookies.txt" http://localhost:3100/my-events
curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/chefs
curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/book
curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/api/openclaw/status
```

**Output:** Append to `/mnt/c/Users/david/Documents/CFv1/docs/hermes/health-pulse.jsonl`

```json
{
  "ts": "2026-05-03T03:15:00Z",
  "routes": {
    "/": 200,
    "/api/health": 200,
    "/dashboard": 200,
    "/my-events": 200,
    "/chefs": 200,
    "/book": 200,
    "/api/openclaw/status": 200
  },
  "all_ok": true
}
```

**Alert condition:** Any non-2xx status = write to `docs/hermes/ALERTS.md` with timestamp and route.

---

### Job 2: OpenClaw Data Freshness (every 2 hours)

**What:** Query OpenClaw API on Pi, check price freshness and sync status.

**Commands:**

```bash
# Price freshness
curl -s http://10.0.0.177:8081/api/health
curl -s http://10.0.0.177:8081/api/stats
# ChefFlow sync status
curl -s http://localhost:3100/api/openclaw/status
# Last sync timestamp from local file
cat /mnt/c/Users/david/Documents/CFv1/docs/sync-status.json
```

**Output:** Append to `docs/hermes/openclaw-freshness.jsonl`

```json
{
  "ts": "2026-05-03T04:00:00Z",
  "pi_alive": true,
  "prices_24h": 1250,
  "last_sync": "2026-05-02T23:00:00Z",
  "sync_age_hours": 5,
  "stale": false
}
```

**Alert condition:** Pi unreachable, sync older than 36 hours, or price count drops >20% from prior check.

---

### Job 3: Git Changelog Digest (every 4 hours)

**What:** Read git log since last digest, summarize what changed.

**Commands:**

```bash
cd /mnt/c/Users/david/Documents/CFv1
git log --oneline --since="4 hours ago" 2>/dev/null
git diff --stat HEAD~5 2>/dev/null
git status --porcelain 2>/dev/null | wc -l
```

**Output:** Append to `docs/hermes/git-changelog.md`

```markdown
## 2026-05-03 04:00

**Commits (last 4h):** 3

- abc1234 feat(events): add co-host settlement panel
- def5678 fix(calendar): week view overflow
- ghi9012 chore: update deps

**Uncommitted files:** 12
**Unpushed commits:** 2
```

**Why this matters:** When Claude Code starts a new session, the morning briefing includes Hermes' changelog. No more cold starts. Context survives overnight.

---

### Job 4: Build State Monitor (every 6 hours)

**What:** Check if TypeScript compiles and capture build state without actually running next build (too heavy).

**Note:** This job needs `npx` access. See "Allowlist Changes" below.

**Commands:**

```bash
cd /mnt/c/Users/david/Documents/CFv1
npx tsc --noEmit --skipLibCheck --pretty false 2>&1 | tail -20
```

**Output:** Write to `docs/hermes/build-state-check.md`

```markdown
## 2026-05-03 06:00

**tsc result:** PASS (0 errors)
```

or

```markdown
## 2026-05-03 06:00

**tsc result:** FAIL (3 errors)

- lib/events/actions.ts(142,5): error TS2345: ...
- components/calendar/week-view.tsx(88,12): error TS2339: ...
- app/(chef)/dashboard/page.tsx(23,7): error TS2307: ...
```

**Alert condition:** Any tsc errors = write to `docs/hermes/ALERTS.md`.

---

### Job 5: Database Backup Watchdog (every 12 hours)

**What:** Verify backups are fresh and intact.

**Commands:**

```bash
ls -lt /mnt/c/Users/david/Documents/CFv1/backups/ | head -5
cat /mnt/c/Users/david/Documents/CFv1/backups/backup-log.json | jq '.[-1]' 2>/dev/null
```

**Output:** Append to `docs/hermes/backup-watchdog.jsonl`

```json
{
  "ts": "2026-05-03T06:00:00Z",
  "latest_backup": "chefflow-2026-05-02.dump",
  "age_hours": 8,
  "count": 15,
  "status": "healthy"
}
```

**Alert condition:** No backup in 48 hours, or backup-log.json last entry is not "success".

---

### Job 6: Morning Briefing Compiler (daily at 5:30 AM)

**What:** Compile all overnight Hermes reports into one file that Claude Code reads on session start.

**Commands:** Read all `docs/hermes/*.jsonl` and `docs/hermes/*.md` from the last 24 hours.

**Output:** Write `docs/hermes/morning-report.md`

```markdown
# Hermes Morning Report: 2026-05-03

## Health Pulse (last 24h)

- 96 checks run, 94 all-OK, 2 failures
- Failures: /dashboard returned 500 at 02:15 and 02:30 (recovered by 02:45)

## OpenClaw

- Pi alive, 1,250 prices in last 24h
- Last sync: 5h ago (healthy)

## Git Activity

- 7 commits since yesterday
- 12 uncommitted files
- 2 unpushed commits
- Key changes: co-host settlement, calendar fix, dep updates

## Build State

- Last tsc check: PASS at 06:00

## Backups

- Latest: chefflow-2026-05-02.dump (8h ago, healthy)

## Alerts

- /dashboard 500 at 02:15-02:30 (auto-recovered)
```

---

## Output Structure

```
docs/hermes/                    (gitignored except morning-report.md)
  health-pulse.jsonl            Job 1: append-only, rotate weekly
  openclaw-freshness.jsonl      Job 2: append-only, rotate weekly
  git-changelog.md              Job 3: append-only, rotate weekly
  build-state-check.md          Job 4: overwrite each run
  backup-watchdog.jsonl         Job 5: append-only, rotate weekly
  morning-report.md             Job 6: overwrite daily (THIS ONE GETS READ)
  ALERTS.md                     Append-only alert log
```

### Integration with session-briefing.sh

Add to `scripts/session-briefing.sh`:

```bash
# -- Hermes Overnight Report --
HERMES_REPORT="$PROJECT_ROOT/docs/hermes/morning-report.md"
if [ -f "$HERMES_REPORT" ]; then
  HERMES_SUMMARY=$(head -40 "$HERMES_REPORT")
else
  HERMES_SUMMARY="No Hermes report found (is Hermes running?)"
fi
```

Then include `$HERMES_SUMMARY` in the briefing output.

---

## Allowlist Changes Required

Current allowlist is too restrictive. Add:

```yaml
allowed_commands:
  # Existing
  - curl
  - cat
  - ls
  - echo
  - pwd
  - rg
  - jq
  - grep
  - head
  - tail
  - wc
  # New: needed for jobs
  - date # timestamps
  - stat # file age checks
  - find # file discovery
  - sort # log processing
  - uniq # log processing
  - tee # write + stdout
  - mkdir # create output dirs
  - touch # create files
  - npx # tsc only (Job 4)
  - git # read-only (log, status, diff)
```

**Still blocked:** `rm`, `node` (direct), `npm install`, `sudo`, `apt`, `pip`, deployment tools, `python`.

**Git note:** Only read commands (log, status, diff, show). Push/commit stay blocked.

---

## Cron Schedule (WSL2 crontab)

```cron
# Hermes Night Shift - ChefFlow 24/7 Ops
*/15 * * * *  /home/hermes/.hermes/jobs/health-pulse.sh      >> /home/hermes/.hermes/logs/cron.log 2>&1
0 */2 * * *   /home/hermes/.hermes/jobs/openclaw-freshness.sh >> /home/hermes/.hermes/logs/cron.log 2>&1
0 */4 * * *   /home/hermes/.hermes/jobs/git-changelog.sh      >> /home/hermes/.hermes/logs/cron.log 2>&1
0 */6 * * *   /home/hermes/.hermes/jobs/build-state.sh        >> /home/hermes/.hermes/logs/cron.log 2>&1
0 */12 * * *  /home/hermes/.hermes/jobs/backup-watchdog.sh    >> /home/hermes/.hermes/logs/cron.log 2>&1
30 5 * * *    /home/hermes/.hermes/jobs/morning-report.sh     >> /home/hermes/.hermes/logs/cron.log 2>&1
```

---

## Hermes Skills to Create

Replace all default skills with ChefFlow-specific ones:

| Skill                      | Trigger           | What it does              |
| -------------------------- | ----------------- | ------------------------- |
| `chefflow/health-check`    | "check health"    | Run Job 1 on demand       |
| `chefflow/openclaw-status` | "openclaw status" | Run Job 2 on demand       |
| `chefflow/changelog`       | "what changed"    | Run Job 3 on demand       |
| `chefflow/build-check`     | "check build"     | Run Job 4 on demand       |
| `chefflow/morning-report`  | "morning report"  | Run Job 6 on demand       |
| `chefflow/alert-review`    | "any alerts"      | Read ALERTS.md, summarize |

---

## SOUL.md v2 (Replaces Current)

The new SOUL.md should say:

> You are Hermes, the night shift operator for ChefFlow. You run 24/7 on cron, producing reports that David and Claude Code read every morning.
>
> **Your jobs:** health monitoring, data freshness tracking, git changelog generation, build state verification, backup validation, and morning report compilation.
>
> **You do not:** write code, make product decisions, modify the database, push to git, or start servers.
>
> **Your output goes to:** `/mnt/c/Users/david/Documents/CFv1/docs/hermes/`
>
> **Your value is measured by:** whether the morning report is accurate, timely, and useful.

---

## Restart Mechanism

Hermes crashed April 29 and nobody restarted it. Fix:

Add to Windows Task Scheduler or a PowerShell startup script:

```powershell
# hermes-watchdog.ps1 - runs every 5 min via Task Scheduler
$hermesRunning = wsl -d Ubuntu -e bash -c "pgrep -f hermes" 2>$null
if (-not $hermesRunning) {
    wsl -d Ubuntu -e bash -c "nohup hermes --daemon > ~/.hermes/logs/daemon.log 2>&1 &"
    Add-Content "C:\Users\david\Documents\CFv1\docs\hermes\ALERTS.md" "$(Get-Date -Format 'yyyy-MM-dd HH:mm') - Hermes restarted by watchdog"
}
```

---

## Verification Checklist (After Deployment)

- [ ] `wsl -d Ubuntu -e bash -c "hermes --version"` returns version
- [ ] `crontab -l` in WSL shows all 6 jobs
- [ ] `docs/hermes/` directory exists with correct files
- [ ] Health pulse runs and appends to health-pulse.jsonl
- [ ] OpenClaw freshness check reaches Pi (curl 10.0.0.177:8081)
- [ ] Git changelog reads from /mnt/c/ path correctly
- [ ] tsc runs via npx without hanging
- [ ] Backup watchdog reads backups/ directory
- [ ] Morning report compiles all sources into one file
- [ ] session-briefing.sh includes Hermes section
- [ ] ALERTS.md gets written on simulated failure
- [ ] Watchdog PowerShell script restarts Hermes after kill
- [ ] After 24h: morning-report.md exists and is accurate

---

## What This Gives You

**Before (current state):**

- Every Claude Code session starts cold
- Build breaks discovered when you sit down
- OpenClaw outages discovered hours later
- Backup staleness unknown until checked manually
- Git state requires manual review
- No continuity between sessions

**After:**

- Morning report waiting when you open Claude Code
- Build breaks caught within 6 hours
- OpenClaw outages caught within 2 hours
- Backup health verified twice daily
- Git changelog auto-generated every 4 hours
- Session-briefing.sh includes overnight intelligence
- Route failures caught within 15 minutes (when server is running)

---

## What This Does NOT Give You

- Code generation (Hermes can't build; Claude Code and Codex do that)
- Playwright testing (requires browser; save for stable app phase)
- Security scanning (premature; app still in active development)
- Production deployment monitoring (not deployed yet)

These become Hermes Phase 2 after the app stabilizes.
