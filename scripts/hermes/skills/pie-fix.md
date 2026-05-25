# pie-fix

Fix the worst active PIE Law violation.

## PIE Laws to check

1. No unpriced ingredient in an active menu (Law 10: never null)
2. No price older than freshness SLA without refresh attempt
3. No quarantined price without a replacement path
4. No negative or zero prices in production
5. No duplicate census entries for same item

## What to do

1. Scan for violations (worst first by impact)
2. For the worst violation:
   a. Diagnose root cause (bad source? stale? wrong unit? missing census entry?)
   b. Fix it: recalculate price, find alternate source, or generate synthetic
   c. Verify fix resolves the violation
3. Log fix to hermes_actions with diagnosis + resolution
4. If violation persists after fix attempt: escalate to Discord as P0

## Rules

- Fix ONE violation per run (precision over speed)
- Never delete data to "fix" a violation
- Synthetic prices are valid fixes (Law 9: synthetic is always available)
- Log the full diagnosis chain for learning
