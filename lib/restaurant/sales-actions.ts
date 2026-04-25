'use server'

// Menu Item Sales - Record sales per menu item per service day.
// Connects to inventory depletion and menu performance analytics.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────

export interface MenuItemSale {
  id: string
  chef_id: string
  service_day_id: string
  menu_item_id: string
  quantity_sold: number
  revenue_cents: number
  food_cost_cents: number | null
  waste_qty: number
  waste_cents: number
  avg_ticket_time_minutes: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RecordSaleInput {
  service_day_id: string
  menu_item_id: string
  quantity_sold: number
  revenue_cents: number
  food_cost_cents?: number
  avg_ticket_time_minutes?: number
  notes?: string
}

export interface RecordWasteInput {
  service_day_id: string
  menu_item_id: string
  waste_qty: number
  waste_cents: number
  notes?: string
}

export interface MenuItemPerformance {
  chef_id: string
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

// ── Record Sales ──────────────────────────────────────────────────────────

export async function recordSale(input: RecordSaleInput) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Upsert: if sales already recorded for this item+day, add to them
  const { data: existing } = await db
    .from('menu_item_sales')
    .select('id, quantity_sold, revenue_cents, food_cost_cents')
    .eq('service_day_id', input.service_day_id)
    .eq('menu_item_id', input.menu_item_id)
    .single()

  if (existing) {
    const { error } = await db
      .from('menu_item_sales')
      .update({
        quantity_sold: existing.quantity_sold + input.quantity_sold,
        revenue_cents: existing.revenue_cents + input.revenue_cents,
        food_cost_cents:
          input.food_cost_cents != null
            ? (existing.food_cost_cents || 0) + input.food_cost_cents
            : existing.food_cost_cents,
        avg_ticket_time_minutes: input.avg_ticket_time_minutes ?? null,
        notes: input.notes,
      })
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db.from('menu_item_sales').insert({
      chef_id: user.tenantId!,
      service_day_id: input.service_day_id,
      menu_item_id: input.menu_item_id,
      quantity_sold: input.quantity_sold,
      revenue_cents: input.revenue_cents,
      food_cost_cents: input.food_cost_cents,
      avg_ticket_time_minutes: input.avg_ticket_time_minutes,
      notes: input.notes,
    })

    if (error) return { success: false, error: error.message }
  }

  // Auto-deduct inventory if recipe is linked
  try {
    await deductInventoryForSale(input.menu_item_id, input.quantity_sold)
  } catch (err) {
    console.error('[non-blocking] Inventory deduction failed', err)
  }

  // Update menu_items.times_served
  try {
    const { data: mi } = await db
      .from('menu_items')
      .select('times_served')
      .eq('id', input.menu_item_id)
      .single()

    if (mi) {
      await db
        .from('menu_items')
        .update({
          times_served: (mi.times_served || 0) + input.quantity_sold,
          last_served_at: new Date().toISOString(),
        })
        .eq('id', input.menu_item_id)
    }
  } catch (err) {
    console.error('[non-blocking] times_served update failed', err)
  }

  revalidatePath('/ops')
  return { success: true }
}

export async function recordBatchSales(
  serviceDayId: string,
  items: Array<{ menu_item_id: string; quantity_sold: number; revenue_cents: number }>
) {
  const results = []
  for (const item of items) {
    const result = await recordSale({
      service_day_id: serviceDayId,
      ...item,
    })
    results.push(result)
  }

  const failures = results.filter((r) => !r.success)
  if (failures.length) {
    return {
      success: false,
      error: `${failures.length} of ${items.length} failed`,
      details: failures,
    }
  }
  return { success: true, recorded: items.length }
}

// ── Record Waste ──────────────────────────────────────────────────────────

export async function recordMenuItemWaste(input: RecordWasteInput) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('menu_item_sales')
    .select('id, waste_qty, waste_cents')
    .eq('service_day_id', input.service_day_id)
    .eq('menu_item_id', input.menu_item_id)
    .single()

  if (existing) {
    const { error } = await db
      .from('menu_item_sales')
      .update({
        waste_qty: existing.waste_qty + input.waste_qty,
        waste_cents: existing.waste_cents + input.waste_cents,
        notes: input.notes,
      })
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db.from('menu_item_sales').insert({
      chef_id: user.tenantId!,
      service_day_id: input.service_day_id,
      menu_item_id: input.menu_item_id,
      quantity_sold: 0,
      revenue_cents: 0,
      waste_qty: input.waste_qty,
      waste_cents: input.waste_cents,
      notes: input.notes,
    })

    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/ops')
  return { success: true }
}

// ── Sales Queries ─────────────────────────────────────────────────────────

export async function getServiceDaySales(serviceDayId: string): Promise<MenuItemSale[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('menu_item_sales')
    .select('*, menu_items(name, category, recipe_id, price_cents)')
    .eq('service_day_id', serviceDayId)
    .eq('chef_id', user.tenantId!)
    .order('quantity_sold', { ascending: false })

  return data || []
}

// ── Menu Performance Analytics ────────────────────────────────────────────

export async function getMenuPerformance(options?: {
  startDate?: string
  endDate?: string
  category?: string
  sortBy?: 'total_sold' | 'total_revenue_cents' | 'food_cost_pct' | 'profit_per_unit_cents'
  limit?: number
}): Promise<MenuItemPerformance[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db.from('menu_item_performance').select('*').eq('chef_id', user.tenantId!)

  if (options?.category) query = query.eq('category', options.category)
  if (options?.sortBy) {
    query = query.order(options.sortBy, { ascending: false })
  } else {
    query = query.order('total_revenue_cents', { ascending: false })
  }
  if (options?.limit) query = query.limit(options.limit)

  const { data } = await query
  return data || []
}

export async function getMenuEngineering(): Promise<{
  stars: MenuItemPerformance[]
  puzzles: MenuItemPerformance[]
  plowhorses: MenuItemPerformance[]
  dogs: MenuItemPerformance[]
}> {
  const items = await getMenuPerformance()
  if (!items.length) return { stars: [], puzzles: [], plowhorses: [], dogs: [] }

  // Boston Matrix classification
  const avgSold = items.reduce((s, i) => s + i.total_sold, 0) / items.length
  const avgProfit = items.reduce((s, i) => s + (i.profit_per_unit_cents || 0), 0) / items.length

  return {
    stars: items.filter(
      (i) => i.total_sold >= avgSold && (i.profit_per_unit_cents || 0) >= avgProfit
    ),
    puzzles: items.filter(
      (i) => i.total_sold < avgSold && (i.profit_per_unit_cents || 0) >= avgProfit
    ),
    plowhorses: items.filter(
      (i) => i.total_sold >= avgSold && (i.profit_per_unit_cents || 0) < avgProfit
    ),
    dogs: items.filter((i) => i.total_sold < avgSold && (i.profit_per_unit_cents || 0) < avgProfit),
  }
}

// ── Inventory Deduction (non-blocking) ────────────────────────────────────

async function deductInventoryForSale(menuItemId: string, qtySold: number) {
  const db: any = createServerClient()

  // Get recipe ingredients for this menu item
  const { data: mi } = await db
    .from('menu_items')
    .select('recipe_id, chef_id')
    .eq('id', menuItemId)
    .single()

  if (!mi?.recipe_id) return

  const { data: ingredients } = await db
    .from('recipe_ingredients')
    .select('ingredient_id, quantity, unit')
    .eq('recipe_id', mi.recipe_id)

  if (!ingredients?.length) return

  // Create inventory transactions for each ingredient
  for (const ing of ingredients) {
    if (!ing.ingredient_id) continue

    const deductQty = ing.quantity * qtySold

    await db.from('inventory_transactions').insert({
      chef_id: mi.chef_id,
      ingredient_id: ing.ingredient_id,
      ingredient_name: '', // Will be filled by trigger or ignored
      quantity: -deductQty,
      unit: ing.unit,
      transaction_type: 'sale_deduction',
      notes: `Auto-deducted for ${qtySold}x sale`,
    })

    // Update inventory_counts
    const { data: count } = await db
      .from('inventory_counts')
      .select('id, current_qty')
      .eq('chef_id', mi.chef_id)
      .eq('ingredient_id', ing.ingredient_id)
      .single()

    if (count) {
      await db
        .from('inventory_counts')
        .update({ current_qty: Math.max(0, (count.current_qty || 0) - deductQty) })
        .eq('id', count.id)
    }
  }
}
