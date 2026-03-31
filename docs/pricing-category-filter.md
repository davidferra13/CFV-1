# Pricing: Non-Food Category Filter

**Date:** 2026-03-31
**File changed:** `lib/pricing/universal-price-lookup.ts`

## Problem

The universal price lookup uses full-text search on `openclaw.products` to find prices for ingredient queries. Because the product catalog includes non-food items (pet food, cleaning supplies, personal care, etc.), food ingredient searches returned irrelevant results:

- "chicken breast" returned Milk-Bone Dog Treats as the top result
- "salmon" returned Purina Fancy Feast cat food as the top result

These contaminated the median price calculation and made confidence scores meaningless.

## Fix

Added a `NON_FOOD_CATEGORIES` exclusion list and a `LEFT JOIN` to `openclaw.product_categories` in both product search queries (location-filtered and national). Six categories are excluded:

| Category           | Products excluded            |
| ------------------ | ---------------------------- |
| Personal_care      | 4,488                        |
| Household          | 4,358                        |
| Pets               | 2,400                        |
| Health Care        | 2,358                        |
| Baby               | kept (includes formula/food) |
| Kitchen Supplies   | 1,496                        |
| Pet                | 446                          |
| **Total excluded** | **15,546 (15.8%)**           |

Products with no category (`pc.name IS NULL`) are kept to avoid false exclusions.

## Before / After

| Ingredient     | Before (top result)          | After (top result)                             |
| -------------- | ---------------------------- | ---------------------------------------------- |
| chicken breast | Milk-Bone Dog Treats ($3.82) | Boneless Chicken Breast ($7.47/lb)             |
| salmon         | Purina Fancy Feast ($1.06)   | Norwegian Salmon ($9.56/lb)                    |
| milk           | Silk Almond Milk ($3.21)     | Same (candy bar "Dairy Milk" is food category) |
| cilantro       | Cilantro ($2.17)             | Same (was already clean)                       |
| olive oil      | Atlas Olive Oil ($23.21)     | Same (was already clean)                       |

## Remaining known issues

- FTS matches product names containing common words (e.g., "milk" matches "Cadbury Dairy Milk" candy). This is a relevance ranking issue, not a category issue. The median is still accurate because candy bars are outnumbered by actual milk products.
- Geographic coverage is 3 states (MA, NH, ME). Non-NE ZIPs fall back to national scope with NE-only data. This requires infrastructure expansion (residential proxy for Instacart), not a code fix.
