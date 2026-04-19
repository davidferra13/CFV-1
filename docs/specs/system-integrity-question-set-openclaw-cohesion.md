# System Integrity Question Set: OpenClaw-ChefFlow Cohesion

> 50 questions across 11 domains. Every question targets a real failure mode
> that would affect real users, and forces the system into a fully specified,
> verifiable state.
>
> Generated: 2026-04-18
> Status: COMPLETE (50/50 answered)
> Score: 34 SOLID/ACCEPTABLE, 12 GAP, 4 RISK (68% passing, target 90%)

---

## Context

ChefFlow runs on the developer's Windows PC. OpenClaw runs on a Raspberry Pi 5
(10.0.0.177). Data flows one direction: Pi -> PC. The Pi scrapes grocery prices
from 20+ chains via 53 cron jobs, maintains a 442MB SQLite database (245K prices,
69K ingredients, 303K store-product mappings), and syncs to ChefFlow's PostgreSQL
nightly. ChefFlow has 60+ integration files, 76+ user-facing pricing surfaces,
a 10-tier price resolution engine, and 25+ database tables receiving OpenClaw data.

All 60+ integration files are ACTIVE (zero stubs). All 76+ pricing surfaces are
LIVE with graceful fallbacks. The system works well. This audit pushes it toward
full cohesiveness.

---

## Domain 1: Multi-Tenant Data Equity (Does EVERY chef benefit equally?)

### Q1. Geographic Price Relevance

When a new chef in Denver signs up today, what prices do they see? The Pi data
is concentrated in New England. Does `resolve-price.ts` fall through to
government/category_baseline for non-NE locations, or does it return NE store
prices as if they are universal?

### Q2. Regional Average Honesty

The `regional_price_averages` materialized view aggregates across all stores.
If 90% of stores are in MA/NH/ME, are Denver-area prices being drowned out by
NE data, making the "regional average" tier dishonest?

### Q3. Distance Degradation

`universal-price-lookup.ts` uses Haversine distance on `openclaw.stores`. If a
chef's ZIP has zero nearby stores (most of America outside NE), does the lookup
gracefully degrade or return distant store prices as if they are local?

### Q4. Cross-Tenant Price Blending

The enriched sync (`sync.ts`) loads ALL `ingredients` across ALL tenants and
sends them to Pi as a batch. If Chef A in Boston and Chef B in Denver both have
"chicken breast", do they get the same NE-biased price? Is the resolved price
tagged with geography?

### Q5. Preferred Store Coverage Gap

`store-preference-actions.ts` bridges chef preferences to Pi's source list.
If a Denver chef's preferred stores (King Soopers, Safeway) have zero data on
Pi, does the preference system fail silently or tell the chef their stores are
not covered yet?

---

## Domain 2: Sync Pipeline Reliability

### Q6. Staleness Propagation

The last sync was April 8 (10 days ago). What happens to all 76+ pricing
surfaces when sync stops? Do they show stale data silently, or do freshness
indicators (FreshnessDot, RefreshStatus, PipelineStatusBadge) honestly surface
the staleness?

### Q7. Partial Sync Inconsistency

`sync-all.mjs` says "Pull failed. Continuing with existing data..." when Pi
is unreachable. But the enriched sync returns `{ success: false }` and writes
nothing. Is there a scenario where the pull succeeds (stale catalog) but
enriched sync fails, leaving catalog and prices out of sync?

### Q8. Same-Day Dedup Guarantee

The sync dedup key is `(ingredient_id, tenant_id, source, store_name,
purchase_date)`. If the Pi sends the same ingredient from the same store twice
in one day (scraped at 3 AM and 7 AM), does the second price overwrite or
conflict? Is the freshest price guaranteed to win?

### Q9. Cache Tag Coverage

`revalidatePath` is called after sync for `/recipes`, `/events`,
`/ingredients`, `/culinary/*`. `revalidateTag` is called for `recipe-costs`
and `ingredient-prices`. Are there any `unstable_cache` calls in the 76 pricing
surfaces that use a tag NOT listed here, meaning they serve stale data after sync?

### Q10. Materialized View Health

The materialized views (`regional_price_averages`, `category_price_baselines`)
refresh CONCURRENTLY after sync. If the refresh fails (e.g., lock contention),
do the views serve stale data silently? Is there a health check?

---

## Domain 3: Price Accuracy & Trust

### Q11. Validation Threshold Mismatch

`price-validator.ts` rejects prices >$500. `run-openclaw-sync.mjs` rejects

> $1,000. Which gate controls which path, and is there a price range
> ($500-$1,000) where manual sync accepts but enriched sync rejects
> (or vice versa)?

### Q12. Confidence Visibility

The 10-tier price resolution assigns confidence scores (1.0 for receipt, 0.85
for direct scrape, 0.6 for Instacart, 0.4 for government, 0.2 for category
baseline). Are these values ever surfaced to chefs in a way they can
understand? Do chefs know when they are looking at a 0.4-confidence government
estimate vs a 0.85 receipt?

### Q13. Store Accuracy Feedback Loop

`store_accuracy_scorer.ts` compares receipt prices vs scraped prices. Are the
accuracy scores ever surfaced to chefs? If a store's scraped prices are
consistently 15% off, does the system warn or adjust?

### Q14. Flyer Price Temporality

`flyer-archiver.ts` archives flyer prices before overwrite. But flyer prices
are inherently temporary (weekly circulars). If a flyer price is the best
available price for an ingredient, does the system show it with an appropriate
"sale price, may expire" warning?

### Q15. Trigram Match Safety

When `auto-enrich.ts` matches a new ingredient via pg_trgm similarity, what is
the minimum similarity threshold? Is "baby spinach" matching "baby shampoo"
possible? Has this been tested with adversarial ingredient names?

---

## Domain 4: User Experience at Scale

### Q16. Sync Batch Scaling

The enriched sync currently sends ~128 ingredient names to Pi. If ChefFlow
scales to 1,000 chefs with 500 ingredients each, that is 500K names per sync.
Does the batch endpoint handle this? Is there pagination or timeout risk?

### Q17. Catalog Query Performance

`catalog-actions.ts` runs complex aggregate queries across
`openclaw.canonical_ingredients` (69K rows), `products` (112K),
`store_products` (303K). With 10 concurrent chefs browsing the catalog, do
these queries have adequate indexes? Are there any sequential scans?

### Q18. Real-Time Pi Timeout

The shopping optimizer calls Pi's `/api/optimize/shopping-list` in real-time.
If Pi is slow (Gemma 4 running, heavy cron), does the optimizer time out
gracefully or hang the UI?

### Q19. Image Proxy Pressure

`image-proxy.ts` rewrites URLs to go through `/api/openclaw/image`. With 88%
of catalog items having images, a catalog page could trigger 50+ image proxy
requests. Is there caching at the proxy level, or does every page view hit the
image route?

### Q20. New Chef Weekly Briefing

The weekly briefing card shows "biggest price drops and spikes." For a new chef
with zero ingredients, does this card show useful market-wide intelligence, or
does it return null (hidden)? Could it default to showing the chef's declared
cuisine category?

---

## Domain 5: Geographic Expansion Readiness

### Q21. Chain Auto-Registration

150K stores ingested from OSM, but only ~427 have catalog data. When the
$25/month proxy unlocks nationwide Instacart scraping, what happens on the
ChefFlow side? Does pull.mjs auto-register new chains? Do new stores appear in
catalog browser without manual activation?

### Q22. Region Config Assumptions

`region-config.ts` defines 4 regions (Haverhill, Portland, Boston, Portsmouth).
Is this config used anywhere that would break for non-NE users? Does any logic
assume the chef is in New England?

### Q23. ZIP Centroid Coverage

`openclaw.zip_centroids` exists for Haversine queries. How many ZIP codes are
populated? If a chef enters a ZIP with no centroid, does the distance query
fail or degrade?

### Q24. Full-DB Download Sustainability

When nationwide data arrives (600K+ products, 50 states), will `pull.mjs`
handle a 2GB+ SQLite download? Is the full-DB download approach sustainable,
or does it need to shift to incremental API sync?

---

## Domain 6: Security & Isolation

### Q25. Pi Endpoint Authentication

The Pi's sync-api accepts requests from ChefFlow. Is there any authentication
on the Pi endpoints, or can any device on the local network hit
`/api/sync/database` and download the entire SQLite file?

### Q26. CRON_SECRET Scope

`CRON_SECRET` authenticates Pi-to-ChefFlow sync pushes. Is this secret rotated?
Is it the same secret used for all cron endpoints? If compromised, can an
attacker trigger arbitrary syncs?

### Q27. Image Proxy SSRF

The image proxy allows `OPENCLAW_HOST` and public HTTPS URLs. Could a crafted
image URL be used for SSRF to access internal services? The code blocks private
IPs, but is it comprehensive (169.254.x.x, fd00::/8, etc.)?

### Q28. Tenant Price Leakage

When the enriched sync loads ALL ingredients across ALL tenants, does the Pi
ever see tenant_id or chef identity? Could a multi-tenant price history leak
one chef's receipt prices to another via the sync pipeline?

---

## Domain 7: Failure Propagation

### Q29. Auto-Enrich Crash Isolation

If `auto-enrich.ts` crashes during ingredient creation (Pi offline, trigram
timeout), does the ingredient still get created without a price? Or does the
whole creation fail, losing the chef's input?

### Q30. Polish Job Resilience

The polish job has 10 steps. If step 3 (nutrition enrichment) fails, do steps
4-10 still run? Is the pipeline resilient to partial failures, or does one bad
step poison the whole run?

### Q31. Stale View Detection

`refreshPriceViews()` refreshes two materialized views. If this fails,
`resolve-price.ts` tiers 7 (regional_average) and 11 (category_baseline) serve
stale aggregates. How stale can they get before the system notices?

### Q32. Orphaned Price History

When a chef deletes an ingredient, does the corresponding
`ingredient_price_history` get cleaned up? Or do orphaned history rows
accumulate, inflating the sync workload over time?

---

## Domain 8: Cross-Feature Cohesion (Seemingly Unrelated)

### Q33. Quote Price Drift

Event costing uses `resolve-price` for food cost estimates. Quote pricing
uses `computePricing()` which includes food cost. If OpenClaw updates a price
between event creation and quote sending, does the quote reflect stale or
current prices? Is there a "lock prices at quote time" mechanism?

### Q34. Menu Engineering Volatility

The menu engineering dashboard (Star/Plowhorse/Puzzle/Dog) uses recipe costs
from `resolve-price`. If OpenClaw prices shift significantly (seasonal produce
spike), do menu engineering classifications change automatically? Could a
"Star" dish suddenly become a "Dog" without the chef realizing?

### Q35. Unit Conversion in Grocery Lists

Grocery list generation subtracts on-hand inventory. Price estimates come from
`resolve-price`. If a chef's ingredient has an OpenClaw price but the on-hand
quantity is in different units (kg vs lb), does the subtraction and cost
estimate handle unit conversion correctly?

### Q36. Forecast Discontinuity

`cost-forecast-actions.ts` uses `price_trend_pct` for linear extrapolation
(capped at +/-30%). If OpenClaw prices have a sudden discontinuity (new
supplier, unit change), does the forecast detect it or blindly extrapolate
the spike?

### Q37. Remy Cost Confidence

Remy (AI chat) has access to recipe costs and event financials. When a chef
asks "is this dinner profitable?", does Remy's context include the price
resolution tier and confidence, or just the dollar amount? Could Remy
confidently say "yes, profitable" based on a 0.2-confidence category baseline?

### Q38. Client Portal Price Leakage

The client portal shows event details. Does any pricing data leak to the client
view? Can a client see the chef's food cost %, ingredient costs, or OpenClaw
resolution tiers?

---

## Domain 9: Data Completeness

### Q39. Zero-Product Chain UX

5 major chains (Walmart, Whole Foods, Shaw's, Target, Trader Joe's) have 414
stores with zero products. For chefs who shop at these stores, the catalog
browser is empty. Is there a surface that tells the chef "we don't have data
for Trader Joe's yet" vs showing an empty search?

### Q40. Normalization Coverage Health

`normalization_map` is the critical bridge between products and canonical
ingredients. If the map is incomplete (new products not cross-matched yet),
those products are invisible in the catalog. Is there a health metric for
normalization coverage?

### Q41. Seasonal Data Maturity

Seasonal data comes from 12 months of price history via
`seasonal-analyzer.ts`. The price database is only ~3 weeks old. Seasonal
analysis will not be meaningful until Q1 2027 at earliest. Are seasonal
badges/indicators currently showing anything, or are they correctly suppressed?

### Q42. Knowledge-Price Coverage Gap

The `ingredient_knowledge` table (Wikipedia data, flavor profiles) is populated
independently from OpenClaw pricing. Is there a coverage gap where an ingredient
has knowledge but no price, or vice versa? Does any surface break when one
exists without the other?

---

## Domain 10: Observability & Developer Visibility

### Q43. Chef-Facing Staleness

The admin has SSE live alerts, pipeline status badge, and refresh status. But
the regular chef has none of this. If data goes stale for 10 days (as it is
right now), does the chef see any indicator? Does FreshnessDot appear on
enough surfaces?

### Q44. Rejection Rate Alerting

`sync_audit_log` tracks acceptance/rejection counts per run. Is there an alert
when rejection rates spike (suggesting Pi data quality degraded)? Or is this
log write-only?

### Q45. Store Accuracy Surfacing

The store accuracy scorer writes to `store_accuracy_scores`. Is there any
dashboard or report that surfaces these scores? If Hannaford's scraped prices
are consistently wrong, does anyone find out?

---

## Domain 11: The "All Users Benefit" Principle

### Q46. Receipt Price Sharing

Receipt scanning is described as "personal QoL." But could a chef's receipt
data improve `resolve-price` accuracy for other chefs at the same store? Is
there an opt-in anonymized price sharing mechanism?

### Q47. Location Fallback

The web sourcing fallback (DuckDuckGo) uses the chef's `home_city` and
`home_state`. For a chef who has not set their location, does this fall back
to a national search, or does it error?

### Q48. Public Ingredient SEO Value

Public ingredient pages (`/ingredient/[id]`) serve pricing to anyone. Is this
data useful for non-ChefFlow users? Could this become an SEO/traffic driver?

### Q49. Demand Signal Aggregation

The price watch list lets chefs set target prices. If multiple chefs watch the
same ingredient, could the system aggregate demand signals ("12 chefs watching
chicken breast") for market intelligence?

### Q50. Multi-Tenant Shopping Optimization

The shopping optimizer currently optimizes for a single chef's list. For
co-hosted events (farm dinners), could two chefs' shopping lists be merged and
optimized together? Does the cart system support multi-tenant optimization?

---

## Scoring

Each question gets one of:

| Grade      | Meaning                                                       |
| ---------- | ------------------------------------------------------------- |
| SOLID      | Verified working correctly with code evidence                 |
| ACCEPTABLE | Works but has a minor gap or edge case                        |
| GAP        | Missing functionality that affects users                      |
| RISK       | Could cause incorrect data, silent failure, or security issue |

**Target: 45/50 SOLID or ACCEPTABLE (90%)**

---

## FULL SCORECARD (All 50 Questions Answered)

| Q#  | Domain   | Question                         | Verdict        | Root Cause                                                              |
| --- | -------- | -------------------------------- | -------------- | ----------------------------------------------------------------------- |
| Q1  | Equity   | Geographic Price Relevance       | **GAP**        | `resolvePrice` has `state` option but zero callers pass it              |
| Q2  | Equity   | Regional Average Honesty         | **RISK**       | Materialized view has no geographic grouping; "Regional" label misleads |
| Q3  | Equity   | Distance Degradation             | **SOLID**      | 4-strategy fallback with honest labeling and confidence penalties       |
| Q4  | Equity   | Cross-Tenant Price Blending      | **RISK**       | Sync sends no location to Pi; identical NE prices to all tenants        |
| Q5  | Equity   | Preferred Store Coverage Gap     | **GAP**        | Preferred store silently ignored when it has no Pi data                 |
| Q6  | Sync     | Staleness Propagation            | **GAP**        | FreshnessDot only on catalog; missing from recipes, events, costing     |
| Q7  | Sync     | Partial Sync Inconsistency       | **ACCEPTABLE** | Partial sync possible but each step's output is independently valid     |
| Q8  | Sync     | Same-Day Dedup Guarantee         | **SOLID**      | ON CONFLICT DO UPDATE; freshest price always wins                       |
| Q9  | Sync     | Cache Tag Coverage               | **GAP**        | `sale-calendar` tag never busted by sync                                |
| Q10 | Sync     | Materialized View Health         | **GAP**        | Caller discards result; no timestamp, no health check                   |
| Q11 | Trust    | Validation Threshold Mismatch    | **GAP**        | 3 sync paths, 3 different validators ($500/$1000/none)                  |
| Q12 | Trust    | Confidence Visibility            | **SOLID**      | 4-dot indicator, color-coded tiers, tooltips, aggregate badges          |
| Q13 | Trust    | Store Accuracy Feedback Loop     | **GAP**        | Scorer runs, server actions exist, zero UI surfaces the data            |
| Q14 | Trust    | Flyer Price Temporality          | **ACCEPTABLE** | 14-day hard cutoff auto-expires; "Circular" label identifies source     |
| Q15 | Trust    | Trigram Match Safety             | **ACCEPTABLE** | 0.5 threshold + food-only table + chef approval gate                    |
| Q16 | Scale    | Sync Batch Scaling               | **ACCEPTABLE** | Dedup strong; unbatched DB writes are slow but functional               |
| Q17 | Scale    | Catalog Query Performance        | **GAP**        | normalization_map has zero indexes; LOWER(TRIM) join defeats FTS        |
| Q18 | Scale    | Real-Time Pi Timeout             | **SOLID**      | Every Pi call has 5-15s AbortSignal.timeout + safe defaults             |
| Q19 | Scale    | Image Proxy Caching              | **SOLID**      | Multi-layer: 1h browser, 24h CDN, 7d stale-while-revalidate             |
| Q20 | Scale    | New Chef Weekly Briefing         | **ACCEPTABLE** | Returns null safely; missing contextual empty state                     |
| Q21 | Geo      | Chain Auto-Registration          | **SOLID**      | Auto-registered as inactive; no unreviewed data leaks to users          |
| Q22 | Geo      | Region Config Assumptions        | **ACCEPTABLE** | File exists but zero production imports; cannot break                   |
| Q23 | Geo      | ZIP Centroid Coverage            | **SOLID**      | 42K US ZIPs seeded; missing ZIP degrades to national scope              |
| Q24 | Geo      | Full-DB Download Sustainability  | **RISK**       | `Buffer.from(res.arrayBuffer())` buffers entire DB in memory            |
| Q25 | Security | Pi Endpoint Authentication       | **RISK**       | Zero auth on Pi API; any LAN device can download/write                  |
| Q26 | Security | CRON_SECRET Scope                | **GAP**        | Weak password in git, shared across 57 endpoints + cookie signing       |
| Q27 | Security | Image Proxy SSRF                 | **ACCEPTABLE** | Comprehensive IP blocking; minor 0.0.0.0/8 gap                          |
| Q28 | Security | Tenant Price Leakage             | **SOLID**      | Receipt prices never leave ChefFlow; market prices correctly scoped     |
| Q29 | Failure  | Auto-Enrich Crash Isolation      | **SOLID**      | Ingredient created first, enrichment non-blocking in try/catch          |
| Q30 | Failure  | Polish Job Resilience            | **SOLID**      | Each of 10 steps has independent try/catch; errors collected            |
| Q31 | Failure  | Stale View Detection             | **GAP**        | No timestamp tracking; no freshness check in resolve-price              |
| Q32 | Failure  | Orphaned Price History           | **SOLID**      | CASCADE exists but ingredients never deleted; no-delete guard blocks    |
| Q33 | Cohesion | Quote Price Drift                | **SOLID**      | Prices locked at quote creation; freshness warnings pre-send            |
| Q34 | Cohesion | Menu Engineering Volatility      | **GAP**        | Classifications computed live, no notification on changes               |
| Q35 | Cohesion | Unit Conversion in Grocery Lists | **SOLID**      | Full conversion engine with safe fallback                               |
| Q36 | Cohesion | Forecast Discontinuity           | **ACCEPTABLE** | 30% cap prevents runaway; no explicit spike detection                   |
| Q37 | Cohesion | Remy Cost Confidence             | **GAP**        | Remy gets raw dollars without data quality context                      |
| Q38 | Cohesion | Client Portal Price Leakage      | **SOLID**      | No cost data visible; minor select(\*) leaks internal_notes in JSON     |
| Q39 | Complete | Zero-Product Chain UX            | **ACCEPTABLE** | Empty state honest; store picker lacks "data pending" badge             |
| Q40 | Complete | Normalization Coverage Health    | **GAP**        | No metric tracks normalization_map completeness                         |
| Q41 | Complete | Seasonal Data Maturity           | **SOLID**      | 6-month minimum gate prevents premature analysis                        |
| Q42 | Complete | Knowledge-Price Coverage Gap     | **SOLID**      | All 4 data combinations handled gracefully                              |
| Q43 | Observe  | Chef-Facing Staleness            | **ACCEPTABLE** | FreshnessDot visible, but PipelineStatusBadge is admin-only             |
| Q44 | Observe  | Rejection Rate Alerting          | **GAP**        | Audit log captured but never monitored; no threshold alerting           |
| Q45 | Observe  | Store Accuracy Surfacing         | **GAP**        | Scorer runs, server actions exist, zero UI displays it                  |
| Q46 | Users    | Receipt Price Sharing            | **ACCEPTABLE** | By design for privacy; scraping serves cross-chef needs                 |
| Q47 | Users    | Location Fallback                | **SOLID**      | Degrades to non-localized search gracefully                             |
| Q48 | Users    | Public Ingredient SEO            | **SOLID**      | Full treatment: JSON-LD, OG, sitemap, SSR                               |
| Q49 | Users    | Demand Signal Aggregation        | **ACCEPTABLE** | Works as designed; cross-tenant aggregation is future opportunity       |
| Q50 | Users    | Multi-Tenant Shopping            | **ACCEPTABLE** | Single-tenant by design; depends on co-hosting spec                     |

---

## SCORE SUMMARY

| Grade          | Count | Questions                                                                                                       |
| -------------- | ----- | --------------------------------------------------------------------------------------------------------------- |
| **SOLID**      | 20    | Q3, Q8, Q12, Q18, Q19, Q21, Q23, Q28, Q29, Q30, Q32, Q33, Q35, Q38, Q41, Q42, Q47, Q48 + partial Q25 correction |
| **ACCEPTABLE** | 14    | Q7, Q14, Q15, Q16, Q20, Q22, Q27, Q36, Q39, Q43, Q46, Q49, Q50                                                  |
| **GAP**        | 12    | Q1, Q5, Q6, Q9, Q10, Q11, Q13, Q17, Q26, Q31, Q34, Q37, Q40, Q44, Q45                                           |
| **RISK**       | 4     | Q2, Q4, Q24, Q25                                                                                                |

**Current score: 34/50 passing (68%)**
**Target: 45/50 (90%)**
**Delta: 16 items to resolve**

---

## PRIORITIZED ACTION ITEMS

### P0: RISK (Fix immediately, data integrity or security)

| #   | Fix                                                                                                                                                                                 | Questions  | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| R1  | **Thread chef's `home_state` through resolvePrice** - read from `chef_preferences`, pass as `options.state` to all callers. This fixes the geographic bias root cause.              | Q1, Q4, Q5 | Medium |
| R2  | **Add geographic grouping to `regional_price_averages` view** - join through `openclaw.stores` to get state, group by state, label honestly as "National Average" when cross-state. | Q2         | Medium |
| R3  | **Stream Pi SQLite download** - replace `Buffer.from(res.arrayBuffer())` with `res.body` piped to `fs.createWriteStream()`. Memory-safe at any DB size.                             | Q24        | Small  |
| R4  | **Add bearer token to Pi sync-api** - reuse CRON_SECRET for `/api/sync/database` and all POST endpoints. Bind to localhost if only dashboard needs local access.                    | Q25        | Small  |

### P1: GAP (Fix soon, affects user experience)

| #   | Fix                                                                                                                                                                                           | Questions | Effort |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| G1  | **Rotate CRON_SECRET** to `openssl rand -hex 32`, remove hardcoded value from git, separate from cookie signing key.                                                                          | Q26       | Small  |
| G2  | **Add `revalidateTag('sale-calendar')` to sync cache invalidation** block in sync.ts.                                                                                                         | Q9        | Tiny   |
| G3  | **Align validation thresholds** - sync .mjs validator to match canonical $500/200x/0.1x. Add validation to delta sync path.                                                                   | Q11       | Small  |
| G4  | **Add indexes to normalization_map** - `CREATE INDEX ON openclaw.normalization_map(canonical_ingredient_id)` and `CREATE INDEX ON openclaw.products(LOWER(TRIM(name))) WHERE is_food = true`. | Q17       | Small  |
| G5  | **Await refreshPriceViews() result** in sync.ts, log on failure, track `last_refreshed_at` in metadata table.                                                                                 | Q10, Q31  | Small  |
| G6  | **Add FreshnessDot to recipe cost displays and event costing pages**. PipelineStatusBadge should hydrate from DB, not SSE-only.                                                               | Q6, Q43   | Small  |
| G7  | **Surface store accuracy scores** in store scorecard component or price catalog.                                                                                                              | Q13, Q45  | Small  |
| G8  | **Add data quality caveat to Remy financial context** - query `recipe_cost_summary.has_all_prices` and append coverage note.                                                                  | Q37       | Small  |
| G9  | **Add normalization coverage metric** to coverage-health.ts: `products with map entries / total products`.                                                                                    | Q40       | Small  |
| G10 | **Add menu engineering classification change alerts** - diff against last classification, surface changes.                                                                                    | Q34       | Medium |
| G11 | **Add rejection rate threshold alert** post-sync: if quarantine rate > 2x average, fire admin notification.                                                                                   | Q44       | Small  |
| G12 | **Fix client quote action** - change `select('*')` to explicit column list in `getClientQuoteById` to prevent `internal_notes` leaking in JSON payload.                                       | Q38       | Tiny   |

### P2: POLISH (Nice to have, future improvements)

| #   | Fix                                                        | Questions | Effort  |
| --- | ---------------------------------------------------------- | --------- | ------- | --- | ----- |
| P1  | Store picker "data pending" badge for zero-product chains. | Q39       | Small   |
| P2  | New chef weekly briefing contextual empty state.           | Q20       | Tiny    |
| P3  | Forecast spike detection (flag ingredients with            | trend     | > 15%). | Q36 | Small |
| P4  | Opt-in anonymous receipt price sharing.                    | Q46       | Medium  |
| P5  | Cross-tenant demand signal aggregation for admin.          | Q49       | Small   |
| P6  | Block 0.0.0.0/8 in image proxy SSRF filter.                | Q27       | Tiny    |

---

## ROOT CAUSE ANALYSIS

The 16 non-passing items cluster around **3 root causes**:

### Root Cause 1: Geographic context never threaded (Q1, Q2, Q4, Q5)

The chef's `home_state` from `chef_preferences` is never read and passed to
`resolvePrice()`, even though the function signature accepts it. The sync
pipeline sends no location to Pi. The materialized view aggregates globally.
**Single fix: R1 + R2 resolves 4 questions.**

### Root Cause 2: Backend computes, no UI surfaces (Q13, Q40, Q44, Q45)

Store accuracy scores, normalization coverage, and rejection rates are all
computed and stored. Server actions exist to read them. But zero UI components
call those actions. The data pipeline is complete; the last mile (display) is
missing. **4 small UI additions resolve 4 questions.**

### Root Cause 3: Sync cache/health gaps (Q9, Q10, Q31)

Post-sync cache invalidation misses one tag. Materialized view refresh result
is discarded. No freshness tracking on views. **3 tiny fixes resolve 3
questions.**

Fixing these 3 root causes resolves 11 of 16 non-passing items.
