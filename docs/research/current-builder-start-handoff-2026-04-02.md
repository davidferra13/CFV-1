# Current Builder Start Handoff

> **Date:** 2026-04-02
> **Revised:** 2026-04-03
> **Status:** active builder-start context
> **Purpose:** give the next builder one canonical starting document that explains the current repo posture, the system-level planning parent, the default queue order, and the branching rules when a narrower slice is explicitly assigned.

---

## Executive Summary

The repo-wide baseline is green again, but the verified state still lives on a preserved dirty checkout.

That means all of these are true at the same time:

- `docs/build-state.md` still records the last known green baseline
- this pass re-confirmed `npm.cmd run typecheck:app`, the focused focus-mode/nav tests, and `npm.cmd run build -- --no-lint` exiting `0`
- the same pass still found post-build artifact drift because `.next/BUILD_ID` was absent immediately afterward
- a strict builder must still treat the checkout as intentionally dirty, not accidentally dirty

This is not a contradiction. It is the current execution posture.

The canonical system-level planning parent is:

- `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`

The canonical missing-surface and false-completion companion is:

- `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`

That control tower is now the queue-order authority for default ChefFlow work.

The default queue is no longer survey-first.

Absent explicit reassignment, the next builder should move in this order:

1. burn down active built-but-unverified debt
2. build the narrow production-hardening foundations
3. restore release-contract truth
4. return to the ready trust / continuity / consolidation queue in control-tower order

The survey lane remains real, but as an explicit validation branch, not as the universal owner of the current builder queue.

Use preserved-dirty-checkout mode only when both `docs/build-state.md` and this handoff authorize it.

---

## Canonical Read Order

Read these in this exact order before this document branches you into the default lane or a narrower assigned lane:

1. `docs/build-state.md`
2. `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`
3. `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`

If the assignment question is not "what exact spec do I run next?" but instead "what belongs in the current builder-admissible docket at all?", read:

- `docs/research/builder-docket-runtime-ownership-map-2026-04-03.md`

and use its `Simple Admission Rollup` before branching.

Then branch by assignment:

### Default path when no narrower assignment is given

4. `docs/research/built-specs-verification-queue.md`
5. If verification debt is explicitly blocked or already cleared, read these next in order:
   - `docs/specs/p1-automated-database-backup-system.md`
   - `docs/specs/p1-request-correlation-and-observability-wiring.md`
   - `docs/specs/p1-build-and-release-contract-truth.md`
   - `docs/specs/p1-allergy-and-dietary-trust-alignment.md`
   - `docs/specs/cost-propagation-wiring.md`
   - `docs/specs/vendor-personalization-layer.md`
   - `docs/specs/p1-dead-zone-gating-and-surface-honesty.md`
   - `docs/specs/p1-task-and-todo-contract-truth.md`
   - `docs/specs/p1-analytics-surface-ownership-and-route-truth.md`
   - `docs/specs/p1-pipeline-analytics-truth-and-honesty.md`

### If the developer explicitly assigns survey validation work

3. `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`
4. `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`
5. `docs/specs/p1-survey-public-hardening-and-results-scale.md`

### If the developer explicitly assigns runtime-owned OpenClaw work

3. `docs/research/current-openclaw-builder-start-handoff-2026-04-03.md`
4. `docs/research/openclaw-runtime-builder-handoff-2026-04-02.md`
5. the exact narrow OpenClaw spec or continuation thread named by that runtime handoff

### If the developer explicitly assigns a non-survey website or system slice

3. the narrower cross-reference or research packet named by the control tower
4. the exact implementation spec for that slice

If that explicit website assignment is specifically render-path, loading, caching, or Core Web Vitals work, branch through:

3. `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`
4. `docs/research/website-performance-hardening-handoff-2026-04-03.md`
5. the exact narrow implementation slice or measurement task for that performance lane

Only read `docs/research/current-build-recovery-handoff-2026-04-02.md` if the baseline regresses or the build-state file becomes contradictory again.

---

## Verified Repo Truth

### Baseline

- `docs/build-state.md`
  - remains the last known green baseline
- `npm.cmd run typecheck:app`
  - passes
- `node --test --import tsx tests/unit/focus-mode.test.ts tests/unit/focus-mode-strict-nav.test.ts`
  - passes
- `npm.cmd run build -- --no-lint`
  - exits `0` and emits the normal route manifest for this pass
- `.next/BUILD_ID`
  - is still absent immediately after that successful build command, so post-build artifact integrity remains a real follow-up instead of a closed concern

### System-Level Planning Parent

The active repo-wide sequencing parent is:

- `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`

The active completeness companion for missing/incomplete systems is:

- `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`

Use it whenever the task is broader than a narrow explicitly assigned slice.

### Default Concrete Execution Lane

The default open execution obligation is now the control-tower queue itself:

- active built-but-unverified work should be verified before it is treated as settled
- two narrow production-hardening specs are now ready:
  - `docs/specs/p1-automated-database-backup-system.md`
  - `docs/specs/p1-request-correlation-and-observability-wiring.md`
- the next contract-truth slice after those is now explicit:
  - `docs/specs/p1-build-and-release-contract-truth.md`
- the next ready user-facing slice after that remains:
  - `docs/specs/p1-allergy-and-dietary-trust-alignment.md`
- the continuity queue then continues through:
  - `docs/specs/cost-propagation-wiring.md`
  - `docs/specs/vendor-personalization-layer.md`
  - `docs/specs/p1-dead-zone-gating-and-surface-honesty.md`
  - `docs/specs/p1-task-and-todo-contract-truth.md`
  - `docs/specs/p1-analytics-surface-ownership-and-route-truth.md`
  - `docs/specs/p1-pipeline-analytics-truth-and-honesty.md`

The survey validation lane is still available, but it is no longer the default owner of generic builder selection.

### Other Current Truths

- the three measured interface-philosophy violations are now corrected on the preserved dirty checkout
- the active built-verification queue still exists and remains real product debt
- targeted release-contract tests are currently stale and failing on the live checkout:
  - `tests/unit/api.health-route.test.ts`
  - `tests/unit/launch-surface-guards.test.ts`
  - `tests/unit/web-beta-build-surface.test.ts`
- the canonical build command now exits `0` again on the dirty checkout, but build-artifact truth is still incomplete because `.next/BUILD_ID` is missing after the run
- OpenClaw runtime, Raspberry Pi host work, and bridge work still require runtime-ownership classification before selection

### Preserved Dirty Baseline

The current dirty snapshot at handoff time includes these files:

- `app/(chef)/culinary/price-catalog/page.tsx`
- `app/(chef)/dashboard/_sections/hero-metrics-client.tsx`
- `app/(chef)/dashboard/_sections/hero-metrics.tsx`
- `app/(client)/my-events/[id]/pay/payment-section.tsx`
- `app/(public)/page.tsx`
- `app/api/cron/event-progression/route.ts`
- `app/api/v2/documents/generate/route.ts`
- `app/api/v2/documents/route.ts`
- `app/api/v2/events/[id]/archive/route.ts`
- `app/api/v2/events/[id]/clone/route.ts`
- `app/api/v2/events/[id]/route.ts`
- `app/api/v2/events/[id]/transition/route.ts`
- `app/api/v2/events/route.ts`
- `app/api/v2/loyalty/members/[id]/route.ts`
- `app/api/v2/loyalty/members/route.ts`
- `app/api/v2/payments/route.ts`
- `app/api/v2/quotes/[id]/accept/route.ts`
- `app/api/v2/quotes/[id]/send/route.ts`
- `app/layout.tsx`
- `chefflow-watchdog.ps1`
- `components/navigation/nav-config.tsx`
- `docs/build-state.md`
- `docs/interface-philosophy-gap-analysis.md`
- `docs/research/README.md`
- `docs/research/builder-docket-runtime-ownership-map-2026-04-03.md`
- `docs/research/current-builder-start-handoff-2026-04-02.md`
- `docs/research/foundations/2026-04-03-builder-gap-closure-handoff.md` (untracked)
- `docs/research/foundations/2026-04-03-system-completeness-gap-map.md` (untracked)
- `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`
- `docs/session-log.md`
- `docs/uptime-history.json`
- `lib/billing/focus-mode-actions.ts`
- `lib/chef/layout-data-cache.ts`
- `lib/documents/intelligence-router.ts`
- `lib/events/transitions.ts`
- `lib/openclaw/catalog-actions.ts`
- `lib/validation/schemas.ts`
- `next.config.js`
- `package.json`
- `public/images/remy/Gustav/Gustav Full body..png` (deleted)
- `public/images/remy/Gustav/gustav-full-body.png` (deleted)
- `public/images/remy/Gustav/gustav-mascot-b64.txt` (deleted)
- `public/images/remy/_watermark_check.png` (deleted)
- `public/images/remy/remy-animation-pack.png` (deleted)
- `public/images/remy/remy-eye-states.png` (deleted)
- `public/images/remy/remy-eyes-closed.png` (deleted)
- `public/images/remy/remy-flag-1.png` (deleted)
- `public/images/remy/remy-flag-2.png` (deleted)
- `public/images/remy/remy-flag-3.png` (deleted)
- `public/images/remy/remy-flag-4.png` (deleted)
- `public/images/remy/remy-flag-5.png` (deleted)
- `public/images/remy/remy-flag-6.png` (deleted)
- `public/images/remy/remy-giddy-surprise.png` (deleted)
- `public/images/remy/remy-happy-eyes-closed.png` (deleted)
- `public/images/remy/remy-happy-sleeping.png` (deleted)
- `public/images/remy/remy-mascot.png` (deleted)
- `public/images/remy/remy-walk-1.png` (deleted)
- `public/images/remy/remy-walk-2.png` (deleted)
- `public/images/remy/remy-walk-3.png` (deleted)
- `public/images/remy/remy-walk-4.png` (deleted)
- `public/images/remy/remy-walk-5.png` (deleted)
- `public/images/remy/remy-waving-6frames.png` (deleted)
- `public/images/remy/remy-whisk-1.png` (deleted)
- `public/images/remy/remy-whisk-2.png` (deleted)
- `public/images/remy/remy-whisk-3.png` (deleted)
- `public/images/remy/remy-whisk-4.png` (deleted)
- `public/images/remy/sprites/remy-base.png` (deleted)
- `public/images/remy/sprites/remy-body-celebrate.png` (deleted)
- `public/images/remy/sprites/remy-body-spicy.png` (deleted)
- `public/images/remy/sprites/remy-body-walk.png` (deleted)
- `public/images/remy/sprites/remy-body-whisk.png` (deleted)
- `scripts/check-bundle-budget.mjs`
- `scripts/openclaw-pull/config.mjs`
- `scripts/openclaw-pull/pull.mjs`
- `docs/specs/p1-automated-database-backup-system.md` (untracked)
- `docs/specs/p1-build-and-release-contract-truth.md` (untracked)
- `docs/specs/p1-pipeline-analytics-truth-and-honesty.md` (untracked)
- `docs/specs/p1-request-correlation-and-observability-wiring.md` (untracked)
- `docs/specs/p1-task-and-todo-contract-truth.md` (untracked)
- `scripts/daily-sync-check.ps1` (untracked)
- `scripts/list-tasks.ps1` (untracked)
- `scripts/run-next-prod.mjs` (untracked)

Treat the files outside the builder's explicitly assigned narrow lane as preserved in-flight work unless the developer explicitly assigns them. Do not clean them up or absorb them casually.

### What Is Not Yet Complete

- active built-but-unverified items in `docs/research/built-specs-verification-queue.md`
- implementation of the two new production-hardening specs
- implementation of the release-contract truth spec
- ready trust / continuity / dead-zone / closure slices beyond the hardening phase
- survey validation work, which remains available but is no longer the default general queue owner
- Cloudflare Tunnel service reinstall with proper args so the tunnel survives reboot

---

## Immediate Next Task

If the developer does **not** explicitly assign a different slice, the next builder should start with:

- `docs/research/built-specs-verification-queue.md`

and burn down the active built-but-unverified queue in that document's order.

If the developer wants the next coding slice instead of verification work, start with:

1. `docs/specs/p1-automated-database-backup-system.md`
2. `docs/specs/p1-request-correlation-and-observability-wiring.md`
3. `docs/specs/p1-build-and-release-contract-truth.md`

Then return to the control tower for the next ready trust / continuity slice.

If the developer explicitly assigns survey validation work, branch into the survey handoff stack and treat hosted reachability as the gating concern before attempting survey-route checks.

If the developer explicitly assigns `runtime-owned` OpenClaw work, branch to:

- `docs/research/current-openclaw-builder-start-handoff-2026-04-03.md`

and let that document become the queue-order authority for the runtime lane. Do not keep using this website-first handoff as if it owned the OpenClaw queue too.

If the developer explicitly assigns website-performance work, branch to:

- `docs/research/website-performance-hardening-handoff-2026-04-03.md`

and treat that handoff plus the website cross-reference as the governing context for render-path and loading work instead of trying to infer a performance queue from the broader default lane.

---

## Dirty Worktree Interpretation

The current handoff describes a verified dirty checkout.

That means:

- there is no repo-wide `tsc` or build blocker
- there is still no clean-commit baseline for the current verified state
- the next builder must not `reset`, `checkout --`, or otherwise discard work just to satisfy pre-flight
- the next builder should capture `git status --short` before coding and treat that output as preserved baseline context
- the next builder may continue only in preserved-dirty-checkout mode for the lanes explicitly authorized by `docs/build-state.md` and this handoff
- the next builder must keep edits narrow and preserve unrelated diffs untouched

This is **not** blanket permission to treat every unrelated task as safe on a dirty tree.

If `docs/build-state.md` and this handoff stop agreeing about the preserved dirty baseline, stop and report that mismatch before building.

The correct response is to preserve the current state, record the dirty worktree clearly, and continue only under this intentionally preserved handoff or after the current state is committed.

---

## Exact Execution Order

### Phase 0

Common start for every builder:

1. read `docs/build-state.md`
2. read this handoff
3. read `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`
4. if the task is about missing systems, false-complete surfaces, or closure work, read `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`
5. confirm whether the task is:
   - the default verification / hardening lane
   - explicitly assigned survey validation work
   - an explicitly assigned narrow implementation slice
   - verification-only work
   - recovery work because the baseline regressed

### Phase 1

If no narrower assignment was given, verify active built work first.

Source of truth:

- `docs/research/built-specs-verification-queue.md`

If phase 1 fails:

- fix or document only the blockers required for truthful verification
- rerun phase 1

### Phase 2

If the developer wants the next coding slice after verification debt, or if the verification lane is explicitly blocked:

- execute `docs/specs/p1-automated-database-backup-system.md`
- then execute `docs/specs/p1-request-correlation-and-observability-wiring.md`
- then execute `docs/specs/p1-build-and-release-contract-truth.md`

### Phase 3

Return to the control tower and follow its phase order for the next assigned domain.

That is where the builder should choose between:

- trust and dietary continuity
- costing and vendor propagation
- dead-zone honesty
- task/todo contract closure
- analytics route ownership and pipeline truth
- demo continuity
- already-specced consolidation lanes
- later validation, reachability, website, or platform-intelligence work

Do not invent a new top-level order outside this handoff plus the control tower.

---

## Do Not Do These Things

- do not restart survey planning from older Google Forms docs
- do not treat `docs/specs/p0-survey-passive-voluntary-surfacing.md` as the next build step; it is implementation reference now
- do not treat the survey lane as the default owner of the whole repo
- do not skip the active built-verification queue and jump straight into new build work without an explicit reason
- do not trust the current targeted release tests until the release-contract truth slice lands
- do not skip the control tower when the task is broader than the default lane
- do not use this website-first handoff as the queue-order authority once the developer has explicitly redirected the builder into the OpenClaw runtime lane
- do not pick a random `ready` spec by filename sorting alone
- do not treat the dirty worktree as permission to clean the tree destructively
- do not reopen the old generated-schema blocker unless the baseline actually regresses

---

## Completion Condition

The current builder-start context is complete when the next builder can answer these questions without guessing:

1. Is the repo-wide baseline green or red?
2. Is the current verified state on a clean commit or a dirty checkout?
3. What is the system-level parent doc for sequencing?
4. What exact queue should be executed next if no narrower assignment is given?
5. What coding slice comes immediately after verification debt?
6. How should a builder branch if the developer explicitly assigns a different ready-spec slice?
7. How should a builder behave if `git status` is dirty for this active context?

This handoff now answers all seven.
