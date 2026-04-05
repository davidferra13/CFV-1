# OpenClaw Opus Distillation Burst

**Status:** Tasks 1-2 EXECUTED (2026-04-05), Tasks 3-5 pending
**Cost cap:** $50 hard limit (actual cost: $0 - executed within Claude Code session)
**Duration:** ~45 minutes for Tasks 1-2
**Concept:** Run Claude Opus temporarily to build high-quality durable artifacts in SQLite, then revert to Qwen for ongoing operations.

---

## Why This Works

The OpenClaw cross-matcher already uses `lookupMemory()` before doing any fuzzy matching. Better lookup tables = less reasoning needed = model quality matters less at runtime. This is standard knowledge distillation: teacher (Opus) produces gold-standard outputs that student (Qwen) consumes as lookup data.

## Baseline vs. Post-Distillation (2026-04-05)

| Artifact             | Before                 | After                   | Change                                |
| -------------------- | ---------------------- | ----------------------- | ------------------------------------- |
| normalization_memory | 9,736 (0.7% confirmed) | 6,929 (23.7% confirmed) | 2,807 garbage purged, 1,641 confirmed |
| learned_patterns     | 16                     | 272                     | 17x increase (7 pattern types)        |
| Category assignments | 69,149 canonical       | 69,149 (unchanged)      | Task 3 pending                        |
| Anomaly triage       | 15,540 unacked         | 15,540 (unchanged)      | Task 4 pending                        |

## Task List (Execute In Order)

### Task 1: Verify and Confirm Normalization Memory - DONE

**Status:** EXECUTED 2026-04-05 (cost: $0, within Claude Code session)
**Method:** Manual review of 250 entries (52% correct, 48% garbage), then pattern-based classifier for remaining 9,400+.
**Results:**

- Manually reviewed 250 entries, confirmed 102, deleted 148
- Built pattern classifier catching: non-food (312), beverages (416), snacks (330), baby food (278), flavored yogurt->plain yogurt (241), substring matches like "pineapple"->"Apple" (159), condiment mismatches (113), prepared meals (85)
- Worst finds: dog food->"Whole Chicken", toilet spray->"Orange", candle->"Honey", baby formula->"Lime", Appleton rum->"Apple", body lotion->"Coconut Oil"
- Auto-confirmed 1,467 clearly correct short-name matches
- **Final: 6,929 entries, 1,641 confirmed (23.7%), 5,288 need individual review**
- Pattern classifier saved to `scripts/openclaw-pull/patches/` for re-use

### Task 2: Generate Learned Patterns from Anomaly History - DONE

**Status:** EXECUTED 2026-04-05 (cost: $0)
**Method:** SQL analytics across 61K anomalies + 65K price changes + 245K current prices.
**Results:** 272 patterns generated across 7 types:

- 128 ingredient_volatility (top 200 most volatile ingredients with price ranges)
- 36 category_price_range (price distributions per food category)
- 33 store_anomaly_rate (which stores produce most anomalies)
- 22 instacart_markup (markup ratios per Instacart store vs. direct)
- 22 store_price_tier (budget/mid/premium classification per store)
- 18 change_magnitude_dist (minor/moderate/significant/major/extreme per category)
- 13 category_volatility (increase/decrease ratios, avg change per category)
- Pattern generator saved to `scripts/openclaw-pull/patches/gen-learned-patterns.py`

### Task 3: Re-categorize Canonical Ingredients (~$5-8)

**Input:** 69,149 canonical_ingredients with auto-assigned categories
**What Opus does:** Batch-review categories in groups of 100. Fix miscategorizations (e.g., "rosemary" as "protein", "pistachios" as "beverage"). Assign proper food taxonomy.
**Output:** Corrected category column on canonical_ingredients.
**Durability:** Permanent. Affects price resolution tier 9 (category baseline) and all category-based analytics.

### Task 4: Triage Anomaly Backlog (~$8-12)

**Input:** 15,540 unacknowledged price_anomalies
**What Opus does:** For each anomaly, classify as: real_anomaly (genuine price spike/crash), unit_mismatch (different package sizes), product_change (different product same name), scraper_error, or normal_variation. Bulk-acknowledge the ones that are normal.
**Output:** Classified and acknowledged anomalies. Only genuine anomalies remain unacknowledged.
**Durability:** One-time cleanup. Future anomalies classified by learned_patterns from Task 2.

### Task 5: Generate Ingredient Variant Mappings (~$3-5)

**Input:** Current cross-match rules + normalization_map
**What Opus does:** Generate explicit variant mappings: "chicken breast" = "boneless skinless chicken breast" = "chicken breast fillet" = "poultry breast". Build a comprehensive synonym table.
**Output:** Populated ingredient_variants table with verified equivalences.
**Durability:** Permanent. Cross-match checks variants before fuzzy matching.

## Total Estimated Cost: $34-52

## Guardrails

1. **Hard cap:** Set API spend limit to $50 before starting. Stop immediately if reached.
2. **Batch processing:** Process in chunks of 100-200 items. Checkpoint after each chunk (write to DB immediately, don't accumulate in memory).
3. **Rollback plan:** Snapshot all tables before the burst. If results are bad, restore from snapshot.
4. **Verification:** After the burst, run one full cross-match cycle and compare match quality before/after.
5. **No runtime dependency:** Opus is never in the runtime path. All outputs go to SQLite lookup tables. Qwen (or no AI at all) serves requests using those tables.

## Execution Plan

### Before (5 min)

1. Snapshot tables: `normalization_memory`, `learned_patterns`, `canonical_ingredients`, `price_anomalies`, `ingredient_variants`
2. Record baseline metrics: match rate, category distribution, anomaly counts

### During (2-3 hours)

3. Swap to Opus profile (via OpenClaw Vault swap script)
4. Execute Tasks 1-5 in order
5. Checkpoint after each task (commit to DB, log progress)

### After (10 min)

6. Swap back to Qwen profile
7. Run full cross-match cycle
8. Compare metrics: match rate, memory hit rate, category accuracy
9. Report results

## How to Trigger

Tell the agent: "Execute the Opus distillation burst per the spec at `docs/specs/openclaw-opus-distillation-burst.md`"

## Profile Swap Notes

The OpenClaw Vault on F: drive has 3 profiles. The swap script handles the full build transfer. See `memory/reference_openclaw_vault.md` for details. The Opus profile would need to be created (or the claw-swarm profile updated to point to Opus via API key).

**Important:** This does NOT require running Opus locally on the Pi. The burst can run via Anthropic API from the PC, writing results directly to Pi's SQLite via SSH. This avoids any Pi resource constraints.
