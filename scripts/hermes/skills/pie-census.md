# pie-census

Expand the ingredient manifest. Match new products to canonical ingredients.

## What to do

1. Query ingredient_price_history for product_names not in ingredient_census
2. For each unmatched product:
   a. Normalize the name (strip brand, size, quantity)
   b. Fuzzy-match against existing census entries (>0.85 similarity)
   c. If match found: link product to census entry
   d. If no match: create new census entry
3. Stop after 100 items or 10 minutes
4. Log to hermes_actions

## Rules

- Never merge two existing census entries (that requires chef approval)
- Prefer exact matches over fuzzy
- Categories must come from the canonical category list
- Log confidence scores for all fuzzy matches
