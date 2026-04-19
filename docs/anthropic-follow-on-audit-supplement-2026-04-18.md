# Anthropic Follow-On Audit Supplement: Remaining Unasked Questions

Date: 2026-04-18
Audience: Anthropic builders and maintainers
Scope: Remaining unanswered items from `docs/anthropic-unasked-questions-2026-04-18.md` after the first follow-on answer pass in `docs/anthropic-follow-on-audit-answers-2026-04-18.md`

## Purpose

This supplement closes the remaining high-signal UQs that were not answered in the first follow-on report:

- `UQ3`
- `UQ7`
- `UQ8`
- `UQ9`
- `UQ14`
- `UQ16`
- `UQ18`
- `UQ19`
- `UQ22`

This pass did not run a fresh production build.

## Answered Questions

### UQ3. Are zero-exit build warnings treated as acceptable debt or as release blockers?

Answer: `PARTIAL POLICY EXISTS`

What is explicitly defined:

- `docs/build-state.md` explicitly marks two warning families as non-blocking for the current baseline:
  - `DYNAMIC_SERVER_USAGE`
  - Next 14.2.35 warning that `serverActions` is an unrecognized key in `next.config.js`

Direct evidence:

- `docs/build-state.md:29` says:
  - these warnings are "Known non-blocking build noise"
  - they are follow-up runtime/config cleanup
  - they are "not a blocker for the current baseline"

What is still missing:

- no repo-wide warning taxonomy
- no manifest distinguishing warning classes like `ignore`, `track`, `block`
- no general policy for future zero-exit warnings outside the two named families

Conclusion:

The repo does have a narrow warning policy, but only for a known pair of warnings. Anthropic should not mistake that for a general release-warning policy.

### UQ7. Which integrity tests depend on grep or brittle string heuristics that are known to generate false positives?

Answer: `PARTIALLY IDENTIFIABLE, NOT CENTRALIZED`

Concrete examples:

1. `tests/unit/auth.tenant-isolation.test.ts`
   - self-describes some checks as "static analysis (grep-based)"
   - current failure on `input.tenantId` is a real false positive against internal helper parameters

2. `tests/system-integrity/q6-server-action-auth.spec.ts`
   - logs "May be false positives — verify manually"
   - explicitly downgrades its own tenant-body scan to warning-only
   - always passes after logging

3. `tests/system-integrity/q69-nonblocking-side-effect-isolation.spec.ts`
   - repeatedly documents that the heuristic may produce false positives
   - uses thresholds and warning output rather than hard certainty

4. `tests/system-integrity/q84-noop-success-return.spec.ts`
   - explicitly notes that helper-delegation patterns may be false positives
   - adds a second test to reduce, not eliminate, that risk

Conclusion:

The repo already knows some tests are heuristic and noisy, but that knowledge lives inside comments and warning text, not in any centralized inventory.

### UQ8. Are contract tests versioned in lockstep with navigation and information-architecture changes?

Answer: `NO`

Evidence from current repo state:

- `components/navigation/public-nav-config.ts` includes `/hub` and `/faq`
- `lib/public/public-surface-config.ts` includes `Dinner Circles`
- `tests/unit/public-surface-contract.test.ts` still expects the older IA

Also:

- `components/navigation/admin-nav-config.ts` intentionally hides `/admin/cannabis`
- `tests/unit/admin-nav-boundary.test.ts` still demands that route appear in the admin nav config

Conclusion:

There is no evidence of a standing mechanism that forces navigation-contract tests to move in lockstep with IA changes. The current repo state proves the opposite.

### UQ9. Does the repo distinguish "durable policy tests" from "historical regression traps"?

Answer: `ONLY INFORMALLY`

Evidence:

- `tests/system-integrity/q36-financial-view-integrity.spec.ts` explicitly calls itself a regression guard
- `tests/system-integrity/q38-calling-auth-gate.spec.ts` explicitly calls itself a focused regression guard
- `tests/unit/runtime-log-regressions.test.ts` is named as regression guards
- `tests/unit/auth.tenant-isolation.test.ts` mixes pure logic with grep-based static analysis
- `tests/system-integrity/q6-server-action-auth.spec.ts` contains warning-only checks

What is missing:

- no shared metadata
- no naming convention that cleanly separates `policy`, `contract`, `heuristic`, and `regression-guard`
- no release-gate rule that says which categories are hard blockers

Conclusion:

The distinction exists in local comments and file naming, but not as a first-class testing taxonomy Anthropic can rely on mechanically.

### UQ14. Is downstream price freshness a sufficient proxy for upstream acquisition health?

Answer: `NO`

Direct evidence from this audit's live DB reads:

- `ingredient_price_history`
  - fresh on `2026-04-18`
  - `updated_today = 270907`
- `openclaw.store_products.last_seen_at`
  - latest `2026-04-16T23:04:36.389Z`
- `openclaw.stores.last_cataloged_at`
  - latest `2026-04-17T02:39:50.000Z`
- `openclaw.sync_runs`
  - latest `2026-04-15T05:22:12.299Z`
- wrapper status file
  - failed on `2026-04-18T23:11:00.084Z`

Conclusion:

Fresh downstream price history proves that some OpenClaw-backed data is flowing into costing history. It does **not** prove that:

- the wrapper is healthy
- the mirror is current
- sync-run bookkeeping is current
- the next run will succeed

### UQ16. Are all scheduled tasks and background launchers guaranteed to run hidden and never steal focus?

Answer: `NO GUARANTEE`

What is solid:

- `scripts/scheduled/register-all-tasks.ps1` uses `-WindowStyle Hidden` for its PowerShell tasks
- watchdog and tray startup tasks use VBS launchers:
  - `scripts/watchdog-launcher.vbs`
  - `scripts/launcher/tray-launcher.vbs`
- `ChefFlow-Watchdog` task settings on the host show `Hidden = True`

What weakens the guarantee:

- live `OpenClaw Auto-Sync` task settings show:
  - `Hidden = False`
  - `LogonType = Interactive`
  - action runs `node.exe` directly, not through a hidden VBS wrapper
- live `OpenClaw-Pull` task settings show:
  - `Hidden = False`
  - `LogonType = Interactive`
  - action does use `pull-hidden.vbs`, but the task itself is not hidden
- the prior damage report already documented that hidden intent and real focus-steal behavior diverged in practice

Conclusion:

The repo has improved the launch strategy, but there is no audit-grade guarantee that every scheduled task is focus-safe. Anthropic should treat this as a host-level regression area, not a solved problem.

### UQ18. Are child processes reliably cleaned up on crash, restart, and shutdown?

Answer: `NO, CLEANUP EXISTS BUT LEAKS ARE STILL RECURRING`

What exists:

- `.claude/hooks/session-cleanup.sh` kills:
  - Playwright MCP zombies
  - orphaned dev servers
  - rogue prod servers
  - stale Playwright test servers
- `chefflow-watchdog.ps1` tracks managed child processes via `$script:managedProcesses`
- watchdog has helpers like:
  - `Clear-ExitedManagedProcess`
  - `Start-ManagedProcess`

Why this is still not proven clean:

- `.claude/hooks/cleanup.log` shows repeated zombie cleanup across many sessions, including extensive April 15-18 churn
- the hook is still regularly killing 1-3 Playwright MCP zombies, with some spikes above that
- a cleanup hook that repeatedly finds leaked children is evidence of mitigation, not proof of hygienic child-process ownership

Conclusion:

The repo now has compensating cleanup mechanisms, but the repeated zombie kills show that reliable child cleanup is still not a settled property of the system.

### UQ19. Can any launcher still resurrect non-canonical servers or services after they have been disabled elsewhere?

Answer: `HISTORICALLY YES, SPECIFIC BETA CASE NOW APPEARS FIXED, GLOBAL PROOF STILL MISSING`

Evidence for the old failure:

- `docs/CODEX-DAMAGE-REPORT-2026-04-09.md` documents the beta respawn loop on port `3200`

Evidence for the current fix:

- `chefflow-watchdog.ps1` now comments out the beta ensure block:
  - `Ensure-BetaServerRunning`
  - beta tunnel block
- the file explicitly says beta was disabled on `2026-04-09`
- current host snapshot from the earlier audit showed:
  - no listener on `3200`

Why the broader question is still unresolved:

- watchdog still actively ensures canonical services like prod/dev/tunnel processes
- there is no standing regression test that says "a disabled launcher path cannot silently come back"

Conclusion:

The known beta resurrection path appears fixed right now, but Anthropic still lacks a generalized proof that future non-canonical services cannot be brought back by another launcher layer.

### UQ22. Which docs or specs claim `PASS`, `green`, or `healthy` states without executable backing tied to the current snapshot?

Answer: `AT LEAST SOME CURRENT DOC CLAIMS ARE STALE OR SNAPSHOT-WEAK`

Concrete examples:

1. `docs/specs/token-efficiency-interrogation.md`
   - still says:
     - `SessionEnd runs tsc and logs to cleanup.log, but does NOT update build-state.md`
   - current code in `.claude/hooks/session-cleanup.sh` does attempt to update `docs/build-state.md`
   - conclusion: this spec claim is stale against current repo code

2. `docs/scheduled-tasks.md`
   - presents a clean task map
   - current live host inventory includes tasks not reflected in the main schedule tables, including:
     - `OpenClaw Auto-Sync`
     - `ChefFlow-DB-Audit`
   - conclusion: the doc is useful, but it is not a complete current machine-truth inventory

3. Specs that rely on `docs/build-state.md` as a planning safety signal
   - example: `docs/specs/openclaw-pc-local-mirror-and-backup-contract.md`
   - claims the active build baseline is green and therefore safe to plan on top of
   - that may be fine as historical planning context, but it is not executable proof of the current dirty snapshot

Conclusion:

The repo needs doc-state labeling. Right now a reader has to infer whether a statement is:

- historical
- design-time
- manually verified
- hook-generated
- current-machine truth

without the docs clearly telling them.

## Findings

### 1. The repo already has more policy than the earlier question set assumed, but it is narrow and local

Two examples:

- build warnings: narrow explicit policy exists
- heuristic tests: local comments often admit uncertainty

The gap is not total absence of policy. The gap is that the policy is scattered and not elevated into system law.

### 2. Host UX safety is weaker than launch-script text suggests

The live task configuration matters more than the script comments. On that standard:

- watchdog is hidden
- some OpenClaw tasks are **not** hidden

That is enough to reject any blanket claim that "all background jobs are now guaranteed invisible."

### 3. Cleanup tooling is compensating for leaks rather than proving they are gone

The repeated Playwright zombie cleanup entries are the clearest proof. The cleanup hook is valuable, but Anthropic should not confuse cleanup frequency with process hygiene.

## Recommendations

### P1. Add a warning taxonomy to the release-gate layer

Minimum categories:

- `non_blocking_known_noise`
- `tracked_runtime_risk`
- `release_blocker`

### P1. Add machine-readable test classification

Minimum categories:

- `policy`
- `contract`
- `heuristic`
- `regression_guard`
- `warning_only`

### P1. Add a task-visibility audit

Anthropic should fail or flag any interactive scheduled task that:

- runs a console binary directly
- is not hidden
- is expected to stay non-disruptive

### P1. Add a child-process hygiene metric

One simple rule:

- if the cleanup hook keeps killing zombies every day, the system should not be labeled operationally clean

### P2. Add doc-state labels to status-bearing docs

Suggested labels:

- `historical snapshot`
- `current host observation`
- `design intent`
- `manually verified`
- `executably verified`

## Bottom Line

The remaining unanswered questions mostly closed in the same direction as the first follow-on report:

- the repo has more structure than a casual read suggests
- but its truth surfaces are still looser than Anthropic should accept as final system law

The biggest remaining weaknesses are not hidden in product code. They are in:

- scattered policy
- unclassified tests
- host/task UX guarantees
- docs that do not say what kind of truth they are asserting
