# OpenClaw Alias Fix + Fuzzy Search (2026-03-28)

## What changed

### Problem

OpenClaw's `smart-lookup.mjs` had ~200 common aliases (e.g., "chicken thigh" -> "chicken-thighs") that pointed to USDA catalog IDs with zero prices. The USDA import created canonical ingredients with academic names ("Spices, pepper, black") but the Instacart/Flipp scrapers created their own canonical IDs ("pepper-black-ground") with real prices. Two separate catalogs, unconnected. Result: 27% of basic chef staples returned no price data.

### Fix (Pi-side, deployed)

1. **Alias remapping** (`fix-aliases.mjs`): Updated 22 existing aliases and added 42 new ones in `lib/smart-lookup.mjs` to point to the priced canonical IDs instead of USDA IDs.
2. **Missing canonicals**: Added 13 new canonical ingredients for items that had no entry at all (sweet potato, brown sugar, arborio rice, etc.).
3. **Normalization map**: Updated 63 entries in the SQLite `normalization_map` table so future scraper runs will correctly map raw names to the right canonical IDs.
4. **Fuzzy search fallback** (`add-fuzzy-search.mjs`): Added a Step 4 to `smartLookup()` - when exact alias, slug match, and LIKE search all miss, it falls back to token-based + Levenshtein fuzzy matching across all 15,000+ canonical ingredients.

### Results

| Metric                                | Before      | After       |
| ------------------------------------- | ----------- | ----------- |
| Ingredients with prices               | 55/75 (73%) | 69/75 (92%) |
| Price history rows                    | 290         | 314         |
| Previously-failing items now resolved | 0/20        | 16/20       |

### Still missing prices (4 items)

These are newly created canonical entries that the scrapers haven't populated yet:

- Sweet Potato, Brown Sugar, Mixed Greens, Red Pepper Flakes

Plus 10 items where the Pi has the canonical entry but no store has been scraped for them yet (arborio rice, balsamic vinegar, sesame oil, dijon mustard, vanilla extract, wines, filet mignon, red wine vinegar, canned tomatoes, worcestershire sauce). These will fill in as scraper runs continue.

## Files changed (Pi: ~/openclaw-prices/)

- `lib/smart-lookup.mjs` - alias fixes + fuzzy search function
- `data/prices.db` - 13 new canonical_ingredients, 63 normalization_map updates

## Files added (ChefFlow: scripts/openclaw/)

- `scripts/openclaw/fix-aliases.mjs` - alias fix script (re-runnable)
- `scripts/openclaw/add-fuzzy-search.mjs` - fuzzy search patch (idempotent)
- `scripts/run-openclaw-sync.mjs` - manual sync runner

## Next steps

1. **Expand scraper coverage** for the 14 still-missing items (sweet potato, brown sugar, etc.)
2. **Source tier passthrough** - Pi's enriched endpoint returns `tier: "retail"` for everything; should pass through the actual source type (flipp_api, retail_chain, government) so ChefFlow's 8-tier confidence system works properly
3. **Unit sanity checks** - some prices come back as package prices, not unit prices (filet mignon at $156/oz)
4. **Receipt scanning** - the long-term moat (Tier 1 data, highest trust)
