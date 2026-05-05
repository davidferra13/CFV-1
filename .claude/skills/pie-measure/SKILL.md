---
name: pie-measure
description: Quick PIE health snapshot. Measures all key metrics without making changes. Use before/after ratchet runs, after syncs, or anytime you want to know where PIE stands. Read-only, fast, outputs structured data.
---

# PIE Measure

Read-only snapshot of PIE's current state. No changes, no fixes, just numbers.
The measurement half of the ratchet, extracted so it can run independently.

## Trigger Conditions

- Before any `/pie-ratchet` or `/pie-fix` run (baseline)
- After any OpenClaw sync completes (verify improvement)
- User says "PIE status", "how's pricing", "coverage?", "measure PIE"
- Part of `/morning` briefing (condensed form)
- Before session close (track drift)

## Output Format

```
PIE HEALTH SNAPSHOT [2026-05-04T14:30:00Z]
==========================================
LAYER 1: PRICE RESOLUTION
  Census size:           70,234
  Total coverage:        61.2% (real+synthetic / census)
  Real price coverage:   24.8%
  Synthetic coverage:    36.4%
  Naked ingredients:     27,251 (NO price at all)
  States with data:      31/50
  Pricing regions:       52/400
  Multi-source:          14.7%
  Freshness (7d vol):    41.3%
  Freshness (14d mod):   58.2%
  Freshness (30d stb):   72.1%
  Stale (past tier):     8,442

LAYER 2: INTELLIGENCE
  Volatility scores:     0% (not built)
  Seasonal calendars:    0% (not built)
  Regional multipliers:  0% (not built)
  Trend data depth:      0 ingredients with 30+ days history

ACCURACY (spot-check)
  Last validation:       never
  Accuracy %:            unmeasured

SOURCES
  Active chains:         N
  Active stores:         N
  Last Pi sync:          [timestamp]
  Pi reachable:          yes/no

TARGETS (6mo)
  Coverage:              61.2% -> 90% [===-------] 68% to goal
  Real prices:           24.8% -> 50% [=====-----] 50% to goal
  States:                31 -> 45     [======----] 69% to goal
  Freshness:             41.3% -> 70% [======----] 59% to goal
```

## Data Sources

### Proven Working Query Pattern (tested 2026-05-04)

Connection: `postgres` package (NOT `pg`), URL from `.env.local`:
`postgresql://postgres:postgres@127.0.0.1:54322/postgres`

**IMPORTANT:** `npx tsx -e` with inline code silently swallows stdout.
Write a temp `.mts` file in project root, run it, then delete it.
Use `console.error()` or `process.stderr.write()` for output.

```typescript
// _pie_measure_tmp.mts (delete after use)
import postgres from 'postgres'
const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres')

// Core counts (fast, <1s)
const census = await sql`SELECT COUNT(*)::int as cnt FROM openclaw.canonical_ingredients`
const linked =
  await sql`SELECT COUNT(DISTINCT canonical_ingredient_id)::int as cnt FROM openclaw.normalization_map`
const priced =
  await sql`SELECT COUNT(*)::int as cnt FROM openclaw.store_products WHERE price_cents > 0`
const stores = await sql`SELECT COUNT(*)::int as cnt FROM openclaw.stores WHERE is_active = true`
const states =
  await sql`SELECT COUNT(DISTINCT state)::int as cnt FROM openclaw.stores WHERE is_active = true`
const chains =
  await sql`SELECT COUNT(DISTINCT chain_id)::int as cnt FROM openclaw.stores WHERE is_active = true`
const norms = await sql`SELECT COUNT(*)::int as cnt FROM openclaw.normalization_map`

console.error(`Census: ${census[0].cnt}`)
console.error(`Linked: ${linked[0].cnt} (${((linked[0].cnt / census[0].cnt) * 100).toFixed(1)}%)`)
console.error(`Naked: ${census[0].cnt - linked[0].cnt}`)
console.error(`Priced products: ${priced[0].cnt.toLocaleString()}`)
console.error(`Stores: ${stores[0].cnt.toLocaleString()}`)
console.error(`States: ${states[0].cnt}`)
console.error(`Chains: ${chains[0].cnt.toLocaleString()}`)
console.error(`Norm entries: ${norms[0].cnt.toLocaleString()}`)

await sql.end()
process.exit(0)
```

Run: `npx tsx _pie_measure_tmp.mts 2>&1`
Then: `rm _pie_measure_tmp.mts`

### Heavy queries (run in background, 30s+ on 39M rows)

```typescript
// Multi-source (joins against 39M store_products - SLOW)
const multi = await sql`
  SELECT
    COUNT(*) FILTER (WHERE src_count = 1)::int as single,
    COUNT(*) FILTER (WHERE src_count >= 2)::int as multi,
    COUNT(*) FILTER (WHERE src_count >= 3)::int as triangulated
  FROM (
    SELECT nm.canonical_ingredient_id, COUNT(DISTINCT s.chain_id) as src_count
    FROM openclaw.normalization_map nm
    JOIN openclaw.products p ON LOWER(TRIM(p.name)) = LOWER(TRIM(nm.raw_name))
    JOIN openclaw.store_products sp ON sp.product_id = p.id AND sp.price_cents > 0
    JOIN openclaw.stores s ON s.id = sp.store_id AND s.is_active = true
    GROUP BY nm.canonical_ingredient_id
  ) sub
`

// Freshness (SLOW on 39M rows)
const fresh = await sql`
  SELECT
    COUNT(*) FILTER (WHERE last_seen_at > now() - interval '7 days')::int as d7,
    COUNT(*) FILTER (WHERE last_seen_at > now() - interval '30 days')::int as d30,
    COUNT(*) FILTER (WHERE last_seen_at <= now() - interval '30 days')::int as stale,
    COUNT(*)::int as total
  FROM openclaw.store_products WHERE price_cents > 0
`
```

### Existing Code to Leverage

1. `lib/pricing/coverage-report.ts` - `generateCoverageReport()` already computes:
   - total_chains, chains_with_data, total_products, total_prices
   - states_covered, states_with_data
   - by_state breakdown, by_category breakdown
   - weakest/strongest states

2. `lib/pricing/price-intelligence-governor.ts` - `PriceIntelligenceSummary` has:
   - expectedCanonicalIngredients, discoveredCanonicalIngredients
   - freshObservedPriceFacts, inferredPriceFacts, surfaceablePriceFacts
   - stalePriceFacts, statesCovered, marketsCovered, zipsCovered

3. `lib/openclaw/pi-stats.ts` - Pi connectivity check

4. `scripts/openclaw-pull/config.mjs` - Pi endpoint at `10.0.0.177:8081`

### Pi (secondary, often unreachable)

```bash
ping -n 1 -w 2000 10.0.0.177  # check network first
ssh -o ConnectTimeout=3 davidferra@10.0.0.177 "sqlite3 ~/prices.db 'SELECT COUNT(*) FROM store_products WHERE price_cents > 0'"
```

### Last sync time

```bash
cat scripts/openclaw-pull/.last-sync-time
```

## Workflow

1. Check Pi reachability (timeout 3s)
2. Query local PG using existing `generateCoverageReport()` or direct SQL
3. Check last sync time from `scripts/openclaw-pull/.last-sync-time`
4. Compute deltas vs last ratchet log entry (if exists)
5. Output structured snapshot
6. If called as part of ratchet: return data object for Phase 2 ranking

## Condensed Form (for /morning)

When called as part of morning briefing, output single line:

```
PIE: 61.2% covered (24.8% real), 31 states, 41% fresh. 27K naked.
```

## Machine-Readable Output

When called programmatically (by ratchet or other skills), return JSON:

```json
{
  "timestamp": "2026-05-04T14:30:00Z",
  "census_size": 70234,
  "coverage_pct": 61.2,
  "real_pct": 24.8,
  "synthetic_pct": 36.4,
  "naked_count": 27251,
  "states_covered": 31,
  "regions_active": 52,
  "multi_source_pct": 14.7,
  "freshness_7d_pct": 41.3,
  "stale_count": 8442,
  "pi_reachable": true,
  "last_sync": "2026-05-04T02:00:00Z",
  "layer2_ready": false
}
```

## Constraints

- **Read-only.** Never modify data.
- **Fast.** Target < 10 seconds total execution.
- **Honest.** If a query fails, report "unknown", never fabricate.
- **Comparable.** Output format must be stable so deltas can be computed across runs.

## Key Files

- Coverage report: `lib/pricing/coverage-report.ts`
- Intelligence governor: `lib/pricing/price-intelligence-governor.ts`
- Pi stats: `lib/openclaw/pi-stats.ts`
- Sync config: `scripts/openclaw-pull/config.mjs`
- Last sync: `scripts/openclaw-pull/.last-sync-time`
- Ratchet log: `docs/pie-ratchet-log.md`
- National vision: `docs/specs/pie-national-vision.md`
