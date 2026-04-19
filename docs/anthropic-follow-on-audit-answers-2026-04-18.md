# Anthropic Follow-On Audit Report: Answers To The Previously Unasked Questions

Date: 2026-04-18
Audience: Anthropic builders and maintainers
Scope: Follow-on audit against the highest-priority missing integrity questions identified in `docs/anthropic-unasked-questions-2026-04-18.md`

## Executive Summary

The second audit pass changed the picture in three important ways.

First, the repo does have some build-state automation now, but it is not authoritative enough to trust as a release attestation. The current `SessionEnd` hook can rewrite `docs/build-state.md`, but only from a `.tsc-dirty` trigger, only for `tsc`, and in a simplified format that does not match the richer two-check build report the repo currently carries.

Second, OpenClaw health is more fragmented than the first audit already suggested. There is not just a mismatch between a failed wrapper daemon and fresh downstream price data. There are at least four competing freshness clocks today:

- wrapper status file says failed on 2026-04-18 23:11 UTC
- `ingredient_price_history` shows fresh 2026-04-18 OpenClaw-backed data
- local mirror freshness in `openclaw.store_products` / `openclaw.stores` is older
- `openclaw.sync_runs` appears stale at 2026-04-15

Third, the Windows host/process layer is partially disciplined but not fully codified in the repo. The live scheduled-task state includes tasks the checked-in registration scripts do not define, and the running `OpenClaw Auto-Sync` task appears to be host-owned rather than reproducibly repo-owned.

## Method

This pass did not run a fresh production build.

The user explicitly framed building as Anthropic-owned work. I stayed within audit work:

- inspected repo code and docs
- re-ran the three failing unit files from the prior audit
- inspected live Windows scheduled-task and process state
- queried the local PostgreSQL runtime for OpenClaw-related timestamps and freshness counters

Primary evidence sources:

- `docs/build-state.md`
- `.claude/settings.json`
- `.claude/hooks/session-cleanup.sh`
- `.claude/hooks/cleanup.log`
- `tests/unit/admin-nav-boundary.test.ts`
- `tests/unit/auth.tenant-isolation.test.ts`
- `tests/unit/public-surface-contract.test.ts`
- `components/navigation/admin-nav-config.ts`
- `components/navigation/public-nav-config.ts`
- `lib/public/public-surface-config.ts`
- `lib/auth/actions.ts`
- `lib/sharing/actions.ts`
- `lib/auth/admin-access.ts`
- `scripts/auto-sync-openclaw.mjs`
- `scripts/openclaw-pull/sync-all.mjs`
- `scripts/openclaw-pull/config.mjs`
- `app/api/cron/openclaw-sync/route.ts`
- `app/api/cron/price-sync/route.ts`
- `app/api/sentinel/sync-status/route.ts`
- `docs/sync-status.json`
- `logs/openclaw-auto-sync.log`
- `logs/ingredient-price-sync.log`
- `docs/scheduled-tasks.md`
- `scripts/scheduled/register-all-tasks.ps1`
- `scripts/scheduled/register-startup-stack.ps1`
- `chefflow-watchdog.ps1`

## Answered Questions

### UQ1. Is `docs/build-state.md` mechanically tied to the exact git snapshot it describes?

Answer: `PARTIAL, NOT AUTHORITATIVE`

What changed from the prior assumption:

- The repo now has a real `SessionEnd` hook in `.claude/settings.json`.
- `.claude/hooks/session-cleanup.sh` can auto-update `docs/build-state.md`.

Why this still does not qualify as trustworthy release truth:

- The hook only runs `npx tsc --noEmit --skipLibCheck`.
- It does **not** run the repo's canonical build command.
- It only triggers when `.tsc-dirty` exists.
- It writes a minimal status file shape that would overwrite the richer current `docs/build-state.md` format.
- It records only `git rev-parse --short HEAD`, not the dirty snapshot contents.

Additional evidence:

- The current `docs/build-state.md` is a rich two-check document with build noise classification, dirty-worktree caveats, and history.
- The recent tail of `.claude/hooks/cleanup.log` contains repeated session cleanup entries and Playwright zombie cleanup, but no visible recent `build-state.md updated` entries in the retained tail.
- Recent `git log -- docs/build-state.md` history shows committed human-authored updates on 2026-04-17 and 2026-04-18.

Conclusion:

Build-state automation exists, but the current build-state discipline is still a hybrid of hooks plus manual stewardship. Anthropic should not treat the file as mechanically authoritative for the exact current working tree.

### UQ2. What exact command set defines the Anthropic-owned release gate for this repo?

Answer: `NO SINGLE AUTHORITATIVE GATE EXISTS`

Evidence:

- `docs/build-state.md` calls out `npx tsc --noEmit --skipLibCheck` and `npm run build -- --no-lint`.
- The audit report's recommended preflight also includes targeted auth/surface tests.
- The `SessionEnd` cleanup hook only runs `tsc`.
- The current failing unit suite is mixed: some failures are stale tests, some are policy ambiguity.

Conclusion:

The repo has multiple gate-like surfaces, but no one checked-in release manifest that says "these commands, these warnings, this interpretation policy."

### UQ4. Can a dirty checkout inherit a green status from an older baseline without fresh revalidation?

Answer: `YES`

Evidence:

- `docs/build-state.md` explicitly says it describes the last known green baseline, not every newer uncommitted change.
- Current `git status --short` shows a dirty worktree with both modified and untracked files.
- The current build-state table itself records green entries against `dirty` or `dirty checkout` states.

Conclusion:

The repo is disciplined enough to say this out loud, but not strict enough to prevent misreading it. Anthropic should assume green-baseline inheritance is possible until a fresh verification pass happens on the active snapshot.

### UQ5. Which currently failing tests are real regressions versus stale tests?

Answer: `MOST CURRENT FAILURES ARE STALE OR POLICY-AMBIGUOUS, NOT PRODUCT BREAKS`

I re-ran:

```powershell
node --test --import tsx tests/unit/admin-nav-boundary.test.ts tests/unit/auth.tenant-isolation.test.ts tests/unit/public-surface-contract.test.ts
```

Result:

- 18 tests
- 12 pass
- 6 fail

Classification of the 6 failures:

1. `tests/unit/admin-nav-boundary.test.ts`
   - Failure: missing `/admin/cannabis` in `admin-nav-config.ts`
   - Classification: `policy ambiguity / stale expectation`
   - Why: `components/navigation/admin-nav-config.ts` explicitly comments that the Cannabis Tier route is hidden while the feature is disabled.

2. `tests/unit/auth.tenant-isolation.test.ts` D2
   - Failure: flags `lib/auth/actions.ts` and `lib/sharing/actions.ts` for `input.tenantId`
   - Classification: `heuristic false positive`
   - Why: the cited patterns are internal helper parameters, not request-derived tenant authority. Examples:
     - `lib/auth/actions.ts` uses `input.tenantId` inside `recordAccountCreatedEvent(...)`, an internal event/logging helper.
     - `lib/sharing/actions.ts` uses `input.tenantId` inside `ensureDinnerCircleForEventNonBlocking(...)`, another internal helper call path.

3. `tests/unit/auth.tenant-isolation.test.ts` D4
   - Failure: says admin access must query persisted `platform_admins`
   - Classification: `stale string-match test`
   - Why: `lib/auth/admin-access.ts` queries the persisted table through the Drizzle schema symbol `platformAdmins`, not through the literal SQL string `platform_admins`.

4. `tests/unit/auth.tenant-isolation.test.ts` D7
   - Failure: `ENOENT` on `db/migrations`
   - Classification: `stale filesystem path bug`
   - Why: the repo uses `database/migrations`.

5. `tests/unit/public-surface-contract.test.ts` nav expectation
   - Failure: expected `['/book','/chefs','/services','/how-it-works','/nearby']`
   - Classification: `stale IA expectation`
   - Why: `components/navigation/public-nav-config.ts` now includes `/hub` and `/faq`.

6. `tests/unit/public-surface-contract.test.ts` footer expectation
   - Failure: missing `Dinner Circles`
   - Classification: `stale IA expectation`
   - Why: `lib/public/public-surface-config.ts` defines `PUBLIC_DINNER_CIRCLES_ENTRY`, and the footer consumes it.

Conclusion:

The current failing set does **not** primarily indicate fresh product regressions. It indicates a test suite that is useful but no longer cleanly authoritative.

### UQ6. How much stale filesystem-path coupling still exists in the test suite?

Answer: `MORE THAN THE PREVIOUS AUDIT CAPTURED`

Evidence:

- `tests/unit/auth.tenant-isolation.test.ts` constructs `join(ROOT, 'db', 'migrations')`
- additional search found 17 literal `db/migrations` references in `tests/unit/runtime-log-regressions.test.ts`

Conclusion:

This is a broader category of test rot, not a single failing assertion.

### UQ10. What is the canonical source of OpenClaw health?

Answer: `THERE IS NO CANONICAL SOURCE TODAY`

Current first-party health clocks disagree:

1. Wrapper daemon status file
   - `docs/sync-status.json`
   - `status: "failed"`
   - `last_sync: "2026-04-18T23:11:00.084Z"`
   - `consecutive_failures: 9`

2. Wrapper daemon log
   - `logs/openclaw-auto-sync.log`
   - shows repeated full-sync failures through 2026-04-18 23:11 UTC

3. Downstream ingredient price bridge
   - `logs/ingredient-price-sync.log`
   - shows `Ingredient Price Sync complete` on 2026-04-18 19:18:21

4. Freshness in `ingredient_price_history`
   - direct DB query during this audit returned:
     - `last_sync = 2026-04-18T00:00:00.000Z`
     - `updated_today = 270907`
     - `total_rows = 19937887`

5. Local mirror freshness
   - direct DB query during this audit returned:
     - `max(openclaw.store_products.last_seen_at) = 2026-04-16T23:04:36.389Z`
     - `max(openclaw.stores.last_cataloged_at) = 2026-04-17T02:39:50.000Z`

6. `openclaw.sync_runs`
   - direct DB query during this audit returned latest row at:
     - `started_at = 2026-04-15T05:22:12.299Z`
     - `finished_at = 2026-04-15T05:59:11.529Z`

Conclusion:

There is no one truthful answer to "Is OpenClaw healthy?" because different layers are answering different questions with different timestamps.

### UQ11. Can the current status model represent partial success?

Answer: `NO, PARTIAL SUCCESS EXISTS BEHAVIORALLY BUT NOT CONTRACTUALLY`

Evidence from `scripts/openclaw-pull/sync-all.mjs`:

- if pull fails, the script logs `Pull failed. Continuing with existing data...`
- if normalization fails, it logs `Normalization sync failed. Continuing...`
- if price sync fails, it logs `Price sync failed.`
- it still proceeds to docket pull, price snapshotting, materialized view refresh, summary, and price probe

Evidence from `scripts/auto-sync-openclaw.mjs`:

- the wrapper writes only `success` or `failed` to `docs/sync-status.json`

Conclusion:

The pipeline clearly allows partial continuation, but the wrapper collapses that into a binary health label.

### UQ12. Does the daemon preserve the failing step that caused an OpenClaw run to fail?

Answer: `NO`

Evidence:

- `docs/sync-status.json` currently stores only:
  - `last_error: "Command failed: node \"...\\sync-all.mjs\""`
- `scripts/auto-sync-openclaw.mjs` captures only the wrapper command failure, not the internal step that failed

Conclusion:

Anthropic cannot localize the failure from the current status payload alone.

### UQ13. Do status surfaces use the same health language?

Answer: `NO`

Evidence:

- wrapper status is binary `success/failed`
- sentinel route reports DB freshness counts from `ingredient_price_history`
- local mirror tables have separate freshness fields
- `openclaw.sync_runs` tracks another notion of sync recency

Conclusion:

Different status surfaces are all "correct" within their own scope, but the repo has not normalized them into one health vocabulary.

### UQ15. Is single-instance behavior proven across every launcher path?

Answer: `PARTIAL`

What is solid:

- `chefflow-watchdog.ps1` has a real global mutex:
  - `Global\\ChefFlowWatchdog`
- live task settings show:
  - `ChefFlow-Watchdog` -> `MultipleInstances = IgnoreNew`
  - `OpenClaw Auto-Sync` -> `MultipleInstances = IgnoreNew`
- live process inspection during this audit found:
  - one watchdog process
  - one `auto-sync-openclaw.mjs --daemon` process

What is still weak:

- `scripts/auto-sync-openclaw.mjs` itself has no self-lock or mutex
- the guarantee for OpenClaw appears to live in Task Scheduler policy, not in the script
- the repo does not contain a checked-in registration script for the currently-running `OpenClaw Auto-Sync` task

Conclusion:

The current host is behaving single-instance for the audited tasks, but the guarantee is only partial. Anthropic should treat it as scheduler-enforced, not universally launch-path-safe.

### UQ17. Is Task Scheduler state audited against the scripts that claim to define it?

Answer: `NO`

Live task inventory during this audit:

- `ChefFlow-DailyBackup`
- `ChefFlow-DailySyncCheck`
- `ChefFlow-DB-Audit`
- `ChefFlow-HealthCheck`
- `ChefFlow-IngredientPriceSync`
- `ChefFlow-LiveOpsGuardian`
- `ChefFlow-MissionControlTray`
- `ChefFlow-MonthlyRestoreTest`
- `ChefFlow-OffsiteBackup`
- `ChefFlow-Ollama`
- `ChefFlow-PipelineAudit`
- `ChefFlow-PlatformObservabilityDigest`
- `ChefFlow-StaleCleanup`
- `ChefFlow-Watchdog`
- `ChefFlow-WeeklyDBIntegrity`
- `ChefFlow-WeeklySecretScan`
- `OpenClaw Auto-Sync`
- `OpenClaw Session Capture`
- `OpenClaw-Pull`
- `PiTether`

Why this shows drift:

- `scripts/scheduled/register-all-tasks.ps1` creates the free-tier tasks but only _mentions_ several pre-existing tasks in its summary.
- the repo search did not find a checked-in registration script for `OpenClaw Auto-Sync`
- `ChefFlow-DB-Audit` exists on the host but did not surface in the checked-in task-registration definitions inspected in this audit

Conclusion:

The live machine state is not fully reproducible from the repo scripts alone.

### UQ20. Which checked-in files are being treated as live operational truth?

Answer: `AT LEAST TWO, AND ONE OF THEM IS ACTIVE WORKTREE CHURN`

Known tracked operational artifacts:

- `docs/build-state.md`
- `docs/sync-status.json`

Important live evidence:

- `git status --short` shows `docs/sync-status.json` as modified in the worktree

Conclusion:

The repo is using at least one checked-in file as a live-updating status surface, which means operational truth is polluting git truth.

### UQ21. Is there one authoritative configuration surface for OpenClaw cadence and failure thresholds?

Answer: `NO`

Conflicting configuration surfaces:

1. `scripts/auto-sync-openclaw.mjs`
   - delta every 2 hours
   - full sync every 24 hours
   - backoff ladder 1m / 2m / 4m / 8m / 16m / 30m

2. live Windows task state
   - `OpenClaw Auto-Sync` is a long-running daemon task
   - `OpenClaw-Pull` is scheduled 5x daily (6/10/14/18/22)
   - `ChefFlow-IngredientPriceSync` is weekly Saturday 4:30 AM

3. route comments
   - `app/api/cron/price-sync/route.ts` still describes a nightly script
   - `app/api/cron/openclaw-sync/route.ts` also describes nightly cartridge syncs

4. repo docs and research
   - `docs/scheduled-tasks.md`
   - `docs/research/openclaw-refresh-cadence-and-status-surface.md`
   - both already document cadence inconsistency

Conclusion:

OpenClaw cadence is spread across daemon code, scheduled tasks, route comments, and docs. There is no single configuration authority today.

### UQ23. Do the runbooks, launcher scripts, and active machine topology still describe the same system?

Answer: `ONLY PARTIALLY`

Live host topology snapshot from this audit:

- listening ports:
  - `3100` -> Next dev
  - `41937` -> `scripts/launcher/server.mjs`
  - `54322` -> local Docker/Postgres backend
- not listening:
  - `3000` prod
  - `3200` beta

Relevant live processes:

- `chefflow-watchdog.ps1` running hidden with `-NoTray`
- `auto-sync-openclaw.mjs --daemon` running
- `scripts/launcher/server.mjs` running
- `next dev -p 3100` running
- `cloudflared` child of watchdog running

What this means:

- the machine is currently a partial stack, not the full prod+dev+beta story that some scripts and comments still imply
- the topology is not fake, but it is conditional and more fragmented than the docs make easy to infer

Conclusion:

Anthropic should not assume that runbook language like "the stack" or watchdog ownership text directly matches the exact live topology on any given machine snapshot.

## Findings

### 1. The build-state mechanism is real but structurally conflicted

The current system has both:

- a rich human-readable build-state file
- an automated hook that would overwrite it with a much thinner tsc-only snapshot

That means the repo has automation, but not one trustworthy build-truth contract.

### 2. OpenClaw health has split into four separate truths

The most important new fact from this pass is that the disagreement is not just:

- wrapper failed
- price propagation fresh

It is actually:

- wrapper failed
- ingredient price history fresh
- local store/catalog mirror older
- sync-run registry older still

That is a deeper integrity problem than the first audit captured.

### 3. The failing verification layer is currently mostly test drift, not product collapse

The failing unit tests are still worth fixing, but Anthropic should interpret them as:

- stale navigation contracts
- stale path assumptions
- stale string heuristics
- policy ambiguity around hidden admin routes

not as evidence that the admin shell, public surface, or persisted admin RBAC are newly broken.

### 4. Host operations are more disciplined than the repo fear suggests, but not fully repo-owned

The host today is not a chaos state:

- watchdog is single-instance guarded
- OpenClaw daemon is single-instance via task policy
- hidden launchers are in use
- the old beta respawn issue is not currently manifesting on port `3200`

But the repo still does not completely define the machine.

## Recommendations For Anthropic

### P0. Create one canonical OpenClaw health contract

One status payload should include at least:

- wrapper run status
- last wrapper success
- last wrapper failure
- local mirror freshness
- ingredient price freshness
- sync_runs freshness
- partial-success state
- failing step name

### P0. Separate build-state reporting from release attestation

Do not let the current `SessionEnd` tsc hook stand in for release truth.

Instead:

- define one checked-in release-gate manifest
- make build-state say whether it was hook-updated or manually builder-verified
- record clean commit vs dirty snapshot explicitly

### P1. Repair the failing unit tests before trusting them as boundary law

Minimum repair list:

- fix hidden admin route policy expectations
- stop treating internal helper params as request-derived tenant violations
- replace stale raw-string RBAC assertions with abstraction-aware checks
- replace `db/migrations` assumptions with `database/migrations`
- update public-nav contract expectations to the current IA

### P1. Add a repo-to-host scheduled-task reconciliation check

Anthropic should be able to answer:

- which tasks are defined by repo scripts
- which tasks are merely mentioned in docs
- which tasks exist only on the host

Without that, operational ownership remains fuzzy.

### P2. Stop writing live status into tracked docs paths when a runtime artifact path would do

`docs/sync-status.json` should not be both:

- a repo artifact
- a live-mutating runtime status file

Move live state to a runtime path or generate a report artifact separately.

## Bottom Line

The next integrity step for Anthropic is no longer "ask more questions about routes."

It is:

- fix truth ownership
- fix status ownership
- fix verification ownership

The repo is mature enough now that the bigger risk is not missing app code boundaries. The bigger risk is trusting the wrong status surface, the wrong test signal, or the wrong ops artifact.
