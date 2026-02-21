# Grocery Quote Feature

## What Changed and Why

### The Problem
Before this feature, ingredient prices in ChefFlow had to be entered manually by the chef — after they returned from shopping. This meant a chef couldn't get a reliable food cost estimate *before* quoting a client. They were guessing.

This mirrors a real culinary school exercise: students were required to fill an actual cart at the store they planned to shop at (Hannaford To Go, Shaw's To Go, etc.) to price out every dinner before quoting it. This feature automates that exercise.

### What Was Built
An automated "Grocery Quote" system that:
1. Takes the event's existing grocery ingredient list (already generated from menu → recipes → ingredients)
2. Queries **Spoonacular** (US average supermarket prices) and **Kroger** (real shelf prices) concurrently for each ingredient
3. Averages the results into a single estimated food cost
4. Generates an **Instacart cart link** pre-filled with all ingredients (chef picks their store inside Instacart — covers Hannaford, Stop & Shop, Shaw's, Whole Foods, Market Basket, and 85,000+ stores globally)
5. Shows a price comparison table (Spoonacular | Kroger | Average)
6. Offers to save discovered prices back to the Recipe Bible (`last_price_cents` on ingredients), improving future projections

---

## Key Finding: New England Grocery APIs

Market Basket, Hannaford, Shaw's, Stop & Shop, and Whole Foods have **no public APIs** — this is true of essentially all regional grocery chains. The solution is Instacart Developer Platform, which covers all of them as an intermediary.

---

## Files Added

### `lib/grocery/pricing-actions.ts`
Server actions for the pricing engine:
- `runGroceryPriceQuote(eventId)` — main action. Fetches ingredients from event menu, queries Spoonacular + Kroger in parallel, saves results to DB, builds Instacart link. Returns cached result if run within 24h.
- `getLatestGroceryQuote(eventId)` — fetches the most recent completed quote for an event.

### `lib/grocery/instacart-actions.ts`
- `buildInstacartCartLink(items[])` — POSTs to Instacart Developer Platform API (`/idp/v1/products/products_link`), returns a shareable URL. Degrades gracefully to `null` if `INSTACART_API_KEY` is not set.

### `app/(chef)/events/[id]/grocery-quote/page.tsx`
New page at `/events/[id]/grocery-quote`. Server component that loads the latest saved quote and renders the panel. Linked from the event detail page header.

### `components/events/grocery-quote-panel.tsx`
Client component with full interactivity:
- "Get Grocery Quote" / "Refresh Prices" button (calls `runGroceryPriceQuote`)
- Loading skeleton with "this may take 10–30s" note (API calls are ~40 requests for 20 ingredients)
- Price comparison table (Spoonacular | Kroger | Avg Estimate per ingredient)
- Budget bar: estimated cost vs quoted-price ceiling (color-coded)
- "Open in Instacart" button → opens pre-filled cart
- "Save Prices to Recipe Bible" → writes per-unit averages back to `ingredients.last_price_cents`

### `supabase/migrations/20260313000001_grocery_pricing.sql`
Two new tables (purely additive, no existing tables touched):
- `grocery_price_quotes` — snapshot per pricing run (totals, Instacart link, status)
- `grocery_price_quote_items` — per-ingredient results (Spoonacular price, Kroger price, average)

Both tables have RLS scoped to the chef's tenant via `user_roles`.

---

## Files Modified

### `lib/recipes/actions.ts`
Added `bulkUpdateIngredientPrices(updates[])` at the end of the file. Writes per-unit average prices from a grocery quote back to `ingredients.last_price_cents + last_price_date`. Uses `Promise.all` for parallel updates, scoped to the chef's tenant.

### `app/(chef)/events/[id]/page.tsx`
Added "Grocery Quote" button to the event header button row. Only shown when the event has a menu (`eventMenus` is truthy) and the event is not cancelled.

---

## Environment Variables Required

Add these to `.env.local` and Vercel environment settings:

```env
# Spoonacular — US average ingredient pricing
# Get free key at: https://spoonacular.com/food-api/console#Dashboard
SPOONACULAR_API_KEY=your_key_here

# Instacart Developer Platform — cart link generation
# Apply at: https://docs.instacart.com/developer_platform_api/
INSTACART_API_KEY=your_key_here

# Kroger API — real shelf prices (free)
# Register at: https://developer.kroger.com/
KROGER_CLIENT_ID=your_client_id
KROGER_CLIENT_SECRET=your_client_secret
```

**Important:** These are platform-level keys. ChefFlow registers once; all chefs benefit. Do not expose these keys to the client.

---

## How It Connects to the System

### Ingredient Flow (before this feature)
```
Menu → Dishes → Components → Recipes → recipe_ingredients → ingredients.last_price_cents
                                                                     ↑ manually entered
```

### Ingredient Flow (after this feature)
```
Menu → Dishes → Components → Recipes → recipe_ingredients → ingredients.last_price_cents
                                                                     ↑ auto-updated via
                                                              Grocery Quote → "Save to Recipe Bible"
```

### Financial Impact
- `projectedFoodCostCents` in `EventFinancialSummaryData` is computed from `last_price_cents × quantity × scale_factor`
- After a chef runs a Grocery Quote and saves prices, every future event using those same ingredients gets a more accurate projected food cost automatically
- The budget bar on the quote page compares estimate vs `quoted_price_cents × (1 - target_margin%)`, using the same budget guardrail logic as the grocery list generator

---

## API Notes

### Spoonacular
- Free tier: 150 requests/day (adequate for ~3-4 dinners/day in dev)
- Production: $99/month
- Returns cost for the exact quantity + unit requested — handles unit conversion (lbs, cups, oz, etc.)
- Coverage: global ingredient database, US average pricing

### Kroger
- Free: `developer.kroger.com`
- OAuth `client_credentials` flow (token cached 30 min in module scope)
- Returns real shelf price per package — used as reference price, not scaled by quantity
- Coverage: Kroger-family chains only (Kroger, Harris Teeter, Fred Meyer, etc.) — not in New England, but valuable for national deployments

### Instacart Developer Platform
- Requires partner approval (~1 week turnaround)
- Coverage: 85,000+ stores including all major New England chains
- Generates a shareable URL — chef picks their specific store inside Instacart
- No pricing data returned (cart building only — pricing visible inside Instacart app/web)

---

## MealMe — Local Store Pricing

MealMe is the only legitimate API covering Market Basket, Hannaford, Shaw's, Stop & Shop, Whole Foods, Walmart, and every major NE chain with real-time prices.

**To enable:**
1. Contact [mealme.ai](https://www.mealme.ai) sales to obtain an enterprise API key
2. Add `MEALME_API_KEY=your_key` to `.env.local` and Vercel
3. The "Local Stores" column in the comparison table lights up automatically on next quote run

**How it works in code:**
- `getMealMePrice(name, zipCode)` in `lib/grocery/pricing-actions.ts`
- Step 1: `GET /search/store/v3` — find nearest grocery store by chef's zip code
- Step 2: `GET /search/item/v3?store_id=...&q=...` — find ingredient at that store
- Returns price in cents; included in the multi-source average
- Auth: `Id-Token: mealme:{API_KEY}` header

**When not configured:** The "Local Stores" column renders greyed-out with dashes, and a green setup banner appears above the table explaining how to enable it.

**Migration:** `20260313000003_grocery_pricing_mealme.sql` adds `mealme_price_cents` (on `grocery_price_quote_items`) and `mealme_total_cents` (on `grocery_price_quotes`).

---

## Future Enhancements
- **Per-chef preferred store** setting (auto-select store in Instacart link)
- **Price history chart** per ingredient (trend over time using `grocery_price_quote_items`)
- **Auto-refresh trigger** — when a quote is older than 72h and event is approaching, notify chef
- **Store name in table** — once MealMe returns the matched store name, display it in the column header (e.g., "Market Basket" instead of "Local Stores")
