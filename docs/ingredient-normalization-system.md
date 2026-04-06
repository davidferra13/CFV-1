# Ingredient Normalization System

> Built 2026-04-06. Address-validation pattern for ingredient names.

## What It Does

Every ingredient a chef uses gets matched against a canonical database of 5,435+ system ingredients (sourced from OpenClaw/USDA). This enables:

- **Accurate food costing**: every ingredient maps to a real price record
- **Yield-aware calculations**: boneless vs bone-in chicken have different yields
- **Cross-chef consistency**: "EVOO" and "Extra Virgin Olive Oil" resolve to the same canonical entry

## How It Works (Formula, Not AI)

### Step 1: Name Normalization

Deterministic string processing in `lib/pricing/ingredient-matching-utils.ts`:

- Lowercase, strip punctuation, collapse hyphens
- Expand abbreviations: EVOO -> extra virgin olive oil, AP flour -> all purpose flour
- Strip articles (a, an, the, of)
- Depluralize (tomatoes -> tomato)

### Step 2: Trigram Similarity Matching

PostgreSQL `pg_trgm` extension compares normalized name against system_ingredients:

- Breaks strings into 3-character sequences and computes overlap
- Returns similarity score 0.0 to 1.0
- Score >= 0.5 creates a pending auto-match
- Score >= 0.8 treated as high-confidence for batch confirmation

### Step 3: Chef Approval

Auto-matches are marked as "pending" (confirmed_at = NULL). The chef sees:

- Coverage percentage and progress bar
- List of pending matches with Confirm/Dismiss buttons
- Completely unmatched ingredients with top suggestions
- Batch confirm button for all pending matches

## Key Files

| File                                              | Purpose                                               |
| ------------------------------------------------- | ----------------------------------------------------- |
| `lib/pricing/ingredient-health-actions.ts`        | Health stats, pending matches, unresolved ingredients |
| `lib/pricing/ingredient-matching-actions.ts`      | Suggest, confirm, dismiss match actions               |
| `lib/pricing/ingredient-matching-utils.ts`        | Name normalization (deterministic)                    |
| `components/pricing/ingredient-health-banner.tsx` | Health banner with inline review queue                |
| `app/(chef)/recipes/ingredients/page.tsx`         | Ingredient library (shows banner)                     |
| `app/(chef)/culinary/costing/page.tsx`            | Food costing page (shows banner)                      |

## Ingredient Status Lifecycle

```
New ingredient added to recipe
    |
    v
autoMatchToSystemIngredient() runs (pg_trgm)
    |
    +-- Score >= 0.5 --> Creates ingredient_alias (confirmed_at = NULL) --> PENDING
    |
    +-- Score < 0.5 --> No alias created --> UNMATCHED
    |
    v
Chef reviews in Health Banner
    |
    +-- Clicks "Confirm" --> Sets confirmed_at = now() --> CONFIRMED
    |
    +-- Clicks "Dismiss" --> Sets match_method = 'dismissed' --> DISMISSED
    |
    v
Price resolution uses alias for 10-tier pricing chain
```

## Database Tables

- `ingredients`: Chef's ingredient records (tenant-scoped)
- `system_ingredients`: Canonical reference database (5,435+ entries, read-only)
- `ingredient_aliases`: Links chef ingredients to system_ingredients
  - `confirmed_at IS NOT NULL` = chef confirmed
  - `confirmed_at IS NULL + system_ingredient_id IS NOT NULL` = pending auto-match
  - `match_method = 'dismissed'` = chef said "none of these"
  - No alias record = completely unmatched

## Coverage Metric

Coverage % = (confirmed + dismissed) / total ingredients

- > = 90%: Green (ready for reliable costing)
- > = 60%: Amber (usable with caveats)
- < 60%: Red (too many unknowns for reliable costing)

Dismissed ingredients count as "resolved" because the chef made an active decision.

## Market Price Bridge

The system bridges OpenClaw's 9.8M store_product prices to system_ingredients using full-text search matching against product names with size data.

**Pipeline:**

```
openclaw.products (7.5M, with size_value/size_unit)
    |
    FTS match against system_ingredient name
    |
    Price normalization: divide price_cents by size_value
    Unit conversion: all weights to per-lb, all volumes to per-fl-oz
    |
    Aggregation: avg, median, min, max, store_count
    |
    openclaw.system_ingredient_prices (1,169 ingredients)
    |
    resolvePrice() Tier 6.5: MARKET AGGREGATE
    |
    Any chef who normalizes their ingredient gets this price
```

**Script:** `scripts/sync-system-ingredient-prices.mjs`

- Run periodically after OpenClaw sync
- Processes all 5,435 system_ingredients
- Uses FTS to find matching products with size data
- Normalizes prices to per-lb (weight) or per-fl-oz (volume)
- Filters outliers ($0.10 to $150 per unit)
- Currently covers 1,169 / 5,435 (22%) of system ingredients
- The 78% unmatched are mostly USDA-specific entries (branded items, processed foods)

**Tier 6.5 in resolve-price.ts:**

- Confidence: 0.55 to 0.65 (based on store count and freshness)
- Sits between Regional Average (0.50) and Government (0.40)
- Only activates when ingredient has a system_ingredient alias

## Current Coverage (2026-04-06)

| Metric                                | Value                             |
| ------------------------------------- | --------------------------------- |
| System ingredients with market prices | 1,169 / 5,435 (22%)               |
| Store coverage                        | 474 stores, 3 states (MA, NH, ME) |
| Price records in pipeline             | 9.8M                              |
| Developer's ingredients covered       | 69 / 75 (92%)                     |
