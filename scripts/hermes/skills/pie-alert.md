# pie-alert

Detect regressions, source failures, and data anomalies.

## What to do

1. Check source health:
   - Any source with 0 new prices in 48+ hours? Flag dead.
   - Any source with >20% price anomalies? Flag unreliable.
2. Check coverage regression:
   - Compare today's coverage to yesterday's (from hermes_actions log)
   - If dropped >1%: P0 alert
3. Check freshness SLA:
   - Volatile items (produce, seafood, dairy) stale >7 days
   - If >5% violated: P1 alert
4. Check anomalies:
   - Prices that changed >50% in one update
   - Prices that are >3 standard deviations from category mean
5. Auto-quarantine bad prices (set confidence to 0)
6. Log findings to hermes_actions
7. P0 alerts: post to Discord immediately

## Response

For dead sources: note in memory which source died and when. Don't retry dead sources for 24h.
For anomalies: quarantine the price, log the reason, shift method weight away from that source.
