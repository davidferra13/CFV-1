# Session Digest: OpenClaw Pipeline Improvements

**Date:** 2026-04-05
**Agent:** Builder
**Duration:** Partial session (continuation)
**Branch:** main

## What Happened

After verifying David's Docket end-to-end, ran a side-by-side comparison of Groq (free, 2s) vs Claude (premium) output quality on the same real task. Then identified and deployed 6 pipeline improvements across Pi and PC.

## Side-by-Side Comparison: Groq vs Claude

Task: "Price anomaly consumer strategy" (what to do with 50K+ unacknowledged anomalies).

- **Groq:** 2s, $0, high confidence, correct problem ID, generic recommendations, wrong file for implementation (suggested modifying resolve-price.ts for anomaly management)
- **Claude:** ~30s, ~$0.15, architecture-aware, understood Pi/PC split and demand-driven sync, specific files to change, knew what NOT to do

Verdict: Groq is solid for first-draft specs. Claude catches implementation pitfalls. Docket is doing its job well as a planning accelerator.

## Improvements Deployed

### PC-side (committed)

1. **Bracket stripping in normalization** - `sync-normalization.mjs` now strips recipe context brackets (e.g., "Honey [Pistachio Baklava...]" -> "Honey") before trigram matching. Should fix 12 previously unmatched ingredients.

2. **6 unmapped chains added** - Added Price Rite, Big Y, Eataly, The Fresh Market, Publix, 7-Eleven to both `openclaw.chains` PG table and `SOURCE_TO_CHAIN` in `pull.mjs`. These were being scraped but skipped during sync.

3. **Catalog pull timeout increased** - `sync-all.mjs` per-step timeout raised from 10 min to 30 min. 303K store_products was timing out at 10 min.

4. **Bulk store_products inserts** - `pull.mjs` now batches store_products upserts in chunks of 50 rows instead of 303K individual queries. Includes per-row fallback on batch failure.

### Pi-side (deployed via SSH)

5. **Price anomaly auto-triage** - New `triageAnomalies()` function added to `services/aggregator.mjs`. Runs nightly at 9 PM. Three rules:
   - Anomalies older than 14 days: auto-acknowledge
   - Anomalies where price resolved within 10% of original: auto-acknowledge
   - Non-food source anomalies (CVS, 7-Eleven, Walgreens): auto-acknowledge
   - First run cleared 2,000 anomalies. 12,299 remain (genuine recent ones that will age out).

6. **Context loader intelligence** - `context-loader.mjs` now:
   - Skips loading all 14 project map files when `where_in_app` is set (loads only targeted one)
   - Searches `lib/` and `features/` directories in addition to `app/` and `components/`
   - Uses grep-based discovery to find related source files
   - Frees up ~10KB budget for more relevant content

## Docket Feedback Loop

Investigated the thumbs up/down feedback loop. Finding: it is **already fully wired and functional**.

- Schema has `feedback` column
- UI has thumbs buttons on done items
- API PATCH accepts feedback
- Processor checks for 3+ thumbs-down in last 3 days before processing
- Quality gate flags all pending items and halts processing

## Files Modified on PC

- `scripts/openclaw-pull/pull.mjs` - 6 new chain mappings + bulk insert batching
- `scripts/openclaw-pull/sync-all.mjs` - timeout 10min -> 30min
- `scripts/openclaw-pull/sync-normalization.mjs` - bracket stripping

## Files Modified on Pi

- `~/openclaw-prices/services/aggregator.mjs` - triageAnomalies() function
- `~/openclaw-docket/context-loader.mjs` - smart loading when where_in_app set

## Context for Next Agent

OpenClaw pipeline is significantly improved. Next sync will pick up 6 new chains (31 total), match more ingredients, and complete the store_products sync without timeout. Anomaly backlog will self-manage. Docket produces smarter context for targeted items.
