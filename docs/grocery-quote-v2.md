# Grocery Quote V2 — Self-Improving NE Price Engine

## What Changed

V2 adds four improvements on top of the existing V1 (Spoonacular + Kroger + MealMe + Instacart):

1. **USDA Northeast price table** — free government data, NE-regional, no API key needed
2. **Category-based NE multipliers** — nudges national API prices toward real NE levels
3. **Post-event actual cost tracking** — chef logs what they actually spent during close-out
4. **Accuracy feedback display** — shows estimated vs actual vs delta % on the quote page

---

## New Files

### `lib/grocery/usda-prices.ts`

Static lookup table of ~160 USDA ERS Northeast Urban Average Retail Food Prices (Q1 2026).

- Source: USDA Economic Research Service, Northeast Urban division
- All prices in cents per common purchase unit (lb, bunch, dozen, pint, etc.)
- Already NE-regional — no multiplier applied to these
- Fuzzy match: exact → contains → contained-by
- Update quarterly by re-downloading the ERS data CSVs

### `lib/grocery/regional-multipliers.ts`

Per-category Northeast price multipliers derived from BLS CPI Northeast Division vs US City Average.

- Applied ONLY to Spoonacular + Kroger (national averages)
- USDA prices are already NE — no multiplier applied to those
- MealMe prices are real-time local stores — no multiplier applied
- Key multipliers: produce 1.18x, fresh_herb 1.20x, specialty 1.22x, protein 1.15x, dairy 1.12x

### `supabase/migrations/20260313000004_grocery_accuracy.sql`

Additive migration — three nullable columns on `grocery_price_quotes`:

- `actual_grocery_cost_cents INT` — what the chef actually spent
- `accuracy_delta_pct DECIMAL(6,2)` — computed: (actual - estimated) / estimated × 100
- `actual_cost_logged_at TIMESTAMPTZ` — when it was recorded
- Plus an index for per-chef accuracy analytics

---

## Modified Files

### `lib/grocery/pricing-actions.ts`

- Added `lookupUsdaPrice` + `getNeMultiplier` imports
- Extended type `IngredientPriceResult` with: `category`, `usdaCents`, `hasNoApiData`
- Extended type `GroceryQuoteResult` with: `usdaTotalCents`, `actualGroceryCostCents`, `accuracyDeltaPct`
- In the main `Promise.all` loop:
  - USDA price looked up from static table (no network call)
  - NE multiplier applied to Spoonacular + Kroger before averaging
  - USDA and MealMe included in the NE-calibrated average as-is
  - `hasNoApiData: true` set when all four sources return null (falls back to Recipe Bible)
- Added `usdaTotalCents` computation in the totals section
- Updated `buildResultFromRow` to hydrate `actualGroceryCostCents` and `accuracyDeltaPct` from DB
- **New export**: `logActualGroceryCost(eventId, actualCostCents)` — finds the most recent complete
  quote for the event, updates it with actual spend, and computes `accuracy_delta_pct`
- **Bug fix (DECIMAL string)**: Supabase returns `DECIMAL` columns as strings. `buildResultFromRow`
  now parses `accuracy_delta_pct` with `Number()` before returning it — otherwise `.toFixed(1)`
  in the UI throws `TypeError: not a function` at runtime
- **Bug fix (USDA unit mismatch)**: `usdaUnitMatches()` helper checks that recipe unit and USDA
  table unit belong to the same family before multiplying. Prevents e.g. 499 cents/pint × 2 cups
  producing $9.98 instead of ~$4.99. Unknown unit combinations fall back to null (other sources used).

### `components/events/grocery-quote-panel.tsx`

- Added **USDA (NE)** column (blue text) to the price table, between Qty and Spoonacular
- Rows with `hasNoApiData === true` get amber background + "no market data" label
- Footer row now shows USDA total alongside Spoonacular/Kroger/MealMe totals
- Updated source legend to explain NE multiplier context
- **New Accuracy Check card** — appears below the Budget Check card when `actualGroceryCostCents`
  is present. Shows: Estimated total | Actual spent | Delta % (green < 10%, amber ≥ 10%)

### `components/events/close-out-wizard.tsx`

- Added import for `logActualGroceryCost` from `@/lib/grocery/pricing-actions`
- `ReceiptsStep` (Step 1) now includes a grocery cost input section visible in all three branches
  (no expenses / all receipts / missing receipts)
- `handleProceed` replaces direct `onNext` calls — saves actual cost first (non-blocking,
  won't stop chef if the save fails), then advances to next step
- The field is optional: if left blank or zero, the save is skipped

---

## How It Works End-to-End

1. Chef clicks "Get Grocery Quote" on an event
2. System fetches all ingredients from the event's menu recipes
3. For each ingredient, concurrently:
   - Looks up USDA NE price (local, instant)
   - Calls Spoonacular API → applies NE category multiplier
   - Calls Kroger API → applies NE category multiplier
   - Calls MealMe API if key configured (already NE local stores)
4. Averages all non-null NE-calibrated sources → `averageCents`
5. Flags `hasNoApiData` if all four return null (rare for common ingredients)
6. Displays a 6-column table: Ingredient | Qty | USDA (NE) | Spoonacular | Kroger | Local | Avg
7. Chef closes out event → ReceiptsStep shows optional "actual grocery spend" input
8. On proceed, `logActualGroceryCost` updates the quote row with actual cost + delta %
9. Next time chef opens the grocery quote page for that event, the Accuracy Check card appears

---

## Self-Calibration Path

The `accuracy_delta_pct` column is the foundation for future tuning:

- If the delta is consistently +20% (estimates too low), the NE multipliers need an upward nudge
- If consistently -10% (estimates too high), multipliers can be softened
- The query `SELECT AVG(accuracy_delta_pct) FROM grocery_price_quotes WHERE tenant_id = $1`
  gives per-chef accuracy across all events — future analytics surface

---

## Environment Variables Required

| Variable               | Source                             | Required?                       |
| ---------------------- | ---------------------------------- | ------------------------------- |
| `SPOONACULAR_API_KEY`  | spoonacular.com — free 150 req/day | Yes (but degrades gracefully)   |
| `KROGER_CLIENT_ID`     | developer.kroger.com — free        | Yes (but degrades gracefully)   |
| `KROGER_CLIENT_SECRET` | developer.kroger.com — free        | Yes (but degrades gracefully)   |
| `INSTACART_API_KEY`    | Instacart partner program          | Optional — cart links only      |
| `MEALME_API_KEY`       | mealme.ai enterprise               | Optional — real NE store prices |
| USDA prices            | Built-in static table              | No key needed, always available |

---

## Migration Instructions

```bash
# Apply the new accuracy columns migration
supabase db push --linked

# Verify
supabase db diff --linked
```

No data loss risk — all three new columns are nullable, with `ADD COLUMN IF NOT EXISTS`.

---

## Testing Checklist

- [ ] Run a grocery quote on an event with a menu → USDA (NE) column shows blue prices
- [ ] Ingredients with no USDA match show `—` in the USDA column (not an error)
- [ ] Amber row highlighting appears for any ingredient where all 4 sources returned null
- [ ] Totals row shows USDA total (null dash if no USDA matches for any ingredient)
- [ ] Budget Check card still works as before
- [ ] Close out an event → ReceiptsStep shows grocery cost input in all 3 branches
- [ ] Enter an actual cost → advance → open grocery quote page → Accuracy Check card appears
- [ ] Delta shows green if within 10%, amber if ≥ 10%
- [ ] Leaving grocery cost blank → no error, proceeds normally
- [ ] `npx tsc --noEmit --skipLibCheck` → zero errors
