// Centralized Purchasing Server Actions
// Aggregate ingredient needs across all locations into unified purchase orders.
// Enables bulk savings and efficient distribution.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type CentralizedPO = {
  id: string
  tenantId: string
  title: string
  status:
    | 'draft'
    | 'submitted'
    | 'approved'
    | 'ordered'
    | 'partially_received'
    | 'received'
    | 'cancelled'
  vendorName: string | null
  vendorId: string | null
  totalEstimatedCents: number
  totalActualCents: number | null
  notes: string | null
  orderDate: string
  expectedDeliveryDate: string | null
  items: CentralizedPOItem[]
  createdAt: string
  updatedAt: string
}

export type CentralizedPOItem = {
  id: string
  orderId: string
  ingredientId: string | null
  ingredientName: string
  unit: string
  locationQuantities: Record<string, number>
  totalQuantity: number
  estimatedUnitCostCents: number | null
  actualUnitCostCents: number | null
  notes: string | null
}

export type CrossLocationNeed = {
  ingredientId: string | null
  ingredientName: string
  unit: string
  locations: Array<{
    locationId: string
    locationName: string
    currentStock: number
    parLevel: number
    needed: number
  }>
  totalNeeded: number
  estimatedUnitCostCents: number | null
}

// ─── Schemas ─────────────────────────────────────────────────────

const CreatePOSchema = z.object({
  title: z.string().min(1),
  vendorName: z.string().optional(),
  vendorId: z.string().uuid().optional(),
  notes: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  items: z
    .array(
      z.object({
        ingredientId: z.string().uuid().optional(),
        ingredientName: z.string().min(1),
        unit: z.string().min(1),
        locationQuantities: z.record(z.string(), z.number().min(0)),
        totalQuantity: z.number().positive(),
        estimatedUnitCostCents: z.number().int().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1),
})

// ─── Helpers ─────────────────────────────────────────────────────

function mapPO(row: any, items: any[]): CentralizedPO {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    status: row.status,
    vendorName: row.vendor_name,
    vendorId: row.vendor_id,
    totalEstimatedCents: Number(row.total_estimated_cents),
    totalActualCents: row.total_actual_cents ? Number(row.total_actual_cents) : null,
    notes: row.notes,
    orderDate: row.order_date,
    expectedDeliveryDate: row.expected_delivery_date,
    items: items.map(mapPOItem),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapPOItem(row: any): CentralizedPOItem {
  return {
    id: row.id,
    orderId: row.order_id,
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    unit: row.unit,
    locationQuantities: row.location_quantities ?? {},
    totalQuantity: Number(row.total_quantity),
    estimatedUnitCostCents: row.estimated_unit_cost_cents
      ? Number(row.estimated_unit_cost_cents)
      : null,
    actualUnitCostCents: row.actual_unit_cost_cents ? Number(row.actual_unit_cost_cents) : null,
    notes: row.notes,
  }
}

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Compute cross-location ingredient needs based on par levels vs current stock.
 * This is the foundation for centralized purchasing.
 */
export async function computeCrossLocationNeeds(): Promise<CrossLocationNeed[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all active locations
  const { data: locations } = await db
    .from('business_locations')
    .select('id, name')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)

  if (!locations?.length) return []

  // Get inventory counts with par levels for all locations
  const { data: counts } = await db
    .from('inventory_counts')
    .select('ingredient_id, ingredient_name, current_qty, par_level, unit, location_id')
    .eq('chef_id', user.tenantId!)
    .not('par_level', 'is', null)

  if (!counts?.length) return []

  // Get latest prices for ingredients
  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, last_price_cents')
    .eq('tenant_id', user.tenantId!)

  const priceMap = new Map<string, number>()
  for (const ing of ingredients ?? []) {
    if (ing.last_price_cents) priceMap.set(ing.id, Number(ing.last_price_cents))
  }

  const locationMap = new Map<string, string>()
  for (const loc of locations) locationMap.set(loc.id, loc.name)

  // Group by ingredient
  const needsByIngredient = new Map<string, CrossLocationNeed>()

  for (const count of counts) {
    if (!count.location_id) continue

    const currentQty = Number(count.current_qty ?? 0)
    const parLevel = Number(count.par_level ?? 0)
    const needed = Math.max(0, parLevel - currentQty)

    if (needed <= 0) continue

    const key = count.ingredient_name.toLowerCase().trim()
    const existing = needsByIngredient.get(key)

    if (existing) {
      existing.locations.push({
        locationId: count.location_id,
        locationName: locationMap.get(count.location_id) ?? 'Unknown',
        currentStock: currentQty,
        parLevel,
        needed,
      })
      existing.totalNeeded += needed
    } else {
      needsByIngredient.set(key, {
        ingredientId: count.ingredient_id,
        ingredientName: count.ingredient_name,
        unit: count.unit,
        locations: [
          {
            locationId: count.location_id,
            locationName: locationMap.get(count.location_id) ?? 'Unknown',
            currentStock: currentQty,
            parLevel,
            needed,
          },
        ],
        totalNeeded: needed,
        estimatedUnitCostCents: count.ingredient_id
          ? (priceMap.get(count.ingredient_id) ?? null)
          : null,
      })
    }
  }

  return Array.from(needsByIngredient.values()).sort((a, b) => b.totalNeeded - a.totalNeeded)
}

export async function createCentralizedPO(
  input: z.infer<typeof CreatePOSchema>
): Promise<{ success: boolean; data?: CentralizedPO; error?: string }> {
  const user = await requireChef()
  const parsed = CreatePOSchema.parse(input)
  const db: any = createServerClient()

  // Calculate total estimated cost
  const totalEstimated = parsed.items.reduce((sum, item) => {
    const unitCost = item.estimatedUnitCostCents ?? 0
    return sum + Math.round(unitCost * item.totalQuantity)
  }, 0)

  // Create the PO
  const { data: po, error: poError } = await db
    .from('centralized_purchase_orders')
    .insert({
      tenant_id: user.tenantId!,
      title: parsed.title,
      vendor_name: parsed.vendorName ?? null,
      vendor_id: parsed.vendorId ?? null,
      total_estimated_cents: totalEstimated,
      notes: parsed.notes ?? null,
      expected_delivery_date: parsed.expectedDeliveryDate ?? null,
    })
    .select()
    .single()

  if (poError) return { success: false, error: poError.message }

  // Create items
  const itemInserts = parsed.items.map((item) => ({
    order_id: po.id,
    ingredient_id: item.ingredientId ?? null,
    ingredient_name: item.ingredientName,
    unit: item.unit,
    location_quantities: item.locationQuantities,
    total_quantity: item.totalQuantity,
    estimated_unit_cost_cents: item.estimatedUnitCostCents ?? null,
    notes: item.notes ?? null,
  }))

  const { data: items, error: itemsError } = await db
    .from('centralized_purchase_order_items')
    .insert(itemInserts)
    .select()

  if (itemsError) return { success: false, error: itemsError.message }

  revalidatePath('/locations/purchasing')
  return { success: true, data: mapPO(po, items ?? []) }
}

export async function listCentralizedPOs(status?: string): Promise<CentralizedPO[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('centralized_purchase_orders')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: pos, error } = await query
  if (error) throw new Error(`Failed to list POs: ${error.message}`)
  if (!pos?.length) return []

  // Get items for all POs
  const poIds = pos.map((p: any) => p.id)
  const { data: allItems } = await db
    .from('centralized_purchase_order_items')
    .select('*')
    .in('order_id', poIds)

  const itemsByPO = new Map<string, any[]>()
  for (const item of allItems ?? []) {
    const existing = itemsByPO.get(item.order_id) ?? []
    existing.push(item)
    itemsByPO.set(item.order_id, existing)
  }

  return pos.map((po: any) => mapPO(po, itemsByPO.get(po.id) ?? []))
}

export async function updatePOStatus(
  poId: string,
  status: CentralizedPO['status']
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('centralized_purchase_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', poId)
    .eq('tenant_id', user.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath('/locations/purchasing')
  return { success: true }
}
