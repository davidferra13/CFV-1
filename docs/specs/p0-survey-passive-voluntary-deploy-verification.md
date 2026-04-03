# Spec: Survey Passive Voluntary Deploy Verification

> **Status:** ready
> **Priority:** P0 (blocking before phase 3)
> **Depends on:** `docs/research/current-builder-start-handoff-2026-04-02.md`, `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`, `docs/specs/p0-survey-passive-voluntary-surfacing.md`
> **Estimated complexity:** small to medium

## Timeline

| Event                                                    | Date                 | Agent/Session | Commit  |
| -------------------------------------------------------- | -------------------- | ------------- | ------- |
| Created                                                  | 2026-04-02           | Codex         | pending |
| Deploy verification attempt blocked on host reachability | 2026-04-03 04:40 EDT | Codex         | pending |

---

## Why This Exists

The passive voluntary survey slice is implemented locally, but deployment verification is still open. Right now that phase exists only as bullets inside the handoff. This spec turns those bullets into an explicit acceptance path so the next builder can verify the deployed behavior without guessing what counts as done.

This is the correct next step because:

- phase 2 runtime work already exists locally
- phase 3 hardening should not start until the current slice is proven in deployment
- the survey program should not move into broad distribution on unverified passive-surface behavior

---

## Builder Goal

Prove that the currently implemented passive voluntary survey path works correctly in the deployed environment across:

- public site
- chef portal
- client portal
- admin review of tracked metadata

The result of this phase should be a clear binary outcome:

- either the deployed path is verified and phase 3 can start
- or concrete defects/blockers are identified and fixed before advancing

---

## Prerequisites

Before starting this phase, confirm:

1. the current passive-surfacing code is present locally
2. the target deployment environment is reachable
3. the deployed environment uses the correct survey definitions and active slugs
4. Turnstile configuration for the deployed hostname is valid
5. you have access to:
   - one chef account
   - one client account
   - admin survey results view

If any of those are missing, stop and log that as a blocker rather than pretending verification occurred.

### Current Blocker Snapshot

Observed on 2026-04-03 04:39 EDT:

- `https://beta.cheflowhq.com/api/health/readiness?strict=1` returned Cloudflare `530` / `1033`
- `https://app.cheflowhq.com/api/health/readiness?strict=1` returned Cloudflare `530` / `1033`
- `.auth/chef-beta-verified.json` and `.auth/client-beta-verified.json` exist for beta verification once the host is reachable again
- `.auth/admin.json` is currently empty, so admin verification will require a fresh authenticated browser state or manual sign-in even after host reachability is restored

This means the current blocker is outside the app before survey-route checks even begin. Re-run the health checks first; do not claim any step below as executed while the host still fails at the edge.

---

## Canonical Test Targets

### Public Survey Routes

- `/beta-survey/public/food-operator-wave-1`
- `/beta-survey/public/private-chef-client-wave-1`

### Owned-Surface Entrypoints

- public-site voluntary survey card
- chef-portal operator banner
- client-portal client banner

### Admin Review Surface

- survey results page for each active market-research survey

---

## Exact Verification Sequence

### Step 1: Baseline Route Reachability

1. Open both public survey slugs in deployment.
2. Confirm each route returns successfully and renders the expected survey.
3. Confirm survey pages are still `noindex`.
4. Confirm the deployed `robots.txt` still disallows `/beta-survey/`.

Fail this step if:

- either slug 404s, redirects incorrectly, or renders the wrong survey
- crawl protections are missing

### Step 2: Public-Site Voluntary Entry

1. Visit the intended deployed public surface.
2. Confirm the optional survey callout appears.
3. Confirm it is non-blocking and not modal.
4. Click each CTA and confirm:
   - the correct public survey opens
   - the URL contains the expected tracked params

Expected tracked params:

- `source=owned_surface`
- `channel=public_site`
- `launch=public_discover_card`
- `respondent_role=food_operator` or `consumer`

### Step 3: Chef Portal Banner

1. Sign in as a chef who has not submitted the operator survey in that browser.
2. Confirm the operator banner appears.
3. Confirm it links to the operator survey slug with:
   - `source=owned_surface`
   - `channel=chef_portal`
   - `launch=in_app_banner`
   - `respondent_role=food_operator`

### Step 4: Client Portal Banner

1. Sign in as a client who has not submitted the client survey in that browser.
2. Confirm the client banner appears.
3. Confirm it links to the client survey slug with:
   - `source=owned_surface`
   - `channel=client_portal`
   - `launch=in_app_banner`
   - `respondent_role=consumer`

### Step 5: Same-Browser Completion Suppression

1. Submit the operator survey from the same browser used for the chef portal check.
2. Revisit the chef portal and confirm the operator banner no longer appears.
3. Submit the client survey from the same browser used for the client portal check.
4. Revisit the client portal and confirm the client banner no longer appears.
5. Submit one public-site survey in the same browser.
6. Revisit the public surface and confirm the matching CTA is suppressed.

This phase is specifically verifying browser-scoped suppression, not cross-browser or account-global suppression.

### Step 6: Admin Tracking Verification

1. Open admin survey results for each active market-research survey.
2. Confirm the new deployed responses were stored.
3. Confirm tracked metadata appears correctly:
   - `source`
   - `channel`
   - `launch`
   - `respondent_role`
4. Confirm the results surface remains usable for this small verification batch.

---

## Evidence To Capture

Record the following:

- deployed base URL used
- verification date/time
- which survey slugs were tested
- which user accounts were used for chef/client verification
- whether each step passed or failed
- any screenshots, admin evidence, or response IDs if available

Update these docs after completion:

- `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`
- `docs/specs/p0-survey-passive-voluntary-surfacing.md`
- `docs/research/survey-distribution-brief-2026-04-02.md`
- `docs/research/survey-readiness-and-outreach-audit-2026-04-02.md`
- `docs/session-log.md`

---

## Completion Criteria

This phase is complete only if all of the following are true:

- both public survey routes render correctly in deployment
- the public voluntary entry works with correct tracked params
- chef and client banners render only in the correct surfaces
- same-browser completion suppression works after submit
- admin shows the expected tracked metadata from deployed submissions
- any issues found are either fixed or explicitly logged as blockers

If any item above is still open, phase 3 does not begin.

---

## Out Of Scope

- distributed rate limiting
- anomaly logging
- admin pagination/scale redesign
- outreach sender-domain operations
- survey question changes

Those belong to later phases, primarily `docs/specs/p1-survey-public-hardening-and-results-scale.md`.

---

## Notes For Builder Agent

- Do not skip directly to hardening because the code "looks right" locally.
- Do not treat local-only verification as deployment proof.
- Do not broaden this into repo-wide build recovery unless explicitly assigned.
- If beta or production health still returns Cloudflare `530` / `1033`, stop and log that as a deployment-reachability blocker before attempting route or banner checks.
- If deployment verification passes cleanly, mark this phase complete and then move to `docs/specs/p1-survey-public-hardening-and-results-scale.md`.
