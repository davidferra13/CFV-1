'use server'

// Pantry Inventory - Feature 3.16
// Multi-location pantry tracking with drawdown for events.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ──────────────────────────────────────────────────────

export type PantryLocationType = 'home' | 'client' | 'storage' | 'other'

export type PantryLocation = {
  id: string
  tenantId: string
  name: string
  locationType: PantryLocationType
  clientId: string | null
  isDefault: boolean
  createdAt: string
}

export type PantryItem = {
  id: string
  tenantId: string
  locationId: string
  ingredientId: string | null
  name: string
  quantity: number
  unit: string | null
  category: string | null
  expiryDate: string | null
  minimumStock: number | null
  notes: string | null
  lastUpdated: string
  updatedBy: string | null
}

export type PantrySummary = {
  totalItems: number
  totalLocations: number
  lowStockCount: number
  expiringCount: number
}

// ── Locations ──────────────────────────────────────────────────

export async function createPantryLocation(data: {
  name: string
  locationType: PantryLocationType
  clientId?: string | null
  isDefault?: boolean
}) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // If setting as default, unset existing defaults first
  if (data.isDefault) {
    await db.from('pantry_locations').update({ is_default: false }).eq('tenant_id', tenantId)
  }

  const { data: location, error } = await db
    .from('pantry_locations')
    .insert({
      tenant_id: tenantId,
      name: data.name,
      location_type: data.locationType,
      client_id: data.clientId || null,
      is_default: data.isDefault || false,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create pantry location: ${error.message}`)

  revalidatePath('/inventory')
  return location
}

export async function getPantryLocations(): Promise<PantryLocation[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data, error } = await db
    .from('pantry_locations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('is_default', { ascending: false })
    .order('name')

  if (error) throw new Error(`Failed to load pantry locations: ${error.message}`)

  return (data || []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    locationType: row.location_type,
    clientId: row.client_id,
    isDefault: row.is_default,
    createdAt: row.created_at,
  }))
}

export async function deletePantryLocation(id: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db
    .from('pantry_locations')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete pantry location: ${error.message}`)

  revalidatePath('/inventory')
  return { success: true }
}

// ── Items ──────────────────────────────────────────────────────

export async function addPantryItem(
  locationId: string,
  data: {
    name: string
    ingredientId?: string | null
    quantity: number
    unit?: string | null
    category?: string | null
    expiryDate?: string | null
    minimumStock?: number | null
    notes?: string | null
  }
) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: item, error } = await db
    .from('pantry_items')
    .insert({
      tenant_id: tenantId,
      location_id: locationId,
      ingredient_id: data.ingredientId || null,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit || null,
      category: data.category || null,
      expiry_date: data.expiryDate || null,
      minimum_stock: data.minimumStock || null,
      notes: data.notes || null,
      updated_by: user.authUserId,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add pantry item: ${error.message}`)

  revalidatePath('/inventory')
  return item
}

export async function updatePantryItem(
  id: string,
  data: {
    name?: string
    quantity?: number
    unit?: string | null
    category?: string | null
    expiryDate?: string | null
    minimumStock?: number | null
    notes?: string | null
  }
) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const updateData: Record<string, any> = {
    last_updated: new Date().toISOString(),
    updated_by: user.authUserId,
  }
  if (data.name !== undefined) updateData.name = data.name
  if (data.quantity !== undefined) updateData.quantity = data.quantity
  if (data.unit !== undefined) updateData.unit = data.unit
  if (data.category !== undefined) updateData.category = data.category
  if (data.expiryDate !== undefined) updateData.expiry_date = data.expiryDate
  if (data.minimumStock !== undefined) updateData.minimum_stock = data.minimumStock
  if (data.notes !== undefined) updateData.notes = data.notes

  const { data: item, error } = await db
    .from('pantry_items')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update pantry item: ${error.message}`)

  revalidatePath('/inventory')
  return item
}

export async function removePantryItem(id: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db.from('pantry_items').delete().eq('id', id).eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to remove pantry item: ${error.message}`)

  revalidatePath('/inventory')
  return { success: true }
}

export async function getPantryItems(locationId?: string): Promise<PantryItem[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  let query = db
    .from('pantry_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('category')
    .order('name')

  if (locationId) {
    query = query.eq('location_id', locationId)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to load pantry items: ${error.message}`)

  return (data || []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    ingredientId: row.ingredient_id,
    name: row.name,
    quantity: Number(row.quantity),
    unit: row.unit,
    category: row.category,
    expiryDate: row.expiry_date,
    minimumStock: row.minimum_stock != null ? Number(row.minimum_stock) : null,
    notes: row.notes,
    lastUpdated: row.last_updated,
    updatedBy: row.updated_by,
  }))
}

// ── Drawdown ───────────────────────────────────────────────────

/**
 * Auto-deduct pantry items based on an event's recipe ingredients.
 * Pure deterministic subtraction (Formula > AI).
 * Deducts from the default location first, then others.
 */
export async function drawdownForEvent(eventId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Get event's menu items and their recipes
  const { data: eventMenus, error: menuErr } = await db
    .from('event_menus')
    .select('menu_id')
    .eq('event_id', eventId)

  if (menuErr) throw new Error(`Failed to load event menus: ${menuErr.message}`)
  if (!eventMenus || eventMenus.length === 0) {
    return { deducted: 0, skipped: 0, details: [] }
  }

  const menuIds = eventMenus.map((em: any) => em.menu_id)

  // 2. Get all recipes from those menus
  const { data: menuRecipes, error: recipeErr } = await db
    .from('menu_recipes')
    .select('recipe_id')
    .in('menu_id', menuIds)

  if (recipeErr) throw new Error(`Failed to load menu recipes: ${recipeErr.message}`)
  if (!menuRecipes || menuRecipes.length === 0) {
    return { deducted: 0, skipped: 0, details: [] }
  }

  const recipeIds = menuRecipes.map((mr: any) => mr.recipe_id)

  // 3. Get all recipe ingredients
  const { data: recipeIngredients, error: riErr } = await db
    .from('recipe_ingredients')
    .select('ingredient_id, quantity, unit')
    .in('recipe_id', recipeIds)

  if (riErr) throw new Error(`Failed to load recipe ingredients: ${riErr.message}`)
  if (!recipeIngredients || recipeIngredients.length === 0) {
    return { deducted: 0, skipped: 0, details: [] }
  }

  // 4. Aggregate ingredient requirements (same ingredient across recipes)
  const needed = new Map<string, { quantity: number; unit: string }>()
  for (const ri of recipeIngredients) {
    if (!ri.ingredient_id) continue
    const existing = needed.get(ri.ingredient_id)
    if (existing) {
      existing.quantity += Number(ri.quantity)
    } else {
      needed.set(ri.ingredient_id, {
        quantity: Number(ri.quantity),
        unit: ri.unit,
      })
    }
  }

  // 5. Get pantry items matching these ingredients, default location first
  const ingredientIds = Array.from(needed.keys())
  const { data: pantryItems, error: piErr } = await db
    .from('pantry_items')
    .select('id, ingredient_id, quantity, location_id, name, pantry_locations!inner(is_default)')
    .eq('tenant_id', tenantId)
    .in('ingredient_id', ingredientIds)
    .gt('quantity', 0)
    .order('pantry_locations(is_default)', { ascending: false })

  if (piErr) throw new Error(`Failed to load pantry items for drawdown: ${piErr.message}`)

  // 6. Deduct
  const details: { itemId: string; name: string; deducted: number; remaining: number }[] = []
  let deducted = 0
  let skipped = 0

  for (const [ingredientId, req] of needed) {
    let remaining = req.quantity
    const matchingItems = (pantryItems || []).filter((pi: any) => pi.ingredient_id === ingredientId)

    if (matchingItems.length === 0) {
      skipped++
      continue
    }

    for (const pi of matchingItems) {
      if (remaining <= 0) break

      const available = Number(pi.quantity)
      const toDeduct = Math.min(available, remaining)
      const newQty = available - toDeduct
      remaining -= toDeduct

      await db
        .from('pantry_items')
        .update({
          quantity: newQty,
          last_updated: new Date().toISOString(),
          updated_by: user.authUserId,
        })
        .eq('id', pi.id)
        .eq('tenant_id', tenantId)

      details.push({
        itemId: pi.id,
        name: pi.name,
        deducted: toDeduct,
        remaining: newQty,
      })
      deducted++
    }
  }

  revalidatePath('/inventory')
  return { deducted, skipped, details }
}

// ── Alerts ─────────────────────────────────────────────────────

export async function getLowStockAlerts(): Promise<PantryItem[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data, error } = await db
    .from('pantry_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .not('minimum_stock', 'is', null)
    .order('name')

  if (error) throw new Error(`Failed to load low stock alerts: ${error.message}`)

  // Filter client-side: quantity <= minimum_stock
  const lowStock = (data || []).filter(
    (row: any) => Number(row.quantity) <= Number(row.minimum_stock)
  )

  return lowStock.map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    ingredientId: row.ingredient_id,
    name: row.name,
    quantity: Number(row.quantity),
    unit: row.unit,
    category: row.category,
    expiryDate: row.expiry_date,
    minimumStock: row.minimum_stock != null ? Number(row.minimum_stock) : null,
    notes: row.notes,
    lastUpdated: row.last_updated,
    updatedBy: row.updated_by,
  }))
}

export async function getExpiringItems(daysAhead: number = 7): Promise<PantryItem[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { data, error } = await db
    .from('pantry_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', cutoffStr)
    .gt('quantity', 0)
    .order('expiry_date')

  if (error) throw new Error(`Failed to load expiring items: ${error.message}`)

  return (data || []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    ingredientId: row.ingredient_id,
    name: row.name,
    quantity: Number(row.quantity),
    unit: row.unit,
    category: row.category,
    expiryDate: row.expiry_date,
    minimumStock: row.minimum_stock != null ? Number(row.minimum_stock) : null,
    notes: row.notes,
    lastUpdated: row.last_updated,
    updatedBy: row.updated_by,
  }))
}

export async function getPantrySummary(): Promise<PantrySummary> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Total items
  const { count: totalItems } = await db
    .from('pantry_items')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  // Total locations
  const { count: totalLocations } = await db
    .from('pantry_locations')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  // Low stock count
  const { data: lowStockData } = await db
    .from('pantry_items')
    .select('id, quantity, minimum_stock')
    .eq('tenant_id', tenantId)
    .not('minimum_stock', 'is', null)

  const lowStockCount = (lowStockData || []).filter(
    (row: any) => Number(row.quantity) <= Number(row.minimum_stock)
  ).length

  // Expiring count (next 7 days)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + 7)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { count: expiringCount } = await db
    .from('pantry_items')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', cutoffStr)
    .gt('quantity', 0)

  return {
    totalItems: totalItems || 0,
    totalLocations: totalLocations || 0,
    lowStockCount,
    expiringCount: expiringCount || 0,
  }
}
