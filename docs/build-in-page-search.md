# In-Page Search & Filtering (#28)

Built: 2026-03-12

## What It Does

Adds client-side search and category filtering to list pages that previously had no way to find specific items. Users can now type to instantly filter any list.

## Reusable Component

Created `components/ui/list-search.tsx`, a generic render-prop component:

```tsx
<ListSearch
  items={data}
  searchKeys={['name', 'category']}
  placeholder="Search..."
  categoryKey="category"
  categoryLabel="categories"
>
  {(filtered) => <Table items={filtered} />}
</ListSearch>
```

Features:

- Instant text search across multiple fields (no debounce needed for client-side filtering)
- Optional category dropdown filter (auto-derives options from data, or accepts explicit list)
- Shows "X of Y" count when filtering is active
- Clear button on search input
- Dark theme styled (stone-800/700 palette)

## Pages Enhanced

| Page                              | Search Fields                       | Category Filter        |
| --------------------------------- | ----------------------------------- | ---------------------- |
| `/culinary/components`            | name, dish, menu, category          | Component category     |
| `/culinary/recipes`               | name, category                      | Recipe category        |
| `/culinary/ingredients`           | name, category, vendor              | Ingredient category    |
| `/finance/ledger/transaction-log` | type, description, payment method   | Entry type             |
| `/events` (list view)             | occasion, client name, date, status | (inline in bulk table) |

## Architecture

Each server page was refactored to:

1. Keep data fetching in the server component
2. Pass data as props to a new client component
3. Client component wraps the table in `ListSearch`

For events, search was added directly to the existing `EventsBulkTable` client component since it already uses `BulkSelectTable` with its own selection system.

## Files Created

- `components/ui/list-search.tsx` (reusable component)
- `app/(chef)/culinary/components/components-table.tsx`
- `app/(chef)/culinary/recipes/recipes-table.tsx`
- `app/(chef)/culinary/ingredients/ingredients-table.tsx`
- `app/(chef)/finance/ledger/transaction-log/transaction-table.tsx`

## Files Modified

- `app/(chef)/culinary/components/page.tsx` (uses ComponentsTable)
- `app/(chef)/culinary/recipes/page.tsx` (uses RecipesTable)
- `app/(chef)/culinary/ingredients/page.tsx` (uses IngredientsTable)
- `app/(chef)/finance/ledger/transaction-log/page.tsx` (uses TransactionTable)
- `components/events/events-bulk-table.tsx` (added inline search)

## Not Covered (already have filtering)

- `/clients` - Already has search via ClientsTable
- `/calls` - Has URL-based status/type filtering
- `/activity` - Has URL-based domain/actor/range filtering
