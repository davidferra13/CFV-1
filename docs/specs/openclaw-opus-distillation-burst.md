# OpenClaw Opus Distillation Burst

**Status:** Ready to execute
**Cost cap:** $50 hard limit
**Duration:** 2-3 hours
**Concept:** Run Claude Opus temporarily to build high-quality durable artifacts in SQLite, then revert to Qwen for ongoing operations.

---

## Why This Works

The OpenClaw cross-matcher already uses `lookupMemory()` before doing any fuzzy matching. Better lookup tables = less reasoning needed = model quality matters less at runtime. This is standard knowledge distillation: teacher (Opus) produces gold-standard outputs that student (Qwen) consumes as lookup data.

## Current State (Baseline - 2026-04-05)

| Artifact             | Count            | Quality             | Gap                     |
| -------------------- | ---------------- | ------------------- | ----------------------- |
| normalization_memory | 9,736            | 0.7% confirmed      | 99.3% unverified        |
| learned_patterns     | 16               | Seeded from history | Sparse (should be 500+) |
| Category assignments | 69,149 canonical | Most auto-assigned  | Unknown accuracy        |
| Anomaly triage       | 15,540 unacked   | Untriaged           | All ignored             |

## Task List (Execute In Order)

### Task 1: Verify and Confirm Normalization Memory (~$8-12)

**Input:** 9,736 `normalization_memory` entries (raw_name -> matched_to pairs)
**What Opus does:** For each entry, evaluate whether the mapping is correct. Score confidence 0-1. Mark confirmed = 1 for good matches, delete bad ones.
**Output:** Confirmed normalization_memory table with high-confidence mappings only.
**Durability:** Permanent. Qwen looks up confirmed entries and skips fuzzy matching.

### Task 2: Generate Learned Patterns from Anomaly History (~$10-15)

**Input:** 61,022 price_anomalies + 65,019 price_changes
**What Opus does:** Analyze patterns by category, store, season, product type. Generate rules like: "Produce prices spike 30-50% in Feb-Mar (winter supply shortage)" or "Instacart prices are consistently 15-25% above flyer prices for the same item."
**Output:** 500+ learned_patterns entries with category, pattern_type, description, confidence, parameters (JSON).
**Durability:** Permanent. The aggregator and cross-match consult these for anomaly classification.

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
