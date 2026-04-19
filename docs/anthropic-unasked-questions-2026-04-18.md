# Anthropic Follow-On Audit: Questions Not Yet Asked As First-Class Integrity Checks

Date: 2026-04-18
Audience: Anthropic builders and maintainers
Scope: Missing or under-specified audit questions after reviewing the current system-integrity corpus, the existing Anthropic audit report, targeted unit-test results, and the repo's operational docs/scripts

## What "Unasked" Means Here

This does **not** mean the repo has never mentioned these concerns anywhere.

Several of these topics appear indirectly in design docs, damage reports, or one-off notes. What is still missing is a clean system-integrity version of the question:

- binary enough to audit
- anchored to one owner
- tied to one canonical source of truth
- repeatable in future verification passes

The current corpus is strong on app-level boundaries:

- auth and tenant boundaries
- API route protection
- cron route auth and query safety
- role hierarchy and persisted admin RBAC
- public/admin surface separation
- OpenClaw domain modeling and pricing-data flows

The weakly-covered areas are different:

- build truth
- verification-layer trust
- multi-source operational truth
- Windows host/process hygiene
- file-based docs or status artifacts being treated as live truth

## Executive Read

The main gap is that the repo asks many good questions about the **application**, but too few about the **truthfulness of the evidence used to judge the application**.

That creates four practical risks:

1. A dirty checkout can inherit a "green" aura from an older baseline.
2. A failing test can mean either "product is broken" or "test is stale," and the suite does not always tell you which.
3. OpenClaw can be both "failed" and "fresh" at the same time depending on which status surface you read.
4. Windows scheduled tasks, watchdogs, and daemons can fight reality underneath the app unless they are audited as part of the system, not treated as external noise.

## Missing Question Set

## Domain 1: Build Truth And Release-Gate Truth

### UQ1. Is `docs/build-state.md` mechanically tied to the exact git snapshot it describes?

Current best answer: `NO`

Why this is still missing:

- `docs/build-state.md` is treated as a green-baseline artifact.
- The file itself warns that it describes the last known green baseline, not every newer uncommitted change.
- `docs/specs/token-efficiency-interrogation.md` notes that the SessionEnd hook logs build results to `.claude/hooks/cleanup.log`, not directly to `docs/build-state.md`.

Why Anthropic should care:

- A checked-in status document is not the same thing as a reproducible build attestation.
- The current audit had to separately note that the working tree is dirty even though the build-state file is green.

Recommendation:

- Make build-state generation automatic and bind it to commit hash or an explicit dirty-snapshot fingerprint.

### UQ2. What exact command set defines the Anthropic-owned release gate for this repo?

Current best answer: `UNDEFINED`

Evidence:

- `docs/build-state.md` tracks `npx tsc --noEmit --skipLibCheck` and `npm run build -- --no-lint`.
- The 2026-04-18 audit additionally needed targeted boundary tests.
- Those targeted tests produced a mixed signal: 76 passing, 6 failing, with failures spanning both real drift and stale checks.

Why this matters:

- Without a canonical gate, "Anthropic verified it" is too ambiguous.
- A builder can mean "typecheck + build passed" while a reviewer hears "the repo is contract-clean."

Recommendation:

- Publish one release-gate manifest that names the exact commands, acceptable warnings, and what to do with known stale tests.

### UQ3. Are zero-exit build warnings treated as acceptable debt or as release blockers?

Current best answer: `UNKNOWN`

Evidence:

- `docs/build-state.md` records green builds that still emit `DYNAMIC_SERVER_USAGE` follow-up warnings.

Why this matters:

- Exit code alone is not enough if warnings describe runtime correctness or caching behavior that the product actually cares about.

Recommendation:

- Classify warning families into `ignore`, `track`, or `block`.

### UQ4. Can a dirty checkout inherit a green status from an older baseline without fresh revalidation?

Current best answer: `YES`

Evidence:

- `docs/build-state.md` explicitly frames itself as last-known baseline truth.
- `docs/anthropic-system-audit-2026-04-18.md` explicitly warns not to interpret that as proof the current dirty checkout is green now.

Recommendation:

- Every Anthropic handoff should state whether it verified a clean commit, a dirty snapshot, or only a previously-reported baseline.

## Domain 2: Verification-Layer Integrity

### UQ5. Which failing contract tests are real regressions versus stale tests?

Current best answer: `MIXED SIGNAL`

Evidence from the 2026-04-18 audit:

- `tests/unit/admin-nav-boundary.test.ts` failed on `/admin/cannabis` nav expectations while the route is intentionally hidden.
- `tests/unit/public-surface-contract.test.ts` still expects the older public IA and misses `/hub`, `/faq`, and `Dinner Circles`.
- `tests/unit/auth.tenant-isolation.test.ts` produced false positives from internal helper parameters and also contained stale path/assertion assumptions.

Why this matters:

- A suite that mixes valid failures and stale failures without clearly labeling them erodes trust in the whole verification layer.

Recommendation:

- Introduce triage labels such as `real-regression`, `stale-test`, `heuristic-warning`, and `needs-contract-refresh`.

### UQ6. How much stale filesystem-path coupling still exists in the test suite?

Current best answer: `MORE THAN ONE TEST`

Evidence:

- The audit identified a stale `db/migrations` path in `tests/unit/auth.tenant-isolation.test.ts`.
- Additional search found 17 `db/migrations` references still living in `tests/unit/runtime-log-regressions.test.ts`.
- The active repo path is `database/migrations`.

Why this matters:

- This is no longer a one-off typo. It is a category of test rot.

Recommendation:

- Add one repo-wide path-integrity sweep to fail any new references to retired roots like `db/migrations`.

### UQ7. Which integrity tests depend on grep or brittle string heuristics that are known to generate false positives?

Current best answer: `NOT INVENTORIED`

Evidence:

- The tenant-isolation unit test flagged safe internal helper usage as a violation.
- `tests/system-integrity/q69-nonblocking-side-effect-isolation.spec.ts` already documents that some of its own heuristics can produce false positives.

Why this matters:

- Heuristic tests are useful, but only if the repo distinguishes them from authoritative contract tests.

Recommendation:

- Maintain an explicit list of heuristic tests and require a stricter evidence threshold before they are treated as release blockers.

### UQ8. Are contract tests versioned in lockstep with navigation and information-architecture changes?

Current best answer: `NO DURABLE EVIDENCE`

Evidence:

- Admin-nav drift and public-nav drift both existed at the same time in the current audit.

Why this matters:

- Navigation is part of the product contract. If route or IA changes can land without the contract tests moving with them, the suite stops being trustworthy as a boundary check.

Recommendation:

- Require IA-touching PRs to update the associated contract tests in the same change.

### UQ9. Does the repo distinguish "durable policy tests" from "historical regression traps"?

Current best answer: `NOT EXPLICITLY`

Why this matters:

- Some tests assert real system law.
- Some tests memorialize prior breakages with brittle file-content checks.
- These are both useful, but they should not carry the same authority.

Recommendation:

- Tag tests by purpose: `policy`, `contract`, `heuristic`, `regression-trap`, `migration-anchor`.

## Domain 3: OpenClaw Status Truth And Partial-Success Truth

### UQ10. What is the canonical source of OpenClaw health?

Current best answer: `UNRESOLVED`

Competing truths visible today:

- `docs/sync-status.json` says the wrapper sync is failed and tracks consecutive failures.
- `app/api/sentinel/sync-status/route.ts` derives freshness from `ingredient_price_history`.
- `logs/ingredient-price-sync.log` showed downstream price propagation completing on the same day the wrapper status was red.

Why this matters:

- The system currently cannot answer a basic question with one truth source: "Is OpenClaw healthy?"

Recommendation:

- Define a health hierarchy: wrapper acquisition, sync-run completion, DB freshness, and downstream price propagation should be separate fields under one status contract.

### UQ11. Can the current status model represent partial success?

Current best answer: `NO`

Evidence:

- `scripts/auto-sync-openclaw.mjs` writes a binary `success` or `failed` status file.
- The sentinel route separately reports freshness counts, which means partial success is being inferred indirectly rather than represented directly.

Why this matters:

- A full-sync wrapper failure should not collapse all downstream evidence into one red light if some data propagation still succeeded.

Recommendation:

- Add explicit states like `success`, `partial`, `stale`, `failed`, with per-stage counts.

### UQ12. Does the daemon preserve the failing step that caused an OpenClaw run to fail?

Current best answer: `NO`

Evidence:

- `scripts/auto-sync-openclaw.mjs` records a generic `Command failed: node "...sync-all.mjs"` style failure.
- The script does not persist stage-level failure identity in the status payload.

Why this matters:

- Anthropic cannot fix what it cannot localize.

Recommendation:

- Persist the exact failed phase, exit code, stderr summary, and whether downstream bridge work still ran.

### UQ13. Do status surfaces that Anthropic might read use the same health language?

Current best answer: `NO`

Evidence:

- Wrapper status is file-based.
- Sentinel status is DB-freshness-based.
- Log files add a third narrative.

Why this matters:

- Different operators can tell contradictory truths while each is technically "correct" within its own layer.

Recommendation:

- Put all status surfaces behind one shared status schema and make each surface clearly name which layer it is reporting.

### UQ14. Is downstream price freshness a sufficient proxy for upstream acquisition health?

Current best answer: `NO`

Why this matters:

- Fresh prices only prove that some usable data reached `ingredient_price_history`.
- They do not prove the catalog mirror is complete, the wrapper is healthy, or the next run will succeed.

Recommendation:

- Treat freshness as one health dimension, not the whole health verdict.

## Domain 4: Windows Host, Process, And Scheduled-Task Integrity

### UQ15. Is single-instance behavior proven across every launcher path, not just inside one script?

Current best answer: `PARTIAL`

Evidence:

- `chefflow-watchdog.ps1` has mutex logic.
- The damage report documents that a rogue prod server on port 3200 kept respawning through watchdog behavior until the beta-spawn loop was disabled.
- The repo also contains multiple launcher and task-registration paths, including `scripts/scheduled/register-all-tasks.ps1` and `scripts/scheduled/register-startup-stack.ps1`.

Why this matters:

- A mutex in one watchdog does not prove the whole host topology is single-instance-safe.

Recommendation:

- Add a host-process integrity audit that checks real running processes against the intended topology.

### UQ16. Are all scheduled tasks and background launchers guaranteed to run hidden and never steal focus?

Current best answer: `INTENT YES, PROOF NO`

Evidence:

- Current task-registration scripts use `-WindowStyle Hidden`.
- The damage report documented repeated popup windows from OpenClaw and watchdog-related jobs, and the cleanup required hidden VBS launchers for some tasks.

Why this matters:

- This is not cosmetic. The repo already has hard evidence that hidden intent and actual user experience can diverge.

Recommendation:

- Make "no visible popup windows" a standing operational regression check, not a one-time cleanup note.

### UQ17. Is Task Scheduler state audited against the scripts that claim to define it?

Current best answer: `UNASKED`

Why this matters:

- The repo contains multiple task-registration scripts and multiple runbooks.
- Without comparing actual registered tasks to repo-defined tasks, there is no guarantee the machine matches the codebase.

Recommendation:

- Add a scheduled-task inventory check that compares live Task Scheduler state to the expected task manifest.

### UQ18. Are child processes reliably cleaned up on crash, restart, and shutdown?

Current best answer: `NOT PROVEN`

Evidence:

- The damage report documented 100+ Playwright MCP zombie processes and a watchdog fighting cleanup.

Why this matters:

- A background process layer that leaks children is part of the system's integrity, not an external annoyance.

Recommendation:

- Add explicit child-process cleanup assertions to watchdog and launcher audits.

### UQ19. Can any launcher still resurrect non-canonical servers or services after they have been disabled elsewhere?

Current best answer: `HISTORICALLY YES`

Evidence:

- The damage report shows a beta/prod respawn loop that kept bringing back a server the operator thought was gone.

Why this matters:

- "Killed the process" is not a meaningful action if another layer silently restarts it.

Recommendation:

- Add a regression question for resurrection behavior across watchdog, startup tasks, beta launchers, and sync daemons.

## Domain 5: File-Based Truth, Docs Truth, And Operational-Config Truth

### UQ20. Which checked-in files are being treated as live operational truth even though they are only repo artifacts?

Current best answer: `AT LEAST TWO`

Known examples:

- `docs/build-state.md`
- `docs/sync-status.json`

Why this matters:

- A checked-in file can be useful as a report artifact, but it is weaker than live runtime state unless the repo proves how and when it is generated.

Recommendation:

- Mark every file-based status surface as either `report artifact` or `runtime truth` and justify the classification.

### UQ21. Is there one authoritative configuration surface for OpenClaw cadence, staleness, and failure thresholds?

Current best answer: `NO CLEAR SINGLE SOURCE`

Evidence:

- `scripts/auto-sync-openclaw.mjs` hardcodes delta/full intervals and backoff steps.
- Scheduled task scripts define separate frequencies.
- Sentinel status only answers a freshness question.
- Multiple OpenClaw specs discuss cadence and watchdog thresholds.

Why this matters:

- If cadence, freshness, and failure policy are spread across code, tasks, and docs, drift is nearly guaranteed.

Recommendation:

- Centralize runtime thresholds or at least generate docs from the live config source.

### UQ22. Which docs or specs claim `PASS`, `green`, or `healthy` states without executable backing tied to the current snapshot?

Current best answer: `NOT AUDITED`

Why this matters:

- The repo is rich in docs and status writing.
- That is valuable, but only if readers can tell whether a claim is executable, historical, or aspirational.

Recommendation:

- Introduce doc-state labels such as `executably-verified`, `historical note`, `design intent`, and `operator observation`.

### UQ23. Do the runbooks, launcher scripts, and active machine topology still describe the same system?

Current best answer: `UNKNOWN`

Evidence suggesting this deserves a real check:

- There are multiple runbooks, launcher scripts, scheduled-task registration scripts, and cleanup narratives.
- The previous damage report already proved that real machine behavior can drift from what the operator thinks is running.

Recommendation:

- Add one topology-reconciliation audit: intended services, registered tasks, live processes, open ports, and tunnel state.

## Priority Order For Anthropic

If Anthropic only asks five new questions next, they should be these:

1. `UQ10`: What is the canonical source of OpenClaw health?
2. `UQ5`: Which failing tests are real regressions versus stale tests?
3. `UQ1`: Is `docs/build-state.md` mechanically tied to the exact snapshot it describes?
4. `UQ15`: Is single-instance behavior proven across every launcher path?
5. `UQ21`: Is there one authoritative configuration surface for OpenClaw cadence and failure thresholds?

## Bottom Line

The repo is no longer missing questions about the app's obvious boundaries. It is missing questions about whether the repo's own **evidence surfaces** deserve trust.

That is the next maturity step for Anthropic:

- not more route-level skepticism first
- more skepticism about build claims, stale tests, daemon truth, and operational status artifacts

Until those questions are promoted into first-class checks, Anthropic can still get correct local answers while drawing the wrong system-level conclusion.
