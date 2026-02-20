# Grocery List Document Generator

## What Changed

Added a **Grocery List PDF** as the 5th printed document in ChefFlow's document system. It sits alongside the existing FOH Menu, Prep Sheet, Execution Sheet, and Non-Negotiables Checklist — and is now the first document in the "Print All" bundle (page 1 of 5).

## Why It Was Added

The grocery list is Stage 6 of the private dinner lifecycle (the full process is documented in the HOW I MAKE A GROCERY LIST process document). Without this feature, the chef had to build the grocery list manually — retracing the menu's component/recipe structure by memory and adding quantities from scratch.

The generator makes the list automatic: the moment a menu exists with linked recipes and ingredients, the grocery list can be generated.

## How It Works

### Data Flow

```
Event → Menu → Dishes → Components → Recipes → recipe_ingredients → ingredients
```

The fetch phase (`fetchGroceryListData`) walks this chain:

1. Fetches event (dates, guest count, quoted price) and client (name)
2. Fetches chef preferences for store names and target margin
3. Finds the first menu attached to the event
4. Fetches all dishes (ordered by course_number)
5. Fetches all components — separates those with a `recipe_id` from those without
6. For components **with** a recipe: fetches `recipe_ingredients` joined to `ingredients`
7. Aggregates ingredients by `(ingredient_id, unit)` key — summing quantities across all components that reference the same recipe, applying each component's `scale_factor`
8. Skips ingredients where `is_staple = true` (salt, pepper, olive oil — assumed always on hand)
9. For components **without** a recipe: records them as warning placeholders (ingredients unknown)

### Stops and Sections

Items are binned into two stops:
- **Stop 1 (Grocery Store):** All non-alcohol ingredients, organized into sections: PROTEINS / PRODUCE / DAIRY & FATS / PANTRY / SPECIALTY
- **Stop 2 (Liquor Store):** Any ingredient with `category = 'alcohol'`

Stop 2 is omitted entirely if no alcohol ingredients are present.

Store names come from `chef_preferences.default_grocery_store` and `chef_preferences.default_liquor_store`. If not set, defaults to "GROCERY STORE" and "LIQUOR STORE".

### Budget Guardrail

If the event has a `quoted_price_cents` AND the chef has a `target_margin_percent` in preferences:

```
budget_ceiling = quoted_price_cents × (1 - target_margin_percent / 100)
```

Example: $800 quote at 60% target margin → $320 food budget.

Projected cost is computed by summing `quantity × last_price_cents` for all TO BUY items. Only shown if at least 50% of items have recorded prices (to avoid misleadingly low estimates from partial price data).

### PDF Layout

One page, US Letter, following the same `PDFLayout` helper used by all other documents:
- Title + event header bars (client, guests, date)
- Budget line (if computable)
- Stop 1 sections with checkbox rows (uses `pdf.checkbox()` — drawn square boxes)
- Stop 2 section (if present)
- Warning section for components without recipes
- Footer with item count, stop count, budget, and quantity disclaimer

Font auto-scales to fit: `> 25 items → 0.85x`, `> 40 items → 0.75x`.

## Files Changed

| File | Change |
|---|---|
| `lib/documents/generate-grocery-list.ts` | **NEW** — full generator (fetch + render + generate) |
| `app/api/documents/[eventId]/route.ts` | Added `case 'grocery'`; added grocery as page 1 of `case 'all'`; updated "5 documents" |
| `lib/documents/actions.ts` | Added `groceryList` field to `DocumentReadiness` type and return value |
| `components/documents/document-section.tsx` | Added Grocery List row (first in list); updated "5 Sheets" |

## What This Does NOT Do (MVP Scope)

- **No inventory/on-hand tracking** — the "ON HAND" concept from the spec requires a dedicated inventory system that doesn't exist yet. All ingredients from recipes are listed as TO BUY. A future iteration can add a per-event "mark as on hand" interface.
- **No carry-forward detection** — the `unused_ingredients` table exists but surfacing leftovers interactively is out of scope for this pass.
- **No unit conversion** — quantities are `recipe_ingredient.quantity × component.scale_factor`. The footer notes "verify for your guest count." Full yield-aware scaling is a future enhancement.
- **No state machine** — the spec describes a `draft → reviewed → finalized → shopping_complete → reconciled` lifecycle. This MVP generates the list on demand with no state tracking, matching the existing pattern of the other four documents.
- **No version history** — grocery list changes are not tracked (no `grocery_list_revisions` table).
- **No insurance items** — the chef-configurable insurance items list is not implemented.

## Connection to the System

The grocery list is the first operational document in the event lifecycle:

```
Menu confirmed → Grocery List ready
       ↓
Chef shops → Receipt captured (expenses)
       ↓
Prep List actions unlock fully
       ↓
Event execution
```

The Prep Sheet already exists as the AT HOME / ON SITE task list. The Grocery List is the prerequisite to that — it ensures the ingredients are in the kitchen before the prep begins.

The receipt capture system (via `lib/ai/parse-receipt.ts` and `components/expenses/expense-form.tsx`) is the downstream step: once the chef shops, they photograph receipts and the AI extracts line items into the expense system. That data flows back into `ingredient_price_history`, which improves the budget projection accuracy on future grocery lists.
