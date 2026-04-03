# Current Builder Start Handoff

> **Date:** 2026-04-02
> **Revised:** 2026-04-03
> **Status:** active builder-start context
> **Purpose:** give the next builder one canonical starting document that explains the current repo posture, the system-level planning parent, the default next execution step, and the branching rules when a narrower slice is explicitly assigned.

---

## Executive Summary

The repo-wide baseline is green again, but the current verified state still lives on a dirty working tree.

That means all of these are true at the same time:

- `npm run typecheck:app` passes
- `npm run build -- --no-lint` passes
- a strict builder must still treat the checkout as intentionally dirty, not accidentally dirty

This is not a contradiction. It is the current execution posture.

The canonical system-level planning parent is now:

- `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`

That control tower is the repo-wide sequencing parent.

The default concrete execution lane is still:

- `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`

but only as the default next step when the developer has not explicitly reassigned the builder into another ready-spec slice.

Use preserved-dirty-checkout mode only when both `docs/build-state.md` and this handoff authorize it.

---

## Canonical Read Order

Read these in this exact order before this document branches you into the default lane or a narrower assigned lane:

1. `docs/build-state.md`
2. `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`

If the assignment question is not "what exact spec do I run next?" but instead "what belongs in the current builder-admissible docket at all?", read:

- `docs/research/builder-docket-runtime-ownership-map-2026-04-03.md`

and use its `Simple Admission Rollup` before branching.

Then branch by assignment:

### Default path when no narrower assignment is given

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

Only read `docs/research/current-build-recovery-handoff-2026-04-02.md` if the baseline regresses or the build-state file becomes contradictory again.

---

## Verified Repo Truth

### Baseline

- `npm run typecheck:app`
  - passes
- `npm run build -- --no-lint`
  - passes
- `node --test --import tsx "tests/unit/beta-survey-utils.test.ts"`
  - passes
- localhost browser verification
  - public discovery card renders with both tracked CTAs
  - chef portal renders the operator survey banner
  - client portal renders the client survey banner

### System-Level Planning Parent

The active repo-wide sequencing parent is:

- `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`

Use it whenever the task is broader than the default survey verification lane or when the developer explicitly assigns another ready-spec slice.

### Default Concrete Execution Lane

The default open execution obligation is still the internal wave-1 market-research survey path:

- public survey routes exist
- passive voluntary surfacing exists locally across public, chef, and client surfaces
- same-browser completion suppression exists
- build-safe caching for survey-definition reads exists
- deployed verification of that slice is still open
- the latest deploy-verification attempt was blocked before app-level checks because at 2026-04-03 04:39 EDT both `beta.cheflowhq.com` and `app.cheflowhq.com` returned Cloudflare `530` / `1033` from `/api/health/readiness?strict=1`

### Parallel Ready Work That Already Exists

Other real builder-ready slices now exist, but they are not the default next execution step unless the developer explicitly redirects the builder or the survey verification lane is closed.

Examples already indexed in the control tower:

- `docs/specs/p1-allergy-and-dietary-trust-alignment.md`
- `docs/specs/cost-propagation-wiring.md`
- `docs/specs/vendor-personalization-layer.md`
- `docs/specs/p1-dead-zone-gating-and-surface-honesty.md`
- `docs/specs/p1-demo-continuity-and-portal-proof.md`
- `docs/specs/p1-chef-getting-started-surface-consolidation.md`
- `docs/specs/p1-finance-root-canonicalization.md`
- `docs/specs/p1-analytics-surface-ownership-and-route-truth.md`
- `docs/specs/p1-recipe-root-canonicalization-and-route-truth.md`
- `docs/specs/p1-event-scheduling-surface-ownership-and-route-truth.md`

Do not read that list as permission to ignore the control tower or to pick a random `ready` file.

### What Is Not Yet Complete

- deployed verification of the passive survey surfacing slice
- restoration of deployed host reachability so that verification can actually run
- deployed proof that tracked survey metadata lands correctly in admin
- phase-3 public hardening and admin-scale work for the survey path
- active built-but-unverified items in `docs/research/built-specs-verification-queue.md`
- multiple ready system-improvement slices that are still planning-ready but not yet implemented

---

## Immediate Next Task

If the developer does **not** explicitly assign a different slice, the next builder should execute:

- `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`

But first, if either hosted health endpoint still returns Cloudflare `530` / `1033`, treat deployment reachability as the active blocker and restore that before attempting survey-route checks.

Do not start:

- `docs/specs/p1-survey-public-hardening-and-results-scale.md`

until deploy verification is actually complete.

If the developer **does** explicitly assign a different ready-spec slice, still start with this handoff and the control tower first, then move to the assigned spec instead of pretending the survey lane owns the whole repo.

If the developer explicitly assigns `runtime-owned` OpenClaw work, branch to:

- `docs/research/current-openclaw-builder-start-handoff-2026-04-03.md`

and let that document become the queue-order authority for the runtime lane. Do not keep using this website-first handoff as if it owned the OpenClaw queue too.

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
4. confirm whether the task is:
   - the default survey verification lane
   - an explicitly assigned narrow implementation slice
   - verification-only work
   - recovery work because the baseline regressed

### Phase 1

If no narrower assignment was given, deploy and verify the current passive voluntary survey slice.

Source of truth:

- `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`

If phase 1 fails:

- fix only the blockers required for deploy verification
- rerun phase 1

If phase 1 cannot even start because hosted health still fails at the edge, log that as deployment-reachability debt instead of pretending the survey verification spec has been exercised.

### Phase 2

Only after phase 1 passes:

- execute `docs/specs/p1-survey-public-hardening-and-results-scale.md`

### Phase 3

If the developer explicitly redirects the builder into another ready-spec slice, or once the survey verification and hardening obligations are cleared, return to the control tower and follow its phase order for the next assigned domain.

That is where the builder should choose between:

- trust and dietary continuity
- costing and vendor propagation
- dead-zone honesty
- demo continuity
- already-specced consolidation lanes
- later validation, reachability, website, or platform-intelligence work

Do not invent a new top-level order outside this handoff plus the control tower.

---

## Do Not Do These Things

- do not restart survey planning from older Google Forms docs
- do not treat `docs/specs/p0-survey-passive-voluntary-surfacing.md` as the next build step; it is implementation reference now
- do not start survey hardening before deploy verification
- do not treat the survey lane as proof that no other builder-ready work exists
- do not skip the control tower when the task is broader than the default survey lane
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
4. What exact spec should be executed next if no narrower assignment is given?
5. What must happen before survey hardening can begin?
6. How should a builder branch if the developer explicitly assigns a different ready-spec slice?
7. How should a builder behave if `git status` is dirty for this active context?

This handoff now answers all seven.
