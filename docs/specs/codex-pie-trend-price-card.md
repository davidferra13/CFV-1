# Codex Build Spec: PIE Trend Data on Price Cards

> **Priority:** P1 - Law 11: "actionable intelligence, not data." Trends exist in backend, invisible in UI
> **Risk:** MEDIUM - modifies existing price display components
> **Estimated scope:** ~150 lines across 2-3 files

## Context

`lib/pricing/trend-intelligence.ts` (642 LOC) computes trend direction (up/down/stable), changePct, and volatility alerts. None of this surfaces in the price cards that chefs see. A chef sees "$8.50/lb" but not "up 12% this month."

## What to Build

### 1. Extend resolved price data

Find where resolved prices are returned to UI components (likely in `lib/pricing/resolve-price.ts` or a server action that calls it). Add optional trend data to the response:

```typescript
interface ResolvedPriceWithTrend extends ResolvedPrice {
  trend?: {
    direction: 'up' | 'down' | 'stable'
    changePct: number
    period: '7d' | '30d'
    volatility: 'low' | 'medium' | 'high'
  }
}
```

### 2. Fetch trend data alongside price

In the price resolution flow, after resolving the price, optionally fetch trend data from `getTrendsForIngredients`. This should be:

- Cached (don't re-fetch trends on every price lookup)
- Optional (trend data missing = price still renders fine)
- Batch-friendly (when costing a recipe with 20 ingredients, one trend query, not 20)

### 3. UI: Trend indicator on price display

Find the component that renders prices (likely in `components/pricing/`). Add a small trend indicator:

- Up arrow (red) + "+12%" for rising prices
- Down arrow (green) + "-5%" for falling prices
- No indicator for stable (< 3% change)
- Tooltip on hover: "Price trend over last 30 days"

Keep it subtle. One small arrow + percentage next to the price. Not a chart, not a graph, not a dashboard.

## Investigation Required

1. Find the primary price display component in `components/pricing/`
2. Find where resolved prices are passed to components (server action or server component)
3. Verify `getTrendsForIngredients` works for batch lookups

## Do NOT

- Add charts, graphs, or historical views (that's a different spec)
- Modify trend calculation logic
- Add new database tables
- Break existing price display if trend data is unavailable

## Acceptance Criteria

- Prices with significant trends show directional arrow + percentage
- Stable prices show no indicator (clean)
- Missing trend data = price renders normally (graceful degradation)
- `npx tsc --noEmit --skipLibCheck` passes
- `npx next build --no-lint` passes
