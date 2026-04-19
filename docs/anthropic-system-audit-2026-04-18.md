# Anthropic System Audit Report

Date: 2026-04-18
Audience: Anthropic builders and maintainers
Scope: ChefFlow V1 repository audit based on code inspection, repo docs, local logs, and targeted unit tests

## Executive Summary

This repository has a real architectural spine now. The system is not just described as a multi-surface platform, it has runtime surface contracts, a distinct admin shell, persisted admin RBAC, and meaningful auth guard coverage. The repo is materially more structured than a "large Next app with ad hoc routes."

The main current problem is not the surface model. It is operational coherence. OpenClaw's wrapper-level sync health is currently red while downstream price propagation appears to have completed during the same day. That means the repo currently has at least two competing truths about whether price intelligence is healthy. Anthropic should treat that as the top system-integrity issue.

The second problem is trust in the verification layer. The targeted contract test run passed 76 of 82 tests, but the 6 failures are a mix of real drift, stale assumptions, and outdated file-path references. That means CI-style signals exist, but they are not yet clean enough to be treated as authoritative without human interpretation.

I did not run a fresh production build in this audit. The user explicitly framed building as Anthropic-owned work. I relied on the current local evidence instead:

- `docs/build-state.md` reports `npx tsc --noEmit --skipLibCheck` and `npm run build -- --no-lint` as green on 2026-04-18.
- The working tree is currently dirty.
- I ran targeted boundary tests only, not a full build.

## Method

I audited the repo using four evidence sources:

1. Canonical architecture and system docs:
   - `docs/system-architecture.md`
   - `docs/build-state.md`
   - `project-map/infrastructure/openclaw.md`

2. Runtime enforcement code:
   - `lib/surfaces/runtime-surface-contract.ts`
   - `middleware.ts`
   - `lib/auth/request-auth-context.ts`
   - `lib/auth/admin.ts`
   - `lib/auth/admin-access.ts`
   - `lib/auth/get-user.ts`

3. Operational OpenClaw status surfaces:
   - `docs/sync-status.json`
   - `logs/openclaw-auto-sync.log`
   - `logs/ingredient-price-sync.log`
   - `app/api/sentinel/sync-status/route.ts`
   - `scripts/auto-sync-openclaw.mjs`
   - `scripts/openclaw-pull/sync-all.mjs`

4. Targeted tests:
   - `node --test --import tsx tests/unit/runtime-surface-contract.test.ts tests/unit/admin-nav-boundary.test.ts tests/unit/middleware.routing.test.ts tests/unit/auth.roles.test.ts tests/unit/auth.tenant-isolation.test.ts tests/unit/public-surface-contract.test.ts`

Result: 76 passing tests, 6 failing tests.

## Question Set And Answers

### Q1. Does the repo define one canonical system model instead of letting routes define reality?

Answer: Yes, mostly.

Assessment: `SOLID`

Why:

- `docs/system-architecture.md` defines the canonical surfaces and roles.
- `lib/surfaces/runtime-surface-contract.ts` turns that model into machine-readable contracts.
- `tests/unit/runtime-surface-contract.test.ts` passed in this audit.

Conclusion:

Anthropic can treat the surface model as real repo law, not just prose.

### Q2. Is admin structurally separated from chef, or is it still a chef-flavored control plane?

Answer: Mostly separated now.

Assessment: `ACCEPTABLE`

Why:

- `app/(admin)/layout.tsx` uses `requireAdmin()` and imports `AdminSidebar`, `AdminMobileNav`, and `AdminMainContent` from `components/navigation/admin-shell`.
- `tests/unit/runtime-surface-contract.test.ts` passed its admin-shell checks.
- `tests/unit/admin-nav-boundary.test.ts` passed most checks and confirmed chef nav no longer exposes `/admin` links.

Remaining gap:

- One admin-nav parity test failed because `components/navigation/admin-nav-config.ts` does not include `/admin/cannabis`, even though the route exists and the comment says the feature is intentionally hidden while disabled.

Conclusion:

The shell boundary is real. The remaining issue is nav governance, not shell collapse.

### Q3. Is request auth propagation fail-closed and protected against spoofed headers?

Answer: Yes for the current propagated model.

Assessment: `SOLID`

Why:

- `middleware.ts` strips internal headers before re-setting trusted context.
- `lib/auth/request-auth-context.ts` requires the middleware-set `x-pathname` sentinel before trusting auth headers.
- Public and skip-auth paths intentionally strip internal request headers.

Conclusion:

The header-spoofing defense is materially better than a naive "trust x-cf-role if present" pattern.

### Q4. Is role enforcement unified across all roles at the edge?

Answer: No, not fully.

Assessment: `RISK`

Why:

- `middleware.ts` can redirect for chef, client, staff, and partner path families.
- But `lib/auth/request-auth-context.ts` only propagates `chef | client`.
- `lib/auth/get-user.ts` still performs separate DB-backed role resolution for staff and partner.
- Admin is resolved via `requireAdmin()` and `platform_admins`, not through the shared request auth context.

Consequence:

The system has two layers of truth:

- route-family awareness in middleware
- authoritative role resolution deeper in server code

That works, but it is structurally weaker than a single unified auth context for all roles.

Conclusion:

Anthropic should treat this as a real cross-cutting architecture item, not a cosmetic cleanup.

### Q5. Is tenant isolation derived from session/server state rather than client input?

Answer: Mostly yes.

Assessment: `ACCEPTABLE`

Why:

- `requireChef()`, `requireClient()`, `requireStaff()`, and `requirePartner()` derive identity from session and database state.
- Chef tenant context comes from the chef entity itself.
- Client tenant context comes from the linked client record.
- Staff and partner tenant context comes from `staff_members.chef_id` and `referral_partners.tenant_id`.

Important nuance:

One static test failed and reported `lib/auth/actions.ts` and `lib/sharing/actions.ts` as tenant-isolation violations. After inspection, those hits are false positives from internal helper parameters like `recordAccountCreatedEvent(input)` and internal non-request helpers that receive tenant context from already-authorized server logic.

Conclusion:

The tenant model looks materially sound, but the test that validates it is too blunt.

### Q6. Is admin RBAC persisted in the database instead of environment-only allowlists?

Answer: Yes.

Assessment: `SOLID`

Why:

- `lib/auth/admin-access.ts` queries `platform_admins`.
- `database/migrations/20260401000065_platform_admins.sql` defines the table and policies.
- `lib/auth/admin.ts` consumes the persisted access layer and does not authorize via `ADMIN_EMAILS`.

Why a test still failed:

- The test expected this contract but partially asserted it through a brittle string check and a stale assumption path. The code itself is using persisted RBAC.

Conclusion:

Anthropic should trust the direction of the RBAC model, but should repair the test so it verifies the abstraction that actually exists.

### Q7. Is the public-surface contract synchronized with the public navigation that actually ships?

Answer: No.

Assessment: `GAP`

Why:

- `lib/public/public-surface-config.ts` now includes `PUBLIC_DINNER_CIRCLES_ENTRY` mapped to `/hub`.
- `components/navigation/public-nav-config.ts` includes `/hub` and `/faq` in the primary consumer nav group.
- `tests/unit/public-surface-contract.test.ts` still expects the older 5-link hierarchy and therefore failed twice.

Consequence:

The runtime public story changed, but the contract tests and contract expectations were not updated with it.

Conclusion:

This is not a security issue, but it does weaken trust in the repo's contract tests.

### Q8. Can the current build state be treated as verified by this audit?

Answer: No. It can only be treated as claimed green by prior work.

Assessment: `ACCEPTABLE`

Why:

- `docs/build-state.md` says typecheck and build were green on 2026-04-18 and names Opus as the verifying builder.
- This audit did not run a fresh production build.
- The working tree is dirty, so the current checkout is not equivalent to a clean verified commit.

Conclusion:

Anthropic should not assume "green" means "green right now on this dirty checkout." It means "last reported green baseline exists and must be revalidated."

### Q9. Is OpenClaw currently operationally healthy according to the repo's own status surfaces?

Answer: No.

Assessment: `RISK`

Why:

- `docs/sync-status.json` currently says:
  - `status: "failed"`
  - `consecutive_failures: 9`
  - `last_sync: 2026-04-18T23:11:00.084Z`
- `logs/openclaw-auto-sync.log` shows repeated full-sync failures across 2026-04-15 through 2026-04-18.

Conclusion:

Anthropic should assume the wrapper-level OpenClaw sync is unhealthy until proven otherwise.

### Q10. Does the repo present one coherent truth about OpenClaw freshness and success?

Answer: No.

Assessment: `RISK`

Why:

- `logs/ingredient-price-sync.log` shows a successful downstream price propagation completion on 2026-04-18 at 19:18:21.
- `app/api/sentinel/sync-status/route.ts` derives freshness from `ingredient_price_history`, not from the wrapper daemon's file-based status.
- `scripts/auto-sync-openclaw.mjs` writes `docs/sync-status.json` purely from the wrapper script exit outcome.
- `scripts/auto-sync-openclaw.mjs` stores only a generic `Command failed: node "...sync-all.mjs"` message, which discards the failing step.

Consequence:

At least three different views can disagree:

- wrapper daemon status
- database freshness
- downstream price propagation logs

Conclusion:

This is the most important system-integrity issue in the repo today.

### Q11. Are the current contract tests trustworthy enough to serve as a clean gate?

Answer: Partially.

Assessment: `GAP`

Why:

- 76 of 82 targeted tests passed.
- The 6 failures split into different classes:
  - 1 likely real parity issue: admin nav missing `/admin/cannabis`
  - 2 product-contract drift issues: public nav now includes Dinner Circles and FAQ, tests do not
  - 2 stale static-analysis issues: false positives on internal helper `tenantId` usage and stale admin-access assertion shape
  - 1 stale filesystem path issue: test looks for `db/migrations`, repo uses `database/migrations`

Conclusion:

The tests are useful, but not clean enough to be treated as self-interpreting truth.

## Findings

### Finding 1. OpenClaw health is ambiguous and currently not trustworthy

Severity: High

Evidence:

- `docs/sync-status.json`
- `logs/openclaw-auto-sync.log`
- `logs/ingredient-price-sync.log`
- `app/api/sentinel/sync-status/route.ts`
- `scripts/auto-sync-openclaw.mjs`

Details:

The wrapper daemon reports repeated failure, while downstream ingredient price propagation logged a successful completion on the same day. The repo therefore cannot currently answer a simple question with one source of truth:

"Is price intelligence healthy right now?"

That is a system-integrity problem, not just a monitoring nicety.

### Finding 2. Role enforcement is directionally strong but still split between edge and deep server guards

Severity: Medium

Evidence:

- `middleware.ts`
- `lib/auth/request-auth-context.ts`
- `lib/auth/get-user.ts`
- `lib/auth/admin.ts`

Details:

Chef and client roles are propagated through the shared request auth context. Staff, partner, and admin are not. That means middleware can classify and redirect routes for those families, but deeper server code still owns authoritative resolution.

This is workable, but it leaves the system with a split-brain auth model.

### Finding 3. Contract tests are drifting away from the architecture they are supposed to protect

Severity: Medium

Evidence:

- `tests/unit/public-surface-contract.test.ts`
- `tests/unit/auth.tenant-isolation.test.ts`
- `tests/unit/admin-nav-boundary.test.ts`
- current runtime files cited above

Details:

Several failures are not product regressions. They are tests that no longer reflect the current abstractions, paths, or public IA. That makes every future failure harder to interpret quickly, which slows Anthropic down and weakens trust in test output.

### Finding 4. Admin shell separation is real, but admin-nav governance is incomplete

Severity: Low

Evidence:

- `app/(admin)/layout.tsx`
- `components/navigation/admin-nav-config.ts`
- `tests/unit/admin-nav-boundary.test.ts`

Details:

The admin shell is its own runtime surface now. That is good. But there is still ambiguity about whether every existing admin route must appear in nav, and how intentionally hidden routes should be declared.

### Finding 5. The current build state is documented, but this checkout is not freshly re-verified

Severity: Medium

Evidence:

- `docs/build-state.md`
- current dirty worktree

Details:

The repo has a build-state discipline, which is good. But Anthropic should not confuse "documented green baseline" with "this exact working tree is green."

## Recommendations For Anthropic

### 1. Re-establish a clean, Anthropic-owned baseline before feature work

Priority: P0

Do this first:

- Snapshot the current dirty state.
- Re-run the exact preflight Anthropic wants to trust.
- Update the build-state only from that verified state.

Minimum suggested preflight:

- targeted auth/surface tests
- `npm run typecheck:app`
- `npm.cmd run build -- --no-lint`

Do not treat this audit as a build verification.

### 2. Collapse OpenClaw health into one authoritative, step-aware status model

Priority: P0

Replace the current generic wrapper status with a structured status payload that captures:

- run id
- started_at
- completed_at
- last_success_at
- step name
- step status
- partial_success boolean
- exit code
- stderr/stdout excerpt
- downstream data freshness

Right now the repo can tell you that `sync-all.mjs` failed, but not which step failed or whether price propagation already succeeded before failure.

### 3. Capture real failure detail in `scripts/auto-sync-openclaw.mjs`

Priority: P0

Today the daemon records only:

- `Command failed: node "...sync-all.mjs"`

That is operationally weak. Anthropic should capture step-level output and persist the root-cause excerpt so the next builder is not blind.

### 4. Unify request auth context across all role families

Priority: P1

Extend the shared propagated auth context to represent:

- `chef`
- `client`
- `staff`
- `partner`
- `admin` or a clearly separate privileged context

The goal is not to remove server-side guards. The goal is to make middleware, server helpers, and runtime contracts operate from the same role vocabulary.

### 5. Repair the contract test suite before adding more contract tests

Priority: P1

Specifically:

- update `tests/unit/public-surface-contract.test.ts` to match the current public IA
- update `tests/unit/auth.tenant-isolation.test.ts` so internal helper parameters do not read as request-derived tenant violations
- fix the stale `db/migrations` path to `database/migrations`
- make the admin RBAC test assert through the current abstraction, not old assumptions
- explicitly encode whether hidden admin routes must or must not appear in `admin-nav-config.ts`

Anthropic should optimize for fewer, cleaner contract tests over more noisy ones.

### 6. Create an explicit "hidden admin route" policy

Priority: P2

Every admin route should be one of:

- visible in admin nav
- deliberately hidden with a named flag/reason
- internal utility route, not a navigable destination

That policy should live in code, not just comments.

### 7. Canonicalize refresh cadence in code or config, not scattered docs/comments

Priority: P2

OpenClaw refresh cadence is described in multiple places across scripts and docs. Anthropic should make one code-level source of truth for:

- full sync cadence
- delta sync cadence
- public-facing freshness semantics
- operator-facing failure thresholds

Until that exists, user-facing promises about exact next refresh time should be treated as untrusted.

## Recommended Anthropic Hand-Off Position

If Anthropic takes over from this audit, the correct starting assumption is:

- architecture: mostly sound
- auth model: improving, but not fully unified
- test suite: useful but partially stale
- build baseline: documented, not freshly verified by this audit
- OpenClaw health: operationally ambiguous and currently the top integrity issue

That means the first Anthropic lane should be:

1. re-verify baseline
2. repair health observability
3. clean contract tests
4. only then continue with new feature work

## Appendix: Targeted Test Result

Command run:

```powershell
node --test --import tsx tests/unit/runtime-surface-contract.test.ts tests/unit/admin-nav-boundary.test.ts tests/unit/middleware.routing.test.ts tests/unit/auth.roles.test.ts tests/unit/auth.tenant-isolation.test.ts tests/unit/public-surface-contract.test.ts
```

Result:

- 82 tests
- 76 passed
- 6 failed

Failure summary:

1. `tests/unit/admin-nav-boundary.test.ts`
   - expected `/admin/cannabis` in admin nav config
2. `tests/unit/auth.tenant-isolation.test.ts`
   - false-positive static hits in `lib/auth/actions.ts` and `lib/sharing/actions.ts`
3. `tests/unit/auth.tenant-isolation.test.ts`
   - stale admin-RBAC assertion shape
4. `tests/unit/auth.tenant-isolation.test.ts`
   - stale migrations path: `db/migrations` vs `database/migrations`
5. `tests/unit/public-surface-contract.test.ts`
   - public nav expectation drift
6. `tests/unit/public-surface-contract.test.ts`
   - footer expectation drift
