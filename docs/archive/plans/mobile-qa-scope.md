# Mobile QA Scope (Whole Website)

## Objective

Create a repeatable, automated mobile QA system that catches layout regressions before release, with screenshot evidence and hard pass/fail checks.

## Inputs

- Route source of truth: coverage specs
  - `tests/coverage/01-public-routes.spec.ts`
  - `tests/coverage/02-chef-routes.spec.ts`
  - `tests/coverage/03-client-routes.spec.ts`
  - `tests/coverage/04-admin-routes.spec.ts`
- Dynamic route placeholders are resolved from `.auth/seed-ids.json` via Playwright fixture `seedIds`.

## Viewport Matrix

- Full matrix:
  - `320x740` (small phone hard mode)
  - `360x800`
  - `375x812`
  - `390x844`
  - `414x896`
  - `768x1024` (tablet)
- Quick matrix:
  - `320x740`
  - `390x844`

## States Audited

- `default` state on every route.
- Extra states on homepage (`/`):
  - `menu_open`
  - `cookie_banner`

## Pass/Fail Rules

- HTTP status must stay below `500`.
- No horizontal overflow:
  - `document.scrollWidth <= window.innerWidth + 1`
- No unhandled JS runtime page errors.
- No non-ignored console errors.

## Commands

- Quick all-roles audit:
  - `npm run test:mobile:audit`
- Full all-roles audit:
  - `npm run test:mobile:audit:full`
- Public-only audit:
  - `npm run test:mobile:audit:public`

## Artifacts

- Per-run output:
  - `reports/mobile-audit/<timestamp>/...` (screenshots + summary)
- Latest summary:
  - `reports/mobile-audit/latest.json`

## Operating Model

1. Run quick audit on active development changes.
2. Fix all failures in `latest.json`.
3. Run full audit before release candidate.
4. Keep screenshots as objective evidence in PR/release notes.
