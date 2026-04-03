# Survey Readiness And Outreach Audit

Date: 2026-04-02
Scope: internal survey system, passive owned-surface collection, anonymous public intake, and pre-outreach readiness
Status: phase 2 implemented locally; phase 3 still open

---

## Executive Verdict

The current survey program is materially closer to launch than it was earlier in the day.

What is now true:

- survey content is not the bottleneck
- the internal public survey route exists
- passive voluntary surfacing now exists locally across public, chef, and client surfaces
- same-browser completion suppression exists for anonymous public submissions

What is not yet true:

- the deployed environment has not yet verified this phase-2 slice
- the currently targeted hosted environments were not reachable at the edge during the latest attempt
- the anonymous intake path is not yet hardened enough for a very large public blast
- the admin review path still assumes a modest response set

The correct conclusion is that controlled launch readiness is close in product terms, but currently blocked operationally by deployment reachability before the survey verification phase can even run.

Fresh local proof on the current dirty checkout:

- `npm run typecheck:app` passed
- `npm run build -- --no-lint` passed
- `node --test --import tsx "tests/unit/beta-survey-utils.test.ts"` passed

No further repo-local implementation work is currently required before deployment verification.

Latest external blocker observed on 2026-04-03 04:39 EDT:

- `https://beta.cheflowhq.com/api/health/readiness?strict=1` returned Cloudflare `530` / `1033`
- `https://app.cheflowhq.com/api/health/readiness?strict=1` returned Cloudflare `530` / `1033`
- `.auth/chef-beta-verified.json` and `.auth/client-beta-verified.json` exist for beta once the host is reachable again
- `.auth/admin.json` is empty, so admin verification still needs a fresh authenticated session after reachability is restored

---

## Verified Evidence

### Internal Survey Path

- public survey route: `app/beta-survey/public/[slug]/page.tsx`
- anonymous submission path: `lib/beta-survey/actions.ts`

### Passive Voluntary Surfacing

- chef/client wrapper: `components/beta-survey/market-research-banner-wrapper.tsx`
- public entry card: `components/beta-survey/public-market-research-entry.tsx`
- layout mounts:
  - `app/(chef)/layout.tsx`
  - `app/(client)/layout.tsx`
  - `app/(public)/layout.tsx`

### Repeat-Prompt Suppression

- browser marker helpers: `lib/beta-survey/survey-presence.ts`
- banner suppression: `components/beta-survey/beta-survey-banner.tsx`
- local completion marker: `components/beta-survey/beta-survey-form.tsx`
- server completion cookie: `lib/beta-survey/actions.ts`

### Search And Crawl Protection

- route `noindex`: `app/beta-survey/public/[slug]/page.tsx`
- robots block: `app/robots.ts`

### Verification Assets

- public route load scenario: `tests/load/scenarios/08-public-surveys.js`
- survey unit test: `tests/unit/beta-survey-utils.test.ts`
- local browser proof artifacts: `tmp/survey-verification/`

### Local Proof Now In Hand

- `npm run typecheck:app`
  - passes
- `npm run build -- --no-lint`
  - passes
- `node --test --import tsx "tests/unit/beta-survey-utils.test.ts"`
  - passes
- localhost browser verification confirms:
  - public discovery card renders with both tracked CTAs
  - chef portal renders the operator survey banner
  - client portal renders the client survey banner
- the client-shell banner regression found during verification is fixed locally:
  - market-research banners no longer depend on onboarding-peripheral visibility
  - client-shell banner spacing no longer reuses the chef shell's negative top offset

---

## What Is Ready

### Ready Or Nearly Ready

- internal survey definitions and public survey routes
- tracked public links for owned-surface attribution
- passive voluntary surfacing on owned surfaces
- anonymous completion suppression at the browser level
- route-level crawl protection

### Still Open

- deployed-environment verification
- deployed host reachability, which currently fails before app-level survey checks
- distributed abuse boundary
- safe write-path burst testing
- admin results scaling
- outreach sender/domain operations

---

## Scale Risk Assessment

If the survey links were blasted to a very large anonymous audience right now, the main risks would be:

1. in-memory rate limiting is still too weak for distributed abuse
2. public submissions still write synchronously on request
3. no proof yet exists for the write path under sustained burst conditions
4. admin results still fetch and render too much data for large response sets
5. deployment-specific behavior of the new passive surfacing slice is not yet verified

Because of that, the current stack should be treated as suitable for controlled launch after deployment verification, but not yet suitable for a massive anonymous blast.

---

## Outreach Position

Do not use deceptive or throwaway outreach identities.

The smart professional path is:

- keep the product and transactional domain clean
- use a branded research or outreach subdomain for survey campaigns
- separate research sending reputation from core product mail
- warm the sender gradually
- do not scale send volume until complaint and completion signals are healthy

This remains an operations decision after the product-side hardening work is complete.

---

## Dependency-Aware Next Steps

1. Restore hosted reachability if the Cloudflare `530` / `1033` blocker persists.
2. Deploy the current passive voluntary surfacing implementation.
3. Verify real submissions from public, chef, and client surfaces.
4. If deployment verification fails, fix those blockers before advancing.
5. Execute `docs/specs/p1-survey-public-hardening-and-results-scale.md`.
6. Re-run route and submission-path validation in a safe environment.
7. Then finalize outreach operations and distribution scale.

Immediate next spec:

- `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`

---

## Non-Goals For This Slice

- do not create a second survey subsystem
- do not move back to Google Forms as the primary path
- do not make survey participation mandatory
- do not broaden scope into generic marketing automation
- do not claim mass-blast readiness before hard evidence exists
