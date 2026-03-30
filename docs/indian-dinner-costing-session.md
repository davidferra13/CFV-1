# Indian Dinner Costing Session (2026-03-30)

## Trigger

Real client inquiry from Gunjan Gupta: 3-course Indian vegetarian dinner for 2 in Harrison, Maine. 7 dishes: Malai Soya Chaap, Paneer Tikka, Malai Kofta Curry, Egg Curry, Dry Jackfruit Stir-fry, Shahi Tukra, Gulab Jamun + sides (rice, naan, raita, papad, salad).

## What Was Done

### 1. Pi Smart-Lookup Aliases (DEPLOYED)

- Added 30+ Indian cuisine aliases to `~/openclaw-prices/lib/smart-lookup.mjs`
- Created 9 new canonical entries: paneer, milk-powder, rose-water, cardamom, green-chili, curry-leaves, fenugreek, asafoetida, tamarind
- Fixed 2 broken aliases: lettuce (pointed to nonexistent slug), chili powder (pointed to wrong slug)
- Result: 36/39 (92%) of Indian dinner ingredients now priced from actual store catalogs

### 2. Baseline Price Seeder (CREATED, NOT YET DEPLOYED)

- File: `.openclaw-deploy/seed-baseline-prices.cjs`
- Seeds market-average prices for 19 items not in any store catalog
- Key items: ghee ($9.99/16oz), rose water ($3.99/10oz), papad ($3.99/7oz)
- Tagged as `baseline_estimate` confidence (real store prices always take priority)
- **Pending:** SSH auth failed. Needs manual deployment to Pi:
  ```bash
  scp .openclaw-deploy/seed-baseline-prices.cjs pi@10.0.0.177:~/openclaw-prices/scripts/
  ssh pi@10.0.0.177 "cd ~/openclaw-prices && node scripts/seed-baseline-prices.cjs"
  ```

### 3. Menu Cost Estimator Spec (WRITTEN)

- File: `docs/specs/menu-cost-estimator.md`
- Status: `ready` for a builder agent
- Features:
  - Paste dish names, get instant cost estimate
  - Fuzzy recipe matching (pg_trgm + token overlap)
  - "Recipe needed" flags with create-recipe link
  - Per-guest scaling from recipe yield
  - Completeness dashboard (X/Y dishes costed)
  - Menu editor sidebar integration
- No database changes needed (uses existing tables and views)

## Remaining Gaps

1. **Deploy baseline seeder** (SSH auth issue, needs manual step or key fix)
2. **Builder agent** to implement the Menu Cost Estimator spec
3. **Sub-department walker** (research done at `docs/research/instacart-subcategory-slugs.md`, implementation pending)
4. **6 more stores** need catalog data (Aldi, Stop & Shop, Shaws, Costco, BJ's, Whole Foods)
