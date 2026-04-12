# Session Digest: UTC Date Sweep Complete + MemPalace Backlog Close-Out

**Date:** 2026-04-12 (context continuation from prior session)
**Agent:** Builder (Sonnet 4.6)
**Status:** Completed

---

## What Was Done

### Phase 1: UTC Date Bug Sweep (Batches 5 + 6) - COMPLETE

Finished the standing mandate to eliminate all `new Date().toISOString().split('T')[0]` and `.slice(0,10)` instances that produce tomorrow's date after ~8pm ET.

**Batch 5 (commit 043e36d07) - 35 files:**

- Scripts: `propagate-market-prices-to-ingredients.mjs`, `run-openclaw-sync.mjs`, `db-integrity-audit.mjs`, `goldmine-audit.mjs`, `overnight-audit.mjs`
- Mission Control: `scripts/launcher/server.mjs` (8+ instances: upcoming events, calendar overview, staff roster, community activity buckets, daily log lookup, commit timestamps) and `scripts/launcher/index.html` (3 browser-side instances)
- lib/: `compute-daily-report.ts` (complex - pure UTC ms arithmetic), `document-intake-parsers.ts`, `document-intake-actions.ts`, seed scripts
- app/ CSV exports: 5 routes across admin and chef areas
- components/: `vendor-price-insights.tsx` (2 instances), `charity-hours-list.tsx`, `export-csv-button.tsx`, `beta-signups-table.tsx`, `entity-activity-timeline.tsx`, `delete-account-form.tsx`, `gdpr-tools.tsx`
- tests/: `factories.ts` (futureDate/pastDate), `e2e-seed.ts` (daysFromNow), `test-db.ts`

**Batch 6 (commit ff8593a80) - 11 test harness files:**

All 7 `tests/remy-quality/harness/client-*-runner.mjs` files, `screenshot-crawler.spec.ts`, `07-public-pages.spec.ts`, `markdown-reporter.ts`, `payment-milestones.test.ts`.

**Final state:** Zero remaining UTC date bugs in source. Confirmed via Grep across entire codebase.

**Technical note on `compute-daily-report.ts`:**
This file takes a `reportDate: string` parameter. The fix needed care: `reportDateObj` stays as `new Date(reportDate + 'T00:00:00Z')` (UTC midnight, consistent with how DB date comparisons work). All arithmetic (yesterday, +7 days, +30 days) done via `reportDateObj.getTime() + N * 86400000` to stay in UTC. Month boundaries use `Date.UTC()` constructor. The initial fix attempt used local midnight which would have broken `daysSince` calculations.

---

### Phase 2: MemPalace Backlog Stale Item Resolution

Three items verified as stale and marked resolved:

1. **Feature Discovery page** - already fully built at `/features` (was already in the resolved section but open item in QUICK WINS wasn't checked off)

2. **Profit margin display inconsistency** - `business-cards.tsx` does not exist. `top-events-profit-widget.tsx` uses `toFixed(1)` consistently. No inconsistency.

3. **`app/api/v2/documents/generate` capability gap** - route fully implements invoice/receipt/quote/contract PDF generation (returns binary PDF). Menu/prep_list/grocery_list/timeline are aliased to existing snapshot types. The `supported: false` path is unreachable for all documented types.

---

## Decisions Made

- `compute-daily-report.ts` stays purely UTC throughout (UTC midnight base + ms arithmetic) because the report date parameter is already a UTC-anchored string and all DB date comparisons use UTC date strings. Mixing local time would cause off-by-one errors at night.
- Inline IIFE pattern used for CSV export filename dates (component-level, browser-side). Module-level `const today = ...` pattern used for scripts and server-side code.

## What's Left Open

Genuinely open items in the MemPalace backlog (not stale, not quick wins):

- Dark mode gaps (~97% coverage missing) - ongoing
- Google Calendar OAuth sync - complex, needs OAuth flow
- SMS channel (Twilio) - complex
- Location roster + rotation calendar - unbuilt, no spec
- Pre-service par level planning UI - no dedicated page
- Pagination standards inconsistency
- OpenClaw pipeline gaps (Pi-side: store_products sync, 5 zero-product chains)
- Multi-chef client view

---

## Commits

- `043e36d07` - fix(utc-date): fix local date in scripts, lib, and component CSV exports (batch 5)
- `ff8593a80` - fix(utc-date): fix local date in test harnesses and test helpers (batch 6)
- (session close-out commit - docs only)

## Build State

tsc: green (0 errors, verified at 5d429b82b). No structural code changes this session (docs + memory only in close-out). Build not re-run; UTC fixes are mechanical string replacements with no type implications.
