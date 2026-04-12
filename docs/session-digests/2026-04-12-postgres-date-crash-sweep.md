# Session Digest: postgres.js Date Crash Sweep + Billing Activation

**Date:** 2026-04-12
**Agent:** Builder (Sonnet 4.6)
**Status:** Completed

---

## What Was Done

### Root Cause Discovery and Fix

Identified and fixed a systemic silent-failure bug affecting the entire codebase. postgres.js 3.x returns DATE columns as JavaScript Date objects (not strings), but all TypeScript types declare date columns as `string`. This caused two categories of failures:

1. **Hard crashes:** `.slice(0, 10)`, `.split('T')`, `.localeCompare()` called on Date objects (no such method on Date).
2. **Silent logic failures:** `date >= '2026-01-01'` always false because `Date >= string` evaluates as NaN comparison.

**Root fix** (`lib/db/index.ts`): Configured postgres.js type parser to return DATE columns (OID 1082) as `YYYY-MM-DD` strings. One-line fix that corrects the source for all consumers.

**Individual fixes** applied to 12 files where Date objects were being treated as strings.

### Files Fixed

| File                                    | Bug                                                            |
| --------------------------------------- | -------------------------------------------------------------- |
| `lib/db/index.ts`                       | Added DATE type parser (root fix)                              |
| `lib/utils/format.ts`                   | Added `dateToDateString()` helper                              |
| `lib/availability/rules-actions.ts`     | `event_date.slice(0, 10)` crash                                |
| `lib/availability/actions.ts`           | `String(event_date)` silent failure                            |
| `lib/dashboard/actions.ts`              | `created_at.slice(0, 10)` crash                                |
| `lib/scheduling/multi-event-days.ts`    | `event_date.slice(0, 10)` crash                                |
| `lib/booking/series-materialization.ts` | `.localeCompare()` crashes, added `compareDateTime` helper     |
| `lib/booking/instant-book-actions.ts`   | `session_date.localeCompare` crash                             |
| `lib/documents/search-actions.ts`       | `created_at.split('T')` crashes (2 branches)                   |
| `lib/ai/client-preference-profile.ts`   | `created_at.split('T')` crashes                                |
| `lib/ai/temp-log-anomaly.ts`            | `logged_at.split('T')` crash, added `loggedAtDisplay()` helper |
| `lib/travel/actions.ts`                 | `event_date.split('-')` crash                                  |
| `lib/analytics/insights-actions.ts`     | `parseDate()` crash + Date/string safety                       |

### Developer's Freemium Billing Work Committed

Developer had staged billing system work that activated the two-tier model:

- **`lib/billing/require-pro.ts`**: No longer a pass-through. Now enforces paid-tier features via redirect to `/settings/billing?feature=slug`. Reads from `feature-classification.ts`. Legacy slugs not in the map degrade safely to auth-only.
- **`app/(chef)/settings/billing/billing-client.tsx`**: Rewritten with Free vs Paid tier comparison table.
- **`app/(chef)/settings/billing/page.tsx`**: Updated for new billing client.
- **`components/billing/upgrade-gate.tsx`**: Actual gate UI (block/blur/hide modes) replacing the previous pass-through.
- **`docs/CLAUDE-ARCHITECTURE.md`**: Monetization model section updated to document two-tier system.

---

## Decisions Made

- **Root fix strategy**: Type parser at connection level (not per-file casts) because the fix applies to all queries automatically and future code won't silently regress.
- **`dateToDateString()`** added to `lib/utils/format.ts` as a safe Date|string converter for use at the boundary where TIMESTAMPTZ columns (which remain as Date objects by design) need to be displayed as dates.
- **TIMESTAMPTZ columns stay as Date objects**: Only DATE (OID 1082) is string-parsed. TIMESTAMP and TIMESTAMPTZ stay as Date for accurate arithmetic. This is intentional and documented in lib/db/index.ts.

---

## Commits

| Hash        | Description                                                      |
| ----------- | ---------------------------------------------------------------- |
| `c661dafa2` | fix(db): configure postgres.js to return DATE columns as strings |
| `7ecb992f3` | fix(booking): fix session_date.localeCompare crash               |
| `252e77789` | fix(menus): fix Date.localeCompare crash in menu engineering     |
| `6cd92bbf7` | fix(booking): fix event_date/block_date Date.slice crash         |
| `1e55b71f5` | fix(analytics): fix parseDate and toISOString timezone bugs      |
| `7a56d1bec` | feat(billing): activate two-tier freemium model                  |
| `58dd3a08d` | chore: remove tmp-vcq-test.mjs scratch file                      |

---

## Build State

- tsc: green (0 errors, verified post-commit)
- Last full build: 2026-04-11 on ce742b36b

---

## For the Next Agent

- The postgres.js Date crash sweep is complete. All known `.slice()`, `.split('T')`, `.localeCompare()` crashes on DATE columns are fixed.
- **TIMESTAMPTZ columns** (logged_at, created_at when it's a timestamp) may still come back as Date objects. The `loggedAtDisplay()` pattern in `temp-log-anomaly.ts` and `dateToDateString()` in `format.ts` are the correct handling patterns.
- `requirePro()` now gates paid features. The first time a feature is accessed by a free-tier chef, they get redirected to `/settings/billing`. Test billing flows before shipping new paid features.
- `feature-classification.ts` is the canonical map. New paid features go there first.
