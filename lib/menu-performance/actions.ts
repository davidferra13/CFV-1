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
      ? ((costMap.get(sale.menu_item_id) as number) ?? 0) * sale.quantity_sold
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
