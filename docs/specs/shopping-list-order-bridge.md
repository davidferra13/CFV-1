# Shopping List / Order Bridge

> **Status:** draft
> **Priority:** P1 (3rd highest-impact exit-point improvement)
> **Depends on:** ingredient-quantity-lifecycle (verified), recipe-costing-integrity (built), receipt-intelligence-and-recipe-scaling (built)
> **Estimated complexity:** medium (8-12 files)
> **Exit points addressed:** 8, 9, 10 from `docs/research/chef-exit-points-analysis.md`

---

## Problem

Vendor ordering is the 3rd most frequent reason a chef leaves ChefFlow (weekly, per event). The chef has menus and recipes in ChefFlow, but when it is time to buy, they manually reconstruct what they need by scanning recipes, estimating quantities, and typing items into vendor portals. Three exit points are permanent:

- **Exit 8:** Browse vendor's full product catalog (US Foods, Sysco, Restaurant Depot, local purveyors)
- **Exit 9:** Place an order with a vendor (vendor ordering portal)
- **Exit 10:** Check order status / delivery tracking (vendor apps)

ChefFlow will never be an ordering system. Vendor catalogs and checkout flows belong to vendors. But ChefFlow owns the data that feeds every order: what ingredients, how much, for which events, from which vendor. The bridge closes the gap between "I know what I need" and "I typed it into the order form."

---

## Existing Infrastructure (Do Not Duplicate)

The codebase already has substantial shopping list machinery. This spec extends it; it does not rebuild it.

### Already Built

| System                      | File                                     | What It Does                                                                                                                                                                    |
| --------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shopping list generator     | `lib/culinary/shopping-list-actions.ts`  | `generateShoppingList()` with date range, event filtering, multi-event consolidation, yield adjustment, service style scaling, sub-recipe recursion, allergen cross-referencing |
| Smart grocery list          | `lib/grocery/smart-list-actions.ts`      | Persistent grocery lists with aisle sections, check-off, price estimates                                                                                                        |
| Grocery list PDF            | `lib/documents/generate-grocery-list.ts` | Document generation for grocery lists                                                                                                                                           |
| Vendor model                | `vendors` table                          | Per-chef vendors with type, contact info, preferred flag, reliability score, minimum order                                                                                      |
| Vendor-ingredient mapping   | `vendor_preferred_ingredients` table     | Links ingredients to vendors with price, lead time, min order qty, preferred flag                                                                                               |
| Vendor price entries        | `vendor_price_entries` table             | Historical vendor-specific pricing                                                                                                                                              |
| Ingredient preferred vendor | `ingredients.preferred_vendor` column    | Text field for quick vendor assignment                                                                                                                                          |
| Best vendor price view      | `ingredient_best_vendor_price` view      | DISTINCT ON cheapest vendor per ingredient                                                                                                                                      |
| Inventory tracking          | `inventory_transactions` table           | On-hand quantities by ingredient (receive, deduction, waste, etc.)                                                                                                              |
| Recipe scaling engine       | `lib/scaling/recipe-scaling-engine.ts`   | 4-category scaling (linear/sublinear/fixed/by_pan), service style multipliers, waste buffer, pack rounding                                                                      |
| Yield adjustment            | Wired in both generators                 | `COALESCE(recipe_ingredients.yield_pct, ingredients.default_yield_pct, 100)` resolution                                                                                         |
| Receipt intelligence        | `lib/receipts/`                          | Receipt parsing, ingredient matching, learning, price sanity guard                                                                                                              |
| Ingredient lifecycle view   | `event_ingredient_lifecycle` DB view     | Full chain: recipe_qty, buy_qty, purchased_qty, used_qty, leftover_qty per event                                                                                                |

### What Is Missing (This Spec Adds)

1. **Export formats** for carrying a shopping list to a vendor portal
2. **Per-vendor sublists** split from the consolidated list
3. **Shopping history** (what was actually purchased per event, linked to receipts)
4. **Incomplete recipe flagging** when ingredients lack quantities
5. **Copy-friendly formatting** optimized for pasting into order forms
6. **Single-event quick list** shortcut (today most paths require a date range)

---

## Architecture

```
Event(s) / Menu(s)
       |
       v
generateShoppingList()         <-- already built (date range + event filter)
       |
       v
ShoppingListItem[]             <-- already has: ingredientId, name, category, supplier,
       |                           unit, recipeQty, yieldPct, totalRequired, onHand,
       |                           toBuy, estimatedCostCents, allergenFlags
       |
       +---> [NEW] splitByVendor()        --> per-vendor sublists
       +---> [NEW] formatForExport()      --> plain text, clipboard, email, print
       +---> [NEW] flagIncompleteRecipes() --> recipes missing ingredient quantities
       +---> [NEW] recordPurchase()       --> log what was actually bought (manual or receipt link)
       |
       v
Export (clipboard / email / print)  -->  Chef carries list to vendor portal
       |
       v
Post-event: receipt scan links back --> shopping history per event
```

No new database tables. All new logic is server actions + UI formatting.

---

## Feature 1: Auto-Generated Shopping List (Extend Existing)

### What Exists

`generateShoppingList()` already produces a complete, consolidated, yield-adjusted, allergen-flagged list from events in a date range. It groups by ingredient, sums across events, subtracts on-hand inventory, and resolves prices.

### What to Add

**1A. Single-event shortcut**

Add an `eventId` convenience parameter that wraps the existing date-range logic:

```typescript
export async function generateEventShoppingList(eventId: string): Promise<ShoppingListResult> {
  // Fetch event date, call generateShoppingList with eventIds: [eventId]
  // and startDate/endDate set to event_date
}
```

**1B. Category grouping for display**

The `ShoppingListItem.category` field already exists (from `ingredients.category`). Add a utility to group items by category and sort within groups:

```typescript
export function groupByCategory(items: ShoppingListItem[]): Map<string, ShoppingListItem[]> {
  // Group by item.category, sort categories in grocery-store walk order:
  // produce, meat_seafood, dairy_eggs, bakery, deli, frozen, pantry_dry,
  // canned, condiments_sauces, spices, baking, beverages, bulk,
  // international, household, other
}
```

Uses the same `AisleSection` taxonomy from `smart-list-actions.ts`.

**1C. Incomplete recipe flagging**

Recipes where `recipe_ingredients.quantity` is NULL or 0 produce unreliable shopping lists. Flag them, do not fake quantities.

```typescript
export type IncompleteRecipeWarning = {
  recipeId: string
  recipeName: string
  ingredientName: string
  reason: 'missing_quantity' | 'missing_unit' | 'missing_ingredient_record'
}
```

Add `incompleteRecipes: IncompleteRecipeWarning[]` to `ShoppingListResult`. The UI shows a warning banner: "3 recipes have missing quantities. Shopping list may be incomplete."

---

## Feature 2: Multi-Event Consolidation (Already Built)

`generateShoppingList()` already accepts a date range and optional `eventIds` array. It sums quantities across all matching events, applying per-event guest counts and service styles. The `eventCount` field on each `ShoppingListItem` tracks how many events use that ingredient.

### What to Add

**2A. Event attribution per item**

Add `eventBreakdown` to `ShoppingListItem`:

```typescript
eventBreakdown: Array<{
  eventId: string
  eventDate: string
  eventLabel: string // "Smith Dinner 6/14" or "Johnson Wedding 6/15"
  quantityForEvent: number
}>
```

Chef can see "I need 12 lbs chicken total: 5 lbs for Smith Dinner, 7 lbs for Johnson Wedding."

**2B. Week-view shortcut**

```typescript
export async function generateWeekShoppingList(): Promise<ShoppingListResult> {
  // Monday-Sunday of current week, all confirmed/accepted/paid events
}
```

---

## Feature 3: Export Formats

The bridge. Chef generates the list in ChefFlow, then carries it to the vendor portal.

### 3A. Plain Text (Clipboard)

Optimized for pasting into vendor order forms, text messages, or notes apps.

```
SHOPPING LIST - Week of June 14-20, 2026
3 events, 47 guests total
========================================

PRODUCE
  Arugula               2 lbs         ~$7.98
  Fingerling potatoes   8 lbs         ~$15.92
  Lemons                12 each       ~$6.00
  Mixed greens          3 lbs         ~$11.97

PROTEIN
  Chicken breast        12 lbs        ~$47.88
  Salmon fillet         8 lbs         ~$95.92
  Shrimp (16/20)        4 lbs         ~$43.96

DAIRY
  Heavy cream           2 qt          ~$7.98
  Butter (unsalted)     3 lbs         ~$11.97

DRY GOODS
  Arborio rice          3 lbs         ~$8.97
  Panko breadcrumbs     1 lb          ~$3.49

========================================
ESTIMATED TOTAL: ~$261.04
Items without prices: 2 (marked with *)
Recipes with missing quantities: 1 (Basil Oil - no quantities specified)
```

Format rules:

- Left-align ingredient names, right-align quantities
- Prices are estimates (prefix with `~`)
- Items without prices get an asterisk, explained in footer
- Incomplete recipes noted in footer
- No special characters that break when pasted into web forms

### 3B. Per-Vendor Text

Same format but split by vendor:

```
ORDER FOR: Restaurant Depot
========================================
PROTEIN
  Chicken breast        12 lbs
  Shrimp (16/20)        4 lbs

DRY GOODS
  Arborio rice          3 lbs
  Panko breadcrumbs     1 lb

========================================

ORDER FOR: Whole Foods
========================================
PRODUCE
  Arugula               2 lbs
  ...
```

### 3C. Email Share

Server action that sends the plain-text list to a specified email address (chef's own, or a vendor contact email from the `vendors` table). Uses existing Remy email infrastructure. Subject line: "Shopping List - [date range]".

### 3D. Print-Friendly View

A dedicated print-optimized page (`/chef/shopping-list/print`) that renders the list with:

- No nav, no sidebar, no interactive elements
- Category headers as section breaks
- Checkbox column for manual check-off while shopping
- Compact typography optimized for paper
- Uses `@media print` CSS, no separate PDF generation needed

---

## Feature 4: Vendor Assignment and Sublists

### What Exists

Three vendor-ingredient mapping sources already in the database:

1. `ingredients.preferred_vendor` (text, quick assignment)
2. `vendor_preferred_ingredients` table (structured, with pricing and lead times)
3. `vendor_items` table (used by shopping list generator for price lookup)

`generateShoppingList()` already resolves a `supplier` field per item using vendor_items data, preferring the cheapest vendor.

### What to Add

**4A. Vendor sublist splitter**

```typescript
export function splitByVendor(items: ShoppingListItem[]): Map<string, ShoppingListItem[]> {
  // Group by item.supplier
  // "Unassigned" group for items without vendor mapping
  // Sort vendors alphabetically, unassigned last
}
```

**4B. Vendor assignment UI**

On the shopping list page, each item shows its current vendor. A dropdown lets the chef reassign to any vendor in their `vendors` table. Changes persist to `vendor_preferred_ingredients` so future lists remember the assignment.

**4C. Bulk vendor assignment**

Select multiple items, assign all to a vendor at once. Common pattern: "all produce from the farm, all proteins from Restaurant Depot."

**4D. Vendor order summary**

Per-vendor subtotal with item count and estimated cost:

```
Restaurant Depot     8 items    ~$142.50
Local Farm           5 items    ~$48.20
Whole Foods          3 items    ~$31.90
Unassigned           2 items    ~$7.98
```

---

## Feature 5: Pantry Offset (Already Built)

### What Exists

`generateShoppingList()` already queries `inventory_transactions` to compute on-hand quantities per ingredient and subtracts from the required amount. The `ShoppingListItem` type has `onHand` and `toBuy` fields.

### What to Add

**5A. Manual on-hand override**

On the shopping list page, chef can edit the "on hand" number for any item. This does not modify inventory records; it is a session-level override for this shopping run only. Use case: "I know I have 2 lbs of butter at home even though inventory says 0."

**5B. "I have this" quick action**

One-click to mark an item as fully in stock (sets `toBuy` to 0 for this list). Visually strikes through the item.

---

## Feature 6: Shopping History

### What Exists

- `inventory_transactions` with `transaction_type = 'receive'` and `event_id` tracks purchases per event
- `event_ingredient_lifecycle` view shows the full chain (recipe_qty through leftover_qty)
- Receipt intelligence (`lib/receipts/`) parses receipts and links line items to ingredients

### What to Add

**6A. Post-shopping log**

After an event, the shopping history tab shows:

| Column                      | Source                                                                   |
| --------------------------- | ------------------------------------------------------------------------ |
| What the list said to buy   | `event_ingredient_lifecycle.buy_qty`                                     |
| What was actually purchased | `inventory_transactions` where `type = 'receive'` and `event_id` matches |
| Purchase cost               | `inventory_transactions.cost_cents` or linked `receipt_line_items`       |
| Variance                    | purchased - buy_qty                                                      |

No new tables. This is a read-only view composing existing data.

**6B. Receipt link**

When a receipt is scanned and approved via the existing receipt intelligence pipeline, link it to an event. The `receipt_line_items` already have `ingredient_id` after matching. The `inventory_transactions` already have `event_id`. The connection exists; the UI just needs to surface it on the shopping history view.

**6C. Manual purchase entry**

For items bought without a receipt (farmers market, cash purchases): a quick-entry form that creates an `inventory_transaction` with `type = 'receive'`, the event_id, ingredient_id, quantity, and cost. Existing `createInventoryTransaction` server action handles this.

**6D. Purchase variance learning**

Cross-reference with `lib/scaling/purchase-feedback.ts` (already built). When a chef consistently buys 20% more salmon than the list says, surface this on the recipe detail page. This is read-only diagnostic, already implemented. The shopping history view links to it.

---

## Files Modified

| File                                       | Change                                                                                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/culinary/shopping-list-actions.ts`    | Add `generateEventShoppingList()`, `generateWeekShoppingList()`, `groupByCategory()`, `splitByVendor()`, `formatForExport()`, `flagIncompleteRecipes()`, event breakdown on items |
| `lib/culinary/shopping-list-export.ts`     | **NEW.** Plain text formatter, per-vendor text formatter, email export action. Separated from actions to keep the main file focused.                                              |
| `lib/culinary/shopping-history-actions.ts` | **NEW.** `getShoppingHistory(eventId)` composing `event_ingredient_lifecycle` view + receipt links. Manual purchase entry wrapper.                                                |
| `app/(chef)/shopping-list/page.tsx`        | Extend with export buttons (copy, email, print), vendor sublists toggle, on-hand overrides                                                                                        |
| `app/(chef)/shopping-list/print/page.tsx`  | **NEW.** Print-optimized view with `@media print`                                                                                                                                 |
| `components/shopping/export-toolbar.tsx`   | **NEW.** Copy-to-clipboard, email share, print, per-vendor toggle                                                                                                                 |
| `components/shopping/vendor-sublist.tsx`   | **NEW.** Collapsible per-vendor sections with subtotals                                                                                                                           |
| `components/shopping/shopping-history.tsx` | **NEW.** Post-event purchase history with variance display                                                                                                                        |

**5 new files, 2 modified files.** No new database tables. No migrations.

---

## Database Changes

None. All required tables, columns, and views already exist:

- `vendors`, `vendor_preferred_ingredients`, `vendor_items`, `vendor_price_entries`
- `ingredients.preferred_vendor`, `ingredients.category`
- `inventory_transactions` (on-hand, purchases)
- `event_ingredient_lifecycle` view
- `receipt_line_items`, `receipt_ingredient_mappings`

---

## Edge Cases

| Scenario                                             | Behavior                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Recipe has no ingredients                            | Skip recipe, include in `incompleteRecipes` warnings                                                       |
| Ingredient has quantity but no unit                  | Use "each" as default unit, include in warnings                                                            |
| Ingredient has no price data                         | Show item with `*` marker, exclude from total estimate                                                     |
| No vendor assigned to ingredient                     | Group under "Unassigned" in vendor sublists                                                                |
| Same ingredient from two vendors at different prices | Use `vendor_preferred_ingredients.is_preferred` flag; fall back to cheapest                                |
| Zero guest count on event                            | Default to 10 (existing behavior in `shopping-list-actions.ts`)                                            |
| Event has no menu                                    | Skip event, do not error. Note in footer: "1 event has no menu"                                            |
| Ingredient unit on recipe differs from vendor unit   | Convert via `lib/units/conversion-engine.ts` (existing). If conversion fails, show recipe unit with a note |
| Chef has no vendors configured                       | Show all items in a single ungrouped list. No vendor split UI.                                             |
| Duplicate ingredient across sub-recipes              | Already handled by existing aggregation in `generateShoppingList()`                                        |

---

## Exit Points Closed

| Exit # | Scenario              | Before                                                                              | After                                                                                                                                                       |
| ------ | --------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8      | Browse vendor catalog | Chef mentally reconstructs what they need, opens vendor site, searches item by item | Chef copies per-vendor shopping list from ChefFlow, opens vendor site, pastes/references list. Knows exact quantities.                                      |
| 9      | Place vendor order    | Chef types items and quantities from memory into vendor portal                      | Chef copies formatted list to clipboard, pastes into vendor order form. Or emails list to vendor contact directly from ChefFlow.                            |
| 10     | Check order status    | No connection between ChefFlow and what was ordered                                 | Shopping history shows what was on the list vs. what was actually received (via receipt scan or manual entry). Chef knows if anything is still outstanding. |

**None of these exits are eliminated.** They are permanent. The chef will always go to vendor portals to browse and order. What changes: the chef arrives at the vendor portal already knowing exactly what they need, in exactly the right quantities, grouped by vendor. The round-trip time drops from 30+ minutes of mental reconstruction to 10 seconds of copy-paste.

---

## What This Spec Does NOT Cover (Explicit Exclusions)

- **Vendor API integrations.** No EDI, no US Foods API, no Sysco integration. ChefFlow is not an ordering system.
- **Automatic reordering.** No "when stock drops below X, auto-order." Chef decides when to order.
- **Vendor catalog search.** Chef browses vendor catalogs on vendor sites. ChefFlow does not replicate catalogs.
- **Delivery tracking.** Chef checks delivery status on vendor apps. ChefFlow could store tracking links (future, not this spec).
- **Price comparison across vendors.** Already partially built via `ingredient_best_vendor_price` view. Full comparison dashboard is a separate spec.
- **Barcode scanning for inventory.** Separate feature, not part of shopping list bridge.
- **AI-generated shopping suggestions.** The list is deterministic from recipes. No AI guessing.

---

## Validation Criteria (Definition of Done)

1. **Single event list:** `generateEventShoppingList(eventId)` returns correct yield-adjusted quantities for all recipes on that event's menu
2. **Multi-event consolidation:** Two events sharing an ingredient produce one combined line item with correct total and per-event breakdown
3. **Clipboard export:** "Copy to clipboard" produces valid plain text that renders correctly when pasted into a text field
4. **Per-vendor split:** Items with vendor assignments appear in correct vendor sublists with per-vendor subtotals
5. **Unassigned items:** Items without vendor mappings appear in "Unassigned" group
6. **Incomplete recipe warning:** Recipe with NULL quantity on an ingredient produces an `IncompleteRecipeWarning`, not a zero-quantity line item
7. **On-hand subtraction:** Item with 5 lbs on hand and 8 lbs required shows `toBuy: 3`
8. **Print view:** `/chef/shopping-list/print` renders without nav/sidebar and respects `@media print`
9. **Shopping history:** Post-event view shows list quantities vs. actual purchases from `inventory_transactions`
10. **No regressions:** `npx tsc --noEmit --skipLibCheck` passes. `npx next build --no-lint` passes

---

## References

- `docs/research/chef-exit-points-analysis.md` (exit points 8-10)
- `docs/specs/ingredient-quantity-lifecycle.md` (yield adjustment, lifecycle view)
- `docs/specs/recipe-costing-integrity.md` (sub-recipe cascade, Q-factor, unit conversion)
- `docs/specs/receipt-intelligence-and-recipe-scaling.md` (receipt parsing, scaling engine, purchase feedback)
