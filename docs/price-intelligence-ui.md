# Price Intelligence UI

## What was added

Three UI features wired to the OpenClaw Pi API endpoints:

### 1. Price Drop Alerts (Dashboard)

Shows on the chef dashboard's Alerts section when the Pi detects significant price drops. Displays the top drop with percentage, current price, and store name.

- Location: Dashboard > Alerts & Health section
- Data source: `GET /api/alerts/price-drops` on Pi
- Server action: `getPriceDropAlerts()` in `lib/openclaw/price-intelligence-actions.ts`

### 2. Price Freshness Card (Dashboard)

Shows what percentage of scraped prices are current vs stale. Helps the chef know if price data is reliable.

- Location: Dashboard > Alerts & Health section
- Data source: `GET /api/freshness` on Pi
- Server action: `getPriceFreshness()` in `lib/openclaw/price-intelligence-actions.ts`

### 3. Shopping Optimizer (Costing Page)

Given all of a chef's ingredients, calculates the cheapest single-store option (convenience) and the optimal multi-store split (maximum savings). Shows store-by-store breakdown with per-store item lists and subtotals.

- Location: `/culinary/costing` page, below recipe costs
- Data source: `POST /api/optimize/shopping-list` on Pi
- Client component: `components/pricing/shopping-optimizer.tsx`
- Server action: `getShoppingOptimization()` in `lib/openclaw/price-intelligence-actions.ts`

### Freshness Badges (Already Built)

The `PriceAttribution` component (`components/pricing/price-attribution.tsx`) already displays freshness indicators with color coding:

- Green: updated within 7 days
- Stone: updated within 14 days
- Amber: older than 14 days

This is already used on the ingredients page.

## Files

| File                                              | Purpose                                                       |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `lib/openclaw/price-intelligence-actions.ts`      | Server actions for price drops, freshness, shopping optimizer |
| `components/pricing/shopping-optimizer.tsx`       | Client component for shopping optimizer UI                    |
| `app/(chef)/dashboard/_sections/alerts-cards.tsx` | Updated with price drop + freshness cards                     |
| `app/(chef)/culinary/costing/page.tsx`            | Updated with shopping optimizer section                       |

## Non-blocking

All Pi calls are wrapped in try/catch with graceful fallbacks. If the Pi is offline, the dashboard cards simply don't render and the shopping optimizer shows an error message. No other dashboard functionality is affected.
