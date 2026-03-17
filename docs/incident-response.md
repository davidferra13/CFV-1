# Incident Response Plan

ChefFlow production incident detection, response, and recovery procedures.

---

## 1. Detection Methods

### Automated

| Source                                                 | What it catches                                          | Alert channel                                       |
| ------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------- |
| **UptimeRobot** (readiness)                            | App down, 503s, slow responses (>5s)                     | Email + webhook (Slack/Discord)                     |
| **UptimeRobot** (ping)                                 | Process crash, edge failure                              | Email                                               |
| **Sentry** (server)                                    | Unhandled exceptions, server action failures             | Sentry dashboard + email                            |
| **Sentry** (client)                                    | Browser errors, failed navigations                       | Sentry dashboard (replay on 100% of error sessions) |
| **Health endpoint** (`/api/health/readiness?strict=1`) | Env vars missing, circuit breakers open, stale cron jobs | UptimeRobot (polled every 5 min)                    |

### Manual

| Source                    | How to check                                                    |
| ------------------------- | --------------------------------------------------------------- |
| Health check (production) | `curl https://app.cheflowhq.com/api/health/readiness?strict=1`  |
| Health check (beta)       | `curl https://beta.cheflowhq.com/api/health/readiness?strict=1` |
| Sentry dashboard          | `https://sentry.io` (project: chefflow)                         |
| Vercel dashboard          | `https://vercel.com` (deployment logs, function logs)           |
| User reports              | Email, beta tester feedback, in-app feedback form               |

---

## 2. Severity Levels

| Level             | Definition                                       | Response time             | Examples                                                                         |
| ----------------- | ------------------------------------------------ | ------------------------- | -------------------------------------------------------------------------------- |
| **P0 - Critical** | App completely down or data loss occurring       | Immediate (within 15 min) | Vercel deployment crash, database unreachable, auth broken for all users         |
| **P1 - Major**    | Core feature broken for all users                | Within 1 hour             | Event creation fails, quotes not saving, payments broken, login loop             |
| **P2 - Degraded** | Non-core feature broken or core feature degraded | Within 4 hours            | Remy AI offline, notifications not sending, calendar sync stale, slow page loads |
| **P3 - Minor**    | Cosmetic issue or edge case affecting few users  | Next business day         | UI glitch on one browser, tooltip misaligned, non-critical cron job stale        |

### Escalation

- P0/P1: Developer gets notified immediately (UptimeRobot alert + Sentry spike detection)
- P2: Logged in Sentry, addressed in next work session
- P3: Tracked, batched into next feature branch

---

## 3. Rollback Procedures

### 3a. Vercel (Production) - Instant Rollback

Vercel keeps every deployment. Rollback takes ~10 seconds.

1. Go to `https://vercel.com` > ChefFlow project > Deployments
2. Find the last known-good deployment
3. Click the three-dot menu > "Promote to Production"
4. Verify: `curl https://app.cheflowhq.com/api/health/readiness?strict=1`

No code changes needed. The previous build is served immediately.

### 3b. Beta Server - Script Rollback

The beta deploy script keeps a `.next.backup` of the previous build.

```bash
# One-command rollback (kills server, swaps builds, restarts)
bash scripts/rollback-beta.sh
```

What the script does:

1. Kills the process on port 3200
2. Replaces `.next` with `.next.backup`
3. Starts `next start -p 3200`
4. Runs health check

If no backup exists (first deploy or backup was cleaned), a fresh deploy is needed:

```bash
# Check out the last known-good commit, then redeploy
git checkout <good-commit-hash>
bash scripts/deploy-beta.sh
```

### 3c. Database - Restore from Backup

**Pre-migration backup (always do this before applying migrations):**

```bash
supabase db dump --linked > backup-$(date +%Y%m%d).sql
```

**Restore from SQL dump:**

```bash
# WARNING: destructive. This replaces the entire database.
# Only do this with explicit developer approval.
psql <connection-string> < backup-YYYYMMDD.sql
```

**Supabase PITR (Point-in-Time Recovery):**

Available on Supabase Pro plan. Restores to any point in the last 7 days.

1. Go to Supabase Dashboard > Project > Database > Backups
2. Select "Point in Time" tab
3. Choose the timestamp (before the incident)
4. Confirm restore

PITR creates a new project with the restored data. You then update environment variables to point to it.

### 3d. Rollback Decision Matrix

| What broke                             | Rollback method                 | Time to recover    |
| -------------------------------------- | ------------------------------- | ------------------ |
| Bad Vercel deploy (UI/server crash)    | Vercel instant rollback         | ~10 seconds        |
| Bad beta deploy                        | `bash scripts/rollback-beta.sh` | ~30 seconds        |
| Bad migration (additive, no data loss) | Deploy new migration to undo    | ~5 minutes         |
| Bad migration (data corrupted)         | Restore from SQL dump or PITR   | ~15-30 minutes     |
| Supabase outage                        | Wait for Supabase status page   | Out of our control |
| Ollama down (AI features)              | Restart Ollama: `ollama serve`  | ~10 seconds        |

---

## 4. Communication Templates

### 4a. Beta Tester Notification (Outage)

> Subject: ChefFlow - Brief service interruption
>
> Hi [name],
>
> ChefFlow experienced a brief interruption today starting at [time]. The issue was [brief description, e.g., "a deployment error that caused pages to load slowly"].
>
> We resolved it at [time] by [action taken]. No data was lost.
>
> If you notice anything unusual, please let me know directly.
>
> Thanks for your patience,
> David

### 4b. Beta Tester Notification (Planned Maintenance)

> Subject: ChefFlow - Scheduled maintenance [date]
>
> Hi [name],
>
> I'll be running maintenance on ChefFlow on [date] between [start time] and [end time]. The app may be briefly unavailable during this window.
>
> What's happening: [brief description, e.g., "database migration to support new features"].
>
> No action needed on your end. Everything should be back to normal by [end time].
>
> David

### 4c. Internal Incident Log Entry

```
Date:       YYYY-MM-DD
Severity:   P0/P1/P2/P3
Duration:   HH:MM (start to resolution)
Impact:     [who was affected and how]
Root cause: [what broke and why]
Resolution: [what was done to fix it]
Action:     [what prevents recurrence]
```

---

## 5. Post-Mortem Template

Use this for any P0 or P1 incident (and optionally for P2).

```markdown
# Post-Mortem: [Incident Title]

**Date:** YYYY-MM-DD
**Severity:** P0/P1/P2
**Duration:** [start time] to [resolution time] (total: X minutes)
**Author:** [who wrote this]

## Summary

One paragraph. What happened, who was affected, how it was resolved.

## Timeline

| Time  | Event                              |
| ----- | ---------------------------------- |
| HH:MM | [First alert / detection]          |
| HH:MM | [Investigation started]            |
| HH:MM | [Root cause identified]            |
| HH:MM | [Fix deployed / rollback executed] |
| HH:MM | [Verified resolved]                |

## Root Cause

What specifically broke and why. Be precise. "The migration dropped a NOT NULL
constraint on events.status, causing the event list query to return nulls that
crashed the FSM transition check."

## Impact

- Users affected: [count or description]
- Features broken: [list]
- Data loss: [yes/no, details if yes]
- Financial impact: [if any]

## Resolution

What was done to fix it. Include the specific commands, commits, or rollback
steps used.

## Prevention

What changes will prevent this from happening again?

- [ ] Action item 1 (owner, deadline)
- [ ] Action item 2 (owner, deadline)

## Lessons Learned

What went well, what went poorly, what was lucky.
```

---

## 6. Monitoring Infrastructure Reference

| Component          | File                                | Purpose                                                              |
| ------------------ | ----------------------------------- | -------------------------------------------------------------------- |
| Health route       | `app/api/health/route.ts`           | Liveness check (env vars, basic health)                              |
| Readiness route    | `app/api/health/readiness/`         | Full readiness (env + circuit breakers + cron jobs)                  |
| Health logic       | `lib/health/public-health.ts`       | Builds health snapshot, checks 24 cron jobs                          |
| Sentry (server)    | `instrumentation.ts`                | Server-side error capture, 20% trace sampling in prod                |
| Sentry (client)    | `instrumentation-client.ts`         | Client-side errors + session replay (10% normal, 100% on error)      |
| Sentry reporter    | `lib/monitoring/sentry-reporter.ts` | Lightweight envelope API reporter (no SDK dependency)                |
| Circuit breakers   | `lib/resilience/circuit-breaker.ts` | Tracks degraded external services                                    |
| UptimeRobot config | `docs/uptime-monitoring-setup.md`   | Monitor URLs, intervals, alert thresholds                            |
| Deploy script      | `scripts/deploy-beta.sh`            | Zero-downtime beta deploy with auto-rollback on health check failure |
| Rollback script    | `scripts/rollback-beta.sh`          | One-command beta rollback to previous build                          |
