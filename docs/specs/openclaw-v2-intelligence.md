# OpenClaw v2 - Price Intelligence Engine

> Spec for transforming OpenClaw from a basic price scraper into a full-featured
> price intelligence system for professional chefs.

## Status: built

## 1. Category-Specific Markup Adjustment

**Problem:** Flat markup % per store is inaccurate. Instacart marks up produce 20-30%, meat 10-15%, pantry 5-10%.

**Solution:** Replace flat markupPct with category-aware adjustment in the scraper.

| Category       | Typical Instacart Markup |
| -------------- | ------------------------ |
| Produce        | 20-30%                   |
| Meat & Seafood | 10-15%                   |
| Dairy & Eggs   | 12-18%                   |
| Bakery         | 15-20%                   |
| Frozen         | 8-12%                    |
| Pantry/Canned  | 5-10%                    |
| Beverages      | 5-10%                    |
| Deli           | 15-20%                   |
| Snacks         | 5-10%                    |
| Household      | 3-8%                     |

**Files:** `scripts/openclaw-deep-scraper.mjs`, `.openclaw-build/lib/normalize-rules.mjs`

---

## 2. Unit Normalization Engine

**Problem:** "16 oz bag", "1 lb", "per lb" all need to resolve to same $/lb. Current regex is basic.

**Solution:** Deterministic parser that extracts quantity + unit from product name/size, then normalizes to standard units (lb, oz, each, gallon, dozen).

**Normalization chain:**

1. Parse size field ("16 oz", "2 lb bag", "6 ct")
2. Extract per-unit pricing from perUnit field ("$0.25/oz")
3. Convert to standard unit (oz -> lb at /16, fl oz -> gallon at /128)
4. Store both raw and normalized price

**Files:** New `lib/openclaw/unit-normalize.ts`

---

## 3. Product Deduplication

**Problem:** Same product appears with different names across stores. "Barilla Spaghetti 16oz" vs "Barilla Pasta Spaghetti 1lb".

**Solution:** Fuzzy matching + canonical ingredient mapping on Pi side.

- Strip brand names for matching
- Normalize sizes before comparison
- Group by canonical_ingredient_id (already exists)

**Files:** `.openclaw-build/lib/smart-lookup.mjs`

---

## 4. Shopping Optimizer

**Problem:** Chef has a menu with 30 ingredients. Which store combination minimizes total cost?

**Solution:** New Pi endpoint + ChefFlow UI component.

**Algorithm:**

1. Accept list of ingredient names + quantities
2. For each ingredient, get price at every store
3. Compute: single-store totals + optimal multi-store split
4. Return ranked results with savings breakdown

**Endpoint:** `POST /api/optimize/shopping-list`
**UI:** Component on recipe/menu costing pages

---

## 5. Price Alerts

**Problem:** Chef doesn't know when ingredients they use frequently drop in price.

**Solution:**

- Track price changes in Pi's `price_changes` table (already exists)
- New endpoint to check for significant drops (>15% in 7 days)
- ChefFlow cron checks and creates notifications

**Endpoint:** `GET /api/alerts/price-drops?threshold=15`

---

## 6. Receipt OCR

**Problem:** Chef's own receipt prices are highest-confidence (tier 1) but manual entry is tedious.

**Solution:** Photo -> Ollama OCR -> structured line items -> bulk price import.

**Flow:**

1. Chef photographs grocery receipt
2. Upload to ChefFlow
3. Ollama extracts: store name, line items (product, qty, price)
4. Fuzzy-match line items to canonical ingredients
5. Chef confirms/edits matches
6. Prices logged to ingredient_price_history as source='receipt'

**Files:** New `lib/ai/receipt-ocr.ts`, new page `app/(chef)/ingredients/receipt-scan/page.tsx`

---

## 7. Scheduled Re-Scraping

**Problem:** Prices change weekly. Manual scraper runs are unsustainable.

**Solution:** Pi cron job triggers Windows scraper via SSH reverse tunnel, or Windows Task Scheduler runs scraper on schedule.

**Schedule:**

- Full catalog scrape: Every Monday + Thursday at 2 AM
- Flipp flyer scrape: Daily at midnight (already exists)
- BLS government data: Monthly (already exists)

**Implementation:** Windows Task Scheduler `.bat` file

---

## 8. Freshness Scoring

**Problem:** A price from 30 days ago is less reliable than one from today.

**Solution:** Already partially exists in `resolve-price.ts` freshness ratings.
Enhancement: Display freshness badges in UI, flag stale prices.

| Age        | Rating  | Badge  |
| ---------- | ------- | ------ |
| 0-3 days   | Current | Green  |
| 4-14 days  | Recent  | Yellow |
| 15-30 days | Stale   | Orange |
| 31+ days   | Expired | Red    |

---

## 9. Bulk Break-Even Calculator

**Problem:** When does buying at Costco beat Market Basket?

**Solution:** Compare unit price at wholesale vs retail, factor in membership cost, calculate break-even usage volume.

**Formula:**

```
break_even_units = membership_annual / (retail_unit_price - wholesale_unit_price)
monthly_savings = (retail_price - wholesale_price) * monthly_usage
```

---

## 10. Seasonal Price Calendar

**Problem:** Lobster is cheapest in summer, asparagus in spring. No data to prove it.

**Solution:** Accumulate price history over months. After 3+ months of data, compute seasonal patterns per ingredient.

**Deferred:** Requires time to accumulate data. Build the tracking now, analysis later.

---

## Implementation Order

1. Category-specific markup (scraper accuracy)
2. Unit normalization engine (data quality)
3. Shopping optimizer endpoint (immediate chef value)
4. Scheduled re-scraping (sustainability)
5. Price alerts endpoint (proactive value)
6. Receipt OCR (highest-trust data)
7. Freshness scoring UI (trust indicators)
8. Bulk break-even (nice to have)
9. Seasonal calendar (long-term)
10. Product dedup (ongoing improvement)
