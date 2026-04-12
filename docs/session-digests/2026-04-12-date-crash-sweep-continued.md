# Session Digest: Date Crash Sweep (Continued) + ZHR Fixes

**Date:** 2026-04-12
**Agent:** Builder
**Task:** Continue sweeping for postgres.js Date object crash sites and ZHR violations

---

## What Was Done

### Date Crash Sweep (Resumed from previous context)

Picked up from prior session which had identified `app/(chef)/dashboard/_sections/hero-metrics.tsx` as a confirmed crash site. Fixed it and continued a comprehensive sweep.

**All crash patterns addressed:**

1. `.split('T')[0]` on Date objects
   - `hero-metrics.tsx`: `r.created_at?.split('T')[0]` and `r.event_date?.split('T')[0]`
   - `generate-quote.ts`: `inquiry.confirmed_date.split('T')[0]` (2 sites)
   - `quote-client route.ts`: `inquiry.confirmed_date.split('T')[0]`

2. `.localeCompare()` on raw DB date fields
   - `inquiries/actions.ts:258`: `a.session_date.localeCompare()` in materializeSeriesSessions
   - `booking/series-planning.ts`: session_date sort
   - `availability/actions.ts`: session_date conflict sort
   - `raffle/actions.ts`: entry_date and created_at sort
   - `scheduling/task-digest.ts`: eventDate assigned from event.event_date
   - `staff/tax-report-actions.ts`: eventDate assigned from event.event_date
   - `analytics/culinary-analytics.ts`: last_price_date sort
   - `raffle/actions.ts`: earliestEntry assignment + comparison

3. `field + 'T00:00:00'` concatenation (Date.toString() produces invalid date string)
   - 13 files fixed: weather-actions, widget-actions, dashboard/actions, seasonality, aar-prompt-actions, deposit-actions (x2), preference-learning-actions, guest-leads/actions, guest-comms/actions, menu-intelligence-actions, scheduling/actions (x2)

4. `parseISO()` on raw DB date fields
   - `generate-receipt.ts`: event_date normalized at return (3 sites)
   - `interactive-specs.ts`: leg_date cast-to-string then parseISO
   - `queue/providers/inquiry.ts`: confirmed_date concatenation

5. Normalization at build time
   - `generate-travel-route.ts`: leg_date and event_date normalized at object construction
   - `payments/milestones.ts`: day_of_event case direct assignment
   - `scheduling/task-digest.ts`: eventDate at push
   - `staff/tax-report-actions.ts`: eventDate at push

6. `.substring(0, 10)` on Date objects
   - `commerce/report-actions.ts`: created_at.substring(0,10) for day grouping (2 sites)

7. `String(Date)` locale sort
   - `client-dashboard/actions.ts`: replaced String(date) with proper Date constructor comparison

### ZHR Fixes

- `app/(chef)/cannabis/ledger/page.tsx`: Removed `.catch(() => zeros)` that silently showed $0 revenue/expenses/profit on DB failure. Now propagates to `app/(chef)/cannabis/error.tsx` boundary.

### False Positive Verification

- `remy-context.ts:534` - `yearStart.split('T')[0]`: safe, yearStart is `.toISOString()` result
- `client-analytics.ts:270`: `startDate.substring(0,10)`: safe, `startDate` is `string` parameter
- `generate-travel-route.ts:254`: already fixed (leg_date normalized at build)
- `import-take-a-chef-action.ts:205`: safe, `parsed.confirmed_date` is `z.string()` from AI schema

---

## Files Modified

### Date crashes fixed:

- `app/(chef)/dashboard/_sections/hero-metrics.tsx`
- `app/api/documents/quote-client/[quoteId]/route.ts`
- `lib/analytics/culinary-analytics.ts`
- `lib/availability/actions.ts`
- `lib/booking/series-planning.ts`
- `lib/documents/generate-quote.ts`
- `lib/documents/generate-travel-route.ts`
- `lib/documents/generate-receipt.ts`
- `lib/documents/interactive-specs.ts`
- `lib/inquiries/actions.ts`
- `lib/raffle/actions.ts`
- `lib/scheduling/task-digest.ts`
- `lib/staff/tax-report-actions.ts`
- `lib/payments/milestones.ts`
- `lib/queue/providers/inquiry.ts`
- `lib/commerce/report-actions.ts`
- `lib/client-dashboard/actions.ts`
- `lib/weather/weather-actions.ts`
- `lib/dashboard/widget-actions.ts`
- `lib/dashboard/actions.ts`
- `lib/analytics/seasonality.ts`
- `lib/events/aar-prompt-actions.ts`
- `lib/finance/deposit-actions.ts`
- `lib/clients/preference-learning-actions.ts`
- `lib/guest-leads/actions.ts`
- `lib/guest-comms/actions.ts`
- `lib/menus/menu-intelligence-actions.ts`
- `lib/scheduling/actions.ts`

### ZHR:

- `app/(chef)/cannabis/ledger/page.tsx`

---

## Build State

tsc: clean (0 errors) throughout all changes.

---

## Context for Next Agent

The postgres.js Date crash sweep is now extremely comprehensive. The canonical fix pattern is:

```ts
import { dateToDateString } from '@/lib/utils/format'
// ...
dateToDateString(field as Date | string)
```

Key remaining open backlog items (from project_mempalace_backlog.md):

- Dark mode gaps (large, ongoing)
- Calendar integration (Google Calendar sync) - stubs only
- SMS channel (Twilio) - unbuilt
- store_products Pi price sync incomplete (Pi-side fix)
- Pre-service par level planning UI
- Pagination standards inconsistent
