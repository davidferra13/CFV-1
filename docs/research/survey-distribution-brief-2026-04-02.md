# Survey Distribution Brief

Date: 2026-04-02
Status: phase 2 implemented locally, deployment verification pending
Canonical owner path: internal survey system, not Google Forms

---

## Current State

The two wave-1 market-research surveys already exist in the internal beta-survey system and have anonymous public routes:

- food operator survey
- private chef client survey

The owned-surface collection gap is now closed locally. Passive, voluntary survey entry points are implemented for:

- the public site via an optional discovery card
- the chef portal via an in-context operator banner
- the client portal via an in-context client banner

The public survey route family is also protected from indexing/discovery by search engines, and a survey-specific route load scenario now exists for builder verification.

This means the repo is no longer blocked on survey content or on the basic internal delivery path. The remaining work is deployment verification plus scale hardening before any broad anonymous blast.

Current deploy-verification blocker observed on 2026-04-03 04:39 EDT:

- `https://beta.cheflowhq.com/api/health/readiness?strict=1` returned Cloudflare `530` / `1033`
- `https://app.cheflowhq.com/api/health/readiness?strict=1` returned Cloudflare `530` / `1033`

That means the next blocker is not survey route logic yet. It is host reachability at the deployment edge.

Fresh local proof on the current dirty checkout:

- `npm run typecheck:app` passed
- `npm run build -- --no-lint` passed
- `node --test --import tsx "tests/unit/beta-survey-utils.test.ts"` passed
- localhost browser verification confirmed:
  - public discovery card renders with both tracked CTAs
  - chef portal renders the operator survey banner
  - client portal renders the client survey banner
- the client-shell banner regression found during verification is fixed locally:
  - market-research banners do not depend on onboarding-peripheral visibility
  - client-shell spacing no longer reuses the chef shell's negative top offset
- local proof artifacts live in `tmp/survey-verification/`

No additional repo-local feature work is currently required before deployment verification.

---

## What Is Complete In Repo

### Survey Delivery

- Active internal public survey routes exist at `/beta-survey/public/[slug]`
- Public shared links support tracked metadata such as `source`, `channel`, `launch`, and `respondent_role`
- Anonymous submissions already flow through the internal survey actions and storage path

### Passive Voluntary Surfacing

- public-site voluntary entry card implemented
- chef-portal banner wrapper implemented
- client-portal banner wrapper implemented
- same-browser repeat prompting suppressed after successful completion

### Safety And Discoverability

- survey public pages marked `noindex`
- `/beta-survey/` blocked in `robots.ts`
- survey route load scenario added for validation work

### Builder Context

- phase-2 implementation spec is current: `docs/specs/p0-survey-passive-voluntary-surfacing.md`
- phase-2 deploy verification spec is current: `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`
- phase-3 hardening spec is current: `docs/specs/p1-survey-public-hardening-and-results-scale.md`
- canonical execution order is current: `docs/research/current-builder-start-handoff-2026-04-02.md`

---

## What Remains

These items are still genuinely open:

1. deploy and verify the current passive surfacing implementation in the target environment
2. restore hosted reachability first if the Cloudflare `530` / `1033` blocker persists
3. confirm tracked query metadata appears correctly in admin after real deployed submissions
4. harden the anonymous public intake path for broader distribution
5. improve the admin results path so it does not assume modest response volume
6. run a safe submission-burst test in a non-production environment
7. finalize outreach operations only after the above are verified

Mass outreach should not start until items 1 through 5 are complete.

Immediate next builder step:

- restore hosted reachability if the deployment edge is still failing, then execute `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`
- do not start `docs/specs/p1-survey-public-hardening-and-results-scale.md` until that deploy-verification phase passes

---

## Readiness Verdict

### For Controlled Or Warm Launches

Blocked until hosted reachability is restored and deployed verification actually passes.

### For Tens Or Hundreds Of Thousands Of Anonymous Visitors

Not yet ready. The current system still needs the phase-3 hardening work before a broad blast is defensible.

---

## Canonical Next Order

1. Preserve the current internal survey system as the only delivery path.
2. Deploy and verify the current phase-2 passive surfacing slice.
3. Fix any blockers discovered in deployment verification before advancing.
4. Execute the phase-3 hardening/admin-scale work.
5. Re-verify with load and submission-path testing.
6. Only then move into large-scale outreach.

---

## Canonical References

- `docs/research/current-builder-start-handoff-2026-04-02.md`
- `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`
- `docs/specs/p0-survey-passive-voluntary-surfacing.md`
- `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`
- `docs/specs/p1-survey-public-hardening-and-results-scale.md`
- `docs/research/survey-launch-checklist-2026-04-02.md`
- `docs/research/survey-wave-1-analysis-codebook-2026-04-02.md`
- `docs/build-state.md`
