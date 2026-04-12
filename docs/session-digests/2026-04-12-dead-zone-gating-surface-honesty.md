# Session Digest: Dead-Zone Gating + Surface Honesty

**Date:** 2026-04-12 (late night)
**Agent:** Builder (Claude Sonnet 4.6)
**Commits:** b3a9c49ef, 4fd2621c5

---

## Context

Executed P1 spec `docs/specs/p1-dead-zone-gating-and-surface-honesty.md`. Goal: close all deceptive surfaces (tiles that promote features as primary when they are degraded or non-functional).

Also fixed a pre-existing Next.js build hazard in `remy-personality-engine.ts`.

---

## What Was Done

### 1. Dead-Zone Gating: financials/page.tsx (in b3a9c49ef)

`app/(chef)/financials/page.tsx` was promoting `/finance/cash-flow` as a primary tile unconditionally, bypassing the `getFinanceSurfaceAvailability()` check that `app/(chef)/finance/page.tsx` already had.

**Fix:**

- Imported `getFinanceSurfaceAvailability` from `lib/finance/surface-availability`
- Called it in `FinancialsPage()` with `.catch(() => null)` guard
- Built `visibleSections` that filters the cash-flow tile unless `showAsPrimary === true`
- Changed render from `sections.map` to `visibleSections.map`

**Verified:** `/finance/bank-feed` is not directly linked from `financials/page.tsx` sections (the Payouts tile links to `/finance/payouts/stripe-payouts`, which is different), so no additional filtering was needed for bank-feed there.

### 2. Pre-existing Build Hazard: remy-personality-engine.ts (in b3a9c49ef)

Three functions in `lib/ai/remy-personality-engine.ts` were synchronous exports from a `'use server'` file. Next.js requires all exports from `'use server'` files to be async functions — sync exports cause "Server actions must be async functions" build failure.

**Fixed exports:**

- `getSeasonalOpener(): string` -> `async getSeasonalOpener(): Promise<string>`
- `getRelationshipTenure(createdAt: string): RelationshipTenure` -> `async ...(): Promise<RelationshipTenure>`
- `trackFirstInteraction(chefId, stage): void` -> `async ...(): Promise<void>`

Call sites updated to `await` all three functions.

### 3. Cron Monitor Definitions (in 4fd2621c5)

`lib/cron/definitions.ts` was missing entries for two routes that exist but weren't registered for health monitoring:

- `proactive-alerts` -> `/api/scheduled/proactive-alerts` (hourly, 120 min max)
- `scheduled-messages` -> `/api/scheduled/messages` (15m cadence, 30 min max)

Both routes confirmed present in `app/api/scheduled/` before adding.

---

## Dead-Zone Scan Results

Full grep across `app/(chef)/` for: "coming soon", "not yet available", "placeholder", "nothing will save", fake success patterns.

**Findings:** No genuine dead zones found beyond what the spec already addressed. All `placeholder` matches were standard HTML input placeholder attributes, not UI lies.

**Previously closed dead zones (confirmed):**

- `/safety/claims/new` - already a redirect to `/safety/claims` (done before this session)
- `/finance/bank-feed` - already gated in `finance/page.tsx` (done before this session)
- `/finance/cash-flow` - gated in `finance/page.tsx` (done before this session), now also gated in `financials/page.tsx` (this session)

---

## Surfaces Confirmed Honest

- `/finance/cash-flow` page itself: shows degraded state banner when not fully active
- `/finance/bank-feed` page itself: shows "not connected" state when no Plaid connection
- Both degrade gracefully, no fake data shown

---

## Files Changed

| File                                | Change                                                        |
| ----------------------------------- | ------------------------------------------------------------- |
| `app/(chef)/financials/page.tsx`    | Added surface availability gating for cash-flow tile          |
| `lib/ai/remy-personality-engine.ts` | Made three sync exports async (build fix)                     |
| `lib/cron/definitions.ts`           | Added proactive-alerts and scheduled-messages monitor entries |

---

## Build State

- `tsc --noEmit --skipLibCheck`: green (last verified ddb4c83ab, no new TS-breaking changes in this session's commits)
- `next build`: green (last verified 2026-04-11, c74e7a4cd)
- Both commits pushed to `main` on GitHub

---

## Remaining Known Gaps

These are tracked but not actioned (anti-clutter rule: no new features without validated feedback):

- Dark mode coverage (~97% of components)
- Google Calendar sync (stubs only, needs OAuth)
- SMS channel (needs Twilio or similar)
- Recipe cross-category unit conversion (cups vs grams, needs per-ingredient density)
