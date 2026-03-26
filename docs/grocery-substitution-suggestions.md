# Pre-Shopping Substitution Suggestions on Grocery List

> Implemented 2026-03-26. Grocery list PDFs now show historical substitution options per ingredient.

## Problem

When a chef arrives at the store and an ingredient is unavailable, they scramble to think of a replacement. ChefFlow already tracks substitution history (via `shopping_substitutions` table) but this data was only visible on a separate page, not at the point of need: the grocery list itself.

## Solution

The single-event grocery list PDF now appends substitution suggestions inline on each ingredient row. If the chef has previously swapped an ingredient for something else, the PDF shows those alternatives with usage counts.

## Example Output

```
[ ] Fresh Basil - 4 oz [Course 1] ~$2.40  | or: Dried Basil (3x), Thai Basil (1x)
[ ] Saffron - 2 g [Course 2] ~$8.00       | or: Turmeric (5x), Annatto (2x)
```

## How It Works

1. After aggregating all ingredients for the grocery list, the system queries `shopping_substitutions` for all ingredient names in the list
2. Matches are grouped by planned ingredient name (case-insensitive)
3. For each match, the actual substitution and its count are stored
4. During PDF rendering, if an ingredient has substitution history, the suggestions are appended after the price

## Data Source

- `shopping_substitutions` table: `planned_ingredient`, `actual_ingredient`, `tenant_id`
- Query groups by planned/actual and counts occurrences
- Only substitutions belonging to the current tenant are shown

## Files Modified

- `lib/documents/generate-grocery-list.ts` - Added `substitutions` field to GroceryItem, query for substitution history, PDF render logic

## Integration

- Uses the same `shopping_substitutions` table as `lib/shopping/substitutions.ts`
- No AI involved (Formula > AI principle): just a SQL count + group-by
- Substitution data accumulates naturally as chefs log shopping trips
