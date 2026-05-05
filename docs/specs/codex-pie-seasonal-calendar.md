# Codex Build Spec: PIE Seasonal Price Calendar

> **Priority:** P2 - Chefs plan menus months ahead. Seasonal data exists, no visual
> **Risk:** LOW - new page, reads existing data
> **Estimated scope:** ~200 lines, 1 new page + 1 server action

## Context

`lib/pricing/seasonal-analysis.ts` and `trend-intelligence.ts` (`getSeasonalPatterns`) compute seasonal price patterns. `lib/pricing/predictive-supply.ts` has availability windows. None of this is visible. A chef planning a December dinner should see that lamb prices peak in spring, not December.

## What to Build

### 1. Server action

Create `lib/pricing/seasonal-calendar-actions.ts`:

- `getSeasonalCalendar(ingredientIds)` - for a set of ingredients, return monthly price index
- Each ingredient gets 12 monthly scores: relative price (0.8 = 20% below average, 1.3 = 30% above)
- Include peak/trough months
- Include availability windows from predictive-supply

### 2. Page: `/pricing/seasonal` (authenticated)

Simple grid view:

- Rows = ingredients (from chef's recent recipes or manually selected)
- Columns = 12 months (Jan-Dec)
- Cells colored: green (cheap), yellow (normal), red (expensive)
- Current month highlighted
- Click ingredient row to see detail: peak month, trough month, best-buy window

### 3. "Best time to buy" summary

At the top of the page:

- "This month's deals: [ingredients that are at seasonal low]"
- "Prices rising soon: [ingredients approaching seasonal peak]"
- Based on current month vs seasonal patterns

## Do NOT

- Build a full charting library dependency
- Modify seasonal analysis logic
- Create alerts or notifications
- Add this to public-facing pages

## Acceptance Criteria

- `/pricing/seasonal` renders with real seasonal data
- 12-month grid with color coding
- Auth required
- `npx tsc --noEmit --skipLibCheck` passes
- `npx next build --no-lint` passes
