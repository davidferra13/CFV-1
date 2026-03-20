# Smart Pricing Insights (Sidebar)

## What Changed

Added a pricing insights sidebar component for the quote builder. Shows historical pricing data for similar events using pure math aggregations (no AI).

## Files Added

- `lib/finance/pricing-insights.ts` - Core query and aggregation logic
- `lib/finance/pricing-insights-actions.ts` - Server action wrapper with tenant scoping
- `components/quotes/pricing-insights-sidebar.tsx` - Client component for sidebar display

## How It Works

1. Queries the `quotes` table joined with `events` for occasion and guest count data
2. Filters by event type (occasion) and guest count range when provided
3. Computes: average, median, win rate, highest/lowest accepted, per-guest average
4. Trend calculation: compares average of older half vs newer half of quotes (10% threshold)
5. Requires 3+ matching quotes before showing insights (otherwise shows "Not enough data")

## Integration

Import `PricingInsightsSidebar` into any quote builder or event page:

```tsx
import { PricingInsightsSidebar } from '@/components/quotes/pricing-insights-sidebar'

<PricingInsightsSidebar
  eventType="Birthday"
  guestCountRange={[10, 20]}
/>
```

## Key Design Decisions

- Formula > AI: all calculations are deterministic math, zero LLM usage
- Zero-hallucination compliant: error states show errors, not zeros; insufficient data is explicit
- Tenant-scoped via `requireChef()` in the server action
- Excludes superseded and soft-deleted quotes
- Trend uses a 10% change threshold to avoid noise
- Per-guest average only computed from accepted quotes with known guest counts
