# Codex Spec: Demand-Based Prep Sheet Generator

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** Migration `20260425000015_restaurant_ops_engine.sql` must be applied
> **Estimated complexity:** medium (5 files)

## What You Are Building

A prep sheet generator that takes a service day's expected covers and active menus, then calculates exactly what needs to be prepped. It walks the chain: service day -> service menus -> menu items -> recipes -> recipe ingredients. For each ingredient, it computes: (recipe quantity / recipe yield) \* expected covers = amount to prep. Staff can mark prep items as done.

This builds on existing DB tables. You are NOT creating any database tables or migrations. The tables already exist: `service_days`, `service_menus`, `service_prep_requirements`, `menu_items`, `recipes`, `recipe_ingredients`.

---

## Files to Create

| File                                                 | Purpose                                                 |
| ---------------------------------------------------- | ------------------------------------------------------- |
| `lib/prep/prep-sheet-actions.ts`                     | Server actions: generate prep, list prep, update status |
| `app/(chef)/stations/service-log/[id]/prep/page.tsx` | Prep sheet page for a service day                       |
| `components/stations/prep-sheet-table.tsx`           | Client component: prep items table with status toggles  |
| `components/stations/generate-prep-button.tsx`       | Client component: button to trigger prep generation     |

## Files to Modify

| File                                            | What to Change                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/stations/service-log/[id]/page.tsx` | Add a link to the prep sheet. After the header section, add: `<Link href={'/stations/service-log/' + day.id + '/prep'} className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors">Prep Sheet</Link>` |

**DO NOT modify any other existing files.**

---

## Server Actions (`lib/prep/prep-sheet-actions.ts`)

```typescript
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ────────────────────────────────────────────────────────────────

export type PrepItem = {
  id: string
  service_day_id: string
  recipe_id: string | null
  ingredient_id: string | null
  ingredient_name: string
  required_qty: number
  unit: string
  on_hand_qty: number | null
  deficit_qty: number | null
  prep_status: string
  assigned_to: string | null
  station_id: string | null
  priority: string
  due_time: string | null
  completed_at: string | null
  notes: string | null
}

// ── List prep requirements for a service day ─────────────────────────────

export async function listPrepRequirements(serviceDayId: string): Promise<PrepItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { data, error } = await db
    .from('service_prep_requirements')
    .select('*')
    .eq('chef_id', chefId)
    .eq('service_day_id', serviceDayId)
    .order('priority', { ascending: true })
    .order('ingredient_name', { ascending: true })

  if (error) {
    console.error('[prep-sheet] list error', error)
    return []
  }
  return data ?? []
}

// ── Generate prep requirements from menus ────────────────────────────────
// Walks: service_menus -> menu_items -> recipes -> recipe_ingredients
// Computes: (ingredient.quantity / recipe.yield_quantity) * expected_covers

export async function generatePrepSheet(
  serviceDayId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  // 1. Get the service day (need expected_covers)
  const { data: serviceDay, error: sdError } = await db
    .from('service_days')
    .select('id, expected_covers, status')
    .eq('id', serviceDayId)
    .eq('chef_id', chefId)
    .single()

  if (sdError || !serviceDay) {
    return { success: false, error: 'Service day not found' }
  }

  const expectedCovers = serviceDay.expected_covers || 1

  // 2. Get active menus for this service day
  const { data: serviceMenus, error: smError } = await db
    .from('service_menus')
    .select('menu_id')
    .eq('service_day_id', serviceDayId)
    .eq('chef_id', chefId)
    .eq('is_active', true)

  if (smError || !serviceMenus || serviceMenus.length === 0) {
    return { success: false, error: 'No menus linked to this service day. Link menus first.' }
  }

  const menuIds = serviceMenus.map((sm: any) => sm.menu_id)

  // 3. Get menu items for those menus
  const { data: menuItemRows, error: miError } = await db
    .from('menu_items')
    .select('id, recipe_id, name')
    .in('menu_id', menuIds)
    .eq('chef_id', chefId)
    .eq('is_active', true)

  if (miError || !menuItemRows || menuItemRows.length === 0) {
    return { success: false, error: 'No active menu items found in linked menus.' }
  }

  // 4. Get recipe IDs (filter out items without recipes)
  const recipeIds = menuItemRows
    .map((mi: any) => mi.recipe_id)
    .filter((id: string | null) => id != null)

  if (recipeIds.length === 0) {
    return {
      success: false,
      error: 'No recipes linked to menu items. Link recipes to menu items first.',
    }
  }

  // 5. Get recipes (need yield_quantity)
  const { data: recipes, error: rError } = await db
    .from('recipes')
    .select('id, name, yield_quantity, yield_unit')
    .in('id', recipeIds)

  if (rError || !recipes) {
    return { success: false, error: 'Failed to load recipes' }
  }

  const recipeMap = new Map(recipes.map((r: any) => [r.id, r]))

  // 6. Get recipe ingredients
  const { data: ingredients, error: iError } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit')
    .in('recipe_id', recipeIds)

  if (iError || !ingredients) {
    return { success: false, error: 'Failed to load recipe ingredients' }
  }

  // 7. Get ingredient names
  const ingredientIds = [...new Set(ingredients.map((i: any) => i.ingredient_id))]
  const { data: ingredientNames } = await db
    .from('ingredients')
    .select('id, name')
    .in('id', ingredientIds)

  const nameMap = new Map((ingredientNames ?? []).map((i: any) => [i.id, i.name]))

  // 8. Delete existing prep requirements for this day (regenerate)
  await db
    .from('service_prep_requirements')
    .delete()
    .eq('service_day_id', serviceDayId)
    .eq('chef_id', chefId)

  // 9. Aggregate ingredients across all recipes
  // Key: ingredient_id, Value: { total_qty, unit, recipe_id, ingredient_name }
  const aggregated = new Map<
    string,
    {
      ingredient_id: string
      recipe_id: string
      ingredient_name: string
      total_qty: number
      unit: string
    }
  >()

  for (const ing of ingredients) {
    const recipe = recipeMap.get(ing.recipe_id)
    if (!recipe) continue

    const recipeYield = parseFloat(recipe.yield_quantity) || 1
    // Scale: how many times do we need this recipe for expected covers?
    const scaleFactor = expectedCovers / recipeYield
    const requiredQty = parseFloat(ing.quantity) * scaleFactor

    const key = ing.ingredient_id
    const existing = aggregated.get(key)
    if (existing) {
      existing.total_qty += requiredQty
    } else {
      aggregated.set(key, {
        ingredient_id: ing.ingredient_id,
        recipe_id: ing.recipe_id,
        ingredient_name: nameMap.get(ing.ingredient_id) || 'Unknown',
        total_qty: requiredQty,
        unit: ing.unit,
      })
    }
  }

  // 10. Insert prep requirements
  const rows = Array.from(aggregated.values()).map((item) => ({
    chef_id: chefId,
    service_day_id: serviceDayId,
    recipe_id: item.recipe_id,
    ingredient_id: item.ingredient_id,
    ingredient_name: item.ingredient_name,
    required_qty: Math.round(item.total_qty * 100) / 100,
    unit: item.unit,
    prep_status: 'pending',
    priority: 'medium',
  }))

  if (rows.length === 0) {
    return { success: true, count: 0 }
  }

  const { error: insertError } = await db.from('service_prep_requirements').insert(rows)

  if (insertError) {
    console.error('[prep-sheet] insert error', insertError)
    return { success: false, error: 'Failed to save prep requirements' }
  }

  revalidatePath(`/stations/service-log/${serviceDayId}/prep`)
  return { success: true, count: rows.length }
}

// ── Update prep item status ──────────────────────────────────────────────

export async function updatePrepStatus(
  prepId: string,
  status: 'pending' | 'in_progress' | 'done'
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const updateData: any = { prep_status: status }
  if (status === 'done') {
    updateData.completed_at = new Date().toISOString()
  } else {
    updateData.completed_at = null
  }

  const { error } = await db
    .from('service_prep_requirements')
    .update(updateData)
    .eq('id', prepId)
    .eq('chef_id', chefId)

  if (error) {
    console.error('[prep-sheet] update status error', error)
    return { success: false, error: error.message || 'Failed to update' }
  }

  revalidatePath('/stations/service-log')
  return { success: true }
}

// ── Link a menu to a service day ─────────────────────────────────────────

export async function linkMenuToServiceDay(
  serviceDayId: string,
  menuId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { error } = await db.from('service_menus').insert({
    chef_id: chefId,
    service_day_id: serviceDayId,
    menu_id: menuId,
    is_active: true,
  })

  if (error) {
    // Unique constraint violation = already linked
    if (error.code === '23505') {
      return { success: true }
    }
    console.error('[prep-sheet] link menu error', error)
    return { success: false, error: error.message || 'Failed to link menu' }
  }

  revalidatePath(`/stations/service-log/${serviceDayId}`)
  return { success: true }
}

// ── List available menus (for linking) ───────────────────────────────────

export async function listMenusForLinking(): Promise<Array<{ id: string; name: string }>> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { data, error } = await db
    .from('menus')
    .select('id, name')
    .eq('tenant_id', chefId)
    .order('name')

  if (error) {
    console.error('[prep-sheet] list menus error', error)
    return []
  }
  return data ?? []
}

// ── Get linked menus for a service day ───────────────────────────────────

export async function getLinkedMenus(
  serviceDayId: string
): Promise<Array<{ id: string; menu_id: string; menu_name: string }>> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { data, error } = await db
    .from('service_menus')
    .select('id, menu_id, menus(name)')
    .eq('service_day_id', serviceDayId)
    .eq('chef_id', chefId)

  if (error) {
    console.error('[prep-sheet] linked menus error', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    menu_id: row.menu_id,
    menu_name: row.menus?.name || 'Unknown Menu',
  }))
}
```

---

## Page: Prep Sheet (`app/(chef)/stations/service-log/[id]/prep/page.tsx`)

Server component. Fetches service day info, linked menus, and prep requirements.

Layout:

1. **Header:** "Prep Sheet for [date]" with back link to service day detail
2. **Menu linking section:** Show linked menus. Dropdown to link additional menus. Uses `listMenusForLinking()` and `linkMenuToServiceDay()`.
3. **Generate button:** `<GeneratePrepButton serviceDayId={id} />` client component. Calls `generatePrepSheet()`. Shows count of generated items.
4. **Prep table:** `<PrepSheetTable items={prepItems} />` client component. Table with columns: Ingredient, Qty, Unit, Status, Actions.

---

## Client Component: Prep Sheet Table (`components/stations/prep-sheet-table.tsx`)

`'use client'` component. Props: `{ items: PrepItem[] }`.

Renders a table:
| Ingredient | Qty Needed | Unit | Status | Action |
|---|---|---|---|---|

- Status shows as a Badge: pending (info), in_progress (warning), done (success)
- Action column: button to cycle status. "Start" (pending -> in_progress), "Done" (in_progress -> done), "Reset" (done -> pending)
- Calls `updatePrepStatus()` on click
- Use `useTransition` for each status update
- Sort: done items at bottom, then by ingredient name

---

## Client Component: Generate Prep Button (`components/stations/generate-prep-button.tsx`)

`'use client'` component. Props: `{ serviceDayId: string }`.

- Button text: "Generate Prep Sheet"
- On click: calls `generatePrepSheet(serviceDayId)`
- Shows loading state during generation
- On success: shows toast-like message "Generated X prep items" and calls `router.refresh()`
- On error: shows error message in red text
- Warning text below button: "This will replace any existing prep items for this day."

---

## Styling Rules

Same as Spec 1:

- Dark theme: `bg-stone-900`, `text-stone-100`, `border-stone-700`
- Cards: `<Card>` and `<CardContent>` from `@/components/ui/card`
- Badges: `<Badge>` with variants: `default`, `success`, `warning`, `info`
- Table: `<table className="w-full">` with `<thead>` and `<tbody>`, stone-themed borders
- Primary button: `bg-amber-600 text-white hover:bg-amber-500`
- Form inputs: `bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2`

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
9. The `menus` table uses `tenant_id` (not `chef_id`). All other tables in this spec use `chef_id`.

---

## Verification

After building, confirm:

1. `npx tsc --noEmit --skipLibCheck` passes
2. Navigate to a service day detail page, confirm "Prep Sheet" link appears
3. Navigate to the prep sheet page, confirm empty state
4. Link a menu to the service day
5. Click "Generate Prep Sheet", confirm items appear
6. Click status toggle on a prep item, confirm it changes
