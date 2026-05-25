# pie-accuracy

Validate resolved prices against ground truth (chef corrections + receipts).

## What to do

1. Read hermes_feedback table (chef price overrides)
2. For each feedback entry:
   a. Compare resolved_price vs actual_price
   b. Calculate error percentage
   c. If error >15%: flag the resolution method
3. Compute weekly accuracy score:
   - (prices within 15% of actual) / (total spot checks)
4. If accuracy <90%: investigate which tiers are drifting
5. Adjust method weights in memory:
   - Source that consistently over/under-prices: reduce confidence
   - Source that matches actuals: increase confidence
6. Log to hermes_actions

## Output

Weekly accuracy report to Discord:

```
PIE Accuracy: 92% (38/41 within 15%). Drift: instacart +8% avg, wholesale -3% avg.
```
