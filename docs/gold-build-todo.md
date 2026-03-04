# Gold Build TODO (2026-03-04)

## Objective

Convert the current "high-noise, low-trust" overnight run into a deterministic release gate that catches real regressions (privacy, finance, auth, Remy reliability) and blocks false positives.

Current baseline from overnight + live lanes:

- Health score: 45/100 (F)
- E2E failures: 71
- Console errors: 21
- Accessibility violations: 100
- DB integrity: 79/100 (5 failed checks)

---

## Build 1: Fix Test Signal Integrity (P0)

1. Correct client project test mapping

- File: `playwright.config.ts`
- Problem: `interactions-client` includes `03-quote-flows.spec.ts` (chef routes like `/quotes/*`), producing guaranteed wrong-role failures.
- Build: remove `**/interactions/03-quote-flows.spec.ts` from `interactions-client` and keep it chef-only.
- Done when: `interactions-client` no longer fails on chef-only `/quotes/*` routes.

2. Fix client-boundary auth cookie format

- File: `tests/remy-quality/harness/client-boundary-runner.mjs`
- Problem: cookie is emitted as `sb-...-auth-token=<base64url>` without the required `base64-` prefix.
- Build: emit `sb-...-auth-token=base64-<base64url>` for client + chef cookies.
- Done when: malformed-body boundary tests hit `/api/remy/client` directly (no login HTML payloads).

3. Stop middleware from rewriting Remy API failures into redirects

- File: `middleware.ts`
- Problem: `/api/remy/client` and `/api/remy/stream` are not in middleware bypass list, so auth turbulence becomes 307 redirects/HTML instead of endpoint-native errors.
- Build: add explicit bypass for these two API paths (route-level `requireClient/requireChef` remains authoritative).
- Done when: Remy runners receive JSON/SSE errors, not HTML redirects.

4. Stabilize TypeScript lane

- File: `tsconfig.json`
- Problem: include pattern `.next-dev/types/**/*.ts` causes intermittent TS6053 missing-file races during dev rebuild.
- Build: move dev-generated type paths out of hardening `tsc --noEmit` path (or use a dedicated CI tsconfig).
- Done when: hardening lane `tsc` becomes stable and only fails on real type errors.

---

## Build 2: Privacy + Tenant Isolation Hardening (P0)

1. Make cross-tenant document denials fast and deterministic

- Files:
  - `app/api/documents/invoice-pdf/[eventId]/route.ts`
  - `app/api/documents/foh-menu/[eventId]/route.ts`
  - supporting data loaders under `lib/events` and `lib/documents`
- Problem: cross-portal negative test times out while reading document endpoints.
- Build: guarantee deny-path returns in bounded time with non-200 and no 5xx leak.
- Done when: `tests/e2e/client_rls_negative.spec.ts` passes consistently.

2. Keep chef/client golden flow deterministic

- File: `tests/e2e/chef_client_golden_path.spec.ts`
- Problem: context disposal after long wait indicates unstable async flow under load.
- Build: tighten waits around acceptance/document-read checkpoints and isolate failure causes (auth, data, latency).
- Done when: cross-portal project passes in repeated runs.

3. Remediate DB integrity failures with migration + backfill

- Input report: `reports/overnight-2026-03-04/db-integrity.md`
- Build:
  - backfill `quotes.accepted_at` from transition history
  - repair/remove orphan client rows with null/invalid tenant
  - backfill missing event transitions
  - repair confirmed inquiries missing required fields
- Done when: db audit returns >=95 and zero critical/high failures.

---

## Build 3: Remy Runtime + Reliability (P0/P1)

1. Ensure seeded tenants have valid Remy runtime settings for quality suites

- Files:
  - `app/api/remy/stream/route.ts`
  - `lib/ai/command-orchestrator.ts`
  - seeding/runtime setup scripts
- Problem: large share of failures are due to "Remy disabled" rather than model quality.
- Build: test tenant setup must explicitly satisfy onboarding + enabled prerequisites before running quality suites.
- Done when: chef/data-accuracy/tier suites fail only for true quality issues.

2. Harden client Remy resilience under load

- File: `app/api/remy/client/route.ts`
- Problem: resilience suite reports timeouts, weak rate-limit signal, and unstable high-history behavior.
- Build:
  - enforce/verify rate-limit behavior in runner environment
  - add bounded response strategy for huge histories
  - improve graceful timeout behavior for cold starts
- Done when: client resilience suite reaches 5/5 pass.

---

## Build 4: User-Facing Quality (P1)

1. Remove runtime console errors on key routes

- Input report: `reports/overnight-2026-03-04/report.md`
- Focus routes:
  - `/chef/.../dashboard` unauthorized render path
  - `/kiosk*` CSP + analytics script issues
  - `/demo` and gift-card success hydration warnings
- Done when: console errors are 0 in overnight audit.

2. Reduce accessibility violations by fixing global primitives first

- Input report: `reports/overnight-2026-03-04/report.md`
- Priority rules:
  - `color-contrast`
  - `region`
  - `skip-link`
  - `landmark-one-main`
- Done when: a11y violations cut from 100 to <=20, then to 0 critical/serious.

---

## Verification Gates (must pass in this order)

1. `npx tsc --noEmit --skipLibCheck`
2. `npm run lint`
3. `npm run test:isolation`
4. `npx playwright test --project=cross-portal`
5. `npm run test:remy-quality:client:boundary`
6. `npm run test:remy-quality:client:resilience`
7. `npm run audit:db`
8. `npm run audit:overnight`

Ship gate:

- No critical privacy/security failures
- No finance-integrity high/critical failures
- No cross-tenant data leaks
- Remy boundary tests 100%
