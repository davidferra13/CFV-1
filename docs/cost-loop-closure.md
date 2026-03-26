# Cost Loop Closure: Estimated vs Actual Food Cost

> Implemented: 2026-03-26
> Status: Phase 1 complete

## What Changed

The system now closes the cost loop: **estimated food cost (from recipes) can be compared against actual food cost (from receipts)**.

Previously, the system had two disconnected cost systems:

- **Estimated**: Menu → Dishes → Components → Recipes → Ingredients → computed cost
- **Actual**: Receipt OCR → line items → generic expenses (total amount, no ingredient link)

These two systems never talked to each other. The chef could not answer: "Did I spend what I estimated?"

## How It Works Now

### New Table: `expense_line_items`

Links individual expense records to specific ingredients from the master list.

| Column                 | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `expense_id`           | FK to expenses table                                              |
| `ingredient_id`        | FK to ingredients table (nullable for unmatched items)            |
| `receipt_line_item_id` | FK to receipt_line_items (source traceability)                    |
| `description`          | Item description from receipt                                     |
| `quantity`             | Quantity purchased (if available)                                 |
| `unit`                 | Unit of measure                                                   |
| `amount_cents`         | Actual cost paid                                                  |
| `matched_by`           | How the ingredient was matched: `manual`, `ai`, or `receipt_ocr`  |
| `match_confidence`     | 0-1 confidence score for auto-matches                             |
| `price_applied`        | Whether this price was used to update ingredient.last_price_cents |

### Flow

```
Receipt photo uploaded
  ↓ Gemini vision OCR
Receipt line items extracted (description, price, category)
  ↓ Chef reviews, tags business/personal
Receipt approved
  ↓ approveReceiptSummary()
Expenses created (one per business line item)
  ↓ NEW: also creates expense_line_items
Auto-match each line item to ingredients (deterministic string matching)
  ↓ Chef can review/correct matches in UI
Chef clicks "Update prices"
  ↓ applyLineItemPrices()
ingredient.last_price_cents updated from actual purchase price
  ↓ Next time this ingredient is used in a recipe
Recipe cost calculation uses the real price
```

### What the Chef Sees

**On the Event Financial page** (`/events/[id]/financial`):

- New "Estimated vs Actual Cost" card showing:
  - Estimated cost (from recipe ingredients)
  - Actual cost (from matched expense line items)
  - Variance (over/under, with percentage)
  - Per-ingredient breakdown (expandable)

**On the Event Receipts page** (`/events/[id]/receipts`):

- Same variance card at the top
- After approval, line items show matched ingredients
- "Match" button to manually match unmatched items
- "Update N prices" button to push actual prices to the ingredient master

### Ingredient Matching (Formula > AI)

Matching is deterministic (no LLM calls):

1. Normalize both strings (lowercase, expand abbreviations like "BNLS CHKN BRST" → "boneless chicken breast")
2. Check substring containment (high confidence)
3. Compute word-level Jaccard similarity
4. Bonus for matching important food words
5. Threshold: 0.7+ confidence auto-matches, below that = manual

40+ common receipt abbreviations are expanded (see `normalizeForMatch()` in `expense-line-item-actions.ts`).

## Files Changed

| File                                                        | Change                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `database/migrations/20260401000104_expense_line_items.sql` | New table                                                                             |
| `lib/finance/expense-line-item-actions.ts`                  | New server actions: CRUD, matching, price application, variance                       |
| `lib/receipts/actions.ts`                                   | Modified: `approveReceiptSummary()` now creates expense line items with auto-matching |
| `lib/finance/food-cost-actions.ts`                          | Modified: `getEventFoodCost()` now considers line item actuals                        |
| `components/finance/expense-line-items-panel.tsx`           | New UI: line item list with ingredient matching                                       |
| `components/finance/cost-variance-card.tsx`                 | New UI: estimated vs actual variance display                                          |
| `app/(chef)/events/[id]/financial/page.tsx`                 | Modified: added CostVarianceCard                                                      |
| `app/(chef)/events/[id]/receipts/page.tsx`                  | Modified: added CostVarianceCard                                                      |

## What's Next (Phase 2)

- Wire `ExpenseLineItemsPanel` into the expense detail page (per-expense view)
- Trend analysis: "Your salmon estimates are consistently 15% low"
- AAR integration: link post-event feedback to specific ingredients/recipes
- Bulk price update from CSV import (already has parser, needs line item creation)
