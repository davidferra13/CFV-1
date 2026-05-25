# pie-measure

Snapshot all PIE metrics. Read-only. Run daily.

## What to do

1. Query PostgreSQL for coverage stats:
   - Total census items (ingredient_census count)
   - Items with at least one price observation
   - Coverage percentage
2. Query freshness stats:
   - Items within SLA (volatile: 7d, moderate: 14d, stable: 30d)
   - Freshness percentage
3. Query source health:
   - Active sources (had data in last 7 days)
   - Dead sources (no data in 30+ days)
4. Log results to hermes_actions table
5. If coverage dropped since yesterday: flag P0 alert

## Output

Post to Discord morning channel. Format:

```
PIE Daily: 82% coverage (+1.2%), 94% fresh, 6 active sources
```
