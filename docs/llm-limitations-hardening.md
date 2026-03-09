# LLM Limitations Hardening - Implementation Report

Based on insights from a research talk on fundamental LLM limitations (pattern-matching, not reasoning; rationalization, not analysis; conservation of information).

## Phase 1: Safety-Critical Fixes

### 1A. Semantic Validation for Allergen Risk (`lib/ai/allergen-risk.ts`)

**Problem:** Zod validates JSON structure but not logical consistency. AI could return `riskLevel: "safe"` alongside `triggerAllergen: "shellfish"` - valid JSON, dangerous lie.

**Fix:** Added `validateAllergenResult()` that catches two contradiction types:
- "safe" + non-null triggerAllergen -> upgraded to "may_contain" (conservative)
- "contains"/"may_contain" + null triggerAllergen -> downgraded to "unknown" (needs review)

Runs AFTER both formula and AI paths. Adds safety flag when corrections are made.

### 1B. Pricing Anchor Removal (`lib/ai/quote-draft.ts`)

**Problem:** The prompt sent `Chef's average per-person rate (from history): $X` directly to the LLM. Per the talk, LLMs anchor to provided numbers and regress toward them instead of reasoning about the actual event.

**Fix:**
- Removed the average from the prompt entirely
- Kept the historical data fetch for a POST-generation sanity check
- If AI quote is >2x or <0.5x the historical average, a warning note is appended for the chef to review
- The AI now prices from event details (guest count, occasion, dietary needs) without anchoring

### 1C. Deterministic Confidence Scores (4 files)

**Problem:** AI-generated confidence scores are meaningless. An LLM saying "high confidence" is pattern-matching on prompt format, not assessing actual accuracy.

**Fix:** Overrode AI-generated confidence with deterministic metrics:

| File | Deterministic Confidence Metric |
|------|------|
| `allergen-risk.ts` | Dish description coverage (>80% = high, >50% = medium, else low) |
| `temp-log-anomaly.ts` | Entry count (>=5 = high, >=2 = medium, else low) |
| `pricing-intelligence.ts` | Comparable event count (>=5 = high, >=3 = medium, else low) |
| `client-portal-triage.ts` | Message length (>=50 chars = high, >=15 = medium, else low) |

Remaining AI files (15+ parsing files) still have AI-generated confidence. These are lower priority since they're text extraction (not safety-critical reasoning), but the same pattern can be applied incrementally.

## Phase 2: Privacy Fix

### Recipe Scaling: Gemini to Ollama (`lib/ai/recipe-scaling.ts`)

**Problem:** Recipe text (ingredients, method, name) is chef intellectual property. Was routed to Gemini (Google's cloud API), violating the privacy boundary.

**Fix:**
- Removed `@google/genai` import
- Replaced with `parseWithOllama` (local processing)
- Added Zod schema (`ScaleResultSchema`) for structured output validation
- Proper `OllamaOfflineError` handling (hard fail with clear message, no silent fallback)

## Phase 3: Prompt Quality

### Pricing Anchor in Pricing Intelligence (`lib/ai/pricing-intelligence.ts`)

**Problem:** Same anchor bias as quote-draft. Sent `Avg comparable price: $X` to the LLM.

**Fix:** Removed the pre-computed average. Added instruction: "Analyze the full historical pricing data. Do NOT anchor to any single average number."

### Em Dash Cleanup

Removed em dashes from all 6 edited files per project style rules.

## Files Changed

| File | Changes |
|------|---------|
| `lib/ai/allergen-risk.ts` | Semantic validation + deterministic confidence + em dash cleanup |
| `lib/ai/quote-draft.ts` | Anchor removal + post-generation sanity check + em dash cleanup |
| `lib/ai/recipe-scaling.ts` | Full rewrite: Gemini to Ollama + Zod validation |
| `lib/ai/temp-log-anomaly.ts` | Deterministic confidence override + em dash cleanup |
| `lib/ai/pricing-intelligence.ts` | Anchor removal + deterministic confidence + em dash cleanup |
| `lib/ai/client-portal-triage.ts` | Deterministic confidence override + em dash cleanup |

## Principles Established

1. **Formula > AI** (reinforced): 7 AI calls replaced with formulas in Phase 2 (previous session)
2. **Semantic validation**: Check logical consistency of AI output, not just JSON structure
3. **No anchoring**: Never send pre-computed averages/targets to the LLM
4. **Deterministic confidence**: Confidence = data quality metric, not AI self-assessment
5. **Privacy boundary**: Chef IP (recipes) stays local via Ollama, never cloud APIs

## Remaining Work (Lower Priority)

- Apply deterministic confidence pattern to 15+ parsing files (parse-client, parse-recipe, etc.)
- These are text extraction tasks where AI confidence is less dangerous but still meaningless
- Pattern is established; can be applied incrementally as files are touched
