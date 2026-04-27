# Persona Pipeline 3977: Complete State Capture

**Timestamp:** 2026-04-27T18:35 EDT
**Branch:** `feature/weather-visibility-analysis`
**Last commit:** `ef04e42ac feat(remy): expand substitution DB, client instant answers, unit tests`
**Server PID:** 68032 (PM2 id=2, 7 restarts lifetime)
**File:** `devtools/persona-inbox-server.mjs` (5,234 lines)

---

## 1. SYSTEM ARCHITECTURE

### What the Pipeline Is

An autonomous gap-discovery and build-plan factory running at `http://127.0.0.1:3977`. It ingests fictional personas (Chef, Client, Guest, Vendor, Staff, Partner, Public), stress-tests ChefFlow against each persona's workflow, identifies gaps in the product, generates build plans via local Ollama (Gemma 4 e4b), quality-gates them, and produces Claude-ready task files.

### Pipeline Flow (6 stages)

```
GENERATE persona -> VALIDATE content -> ANALYZE gaps -> PLAN tasks -> QUALITY GATE -> COMPLETE (Claude builds)
     19               6 (4 dropped)       6              5 (24 plans)    24 (0 rejected)   0
```

End-to-end conversion: 0% (no plans have been executed by Claude yet)

### File Inventory

| File                                   | Lines | Purpose                                                            |
| -------------------------------------- | ----- | ------------------------------------------------------------------ |
| `devtools/persona-inbox-server.mjs`    | 5,234 | Main server: HTTP API, dashboard, 9 background jobs, 30+ endpoints |
| `devtools/persona-orchestrator.mjs`    | 866   | Pipeline executor: validate -> analyze -> plan -> synthesize       |
| `devtools/persona-planner.mjs`         | 452   | Ollama-powered build plan generator with quality gate              |
| `devtools/persona-validator.mjs`       | 703   | Persona content validation (structure, scoring, section checks)    |
| `devtools/ecosystem.config.cjs`        | 20    | PM2 config (512M memory limit, backoff restart)                    |
| `scripts/persona-inbox-healthcheck.sh` | 52    | External watchdog (Task Scheduler, 5min interval)                  |
| `scripts/pipeline-briefing.sh`         | 82    | Session briefing integration (4 API calls -> markdown)             |

### Supporting Data Files

| Path                                                 | Content                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `system/persona-pipeline-state.json`                 | Pipeline state: 6 processed, 4 failed, last cycle timestamps         |
| `system/persona-batch-synthesis/validation.json`     | 43 gaps across 17 categories with status (BUILT/PARTIAL/MISSING)     |
| `system/persona-batch-synthesis/saturation.json`     | Saturation tracking per category                                     |
| `system/persona-batch-synthesis/priority-queue.json` | Priority-ranked work items                                           |
| `system/persona-build-plans/{slug}/task-{n}.md`      | Active build plans (24 total across 6 personas)                      |
| `system/persona-build-plans-archive/{slug}/`         | Auto-archived stale plans (5 archived: emma-1, mindy-1/4, oprah-1/5) |
| `system/persona-build-plans-rejected/`               | Quality-gated rejected plans (0 currently)                           |
| `system/persona-vault/index.json`                    | 10 validated personas in vault                                       |
| `system/persona-inbox-uptime.json`                   | Uptime/restart tracking                                              |
| `system/runtime-events.ndjson`                       | NDJSON event log (capped at 1000 lines)                              |
| `system/.pipeline.lock`                              | Pipeline mutex (PID-based, auto-cleaned)                             |

---

## 2. CURRENT STATE (exact moment)

### Server Health

- **Status:** DEGRADED (Ollama unreachable)
- **Health Score:** 58/100 (Grade C)
- **Score Breakdown:** server=15, ollama=0, conversion=12, plan_quality=11, score_trend=10, coverage=10, drift_penalty=0
- **Circuit Breaker:** CLOSED (0 failures)
- **Pipeline Lock:** FALSE (self-healed by Round 8 watchdog improvement)
- **Pipeline Running:** FALSE
- **Request Metrics:** 6 total, 0 errors, avg 10ms, max 19ms

### Build Plans (24 active, 5 archived, 0 completed)

| Persona          | Active Tasks   | Archived     | Notes                            |
| ---------------- | -------------- | ------------ | -------------------------------- |
| ari-weinzweig    | 5 (task-1..5)  | 0            | Highest priority plan (score 55) |
| david-chang      | 5 (task-1..5)  | 0            | 1 "retry candidate"              |
| gail-simmons     | 5 (task-1..5)  | 0            | 1 stale (40% ref accuracy)       |
| emma-chamberlain | 3 (task-2,3,5) | 1 (task-1)   | task-1 had all invalid refs      |
| mindy-weiss      | 3 (task-2,3,5) | 2 (task-1,4) | task-1,4 had all invalid refs    |
| oprah-winfrey    | 3 (task-2,3,4) | 2 (task-1,5) | task-1,5 had all invalid refs    |

### Category Coverage (33% overall)

| Status | Category            | Coverage | Built | Partial | Missing | HIGH severity |
| ------ | ------------------- | -------- | ----- | ------- | ------- | ------------- |
| RED    | ticketing-drops     | 0%       | 0     | 0       | 1       | 1             |
| RED    | location-venue      | 0%       | 0     | 0       | 1       | 0             |
| RED    | payment-financial   | 0%       | 0     | 0       | 2       | 1             |
| RED    | recipe-menu         | 0%       | 0     | 0       | 2       | 2             |
| RED    | communication       | 0%       | 0     | 0       | 1       | 0             |
| RED    | staffing-team       | 0%       | 0     | 0       | 2       | 2             |
| RED    | dietary-medical     | 17%      | 0     | 1       | 2       | 3             |
| RED    | scheduling-calendar | 33%      | 0     | 2       | 1       | 3             |
| RED    | sourcing-supply     | 33%      | 1     | 0       | 2       | 3             |
| RED    | dosing-cannabis     | 36%      | 1     | 3       | 3       | 7             |
| GREEN  | audience-community  | 50%      | 0     | 1       | 0       | 0             |
| GREEN  | reporting-analytics | 50%      | 0     | 2       | 0       | 2             |
| YELLOW | scaling-multi       | 50%      | 1     | 1       | 1       | 2             |
| GREEN  | uncategorized       | 58%      | 1     | 5       | 0       | 4             |
| YELLOW | compliance-legal    | 67%      | 2     | 0       | 1       | 3             |
| GREEN  | event-lifecycle     | 75%      | 1     | 1       | 0       | 2             |
| GREEN  | access-control      | 100%     | 1     | 0       | 0       | 1             |

### Persona Vault (10 entries)

david-chang, oprah-winfrey, mindy-weiss, woody, emma-chamberlain, will-allen, ari-weinzweig, gail-simmons, rene, danny-meyer

### Failed Personas (4 in dead letter)

All 4 failures are validation errors: 2x "File not found", 1x "Missing sections", 1x analyzer token overflow. These are recoverable by auto-retry when Ollama comes back online.

### Source Persona Files

Only 1 file in `Chef Flow Personas/Uncompleted/`: "Partner" type. Most personas already processed into vault.

---

## 3. WHAT WAS BUILT (8 rounds of improvement)

### Round 1: 24/7 Persistence

- PM2 process management (`ecosystem.config.cjs`)
- Windows Task Scheduler boot persistence (`pm2 resurrect` on login)
- PM2 log rotation (`pm2-logrotate` module)

### Round 2: Infrastructure Hardening

- `/healthz` endpoint with Ollama connectivity check
- Graceful shutdown (SIGTERM/SIGINT handlers, interval cleanup, SSE client close)
- EADDRINUSE retry logic (5 retries, 3s apart)
- Memory limit 512M with PM2 auto-restart
- `ecosystem.config.cjs` with env vars

### Round 3: Reliability

- `unhandledRejection` / `uncaughtException` crash guards
- Child process registry (`activeChildren` Map, `trackChild()`)
- Watchdog kills stalled pipelines (not just logs)
- Uptime persistence (`persona-inbox-uptime.json`)
- `pipelineChildPid` tracking

### Round 4: Operational

- Boot-time orphaned lock cleanup (checks PID liveness)
- NDJSON pruning (cap 1000 lines, prune every 100 writes)
- External health check script (`scripts/persona-inbox-healthcheck.sh`, Task Scheduler 5min)
- Request metrics (latency, error rate, per-route counts)
- 503 excluded from error counting (expected Ollama-down state)

### Round 5: Quality + Volume

- Build plan quality gate in `persona-planner.mjs` (scope blocklist: 15 regex patterns for hallucinated features like LMS, marketplace, gamification, AI recipe generation)
- File existence validation (reject if all refs invalid)
- Required section validation (What to Build, Files to Modify, Acceptance Criteria)
- Auto-retry failed personas (4hr interval, max 2 retries, recoverable error patterns)
- Volume boost (hourly 3->8, daily 10->30, interval 2hr->45min, count 1->2)
- Score regression tracking (re-analyze after all tasks completed)
- Overnight auto-scheduler (2 AM, 15 personas, Ollama check first)

### Round 6: Intelligence APIs

- Smart targeting (reads validation.json, ranks HIGH severity MISSING, skips recent)
- `/api/score-trend` - per-persona score over time with deltas
- `/api/pipeline-funnel` - conversion rates at each stage
- `/api/gap-dedup` - exact + near-duplicate gap detection (Jaccard similarity)
- Codebase drift detection (`quickCodeGrep()`, `runDriftDetection()`, 12hr interval)

### Round 7: Analytics + Self-Awareness

- `/api/plan-priority` - plans scored 0-100, ranked (24 plans, top=55)
- `/api/drift` - codebase drift report
- `/api/coverage` - category coverage heatmap (17 categories, 33% overall)
- `/api/health-score` - composite 0-100 with grade and recommendations
- `/api/stale-plans` + `POST /api/archive-stale` - stale detection and archival

### Round 8: Intelligence Dashboard + Self-Healing (THIS SESSION)

- **Intelligence Dashboard UI section** - new section in the web dashboard at localhost:3977 with:
  - Health score gauge (score, grade, meter, recommendations)
  - Pipeline funnel bar chart (6 stages with counts and notes)
  - Category coverage heatmap table (17 rows, sorted worst-first, color-coded)
  - Stale plans list with "Archive All" button
  - Top-8 plan priority ranking with "Copy" buttons
  - Auto-refreshes every 5 minutes
- **Stale lock self-healing in watchdog** - when `pipelineRunning=false` but lock file exists with dead PID, watchdog deletes it automatically every 60s check. Fixed the stale lock that existed at session start.
- **Auto-archive stale plans** - scheduled every 24hr. Plans where ALL file references are invalid get moved to `system/persona-build-plans-archive/` with metadata header. Runs 2min after startup. Already archived 5 plans on first run.
- **Claude-ready export** - "Copy" button on each priority plan in Intel dashboard. Fetches plan content via `/api/plan-content?path=...`, wraps in Claude prompt prefix, copies to clipboard. Path security-gated to `system/persona-build-plans/` only.
- **Health Score in top stats** - replaced "Sources" stat with "Health Score" showing score + grade with color coding.
- **Nav link** - added "Intel" to section navigation bar.

---

## 4. ALL API ENDPOINTS (30+)

### No Auth Required

| Method | Path              | Purpose                                       |
| ------ | ----------------- | --------------------------------------------- |
| GET    | `/`               | Dashboard HTML (single-page app)              |
| GET    | `/healthz`        | Health check (also cleans stale locks >15min) |
| GET    | `/state`          | Full pipeline state                           |
| GET    | `/runtime-stream` | SSE stream for real-time events               |

### Data APIs

| Method | Path                    | Purpose                                         |
| ------ | ----------------------- | ----------------------------------------------- |
| GET    | `/api/synthesis`        | Batch synthesis results                         |
| GET    | `/api/personas`         | All personas with scores                        |
| GET    | `/api/build-tasks`      | All build tasks with metadata                   |
| GET    | `/api/score-history`    | Score history entries                           |
| GET    | `/api/score-trend`      | Per-persona score deltas                        |
| GET    | `/api/sources`          | Source persona files                            |
| GET    | `/api/vault`            | Validated persona vault                         |
| GET    | `/api/intake`           | Persona intake queue                            |
| GET    | `/api/universal-intake` | Universal intake (ideas, bugs, features, notes) |
| GET    | `/api/build-queue`      | Build queue items                               |
| GET    | `/api/dead-letter`      | Failed items for retry                          |
| GET    | `/api/metrics`          | Pipeline timing metrics                         |
| GET    | `/api/captures`         | Captured sessions                               |
| GET    | `/api/capture/:id`      | Single capture by ID                            |
| GET    | `/api/capture-tags`     | All capture tags                                |
| GET    | `/api/request-metrics`  | HTTP request metrics                            |

### Intelligence APIs (Rounds 6-8)

| Method | Path                      | Purpose                                        |
| ------ | ------------------------- | ---------------------------------------------- |
| GET    | `/api/health-score`       | Composite 0-100 with grade and recommendations |
| GET    | `/api/coverage`           | 17-category coverage heatmap                   |
| GET    | `/api/pipeline-funnel`    | 6-stage conversion funnel                      |
| GET    | `/api/plan-priority`      | Plans scored and ranked 0-100                  |
| GET    | `/api/gap-dedup`          | Duplicate/near-duplicate gap detection         |
| GET    | `/api/drift`              | Codebase drift report                          |
| GET    | `/api/stale-plans`        | Plans with invalid refs or age                 |
| GET    | `/api/plan-content?path=` | Raw plan file content (security-gated)         |

### Mutation APIs

| Method | Path                         | Purpose                    |
| ------ | ---------------------------- | -------------------------- |
| POST   | `/import`                    | Import persona text        |
| POST   | `/run-pipeline`              | Trigger pipeline run       |
| POST   | `/send-queued`               | Process queued items       |
| POST   | `/retry-failed`              | Retry failed items         |
| POST   | `/clear-completed`           | Clear completed entries    |
| POST   | `/delete-entry`              | Delete single entry        |
| POST   | `/api/reanalyze`             | Re-analyze a persona       |
| POST   | `/api/complete-task`         | Mark task as completed     |
| POST   | `/api/intake-submit`         | Submit to universal intake |
| POST   | `/api/classify`              | AI-classify input text     |
| POST   | `/api/dead-letter/retry`     | Retry single dead letter   |
| POST   | `/api/dead-letter/retry-all` | Retry all dead letters     |
| POST   | `/api/capture`               | Save a capture             |
| POST   | `/api/archive-stale`         | Archive stale plans        |

---

## 5. BACKGROUND SCHEDULED JOBS (9 total)

| Job                | Function                    | Interval      | Purpose                                          |
| ------------------ | --------------------------- | ------------- | ------------------------------------------------ |
| scheduledPipeline  | `startScheduledPipeline()`  | 45min         | Auto-trigger pipeline if Ollama up, not locked   |
| scheduledSynthesis | `startScheduledSynthesis()` | ?             | Batch synthesis runs                             |
| watchdog           | `startWatchdog()`           | 60s           | Kill stalled pipelines, self-heal orphaned locks |
| autoGeneration     | `startAutoGeneration()`     | ?             | Auto-generate new personas (8/hr, 30/day max)    |
| autoRetry          | `startAutoRetry()`          | 4hr           | Retry recoverable failures (max 2 retries each)  |
| overnightScheduler | `startOvernightScheduler()` | checks hourly | 2 AM batch: 15 personas, once per night          |
| driftDetection     | `startDriftDetection()`     | 12hr          | Re-validate gap data against current codebase    |
| autoArchive        | `startAutoArchive()`        | 24hr          | Archive plans with all-invalid file refs         |
| runtimeFileWatcher | `startRuntimeFileWatcher()` | fs.watch      | Watch NDJSON for SSE broadcast                   |

All intervals cleared in `gracefulShutdown()`.

---

## 6. PROCESS MANAGEMENT

### PM2

- Config: `devtools/ecosystem.config.cjs`
- Name: `persona-inbox`
- Memory limit: 512M (auto-restart on exceed)
- Max restarts: 10
- Restart delay: 5s with exponential backoff
- Kill timeout: 6s
- Env: `NODE_ENV=production`, `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `EXPAND_MODEL=gemma4:e4b`

### Windows Task Scheduler

1. **Boot persistence:** `pm2 resurrect` on user login
2. **Health check:** `scripts/persona-inbox-healthcheck.sh` every 5 minutes
   - Curls `/healthz`, if non-200/503: `pm2 restart`, wait 5s, recheck, fallback `pm2 resurrect`
   - Self-pruning log at `system/persona-inbox-healthcheck.log` (500 line cap)

### Triple Redundancy

PM2 auto-restart (crash) + Watchdog (stall) + Task Scheduler health check (external) = three independent recovery mechanisms.

---

## 7. DECISIONS AND TRADEOFFS

1. **Ollama dependency is hard:** No fallback. If Ollama is down, pipeline stops. This is intentional (per CLAUDE.md: "If the cloud runtime is down, the product fails clearly"). Health score reflects it (0 points for ollama component).

2. **Quality gate is aggressive:** Scope blocklist (15 patterns) rejects plans that mention features ChefFlow doesn't have (LMS, marketplace, gamification, AI recipe generation). Better to reject good plans occasionally than ship hallucinated ones.

3. **Auto-archive uses ALL-invalid threshold:** Only archives plans where 100% of file references are invalid. Partial invalidity (like gail-simmons at 40%) is kept for human review. Conservative to avoid losing actionable plans.

4. **Health score weights:** Server=15, Ollama=20, Conversion=15, Plan Quality=15, Score Trend=15, Coverage=15, Drift Penalty=-5. Ollama being the largest single component means score is capped ~80 when Ollama is down.

5. **Volume limits exist:** 8/hour, 30/day to avoid overwhelming Ollama when it's running. Overnight batch is 15 at 2 AM. These can be tuned in the constants at top of file.

6. **No second AI provider:** All inference goes through Ollama (Gemma 4 e4b). No cloud AI, no API keys, $0 cost. Per project mandate.

7. **Dashboard is server-rendered HTML:** Single file, no build step, no React, no npm dependencies. The entire dashboard is a template literal inside `persona-inbox-server.mjs`. This keeps deployment trivial (PM2 only) but makes the file large (5234 lines).

---

## 8. KNOWN ISSUES

1. **Ollama unreachable** - Main health drag. Score capped at ~80. All pipeline work blocked. Start Ollama (`ollama serve`) to unblock.

2. **4 failed personas in dead letter** - Recoverable errors (file not found, missing sections, token overflow). Will auto-retry when Ollama comes back.

3. **0% end-to-end conversion** - No plans have been executed by Claude yet. 24 plans waiting. The "Copy" button on the Intel dashboard enables manual handoff.

4. **Vault entries missing slugs/scores** - `index.json` shows `undefined` for slug field on all 10 entries. Non-blocking but cosmetic.

5. **`locked: true` appears transiently on healthz** - The healthz endpoint reads the lock file at request time. Between pipeline start and the moment the lock is written, there's a race. Watchdog handles stale locks within 60s.

6. **Pipeline state `failed` entries have `undefined` slugs** - The 4 failed entries don't have slug fields populated, making auto-retry targeting imprecise. The retry logic works on file paths instead.

---

## 9. EXACT NEXT STEPS (ordered)

### Immediate (unblock pipeline)

1. **Start Ollama:** `ollama serve` (or ensure it's running). This single action unblocks everything.
2. **Verify health score jumps:** `curl http://127.0.0.1:3977/api/health-score` should show ollama=20, score ~78+.
3. **Pipeline will auto-trigger** within 45min of Ollama coming up. Or manual: `curl -X POST http://127.0.0.1:3977/run-pipeline`.

### Short-term (improve conversion rate)

4. **Execute top-priority plans via Claude:** Open `http://127.0.0.1:3977`, go to Intel section, click "Copy" on top-scored plans, paste into Claude Code session with `/builder` skill.
5. **Mark completed tasks:** After Claude builds each plan, call `POST /api/complete-task` with the plan path to track completion.
6. **Re-analyze personas after completion:** The server auto-triggers re-analysis when all tasks for a slug are completed. Scores should improve.

### Medium-term (improve coverage)

7. **Generate more persona types:** Only 1 source in Uncompleted (Partner type). Need Client, Guest, Vendor, Staff personas to cover the 10 RED categories.
8. **Target specific categories:** Smart targeting already prioritizes HIGH severity MISSING categories (dosing-cannabis=7 HIGH, scheduling-calendar=3, sourcing-supply=3, dietary-medical=3).
9. **Fix dead letter personas:** When Ollama is up, auto-retry will process the 4 failed personas within 4 hours.

### Ongoing (maintain and improve)

10. **Monitor Intel dashboard:** `http://127.0.0.1:3977` -> Intel section shows all metrics.
11. **Auto-archive runs daily** at startup+2min and every 24hr after.
12. **Drift detection runs every 12hr** to catch codebase changes that invalidate gap data.

---

## 10. RECOVERY INSTRUCTIONS

### If server is down

```bash
pm2 list                          # Check if persona-inbox exists
pm2 restart persona-inbox         # Restart it
pm2 logs persona-inbox --lines 20 # Check for errors
```

If PM2 doesn't have it:

```bash
cd c:/Users/david/Documents/CFv1
pm2 start devtools/ecosystem.config.cjs
pm2 save
```

### If lock is stuck

The watchdog self-heals within 60s. If urgent:

```bash
rm c:/Users/david/Documents/CFv1/system/.pipeline.lock
```

### If Ollama won't start

Pipeline will stay degraded. All background jobs check Ollama before running. No damage from Ollama being down, just no progress.

### If plans are stale

```bash
curl -X POST http://127.0.0.1:3977/api/archive-stale
```

Or click "Archive All" in the Intel dashboard.

### If score regresses

Check `/api/health-score` breakdown. Each component is independent:

- server=0: server crashed, restart PM2
- ollama=0: start Ollama
- conversion=0: no plans completed, execute some
- plan_quality low: run drift detection, archive stale plans
- coverage low: generate more personas targeting RED categories

### Full reset (last resort)

```bash
pm2 delete persona-inbox
cd c:/Users/david/Documents/CFv1
pm2 start devtools/ecosystem.config.cjs
pm2 save
```

All state is in `system/` directory files. Server reads them on startup. No database.

---

## 11. UNCOMMITTED CHANGES

The `devtools/persona-inbox-server.mjs` file has extensive uncommitted changes from Rounds 1-8. Key files modified:

- `devtools/persona-inbox-server.mjs` (5234 lines, bulk of all work)
- `devtools/persona-planner.mjs` (quality gate addition)
- `devtools/persona-validator.mjs` (validation improvements)
- `devtools/persona-orchestrator.mjs` (orchestration updates)
- `scripts/session-briefing.sh` (pipeline briefing integration)
- `scripts/pipeline-briefing.sh` (new file)
- `scripts/persona-inbox-healthcheck.sh` (new file)
- `devtools/ecosystem.config.cjs` (new file)
- Multiple `system/persona-batch-synthesis/` data files updated by pipeline runs

These should be committed before session end. Suggested commit:

```
feat(pipeline): 8 rounds of autonomous pipeline hardening

PM2 persistence, watchdog, quality gate, smart targeting,
intelligence dashboard, self-healing locks, auto-archive,
Claude-ready export. Health score 58/100, 24 plans ready.
```
