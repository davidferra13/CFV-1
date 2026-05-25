# pie-forecast

Build Layer 2 trend intelligence. Gated: only runs when coverage >80%.

## What to do

1. Check coverage gate: if <80%, skip (log reason)
2. For items with 30+ days of price history:
   a. Calculate 14-day trend (linear regression slope)
   b. Calculate 30-day trend
   c. Detect seasonality (compare to same month last year if data exists)
   d. Flag items with strong upward trend (>10% in 14d)
3. Write trend data to ingredient_trends table
4. Log to hermes_actions

## Rules

- Never forecast items with <5 data points
- Confidence decreases with fewer observations
- Seasonal adjustments only when 12+ months of data exists
- This is informational only: forecasts never override actual prices
