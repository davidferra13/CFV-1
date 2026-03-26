# Inventory Integration: Auto-Receive, Auto-Deduct, Smart Grocery Lists

> Implemented 2026-03-26. Wires the existing inventory ledger into the receipt approval flow, event completion flow, and grocery list generation.

## Overview

The inventory system (`inventory_transactions` table, `inventory_current_stock` view) was already built but operated in isolation. These three integrations close the loop so inventory state stays current automatically.

## 1. Auto-Receive on Receipt Approval

**File:** `lib/receipts/actions.ts` (inside `approveReceiptSummary`)

**What happens:** When a chef approves a receipt, the system already creates expenses and updates ingredient prices. Now it also creates positive `receive` transactions in the inventory ledger for every matched ingredient.

**Flow:**

```
Receipt approved
  -> Expenses created (existing)
  -> Ingredient prices updated (existing)
  -> Price history logged (existing)
  -> Inventory receive transactions created (NEW)
```

**Details:**

- Only ingredients that were auto-matched (confidence >= 0.7) or manually matched get receive transactions
- Quantity defaults to 1 unit in the ingredient's `default_unit` (since receipt OCR does not reliably parse quantities)
- The chef can adjust quantities via the inventory UI after the fact
- Non-blocking: if the inventory insert fails, the receipt approval still succeeds
- Each transaction records the store name and links to the event (if applicable)

**Limitation:** Receipt line items don't have parsed quantity/unit data. The system records 1 unit per matched item. Future enhancement: parse "2 LB" or "1 GAL" from receipt descriptions to record accurate quantities.

## 2. Auto-Deduct on Event Completion

**File:** `lib/events/transitions.ts` (inside the `completed` transition block)

**What happens:** When an event transitions from `in_progress` to `completed`, the system automatically deducts all ingredients used from inventory.

**Flow:**

```
Event completed (in_progress -> completed)
  -> Survey created and emailed (existing)
  -> Variance alerts checked (existing)
  -> Inventory deducted for all event recipes (NEW)
```

**Details:**

- Calls `executeEventDeduction(eventId)` from `lib/inventory/event-deduction-actions.ts`
- Walks the full recipe chain: event -> menus -> dishes -> components -> recipes -> recipe_ingredients (including sub-recipes recursively)
- Creates negative `event_deduction` transactions for each ingredient
- Applies component `scale_factor` to quantities
- Non-blocking: if deduction fails, the event transition still completes
- Reversible: `reverseEventDeduction(eventId)` creates offsetting `return_from_event` transactions

**Edge case:** If the event has no menu or no recipe-linked components, the deduction is a no-op (no error).

## 3. Smart Grocery Lists (On-Hand Subtraction)

**File:** `lib/documents/generate-grocery-list.ts`

**What happens:** Grocery lists now query current inventory and subtract on-hand quantities from the buy list. Items fully covered by stock are omitted entirely.

**Flow:**

```
Generate grocery list
  -> Aggregate recipe ingredients across all courses (existing)
  -> Query inventory_current_stock for all needed ingredients (NEW)
  -> Convert on-hand units to recipe units if needed (NEW)
  -> Subtract on-hand from needed quantities (NEW)
  -> Skip items fully covered by inventory (NEW)
  -> Show "(have X on hand)" note for partially covered items (NEW)
  -> Projected cost uses need-to-buy quantities, not total (NEW)
```

**Details:**

- Uses `convertQuantity()` from `lib/units/conversion-engine.ts` for same-type unit conversion (e.g., stock in lbs, recipe in oz)
- If units are incompatible (cross-type without density context), on-hand subtraction is skipped for that ingredient (safe fallback)
- Items with `needToBuyQty <= 0` are removed from the list entirely (unless optional)
- The projected cost now reflects only what needs to be purchased, not the full recipe cost
- Non-blocking: if the inventory query fails, the grocery list generates normally without on-hand data

**New fields on `GroceryItem` type:**

- `onHandQty: number | null` - current inventory in recipe units, null if not tracked
- `needToBuyQty: number` - `max(0, quantity - onHandQty)`

## Data Flow Diagram

```
Receipt uploaded
  -> OCR extraction (Gemini)
  -> Chef tags business/personal
  -> Chef approves
  -> [Expenses created]
  -> [Ingredient prices updated]       --> Recipe costs auto-recalculate
  -> [Inventory receive transactions]   --> Stock levels increase
                                            |
Event created with menu                    |
  -> Grocery list generated  <------------- Stock levels consulted
     (subtracts on-hand)                    |
  -> Chef shops (guided by smart list)      |
  -> Receipts uploaded for this event       |
  -> [More inventory received]              |
                                            |
Event completed                             |
  -> [Inventory deducted]  --------------> Stock levels decrease
  -> [Variance alerts checked]
  -> [AAR generated]
```

## Future Enhancements

1. **Receipt quantity parsing:** Extract "2 LB" or "1 GAL" from receipt descriptions to record accurate receive quantities instead of defaulting to 1
2. **Multi-event grocery consolidation:** Merge grocery lists across events in the same week
3. **Low stock alerts on grocery list:** Flag ingredients that will go below par level after this event
4. **Expiry-aware subtraction:** Don't count inventory that expires before the event date
