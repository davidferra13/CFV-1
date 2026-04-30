# Spec: Recipe and Menu Cost CSV Export

> **Status:** verified
> **Priority:** P1 (high-impact gap from Arthur Klein stress test)
> **Estimated effort:** 3-5 hours
> **Risk level:** LOW (read-only exports, no mutations)
> **Built by:** Codex builder session 2026-04-30

## What This Does (Plain English)

Adds "Export CSV" buttons to recipe detail and menu detail pages. The CSV includes every ingredient with quantity, unit, unit cost, source, extended cost, and food cost %. This lets chefs verify ChefFlow's costing in Excel.

## Why It Matters

Chefs migrating from Excel need to cross-reference ChefFlow's numbers against their spreadsheets. Without export, they maintain parallel systems forever.

---

## Part A: Recipe Cost CSV Export

### A1. Server Action

**File:** `lib/exports/actions.ts` (ADD to existing file, at the bottom)

Add this new exported function. Follow the exact pattern of the existing `exportEventCSV` function in the same file. Use `csvRowSafe` (imported as `csvRow` at the top of the file) for every row. Use the existing `formatDollars` helper.

```typescript
/**
 * Export a recipe's ingredient cost breakdown as CSV.
 * Columns: Ingredient, Quantity, Unit, Unit Cost, Source, Extended Cost
 */
export async function exportRecipeCostCSV(recipeId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // 1. Fetch recipe
  const { data: recipe } = await db
    .from('recipes')
    .select('id, name, servings, total_cost_cents')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) throw new Error('Recipe not found')

  // 2. Fetch recipe ingredients with resolved prices
  const { data: ingredients } = await db
    .from('recipe_ingredients')
    .select('ingredient_name, quantity, unit, cost_cents, price_source, price_per_unit_cents')
    .eq('recipe_id', recipeId)
    .order('sort_order', { ascending: true })

  const rows: string[] = []

  // Header
  rows.push(csvRow(['Recipe', recipe.name, '', '', '', '']))
  rows.push(csvRow(['Servings', String(recipe.servings || 1), '', '', '', '']))
  rows.push(csvRow([]))
  rows.push(csvRow(['Ingredient', 'Quantity', 'Unit', 'Unit Cost', 'Source', 'Extended Cost']))

  let totalCents = 0
  for (const ing of ingredients ?? []) {
    const extCents = ing.cost_cents || 0
    totalCents += extCents
    rows.push(
      csvRow([
        ing.ingredient_name || '',
        String(ing.quantity || ''),
        ing.unit || '',
        ing.price_per_unit_cents ? formatDollars(ing.price_per_unit_cents) : 'N/A',
        ing.price_source || 'unknown',
        formatDollars(extCents),
      ])
    )
  }

  // Summary
  rows.push(csvRow([]))
  rows.push(csvRow(['Total Ingredient Cost', '', '', '', '', formatDollars(totalCents)]))
  if (recipe.servings && recipe.servings > 0) {
    rows.push(
      csvRow([
        'Cost Per Serving',
        '',
        '',
        '',
        '',
        formatDollars(Math.round(totalCents / recipe.servings)),
      ])
    )
  }

  const csv = rows.join('\n')
  const filename = `recipe-cost-${recipe.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.csv`

  return { csv, filename }
}
```

**Rules:**

- Use `csvRowSafe` (aliased as `csvRow`) -- already imported at top of file
- Use `formatDollars` -- already defined in file
- Use `format` from `date-fns` -- already imported
- Use `requireChef()` for auth -- already imported
- ALL money in cents, display with `formatDollars`
- If `recipe_ingredients` table columns differ slightly, adjust the select to match actual schema. Check the table before coding.

### A2. Export Button on Recipe Detail

**File:** `app/(chef)/recipes/[id]/page.tsx`

Find the existing action buttons area (where Duplicate/Share/Delete buttons are). Add an "Export CSV" button next to them:

```tsx
import { exportRecipeCostCSV } from '@/lib/exports/actions'
```

Add a client component or use the existing `CsvDownloadButton` pattern from `components/exports/csv-download-button.tsx`. That component accepts a server action and triggers download. Use it like:

```tsx
<CsvDownloadButton
  action={() => exportRecipeCostCSV(recipe.id)}
  label="Export Cost CSV"
  variant="ghost"
/>
```

If `CsvDownloadButton` is not importable from a server component, wrap it in a small client component. Check how other pages use it (search for `CsvDownloadButton` in the codebase).

---

## Part B: Menu Cost CSV Export

### B1. Server Action

**File:** `lib/exports/actions.ts` (ADD to existing file, after the recipe export)

```typescript
/**
 * Export a menu's full cost breakdown as CSV.
 * Hierarchy: Course > Dish > Ingredient with quantities and costs.
 */
export async function exportMenuCostCSV(menuId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // 1. Fetch menu
  const { data: menu } = await db
    .from('menus')
    .select('id, name, guest_count')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) throw new Error('Menu not found')

  // 2. Fetch dishes grouped by course
  const { data: dishes } = await db
    .from('dishes')
    .select('id, name, course_name, linked_recipe_id, scale_factor')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_name', { ascending: true })

  const rows: string[] = []

  // Header
  rows.push(csvRow(['Menu', menu.name, '', '', '', '', '']))
  rows.push(csvRow(['Guests', String(menu.guest_count || ''), '', '', '', '', '']))
  rows.push(csvRow([]))
  rows.push(
    csvRow(['Course', 'Dish', 'Ingredient', 'Quantity', 'Unit', 'Unit Cost', 'Extended Cost'])
  )

  let grandTotalCents = 0

  for (const dish of dishes ?? []) {
    if (!dish.linked_recipe_id) {
      rows.push(
        csvRow([dish.course_name || '', dish.name || '', '(no recipe linked)', '', '', '', ''])
      )
      continue
    }

    // Fetch recipe ingredients
    const { data: ingredients } = await db
      .from('recipe_ingredients')
      .select('ingredient_name, quantity, unit, cost_cents, price_per_unit_cents')
      .eq('recipe_id', dish.linked_recipe_id)
      .order('sort_order', { ascending: true })

    let dishTotalCents = 0
    const scale = dish.scale_factor || 1

    for (const ing of ingredients ?? []) {
      const scaledCost = Math.round((ing.cost_cents || 0) * scale)
      dishTotalCents += scaledCost
      const scaledQty = ing.quantity ? (parseFloat(ing.quantity) * scale).toFixed(2) : ''

      rows.push(
        csvRow([
          dish.course_name || '',
          dish.name || '',
          ing.ingredient_name || '',
          scaledQty,
          ing.unit || '',
          ing.price_per_unit_cents ? formatDollars(ing.price_per_unit_cents) : 'N/A',
          formatDollars(scaledCost),
        ])
      )
    }

    rows.push(csvRow(['', dish.name + ' subtotal', '', '', '', '', formatDollars(dishTotalCents)]))
    grandTotalCents += dishTotalCents
  }

  rows.push(csvRow([]))
  rows.push(csvRow(['TOTAL MENU COST', '', '', '', '', '', formatDollars(grandTotalCents)]))
  if (menu.guest_count && menu.guest_count > 0) {
    rows.push(
      csvRow([
        'COST PER GUEST',
        '',
        '',
        '',
        '',
        '',
        formatDollars(Math.round(grandTotalCents / menu.guest_count)),
      ])
    )
  }

  const csv = rows.join('\n')
  const filename = `menu-cost-${menu.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.csv`

  return { csv, filename }
}
```

### B2. Export Button on Menu Detail

**File:** `app/(chef)/menus/[id]/page.tsx` (the menu detail page)

Same pattern as recipe. Add `CsvDownloadButton` in the action buttons area:

```tsx
<CsvDownloadButton
  action={() => exportMenuCostCSV(menu.id)}
  label="Export Cost CSV"
  variant="ghost"
/>
```

---

## Files Changed (Complete List)

| File                               | Change                         |
| ---------------------------------- | ------------------------------ |
| `lib/exports/actions.ts`           | ADD 2 server actions at bottom |
| `app/(chef)/recipes/[id]/page.tsx` | ADD CsvDownloadButton          |
| `app/(chef)/menus/[id]/page.tsx`   | ADD CsvDownloadButton          |

## Files NOT Changed (Do Not Touch)

- `lib/security/csv-sanitize.ts` -- already handles formula injection
- `components/exports/csv-download-button.tsx` -- reuse as-is
- Any migration files -- no DB changes needed
- Any other export actions -- do not modify existing exports

## Verification

1. Go to `/recipes/[any-recipe-id]`
2. Click "Export Cost CSV"
3. Open in Excel: verify ingredient rows with quantities, unit costs, extended costs
4. Go to `/menus/[any-menu-id]`
5. Click "Export Cost CSV"
6. Open in Excel: verify course/dish/ingredient hierarchy with scaled quantities

## IMPORTANT: Schema Discovery

Before writing the server actions, **read the actual `recipe_ingredients` table columns** by checking:

- `database/migrations/` for the recipe_ingredients CREATE TABLE
- Or `types/database.ts` for the generated type

The column names in this spec (ingredient_name, quantity, unit, cost_cents, price_per_unit_cents, price_source, sort_order) are best guesses. Adjust to match the REAL schema. Do NOT invent columns that do not exist. If a column is missing, omit that CSV column rather than fabricating data.

Similarly, check the `dishes` table for `scale_factor` -- it may be called something else or may not exist. If it does not exist, use `1` as the default scale.

## DO NOT

- Modify existing export functions
- Add any AI features
- Create new tables or migrations
- Touch the CSV sanitization logic
- Change the CsvDownloadButton component

## Timeline

| Date       | Status   | Notes                                                                                                                                                                                                 |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-30 | verified | Added scoped recipe and menu cost CSV exports using the real recipe ingredient, ingredient, dish, and component schema. Added food cost percentage columns, missing-price N/A handling, and query errors. |
