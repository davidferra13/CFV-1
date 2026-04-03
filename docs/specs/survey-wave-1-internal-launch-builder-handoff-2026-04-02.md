# Spec: Survey Wave 1 Internal Launch Builder Handoff

> **Status:** current
> **Priority:** active handoff
> **Depends on:** current internal beta-survey system and the seeded market-research survey definitions
> **Execution model:** preserve what exists, verify it, then harden it
> **Execution note:** this is the survey-specific branch under the current builder-start handoff and the system-improvement control tower, not the repo-wide sequencing parent
> **Immediate next executable step:** `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`

## Read In This Order

1. `docs/build-state.md`
2. `docs/research/current-builder-start-handoff-2026-04-02.md`
3. `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`
4. `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`
5. `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`
6. `docs/specs/p0-survey-passive-voluntary-surfacing.md`
7. `docs/specs/p1-survey-public-hardening-and-results-scale.md`

If the builder needs to touch repo-wide build health beyond the survey slice, also read:

- `docs/research/current-build-recovery-handoff-2026-04-02.md`

If the builder needs outreach or readiness context after product verification planning, then read:

- `docs/research/survey-distribution-brief-2026-04-02.md`
- `docs/research/survey-readiness-and-outreach-audit-2026-04-02.md`

## Current Next Action

The next builder should not add more repo-local survey code first.

Do this in order:

1. deploy the current tree that already contains the passive voluntary survey slice
2. restore deployment reachability first if either hosted health endpoint still returns Cloudflare `530` / `1033`
3. execute `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`
4. fix only the defects that block that phase from passing, then rerun it
5. only after deploy verification passes, execute `docs/specs/p1-survey-public-hardening-and-results-scale.md`
6. only after phases 1 and 2 are complete, begin broader outreach work

This ordering is grounded in the current checkout: `npm run typecheck:app`, `npm run build -- --no-lint`, and `node --test --import tsx "tests/unit/beta-survey-utils.test.ts"` all pass locally.

## Timeline

| Event                                                     | Date       | Agent/Session | Commit  |
| --------------------------------------------------------- | ---------- | ------------- | ------- |
| Internal public survey path established                   | 2026-04-02 | Codex         | pending |
| Public route crawl protection + route load scenario added | 2026-04-02 | Codex         | pending |
| Passive voluntary surfacing implemented locally           | 2026-04-02 | Codex         | pending |
| Current handoff rebuilt after doc-state recovery          | 2026-04-02 | Codex         | pending |

---

## Builder Intent

This handoff exists so the next builder does not have to reconstruct the survey thread from scattered docs.

The current system already has:

- active internal market-research survey definitions
- anonymous public survey routes by slug
- tracked owned-surface links
- passive voluntary surfacing implemented locally across public, chef, and client shells

The next builder must not start over. The correct posture is to preserve the implemented path, verify it in deployment, then move to the next dependency layer.

Older Google Forms docs remain in the repo only as fallback reference. They are not the active execution path.

This handoff is the entry document. The next builder should not choose between survey specs by intuition. Start with the deploy-verification spec named above, and only move forward if that phase is actually complete.

This handoff describes the current local working tree, which is still dirty. If the next builder is launched with the strict builder prompt from `docs/specs/README.md`, expect pre-flight to stop on `git status` until the current state is committed or otherwise intentionally preserved.

If the developer explicitly assigns a non-survey slice, this handoff stops being the branch owner and the builder must return to `docs/research/current-builder-start-handoff-2026-04-02.md` plus `docs/research/foundations/2026-04-03-system-improvement-control-tower.md` before choosing the next spec.

---

## Verified Local State

### Core Public Survey Path

- `app/beta-survey/public/[slug]/page.tsx`
- `lib/beta-survey/actions.ts`
- `lib/beta-survey/survey-cache.ts`
- `lib/beta-survey/survey-utils.ts`

### Passive Voluntary Surfacing

- `components/beta-survey/market-research-banner-wrapper.tsx`
- `components/beta-survey/public-market-research-entry.tsx`
- `app/(chef)/layout.tsx`
- `app/(client)/layout.tsx`
- `app/(public)/layout.tsx`

### Same-Browser Completion Suppression

- `lib/beta-survey/survey-presence.ts`
- `components/beta-survey/beta-survey-banner.tsx`
- `components/beta-survey/beta-survey-form.tsx`
- `lib/beta-survey/actions.ts`

### Crawl Protection And Verification Assets

- `app/robots.ts`
- `tests/load/scenarios/08-public-surveys.js`
- `tests/unit/beta-survey-utils.test.ts`

### Foundation Caveat

- `docs/build-state.md` now reports both `npm run typecheck:app` and `npm run build -- --no-lint` as green on the current dirty checkout
- the survey passive-surfacing slice now includes build-safe cached survey-definition reads so public static generation does not fan out uncached survey DB queries across every public page
- current survey blockers are deployment verification, live submission proof, and phase-3 hardening, not repo-wide baseline recovery

---

## What Has Already Been Verified

Local targeted verification completed:

- eslint passed on the passive-surfacing runtime files
- `node --test --import tsx "tests/unit/beta-survey-utils.test.ts"` passed
- `npm run typecheck:app` passed
- `npm run build -- --no-lint` passed

No further repo-local implementation work is currently justified for this slice unless deployed verification finds a defect.

- fresh localhost browser verification confirmed:
  - the public discovery card renders with both owned-surface tracked links
  - the chef portal renders the operator survey banner
  - the client portal renders the client survey banner
- the client-shell regression discovered during verification is fixed locally:
  - market-research banners no longer depend on onboarding-peripheral visibility
  - client-shell banner spacing no longer reuses the chef shell's negative top offset
- local verification artifacts were captured under:
  - `tmp/survey-verification/public-home-passive-entry.png`
  - `tmp/survey-verification/chef-portal-banner-viewport.png`
  - `tmp/survey-verification/client-portal-banner-viewport.png`

Not yet verified:

- deployed-environment rendering of the public card and portal banners
- real deployed submissions from each owned surface
- admin visibility of tracked metadata after deployed submissions
- large-volume anonymous intake behavior
- current hosted reachability itself, because on 2026-04-03 04:39 EDT both `https://beta.cheflowhq.com/api/health/readiness?strict=1` and `https://app.cheflowhq.com/api/health/readiness?strict=1` returned Cloudflare `530` / `1033` before any app-level survey checks
- admin browser state is not pre-provisioned in `.auth/admin.json`, so admin verification still needs a fresh authenticated session once the host is back

---

## Correct Execution Order

### Phase 1: Preserve And Verify The Existing Path

Do this first:

1. Deploy the current internal survey implementation.
2. Confirm the hosted environment is reachable; as of 2026-04-03 04:39 EDT both beta and production readiness checks were failing at Cloudflare with `530` / `1033`.
3. Execute `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`.
4. If verification fails, fix only the blockers required to make this phase pass, then rerun the same phase.

Why first:

- the phase-2 runtime slice already exists locally
- deployment verification is the prerequisite for any further hardening or outreach confidence

### Phase 2: Continue With Hardening, Not Re-architecture

Only after phase 1 passes, execute:

- `docs/specs/p1-survey-public-hardening-and-results-scale.md`

That phase is responsible for:

- distributed abuse controls
- safe write-path burst testing
- admin results pagination/scale work
- anomaly logging and broader anonymous-intake defensibility

### Phase 3: Outreach Operations

Only after phases 1 and 2:

- finalize the outreach sender/domain plan
- generate the real distribution links
- launch controlled outreach waves

### Post-Survey Or Explicit Reassignment

If the survey lane is no longer the assigned branch, return to:

- `docs/research/current-builder-start-handoff-2026-04-02.md`
- `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`

Then select the next ready-spec slice from the broader system order instead of treating this survey handoff as the repo-wide queue owner.

---

## Important Implementation Notes

### Anonymous Completion Is Browser-Scoped

The market-research surveys are anonymous public submissions. Because of that, chef/client users taking the public route do not create an authenticated `auth_user_id` relationship for completion checks.

Current suppression behavior intentionally uses:

- a server-set completion cookie
- a browser `localStorage` completion marker

This prevents repeated prompting in the same browser without weakening the anonymous model.

### Do Not Replace The Existing Banner System

The existing beta banner system is broader than market research. The new market-research wrapper is intentionally narrow so phase 2 can coexist with earlier survey flows.

### Do Not Reintroduce Google Forms

The primary path is now the internal survey system. External form tools are not the operating model for wave 1.

---

## Builder Do Nots

- do not create a second public survey delivery path
- do not make survey participation mandatory
- do not assume mass-scale readiness from local-only checks
- do not weaken CAPTCHA or public abuse protections for convenience
- do not touch unrelated repo build issues as part of this slice

---

## Remaining Work After This Handoff

Open items are now cleanly separated:

1. deployment verification of the implemented passive-surfacing slice
2. phase-3 hardening and admin-scale work
3. live outreach operations after the product path is verified and hardened

If the next builder needs a one-line rule: prove the deployed phase-2 path first, then harden it for scale, then distribute it.

## One-Line Builder Start

If a fresh builder asks "what do I do next?", the answer is:

1. read `docs/build-state.md`
2. read `docs/research/current-builder-start-handoff-2026-04-02.md`
3. read `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`
4. read this handoff
5. execute `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`
6. do not start `docs/specs/p1-survey-public-hardening-and-results-scale.md` until phase 1 is truly passed

If those are still open, the correct close-out phrase is not "everything is done, end-to-end".
