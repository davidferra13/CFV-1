# Codex Spec: Menu Performance Dashboard + Sales Logging

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** Migration `20260425000015_restaurant_ops_engine.sql` must be applied
> **Estimated complexity:** medium (5 files)

## What You Are Building

A page where restaurant operators log daily sales per menu item and view performance analytics over time. At the end of each service day, the chef enters how many of each dish sold. Over time, this builds a performance picture: which dishes sell best, which are most profitable, which have the worst food cost ratio. The data feeds into the existing `menu_item_performance` database view which computes aggregates automatically.

This builds on existing DB tables. You are NOT creating any database tables or migrations. The tables already exist: `service_days`, `menu_item_sales`, `menu_items`, and the `menu_item_performance` view.

---

## Files to Create

| File                                                  | Purpose                                           |
| ----------------------------------------------------- | ------------------------------------------------- |
| `lib/menu-performance/actions.ts`                     | Server actions: log sales, get performance data   |
| `app/(chef)/stations/service-log/[id]/sales/page.tsx` | Sales entry page for a specific service day       |
| `app/(chef)/stations/menu-performance/page.tsx`       | Menu performance dashboard (aggregated analytics) |
| `components/stations/sales-entry-form.tsx`            | Client component: per-item sales entry            |
| `components/stations/performance-table.tsx`           | Client component: performance analytics table     |

## Files to Modify

| File                                            | What to Change                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/stations/page.tsx`                  | Add "Menu Performance" link to the quick links section (line ~36-60). Copy the exact pattern of the existing links. Add: `<Link href="/stations/menu-performance" className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors">Menu Performance</Link>` |
| `app/(chef)/stations/service-log/[id]/page.tsx` | Add a "Log Sales" link next to the "Prep Sheet" link. Same pattern: `<Link href={'/stations/service-log/' + day.id + '/sales'} className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors">Log Sales</Link>`                                           |

**DO NOT modify any other existing files.**

---

## Server Actions (`lib/menu-performance/actions.ts`)

```typescript
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ────────────────────────────────────────────────────────────────

export type MenuItemSale = {
  id: string
  service_day_id: string
  menu_item_id: string
  quantity_sold: number
  revenue_cents: number
  food_cost_cents: number | null
  waste_qty: number
  waste_cents: number
  notes: string | null
}

export type MenuItemPerformance = {
  menu_item_id: string
  item_name: string
  category: string | null
  recipe_id: string | null
  days_on_menu: number
  total_sold: number
  avg_daily_sold: number
  total_revenue_cents: number
  avg_daily_revenue_cents: number
  total_food_cost_cents: number | null
  food_cost_pct: number | null
  total_waste_qty: number
  total_waste_cents: number
  avg_ticket_time_minutes: number | null
  profit_per_unit_cents: number | null
  first_served: string
  last_served: string
}

export type MenuItemForSalesEntry = {
  id: string
  name: string
  category: string | null
  price_cents: number | null
  food_cost_cents: number | null
  existing_sale: MenuItemSale | null
}

// ── Get menu items for sales entry (for a service day) ───────────────────

export async function getMenuItemsForSalesEntry(
  serviceDayId: string
): Promise<MenuItemForSalesEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  // Get menus linked to this service day
  const { data: serviceMenus } = await db
    .from('service_menus')
    .select('menu_id')
    .eq('service_day_id', serviceDayId)
    .eq('chef_id', chefId)
    .eq('is_active', true)

  if (!serviceMenus || serviceMenus.length === 0) {
    // Fallback: get all active menu items for this chef
    const { data: allItems } = await db
      .from('menu_items')
      .select('id, name, category, price_cents, food_cost_cents')
      .eq('chef_id', chefId)
      .eq('is_active', true)
      .order('category')
      .order('name')

    const items = allItems ?? []

    // Get existing sales for this day
    const { data: existingSales } = await db
      .from('menu_item_sales')
      .select('*')
      .eq('service_day_id', serviceDayId)
      .eq('chef_id', chefId)

    const salesMap = new Map((existingSales ?? []).map((s: any) => [s.menu_item_id, s]))

    return items.map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      price_cents: item.price_cents,
      food_cost_cents: item.food_cost_cents,
      existing_sale: salesMap.get(item.id) || null,
    }))
  }

  const menuIds = serviceMenus.map((sm: any) => sm.menu_id)

  // Get menu items for linked menus
  const { data: menuItems } = await db
    .from('menu_items')
    .select('id, name, category, price_cents, food_cost_cents')
    .in('menu_id', menuIds)
    .eq('chef_id', chefId)
    .eq('is_active', true)
    .order('category')
    .order('name')

  const items = menuItems ?? []

  // Get existing sales for this day
  const { data: existingSales } = await db
    .from('menu_item_sales')
    .select('*')
    .eq('service_day_id', serviceDayId)
    .eq('chef_id', chefId)

  const salesMap = new Map((existingSales ?? []).map((s: any) => [s.menu_item_id, s]))

  return items.map((item: any) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price_cents: item.price_cents,
    food_cost_cents: item.food_cost_cents,
    existing_sale: salesMap.get(item.id) || null,
  }))
}

// ── Save sales for a service day (upsert) ────────────────────────────────

export async function saveDailySales(
  serviceDayId: string,
  sales: Array<{
    menu_item_id: string
    quantity_sold: number
    revenue_cents: number
    waste_qty: number
  }>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  // Filter out items with zero sales and zero waste
  const nonZeroSales = sales.filter((s) => s.quantity_sold > 0 || s.waste_qty > 0)

  if (nonZeroSales.length === 0) {
    return { success: true }
  }

  // Delete existing sales for this day, then re-insert
  await db.from('menu_item_sales').delete().eq('service_day_id', serviceDayId).eq('chef_id', chefId)

  // Get food cost from menu items for each sale
  const menuItemIds = nonZeroSales.map((s) => s.menu_item_id)
  const { data: menuItemCosts } = await db
    .from('menu_items')
    .select('id, food_cost_cents')
    .in('id', menuItemIds)

  const costMap = new Map((menuItemCosts ?? []).map((mi: any) => [mi.id, mi.food_cost_cents]))

  const rows = nonZeroSales.map((sale) => ({
    chef_id: chefId,
    service_day_id: serviceDayId,
    menu_item_id: sale.menu_item_id,
    quantity_sold: sale.quantity_sold,
    revenue_cents: sale.revenue_cents,
    food_cost_cents: costMap.get(sale.menu_item_id)
      ? (costMap.get(sale.menu_item_id) ?? 0) * sale.quantity_sold
      : null,
    waste_qty: sale.waste_qty,
    waste_cents: 0,
  }))

  const { error } = await db.from('menu_item_sales').insert(rows)

  if (error) {
    console.error('[menu-performance] save sales error', error)
    return { success: false, error: error.message || 'Failed to save sales' }
  }

  // Update service day totals
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue_cents, 0)
  const totalFoodCost = rows.reduce((sum, r) => sum + (r.food_cost_cents ?? 0), 0)
  const totalItemsSold = rows.reduce((sum, r) => sum + r.quantity_sold, 0)

  await db
    .from('service_days')
    .update({
      total_revenue_cents: totalRevenue,
      total_food_cost_cents: totalFoodCost,
      items_sold: totalItemsSold,
    })
    .eq('id', serviceDayId)
    .eq('chef_id', chefId)

  revalidatePath(`/stations/service-log/${serviceDayId}`)
  revalidatePath(`/stations/service-log/${serviceDayId}/sales`)
  revalidatePath('/stations/menu-performance')
  revalidatePath('/stations/service-log')
  return { success: true }
}

// ── Get menu performance (aggregated view) ───────────────────────────────

export async function getMenuPerformance(): Promise<MenuItemPerformance[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { data, error } = await db
    .from('menu_item_performance')
    .select('*')
    .eq('chef_id', chefId)
    .order('total_sold', { ascending: false })

  if (error) {
    console.error('[menu-performance] performance error', error)
    return []
  }
  return data ?? []
}
```

---

## Page: Sales Entry (`app/(chef)/stations/service-log/[id]/sales/page.tsx`)

Server component. Fetches menu items with any existing sales data.

Layout:

1. **Header:** "Sales Log for [date]" with back link to service day detail
2. **Sales form:** `<SalesEntryForm serviceDayId={id} items={menuItems} />` client component

---

## Client Component: Sales Entry Form (`components/stations/sales-entry-form.tsx`)

`'use client'` component. Props: `{ serviceDayId: string, items: MenuItemForSalesEntry[] }`.

Renders a table where each row is a menu item:
| Item | Category | Price | Qty Sold | Revenue | Waste Qty |
|---|---|---|---|---|---|

- **Qty Sold:** number input, default from `existing_sale.quantity_sold` or 0
- **Revenue:** auto-calculated: `qty_sold * price_cents`. Editable override.
- **Waste Qty:** number input, default 0
- Group items by category with category headers
- Submit button at bottom: "Save Sales"
- On submit: call `saveDailySales()` with all non-zero rows
- Show success message or error after save
- Use `useTransition` for submit

Format prices as dollars for display (divide cents by 100).
Revenue input should be in dollars. Convert to cents before submit: `Math.round(value * 100)`.

---

## Page: Performance Dashboard (`app/(chef)/stations/menu-performance/page.tsx`)

Server component.

Layout:

1. **Header:** "Menu Performance" with subtitle "How your dishes perform over time"
2. **Summary cards row:** Total items tracked, Total revenue, Average food cost %
3. **Performance table:** `<PerformanceTable items={performanceData} />`

---

## Client Component: Performance Table (`components/stations/performance-table.tsx`)

`'use client'` component. Props: `{ items: MenuItemPerformance[] }`.

Sortable table:
| Dish | Days on Menu | Total Sold | Avg/Day | Revenue | Food Cost % | Profit/Unit | Waste |
|---|---|---|---|---|---|---|---|

- Default sort: total_sold descending
- Click column headers to sort
- Food Cost % column: color-coded. Green if < 30%, yellow if 30-35%, red if > 35%
- Profit/Unit: format as dollars (cents / 100)
- Revenue: format as dollars
- Empty state: "No sales data yet. Start logging daily sales to see performance trends."

---

## Styling Rules

Same as other specs:

- Dark theme: `bg-stone-900`, `text-stone-100`, `border-stone-700`
- Cards: `<Card>` and `<CardContent>` from `@/components/ui/card`
- Badges: `<Badge>` with variants: `default`, `success`, `warning`, `info`, `error`
- Table: `<table className="w-full">` with stone-themed headers and borders
- Primary button: `bg-amber-600 text-white hover:bg-amber-500`
- Number inputs: `bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 w-20`
- Category group headers: `text-xs font-semibold uppercase text-stone-500 tracking-wider`

---

## DO NOT Rules

1. DO NOT create any database migrations or modify any SQL
2. DO NOT modify any files other than those listed in "Files to Modify"
3. DO NOT import from `drizzle-orm`. Use the compat API: `createServerClient()` then `db.from('table').select().eq()`
4. DO NOT add `@ts-nocheck` to any file
5. DO NOT use em dashes anywhere
6. DO NOT create test files
7. Always call `requireChef()` at the top of every server action and every server component page
8. Always derive `chef_id`/`tenantId` from the session (`user.tenantId!`), never from request input
9. The `menu_items` table uses `chef_id`. The `menus` table uses `tenant_id`.
10. All monetary amounts stored in cents. Display as dollars. Accept user input in dollars and convert to cents.
11. The `menu_item_performance` view is read-only. Query it with `db.from('menu_item_performance')`.

---

## Verification

After building, confirm:

1. `npx tsc --noEmit --skipLibCheck` passes
2. Navigate to `/stations` and confirm "Menu Performance" link appears
3. Navigate to `/stations/menu-performance` and confirm empty state renders
4. Navigate to a service day detail page, confirm "Log Sales" link appears
5. Navigate to sales entry page, confirm menu items appear in the form
6. Enter quantities for a few items, submit. Confirm success message.
7. Navigate to `/stations/menu-performance` and confirm the items now show aggregated data.
