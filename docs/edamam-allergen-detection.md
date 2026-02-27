# Edamam Allergen Detection — Implementation Notes

**Date:** 2026-02-26
**Feature:** Allergen detection for recipes via Edamam Nutrition Analysis API
**Branch:** `feature/risk-gap-closure`

---

## What Changed

### New Files

| File                                          | Purpose                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `lib/nutrition/edamam.ts`                     | Edamam API utility — `analyzeRecipe()` sends ingredient lines, returns nutrition + allergen data                    |
| `lib/recipes/allergen-actions.ts`             | Server action — `detectAllergens(recipeId)` fetches ingredients from DB, sends to Edamam, returns structured result |
| `components/recipes/allergen-badge-panel.tsx` | Client component — on-demand allergen check with color-coded badges                                                 |

### Modified Files

| File                                               | Change                                               |
| -------------------------------------------------- | ---------------------------------------------------- |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx` | Added `AllergenBadgePanel` below the Nutrition panel |

---

## How It Works

### Flow

1. Chef opens a recipe detail page
2. Chef clicks "Check Allergens" button
3. Server action `detectAllergens()` fetches recipe ingredients from Supabase
4. Ingredients are formatted as natural language lines (e.g., "2 cups rice")
5. Lines are sent to Edamam's Nutrition Analysis API
6. Edamam returns health labels (e.g., `PEANUT_FREE`, `VEGAN`) and cautions (e.g., `GLUTEN`)
7. Allergens are **derived deterministically** from health labels: if `DAIRY_FREE` is absent, the recipe contains dairy
8. Results are cached in Upstash (30-day TTL) and displayed as color-coded badges

### Allergen Derivation Logic (Formula > AI)

This is a **deterministic formula**, not AI interpretation. Edamam's API returns structured health labels like `PEANUT_FREE`, `GLUTEN_FREE`, etc. The logic is:

- If `*_FREE` label is **present** → recipe does NOT contain that allergen
- If `*_FREE` label is **absent** → recipe CONTAINS that allergen

This covers all 14 major allergens recognized by FDA/EU food labeling:
Peanuts, Tree Nuts, Dairy, Eggs, Gluten, Wheat, Soy, Fish, Shellfish, Crustaceans, Mollusks, Sesame, Celery, Mustard, Lupine, Sulfites.

### Badge Colors

| Color  | Variant   | Meaning                | Example                                |
| ------ | --------- | ---------------------- | -------------------------------------- |
| Red    | `error`   | Major allergen present | "Dairy", "Tree Nuts", "Gluten"         |
| Yellow | `warning` | Caution flag           | "FODMAPs", "Sulfites"                  |
| Green  | `success` | Positive health label  | "Vegan", "Vegetarian", "Keto Friendly" |

---

## API Details

### Edamam Nutrition Analysis API

- **Endpoint:** `POST https://api.edamam.com/api/nutrition-details?app_id={id}&app_key={key}`
- **Body:** `{ "ingr": ["1 cup rice", "2 tbsp olive oil", ...] }`
- **Free tier:** 10,000 calls/month
- **Auth:** App ID + App Key (env vars: `EDAMAM_APP_ID`, `EDAMAM_APP_KEY`)

### Caching Strategy

Results are cached in Upstash Redis with a 30-day TTL. The cache key is a hash of the sorted, normalized ingredient lines. This means:

- Same recipe checked twice → 1 API call (second is cached)
- Recipe edited with different ingredients → new API call
- Cache expires after 30 days → fresh API call

This keeps usage well under the 10K/month free tier limit.

---

## Graceful Degradation

| Scenario                 | Behavior                                                                        |
| ------------------------ | ------------------------------------------------------------------------------- |
| API keys not set         | Panel shows "Add EDAMAM_APP_ID and EDAMAM_APP_KEY to enable allergen detection" |
| API call fails           | Returns empty arrays — panel shows no allergens (non-blocking)                  |
| Upstash unavailable      | Bypasses cache — calls API directly                                             |
| No ingredients on recipe | Button disabled, shows "Add ingredients to check for allergens"                 |

---

## Setup

1. Sign up at [developer.edamam.com](https://developer.edamam.com/) (free tier)
2. Create a Nutrition Analysis application
3. Add to `.env.local`:
   ```
   EDAMAM_APP_ID=your_app_id
   EDAMAM_APP_KEY=your_app_key
   ```
4. Restart dev server

---

## Safety Disclaimer

The allergen detection panel includes a disclaimer: allergen data is based on ingredient parsing and may not account for cross-contamination. Chefs should always verify with ingredient suppliers for safety-critical decisions. This is a **detection aid**, not a substitute for proper allergen management protocols.
