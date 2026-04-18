# Receipt Intelligence + Recipe Scaling Engine

**Date:** 2026-04-18
**Status:** Built (pending migration apply)
**Type:** Deterministic Engine (Formula > AI)

---

## Problem

Two gaps prevent receipts and recipes from being first-class deterministic systems:

1. **Receipt data loss**: Gemini parser extracts quantity but discards it at persistence. Unit prices computed with qty=1 default. No learning from manual corrections. No unit normalization at match time.
2. **Naive scaling**: All 5 scaling consumers use `(guestCount / recipeServings) * scaleFactor`. `PORTIONS_BY_SERVICE_STYLE` defined but unused. Seasonings scale linearly. No waste buffer. No pack rounding.

## Solution

Two deterministic engines. Zero LLM calls in the core. One additive migration.

---

## System 1: Receipt Intelligence

### Structured Data Extraction

- Gemini parser now extracts `unit` field per line item (lb, oz, each, etc.)
- Regex parser handles weight-priced (`2.31 LB @ $4.99/LB`), quantity prefix (`2x ITEM`), and quantity-at-price (`ITEM 2@$3.99`) patterns
- `receipt_line_items` table has new `quantity` and `unit` columns
- Approval pipeline passes actual quantity/unit to `logIngredientPrice`

### Receipt Learning

- New `receipt_ingredient_mappings` table remembers manual corrections
- `suggestIngredientMatches` checks learned mappings before string similarity
- Confidence scales: 1 use = 0.80, 3+ = 0.92, 5+ = 0.97
- Store-specific mappings with store-agnostic fallback

### Unit Normalization

- `applyLineItemPrices` converts receipt units to ingredient's `default_unit` via conversion engine
- Prevents incorrect per-unit prices when receipt says "2 lb" but ingredient tracks in "oz"

### Price Sanity Guard

- Compares new price to `average_price_cents` before auto-applying
- > 50% deviation sets `price_flag_pending = true` with reason text
- Chef must accept or reject via `resolvePriceFlag` action
- Prevents $30/lb chicken because qty defaulted to 1

---

## System 2: Recipe Scaling

### Central Engine (`lib/scaling/recipe-scaling-engine.ts`)

Single source of truth replacing 5 duplicated linear formulas.

**Pipeline:** base qty -> guest scaling -> service style -> category modifier -> yield adjustment -> waste buffer -> pack rounding

**4 scaling categories:**
| Category | Behavior | Applies to |
|----------|----------|-----------|
| linear | 1:1 with multiplier | Proteins, produce, dairy, pantry |
| sublinear | 75-90% of linear | Spices, herbs, condiments |
| fixed | Stays at base qty | Bay leaves, vanilla beans |
| by_pan | Rounds up to batch increments | Oils for sauteeing |

Override per ingredient via `ingredients.scaling_category`.

### Service Style Multipliers (now live)

`PORTIONS_BY_SERVICE_STYLE` from `industry-benchmarks.ts` wired into shopping list and grocery list:

- Plated: 1.0x (3% waste)
- Family style: 1.15x (8% waste)
- Buffet: 1.25x (12% waste)
- Cocktail: 0.75x (5% waste)
- Tasting menu: 0.85x (4% waste)
- Stations: 1.3x (15% waste)

### Waste Buffer

Applied after yield adjustment, before on-hand subtraction. Rate from service style.

### Pack Rounding

- Count units (each, can, bunch): `Math.ceil`
- Weight: nearest 0.25
- Volume: nearest 0.5
- Custom pack size overrides all

### Yield Inference (`lib/scaling/yield-inference.ts`)

When `yield_quantity` and `servings` are both NULL, infers from protein weight / standard portion (170g). Read-only, never auto-writes.

### Purchase Feedback (`lib/scaling/purchase-feedback.ts`)

Analyzes purchase variance across 3+ events. Suggests recipe qty adjustments when chef consistently over-buys by 15%+. Read-only diagnostic for recipe detail page.

---

## Migration

`database/migrations/20260418000002_receipt_intelligence_and_scaling.sql`

All additive. No drops, no renames.

- `receipt_line_items`: +`quantity`, +`unit`
- New table: `receipt_ingredient_mappings` (with RLS)
- `ingredients`: +`scaling_category`, +`price_flag_pending`, +`price_flag_new_cents`, +`price_flag_reason`

---

## Files

### New (5)

- `database/migrations/20260418000002_receipt_intelligence_and_scaling.sql`
- `lib/receipts/receipt-learning.ts`
- `lib/scaling/recipe-scaling-engine.ts`
- `lib/scaling/yield-inference.ts`
- `lib/scaling/purchase-feedback.ts`

### Modified (7)

- `lib/ai/parse-receipt.ts` - unit field in Gemini schema + prompt
- `lib/ocr/receipt-parser.ts` - quantity/unit regex patterns
- `lib/receipts/actions.ts` - persist qty/unit, pass through pipeline
- `lib/finance/expense-line-item-actions.ts` - learning, unit normalization, sanity guard, resolvePriceFlag
- `lib/expenses/receipt-actions.ts` - pass qty/unit from Ollama parser
- `lib/culinary/shopping-list-actions.ts` - service style + waste buffer
- `lib/grocery/generate-grocery-list.ts` - service style + waste buffer

---

## Backward Compatibility

- Plated events (default) produce identical results (multiplier=1.0, wasteExpected=3%)
- Null quantity/unit in receipts gracefully defaults to qty=1, unit=null
- Ingredients with no price history skip sanity check
- `scaling_category` defaults to 'linear' (existing behavior)

## What This Does NOT Do

- No AI in the core engines (Formula > AI)
- No auto-modification of recipe quantities (purchase feedback is read-only)
- No UI changes (backend engines only; UI surfaces are next)
- No new API routes
