# pie-acquire

Continuous data acquisition. Replaces Pi sync + OpenClaw cron.

## What to do

1. Check acquisition queue:
   a. hermes_queue events (P1: unpriced items from new menus)
   b. Freshness violations (items past SLA)
   c. Coverage gaps (from pie-ratchet findings)
2. For each item to acquire:
   a. Pick best source based on: item category, region, source health history
   b. Attempt acquisition (API call, data lookup, computation)
   c. Normalize result (standardize unit, validate range)
   d. Write to ingredient_price_history
   e. Update freshness timestamp
   f. Log to hermes_actions
3. Track source reliability:
   - Success rate per source
   - Average latency per source
   - Data quality per source (anomaly rate)
4. After processing queue: enter idle acquisition mode
   - Refresh oldest stale items
   - Expand to new regions
   - Fill category gaps

## Sources (by preference)

1. Existing PG data (cross-reference other stores)
2. Government feeds (BLS/USDA monthly data)
3. Wholesale catalogs (Sysco, US Foods pricing)
4. Regional averages (computed from multiple observations)
5. Synthetic generation (last resort, Law 9)

## Rules

- Never exceed rate limits on external sources
- Log every acquisition attempt (success or failure)
- Track cost: $0 for all sources (no paid APIs)
- When idle >5 minutes with empty queue: run one pie-ratchet cycle
