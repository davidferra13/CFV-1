# Spring Surge Command Center - Implementation Notes

**Spec:** `docs/specs/spring-surge-command-center.md`
**Built:** 2026-03-27

## Changes Implemented

### Change 1: Inquiry Readiness Score

- `computeReadinessScore()` in `lib/inquiries/actions.ts` - pure field presence check across 8 key fields (date, guest count, location, occasion, budget, dietary, service expectations, contact info)
- `computeReadinessScoresForInquiries()` - batch computation for all open inquiries
- `ReadinessScoreBadge` component at `components/inquiries/readiness-score-badge.tsx` - color-coded badge with hover popover showing filled/missing fields
- Integrated into inquiry pipeline page alongside existing BookingScoreBadge

### Change 2: Dashboard Surge Awareness

- Hero metrics now show "new this week" trend count under open inquiries
- Surge detection: 5+ new inquiries in 7 days triggers "(surge)" label and amber trend indicator
- `hero-metrics-client.tsx` updated to render trend data with up-arrow icon
- `RespondNextCard` component at `components/dashboard/respond-next-card.tsx` - shows the single highest-priority unresponded inquiry with wait time and readiness score
- Added to dashboard between Command Center and Priority Queue

### Change 3: Auto-Generate Documents on Completeness

- `lib/documents/auto-generate.ts` (new) - provides:
  - `getDocumentReadinessStatus()` - returns all doc types with generated/ready/blocked status
  - `getReadyDocumentTypes()` - returns which docs can be generated now
  - `generateAllReadyDocuments()` - generates all ready docs, non-blocking per type
- Existing `getDocumentReadiness()` in `lib/documents/actions.ts` already handles the readiness checks
- Existing `BulkGenerateRunner` on events documents page handles the UI

### Change 4: Batch Opportunity Detection

- `lib/grocery/batch-opportunities.ts` (new) - `getBatchOpportunities(startDate, endDate)`
  - Walks full join path: events -> menus -> dishes -> components -> recipes -> recipe_ingredients -> ingredients
  - Groups by ingredient, filters to 2+ events sharing the same ingredient
  - Returns quantities, event count, and event details per ingredient
- `components/grocery/batch-opportunities-card.tsx` (new) - collapsible card showing shared ingredients for the current week

### Change 5: Response Queue with Quick Actions

- `getResponseQueue()` in `lib/inquiries/actions.ts` - returns inquiries sorted by wait time (desc), date proximity (asc), readiness score (desc)
- Only shows inquiries where chef needs to act (status: new, awaiting_chef)
- "Respond Next" tab added to inquiry pipeline page - highlights #1 priority with "Up Next" badge
- Shows wait time badge per inquiry row

## Files Created

- `components/inquiries/readiness-score-badge.tsx`
- `components/dashboard/respond-next-card.tsx`
- `components/grocery/batch-opportunities-card.tsx`
- `lib/documents/auto-generate.ts`
- `lib/grocery/batch-opportunities.ts`

## Files Modified

- `lib/inquiries/actions.ts` - added readiness score + response queue actions
- `app/(chef)/inquiries/page.tsx` - added readiness badge + respond next tab
- `app/(chef)/dashboard/_sections/hero-metrics.tsx` - surge awareness + trend
- `app/(chef)/dashboard/_sections/hero-metrics-client.tsx` - trend rendering
- `app/(chef)/dashboard/page.tsx` - added RespondNextCard
