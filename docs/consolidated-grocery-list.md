# Consolidated Grocery List: Multi-Event Shopping

> Implemented 2026-03-26. Merges grocery lists across multiple events into one shopping trip.

## Problem

A chef with 3 events this week generates 3 separate grocery lists. They shop 3 times, buying the same chicken breast, olive oil, and garlic at each trip. Shared ingredients are purchased redundantly.

## Solution

One API call produces a single consolidated grocery list PDF that:

- Aggregates all ingredients across all events in a date range
- Combines shared ingredients (same ingredient + same unit = summed quantities)
- Shows which events need each ingredient (event attribution)
- Subtracts current inventory (same as single-event lists)
- Merges allergy alerts across all events/clients
- Combines budget ceilings across events

## API

```
GET /api/documents/consolidated-grocery?from=2026-03-24&to=2026-03-30
```

**Query params:**

- `from` (required): Start date, YYYY-MM-DD
- `to` (required): End date, YYYY-MM-DD

**Returns:** PDF (inline disposition) or JSON error

**Auth:** Requires chef session

**Event filter:** Only events with status `confirmed`, `paid`, `accepted`, or `in_progress` are included.

## How It Works

1. Fetch all events in the date range with actionable statuses
2. For each event, walk the full recipe chain: event -> menu -> dishes -> components -> recipes -> recipe_ingredients
3. Aggregate by ingredient_id + unit across all events
4. Track per-event quantities (event breakdown)
5. Query `inventory_current_stock`, convert units, subtract on-hand
6. Bin into store sections (same as single-event: PROTEINS, PRODUCE, DAIRY/FATS, PANTRY, SPECIALTY)
7. Render to one-page PDF with event summary header

## PDF Layout

```
CONSOLIDATED GROCERY LIST
Mar 24 - Mar 30, 2026  |  3 events

  Mon 3/24: Johnson (8 guests) - Birthday Dinner
  Wed 3/26: Smith (20 guests) - Corporate Lunch
  Sat 3/29: Davis (12 guests) - Anniversary

Combined budget: $1,200  |  Projected: ~$890  |  7 shared ingredients

* ALLERGY ALERT: TREE NUTS, SHELLFISH

STOP 1: MARKET BASKET
  PROTEINS
  [ ] Chicken Breast - 8 lb (have 2 lb on hand) [3/24 Birthday, 3/26 Corporate]
  [ ] Salmon Fillet - 5 lb [3/29 Anniversary]

  PRODUCE
  [ ] Garlic - 6 head [3/24 Birthday, 3/26 Corporate, 3/29 Anniversary]
  ...
```

Shared ingredients show `[event labels]` so the chef knows why the quantity is high.

## Files

- `lib/documents/generate-consolidated-grocery-list.ts` - Data fetcher + PDF renderer
- `app/api/documents/consolidated-grocery/route.ts` - API endpoint

## Integration with Existing System

- Uses the same `inventory_current_stock` view and `convertQuantity()` engine as single-event lists
- Same store section mapping (CATEGORY_TO_SECTION)
- Same budget guardrail logic (quoted_price x target_margin)
- Same allergy alert merging pattern
- PDF uses same `PDFLayout` primitives

## Future Enhancements

- Dashboard "Week Shopping" button that auto-sets date range to current week
- Pre-shopping substitution suggestions for shared ingredients
- Vendor routing: suggest which store to visit based on historical prices per ingredient
- Print per-event grocery sub-lists alongside the consolidated view
