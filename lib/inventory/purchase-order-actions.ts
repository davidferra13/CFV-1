// Purchase Order Server Actions
// Chef-only: Full PO lifecycle - draft, submit, receive, cancel.
// Receiving creates inventory_transactions (type: receive) and updates ingredient prices.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type PurchaseOrderStatus =
  | 'draft'
  | 'submitted'
  | 'partially_received'
  | 'received'
  | 'cancelled'

export type PurchaseOrder = {
  id: string
  chefId: string
  vendorId: string | null
  eventId: string | null
  poNumber: string | null
  status: PurchaseOrderStatus
  orderDate: string | null
  expectedDelivery: string | null
  deliveryLocationId: string | null
  estimatedTotalCents: number
  actualTotalCents: number | null
  photoUrl: string | null
  notes: string | null
  submittedAt: string | null
  receivedAt: string | null
  createdAt: string
  vendorName?: string
  eventTitle?: string
  itemCount?: number
}

export type POItem = {
  id: string
  purchaseOrderId: string
  ingredientId: string | null
  ingredientName: string
  orderedQty: number
  unit: string
  estimatedUnitPriceCents: number | null
  estimatedTotalCents: number | null
  receivedQty: number | null
  actualUnitPriceCents: number | null
  actualTotalCents: number | null
  isReceived: boolean
  isShorted: boolean
  isDamaged: boolean
  damageNotes: string | null
  expiryDate: string | null
  lotNumber: string | null
  notes: string | null
}

// ─── Schemas ─────────────────────────────────────────────────────

const CreatePOSchema = z.object({
  vendorId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  poNumber: z.string().optional(),
  orderDate: z.string().optional(),
  expectedDelivery: z.string().optional(),
  deliveryLocationId: z.string().uuid().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().url().optional(),
})

const AddPOItemSchema = z.object({
  ingredientId: z.string().uuid().optional(),
  ingredientName: z.string().min(1, 'Ingredient name is required'),
  orderedQty: z.number().positive('Ordered quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  estimatedUnitPriceCents: z.number().int().optional(),
  notes: z.string().optional(),
})

const UpdatePOItemSchema = z.object({
  ingredientName: z.string().min(1).optional(),
  orderedQty: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  estimatedUnitPriceCents: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const ReceiveItemSchema = z.object({
  itemId: z.string().uuid(),
  receivedQty: z.number().min(0),
  actualUnitPriceCents: z.number().int().optional(),
  isShorted: z.boolean().optional(),
  isDamaged: z.boolean().optional(),
  damageNotes: z.string().optional(),
  expiryDate: z.string().optional(),
  lotNumber: z.string().optional(),
})

export type CreatePOInput = z.infer<typeof CreatePOSchema>
export type AddPOItemInput = z.infer<typeof AddPOItemSchema>
export type UpdatePOItemInput = z.infer<typeof UpdatePOItemSchema>
export type ReceiveItemInput = z.infer<typeof ReceiveItemSchema>

// ─── DB helper ────────────────────────────────────────────
// All inventory tables are pre-built for planned schema.
// Cast .from() to bypass strict type checking.
function db(db: any) {
  return {
    purchaseOrders: () => db.from('purchase_orders' as any) as any,
    purchaseOrderItems: () => db.from('purchase_order_items' as any) as any,
    inventoryTransactions: () => db.from('inventory_transactions' as any) as any,
    inventoryBatches: () => db.from('inventory_batches' as any) as any,
  }
}

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Create a new purchase order in draft status.
 */
export async function createPurchaseOrder(input: CreatePOInput): Promise<PurchaseOrder> {
  const user = await requireChef()
  const parsed = CreatePOSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db(db)
    .purchaseOrders()
    .insert({
      chef_id: user.tenantId!,
      vendor_id: parsed.vendorId ?? null,
      event_id: parsed.eventId ?? null,
      po_number: parsed.poNumber ?? null,
      order_date: parsed.orderDate ?? null,
      expected_delivery: parsed.expectedDelivery ?? null,
      delivery_location_id: parsed.deliveryLocationId ?? null,
      notes: parsed.notes ?? null,
      photo_url: parsed.photoUrl ?? null,
      status: 'draft',
      estimated_total_cents: 0,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create purchase order: ${(error as any).message}`)

  revalidatePath('/inventory')
  revalidatePath('/inventory/purchase-orders')

  return mapPO(data)
}

/**
 * Auto-generate a purchase order from an event's menu recipes.
 * Walks: event -> menus -> dishes -> components -> recipes -> recipe_ingredients -> ingredients.
 * Also walks sub-recipes recursively.
 * Aggregates by ingredient, creates PO + items, using last_price_cents for estimates.
 */
export async function createPOFromEvent(eventId: string): Promise<PurchaseOrder> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify event ownership
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, tenant_id, occasion')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) throw new Error('Event not found')

  // Step 1: Get menus for this event
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (!menus || menus.length === 0) {
    throw new Error('No menus found for this event. Add menus before generating a PO.')
  }

  const menuIds = menus.map((m: any) => m.id)

  // Step 2: Get dishes for those menus
  const { data: dishes } = await db.from('dishes').select('id, menu_id').in('menu_id', menuIds)

  if (!dishes || dishes.length === 0) {
    throw new Error('No dishes found in the event menus.')
  }

  const dishIds = dishes.map((d: any) => d.id)

  // Step 3: Get components with recipe_id and scale_factor
  const { data: components } = await db
    .from('components')
    .select('id, recipe_id, scale_factor')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) {
    throw new Error('No recipe-linked components found in the event dishes.')
  }

  // Collect all recipe IDs (direct components)
  const recipeIds = (components as any[]).map((c: any) => c.recipe_id as string)
  const recipeScaleMap = new Map<string, number>()
  for (const c of components as any[]) {
    const existing = recipeScaleMap.get(c.recipe_id) ?? 0
    recipeScaleMap.set(c.recipe_id, existing + Number(c.scale_factor ?? 1))
  }

  // Step 4: Walk sub-recipes recursively to collect all recipe IDs and their effective multipliers
  const allRecipeMultipliers = new Map<string, number>()
  for (const [recipeId, scale] of recipeScaleMap) {
    allRecipeMultipliers.set(recipeId, (allRecipeMultipliers.get(recipeId) ?? 0) + scale)
  }

  // Recursive sub-recipe walk
  const visited = new Set<string>()
  const toProcess = [...recipeIds]

  while (toProcess.length > 0) {
    const batch = toProcess.filter((id) => !visited.has(id))
    if (batch.length === 0) break
    batch.forEach((id) => visited.add(id))

    const { data: subRecipes } = await db
      .from('recipe_sub_recipes')
      .select('parent_recipe_id, child_recipe_id, quantity')
      .in('parent_recipe_id', batch)

    if (subRecipes && subRecipes.length > 0) {
      for (const sr of subRecipes as any[]) {
        const parentMultiplier = allRecipeMultipliers.get(sr.parent_recipe_id) ?? 1
        const childMultiplier = parentMultiplier * Number(sr.quantity ?? 1)
        allRecipeMultipliers.set(
          sr.child_recipe_id,
          (allRecipeMultipliers.get(sr.child_recipe_id) ?? 0) + childMultiplier
        )
        toProcess.push(sr.child_recipe_id)
      }
    }
  }

  // Step 5: Get recipe_ingredients for all collected recipes
  const allRecipeIds = Array.from(allRecipeMultipliers.keys())
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit')
    .in('recipe_id', allRecipeIds)

  if (!recipeIngredients || recipeIngredients.length === 0) {
    throw new Error('No ingredients found in the event recipes.')
  }

  // Step 6: Get ingredient details
  const ingredientIds = [
    ...new Set((recipeIngredients as any[]).map((ri: any) => ri.ingredient_id)),
  ]
  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name, last_price_cents')
    .in('id', ingredientIds)

  const ingredientMap = new Map<string, { name: string; lastPriceCents: number | null }>()
  for (const ing of (ingredients || []) as any[]) {
    ingredientMap.set(ing.id, { name: ing.name, lastPriceCents: ing.last_price_cents })
  }

  // Step 7: Aggregate quantities by ingredient
  const aggregated = new Map<
    string,
    {
      ingredientId: string
      ingredientName: string
      quantity: number
      unit: string
      lastPriceCents: number | null
    }
  >()

  for (const ri of recipeIngredients as any[]) {
    const multiplier = allRecipeMultipliers.get(ri.recipe_id) ?? 1
    const qty = Number(ri.quantity) * multiplier
    const ingInfo = ingredientMap.get(ri.ingredient_id)
    if (!ingInfo) continue

    const key = `${ri.ingredient_id}:${ri.unit}`
    const existing = aggregated.get(key)
    if (existing) {
      existing.quantity += qty
    } else {
      aggregated.set(key, {
        ingredientId: ri.ingredient_id,
        ingredientName: ingInfo.name,
        quantity: qty,
        unit: ri.unit,
        lastPriceCents: ingInfo.lastPriceCents,
      })
    }
  }

  // Step 8: Create the PO
  let estimatedTotalCents = 0
  const poItems: Array<{
    ingredient_id: string
    ingredient_name: string
    ordered_qty: number
    unit: string
    estimated_unit_price_cents: number | null
    estimated_total_cents: number | null
  }> = []

  for (const item of aggregated.values()) {
    const itemEstimate =
      item.lastPriceCents != null ? Math.round(item.quantity * item.lastPriceCents) : null
    if (itemEstimate) estimatedTotalCents += itemEstimate

    poItems.push({
      ingredient_id: item.ingredientId,
      ingredient_name: item.ingredientName,
      ordered_qty: Math.round(item.quantity * 1000) / 1000, // 3 decimal precision
      unit: item.unit,
      estimated_unit_price_cents: item.lastPriceCents,
      estimated_total_cents: itemEstimate,
    })
  }

  // Create PO header
  const { data: po, error: poError } = await db(db)
    .purchaseOrders()
    .insert({
      chef_id: user.tenantId!,
      event_id: eventId,
      status: 'draft',
      estimated_total_cents: estimatedTotalCents,
      notes: `Auto-generated from event: ${(event as any).occasion || eventId}`,
      created_by: user.id,
    })
    .select()
    .single()

  if (poError) throw new Error(`Failed to create purchase order: ${(poError as any).message}`)

  // Create PO items
  if (poItems.length > 0) {
    const itemRows = poItems.map((item) => ({
      purchase_order_id: po.id,
      ...item,
    }))

    const { error: itemsError } = await db(db).purchaseOrderItems().insert(itemRows)

    if (itemsError) throw new Error(`Failed to create PO items: ${(itemsError as any).message}`)
  }

  revalidatePath('/inventory')
  revalidatePath('/inventory/purchase-orders')
  revalidatePath(`/events/${eventId}`)

  return { ...mapPO(po), itemCount: poItems.length }
}

/**
 * Add an item to an existing purchase order.
 * Recalculates estimated_total_cents on the PO.
 */
export async function addPOItem(poId: string, input: AddPOItemInput): Promise<POItem> {
  const user = await requireChef()
  const parsed = AddPOItemSchema.parse(input)
  const db: any = createServerClient()

  // Verify PO ownership and status
  await verifyPOOwnership(db, poId, user.tenantId!)

  const estimatedTotal =
    parsed.estimatedUnitPriceCents != null
      ? Math.round(parsed.orderedQty * parsed.estimatedUnitPriceCents)
      : null

  const { data, error } = await db(db)
    .purchaseOrderItems()
    .insert({
      purchase_order_id: poId,
      ingredient_id: parsed.ingredientId ?? null,
      ingredient_name: parsed.ingredientName,
      ordered_qty: parsed.orderedQty,
      unit: parsed.unit,
      estimated_unit_price_cents: parsed.estimatedUnitPriceCents ?? null,
      estimated_total_cents: estimatedTotal,
      notes: parsed.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add PO item: ${(error as any).message}`)

  // Recalculate PO estimated total
  await recalcPOEstimatedTotal(db, poId, user.tenantId!)

  revalidatePath('/inventory')
  revalidatePath('/inventory/purchase-orders')

  return mapPOItem(data)
}

/**
 * Update an existing PO item.
 * Recalculates estimated_total_cents on the PO.
 */
export async function updatePOItem(itemId: string, input: UpdatePOItemInput): Promise<POItem> {
  const user = await requireChef()
  const parsed = UpdatePOItemSchema.parse(input)
  const db: any = createServerClient()

  // Get the item to find its PO, then verify ownership
  const { data: item, error: fetchError } = await db(db)
    .purchaseOrderItems()
    .select('purchase_order_id, ordered_qty, estimated_unit_price_cents')
    .eq('id', itemId)
    .single()

  if (fetchError || !item) throw new Error('PO item not found')
  await verifyPOOwnership(db, (item as any).purchase_order_id, user.tenantId!)

  // Build update payload
  const updatePayload: Record<string, any> = {}
  if (parsed.ingredientName !== undefined) updatePayload.ingredient_name = parsed.ingredientName
  if (parsed.orderedQty !== undefined) updatePayload.ordered_qty = parsed.orderedQty
  if (parsed.unit !== undefined) updatePayload.unit = parsed.unit
  if (parsed.estimatedUnitPriceCents !== undefined) {
    updatePayload.estimated_unit_price_cents = parsed.estimatedUnitPriceCents
  }
  if (parsed.notes !== undefined) updatePayload.notes = parsed.notes

  // Recalculate item estimated total if qty or unit price changed
  const finalQty = parsed.orderedQty ?? Number((item as any).ordered_qty)
  const finalPrice =
    parsed.estimatedUnitPriceCents !== undefined
      ? parsed.estimatedUnitPriceCents
      : (item as any).estimated_unit_price_cents
  updatePayload.estimated_total_cents =
    finalPrice != null ? Math.round(finalQty * finalPrice) : null

  const { data, error } = await db(db)
    .purchaseOrderItems()
    .update(updatePayload)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update PO item: ${(error as any).message}`)

  await recalcPOEstimatedTotal(db, (item as any).purchase_order_id, user.tenantId!)

  revalidatePath('/inventory')
  revalidatePath('/inventory/purchase-orders')

  return mapPOItem(data)
}

/**
 * Remove an item from a purchase order.
 * Recalculates estimated_total_cents on the PO.
 */
export async function removePOItem(itemId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get the item to find its PO
  const { data: item, error: fetchError } = await db(db)
    .purchaseOrderItems()
    .select('purchase_order_id')
    .eq('id', itemId)
    .single()

  if (fetchError || !item) throw new Error('PO item not found')
  await verifyPOOwnership(db, (item as any).purchase_order_id, user.tenantId!)

  const { error } = await db(db).purchaseOrderItems().delete().eq('id', itemId)

  if (error) throw new Error(`Failed to remove PO item: ${(error as any).message}`)

  await recalcPOEstimatedTotal(db, (item as any).purchase_order_id, user.tenantId!)

  revalidatePath('/inventory')
  revalidatePath('/inventory/purchase-orders')
}

/**
 * Submit a purchase order - transitions from draft to submitted.
 */
export async function submitPO(poId: string): Promise<PurchaseOrder> {
  const user = await requireChef()
  const db: any = createServerClient()

  const po = await verifyPOOwnership(db, poId, user.tenantId!)
  if (po.status !== 'draft') {
    throw new Error(`Cannot submit PO in "${po.status}" status - must be draft`)
  }

  const { data, error } = await db(db)
    .purchaseOrders()
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', poId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to submit PO: ${(error as any).message}`)

  revalidatePath('/inventory')
  revalidatePath('/inventory/purchase-orders')

  return mapPO(data)
}

/**
 * Receive items on a purchase order.
 * For each received item:
 *   1. Updates the PO item with received data
 *   2. Creates an inventory_transaction (type: receive, positive quantity)
 *   3. Updates ingredient.last_price_cents if actual price provided
 * Then: if all items received -> status='received', else -> 'partially_received'.
 * Recalculates actual_total_cents.
 */
export async function receivePOItems(
  poId: string,
  items: ReceiveItemInput[]
): Promise<PurchaseOrder> {
  const user = await requireChef()
  const parsedItems = items.map((item) => ReceiveItemSchema.parse(item))
  const db: any = createServerClient()

  const po = await verifyPOOwnership(db, poId, user.tenantId!)
  if (po.status === 'cancelled') {
    throw new Error('Cannot receive items on a cancelled PO')
  }

  // Track ingredient IDs whose prices changed (for recipe cost cascade)
  const priceChangedIngredientIds: string[] = []

  // Process each item
  for (const item of parsedItems) {
    // Get the PO item details
    const { data: poItem, error: itemError } = await db(db)
      .purchaseOrderItems()
      .select('*')
      .eq('id', item.itemId)
      .eq('purchase_order_id', poId)
      .single()

    if (itemError || !poItem) {
      throw new Error(`PO item not found: ${item.itemId}`)
    }

    const actualUnitPrice = item.actualUnitPriceCents ?? (poItem as any).estimated_unit_price_cents
    const actualTotal =
      actualUnitPrice != null ? Math.round(item.receivedQty * actualUnitPrice) : null

    // Update the PO item
    const { error: updateError } = await db(db)
      .purchaseOrderItems()
      .update({
        received_qty: item.receivedQty,
        actual_unit_price_cents: actualUnitPrice,
        actual_total_cents: actualTotal,
        received_at: new Date().toISOString(),
        is_received: true,
        is_shorted: item.isShorted ?? item.receivedQty < Number((poItem as any).ordered_qty),
        is_damaged: item.isDamaged ?? false,
        damage_notes: item.damageNotes ?? null,
        expiry_date: item.expiryDate ?? null,
        lot_number: item.lotNumber ?? null,
      })
      .eq('id', item.itemId)

    if (updateError) throw new Error(`Failed to update PO item: ${(updateError as any).message}`)

    // Create inventory_transaction for the received quantity (if qty > 0)
    if (item.receivedQty > 0) {
      const totalCostCents =
        actualUnitPrice != null ? Math.round(item.receivedQty * actualUnitPrice) : null
      let batchId: string | null = null

      const { data: batch, error: batchError } = await db(db)
        .inventoryBatches()
        .insert({
          chef_id: user.tenantId!,
          ingredient_id: (poItem as any).ingredient_id ?? null,
          ingredient_name: (poItem as any).ingredient_name,
          received_date: ((_d) =>
            `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(
            new Date()
          ),
          expiry_date: item.expiryDate ?? null,
          lot_number: item.lotNumber?.trim() || null,
          vendor_id: po.vendor_id ?? null,
          purchase_order_id: poId,
          initial_qty: item.receivedQty,
          remaining_qty: item.receivedQty,
          unit: (poItem as any).unit,
          unit_cost_cents: actualUnitPrice ?? null,
          location_id: po.delivery_location_id ?? null,
          notes: `Received via PO ${po.po_number || poId}`,
        })
        .select('id')
        .single()

      if (batchError) {
        throw new Error(`Failed to create inventory batch: ${(batchError as any).message}`)
      }

      batchId = (batch as any)?.id ?? null

      const { error: txError } = await db(db)
        .inventoryTransactions()
        .insert({
          chef_id: user.tenantId!,
          ingredient_id: (poItem as any).ingredient_id ?? null,
          ingredient_name: (poItem as any).ingredient_name,
          transaction_type: 'receive',
          quantity: item.receivedQty, // Positive = adding stock
          unit: (poItem as any).unit,
          cost_cents: totalCostCents,
          location_id: po.delivery_location_id ?? null,
          purchase_order_id: poId,
          expiry_date: item.expiryDate ?? null,
          batch_id: batchId,
          notes: `Received via PO ${po.po_number || poId}`,
          created_by: user.id,
        })

      if (txError)
        throw new Error(`Failed to create receive transaction: ${(txError as any).message}`)
    }

    // Update ingredient.last_price_cents if actual price provided and ingredient is linked
    if (item.actualUnitPriceCents != null && (poItem as any).ingredient_id) {
      try {
        await db
          .from('ingredients')
          .update({ last_price_cents: item.actualUnitPriceCents } as any)
          .eq('id', (poItem as any).ingredient_id)

        priceChangedIngredientIds.push((poItem as any).ingredient_id)

        // Record price history entry (non-blocking)
        await db.from('ingredient_price_history').insert({
          chef_id: user.tenantId!,
          ingredient_id: (poItem as any).ingredient_id,
          price_cents: item.actualUnitPriceCents,
          unit: (poItem as any).unit,
          source: 'po_receipt',
          source_id: item.itemId,
          vendor_id: po.vendor_id ?? null,
          recorded_at: ((_d) =>
            `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(
            new Date()
          ),
          notes: `PO ${po.po_number || poId}`,
        })
      } catch (err) {
        // Non-blocking: price update failure shouldn't stop receiving
        console.error('[non-blocking] Failed to update ingredient price', err)
      }
    }
  }

  // Determine new PO status: check if all items are received
  const { data: allItems, error: allItemsError } = await db(db)
    .purchaseOrderItems()
    .select('is_received, actual_total_cents')
    .eq('purchase_order_id', poId)

  if (allItemsError) throw new Error(`Failed to check PO items: ${(allItemsError as any).message}`)

  const allReceived = (allItems || []).every((i: any) => i.is_received)
  const newStatus = allReceived ? 'received' : 'partially_received'

  // Calculate actual total from received items
  const actualTotalCents = (allItems || []).reduce((sum: number, i: any) => {
    return sum + (i.actual_total_cents ?? 0)
  }, 0)

  // Update PO status and actual total
  const { data: updatedPO, error: poUpdateError } = await db(db)
    .purchaseOrders()
    .update({
      status: newStatus,
      actual_total_cents: actualTotalCents,
      received_at: allReceived ? new Date().toISOString() : null,
    })
    .eq('id', poId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (poUpdateError)
    throw new Error(`Failed to update PO status: ${(poUpdateError as any).message}`)

  // Propagate price changes to recipe costs (non-blocking)
  if (priceChangedIngredientIds.length > 0) {
    try {
      const { propagatePriceChange } = await import('@/lib/pricing/cost-refresh-actions')
      await propagatePriceChange(priceChangedIngredientIds)
    } catch (err) {
      console.error('[non-blocking] Recipe cost cascade failed after PO receive:', err)
    }
  }

  revalidatePath('/inventory')
  revalidatePath('/inventory/expiry')
  revalidatePath('/inventory/purchase-orders')

  return mapPO(updatedPO)
}

/**
 * Get purchase orders with optional status filter.
 * Includes vendor name and item count.
 */
export async function getPurchaseOrders(filters?: {
  status?: PurchaseOrderStatus
  vendorId?: string
  eventId?: string
}): Promise<PurchaseOrder[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db(db)
    .purchaseOrders()
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.vendorId) {
    query = query.eq('vendor_id', filters.vendorId)
  }
  if (filters?.eventId) {
    query = query.eq('event_id', filters.eventId)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch purchase orders: ${(error as any).message}`)

  // Enrich with vendor names and item counts
  const pos = data || []
  if (pos.length === 0) return []

  const poIds = pos.map((p: any) => p.id)
  const vendorIds = [...new Set(pos.map((p: any) => p.vendor_id).filter(Boolean))]

  // Get vendor names
  const vendorNameMap = new Map<string, string>()
  if (vendorIds.length > 0) {
    const { data: vendors } = await (db.from('vendors') as any)
      .select('id, name')
      .in('id', vendorIds)

    for (const v of (vendors || []) as any[]) {
      vendorNameMap.set(v.id, v.name)
    }
  }

  // Get item counts per PO
  const { data: itemCounts } = await db(db)
    .purchaseOrderItems()
    .select('purchase_order_id')
    .in('purchase_order_id', poIds)

  const countMap = new Map<string, number>()
  for (const item of (itemCounts || []) as any[]) {
    countMap.set(item.purchase_order_id, (countMap.get(item.purchase_order_id) ?? 0) + 1)
  }

  // Get event titles
  const eventIds = [...new Set(pos.map((p: any) => p.event_id).filter(Boolean))]
  const eventTitleMap = new Map<string, string>()
  if (eventIds.length > 0) {
    const { data: events } = await db.from('events').select('id, occasion').in('id', eventIds)

    for (const e of (events || []) as any[]) {
      eventTitleMap.set(e.id, e.occasion)
    }
  }

  return pos.map((row: any) => ({
    ...mapPO(row),
    vendorName: row.vendor_id ? vendorNameMap.get(row.vendor_id) : undefined,
    eventTitle: row.event_id ? eventTitleMap.get(row.event_id) : undefined,
    itemCount: countMap.get(row.id) ?? 0,
  }))
}

/**
 * Get a single purchase order with all its items.
 */
export async function getPurchaseOrder(
  poId: string
): Promise<{ po: PurchaseOrder; items: POItem[] }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: po, error: poError } = await db(db)
    .purchaseOrders()
    .select('*')
    .eq('id', poId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (poError || !po) throw new Error('Purchase order not found')

  const { data: items, error: itemsError } = await db(db)
    .purchaseOrderItems()
    .select('*')
    .eq('purchase_order_id', poId)
    .order('created_at', { ascending: true })

  if (itemsError) throw new Error(`Failed to fetch PO items: ${(itemsError as any).message}`)

  // Get vendor name if applicable
  let vendorName: string | undefined
  if ((po as any).vendor_id) {
    const { data: vendor } = await db
      .from('vendors')
      .select('name')
      .eq('id', (po as any).vendor_id)
      .single()
    vendorName = (vendor as any)?.name
  }

  // Get event title if applicable
  let eventTitle: string | undefined
  if ((po as any).event_id) {
    const { data: event } = await db
      .from('events')
      .select('occasion')
      .eq('id', (po as any).event_id)
      .single()
    eventTitle = (event as any)?.occasion
  }

  return {
    po: {
      ...mapPO(po),
      vendorName,
      eventTitle,
      itemCount: (items || []).length,
    },
    items: (items || []).map(mapPOItem),
  }
}

/**
 * Cancel a purchase order.
 * Only draft or submitted POs can be cancelled.
 */
export async function cancelPO(poId: string): Promise<PurchaseOrder> {
  const user = await requireChef()
  const db: any = createServerClient()

  const po = await verifyPOOwnership(db, poId, user.tenantId!)
  if (po.status === 'received' || po.status === 'cancelled') {
    throw new Error(`Cannot cancel PO in "${po.status}" status`)
  }

  const { data, error } = await db(db)
    .purchaseOrders()
    .update({ status: 'cancelled' })
    .eq('id', poId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to cancel PO: ${(error as any).message}`)

  revalidatePath('/inventory')
  revalidatePath('/inventory/purchase-orders')

  return mapPO(data)
}

// ─── Helpers ─────────────────────────────────────────────────────

async function verifyPOOwnership(db: any, poId: string, tenantId: string): Promise<any> {
  const { data, error } = await db(db)
    .purchaseOrders()
    .select('*')
    .eq('id', poId)
    .eq('chef_id', tenantId)
    .single()

  if (error || !data) throw new Error('Purchase order not found')
  return data
}

async function recalcPOEstimatedTotal(db: any, poId: string, tenantId: string): Promise<void> {
  const { data: items } = await db(db)
    .purchaseOrderItems()
    .select('estimated_total_cents')
    .eq('purchase_order_id', poId)

  const total = (items || []).reduce((sum: number, i: any) => {
    return sum + (i.estimated_total_cents ?? 0)
  }, 0)

  await db(db)
    .purchaseOrders()
    .update({ estimated_total_cents: total })
    .eq('id', poId)
    .eq('chef_id', tenantId)
}

function mapPO(row: any): PurchaseOrder {
  return {
    id: row.id,
    chefId: row.chef_id,
    vendorId: row.vendor_id,
    eventId: row.event_id,
    poNumber: row.po_number,
    status: row.status,
    orderDate: row.order_date,
    expectedDelivery: row.expected_delivery,
    deliveryLocationId: row.delivery_location_id,
    estimatedTotalCents: row.estimated_total_cents ?? 0,
    actualTotalCents: row.actual_total_cents,
    photoUrl: row.photo_url,
    notes: row.notes,
    submittedAt: row.submitted_at,
    receivedAt: row.received_at,
    createdAt: row.created_at,
  }
}

function mapPOItem(row: any): POItem {
  return {
    id: row.id,
    purchaseOrderId: row.purchase_order_id,
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    orderedQty: Number(row.ordered_qty),
    unit: row.unit,
    estimatedUnitPriceCents: row.estimated_unit_price_cents,
    estimatedTotalCents: row.estimated_total_cents,
    receivedQty: row.received_qty != null ? Number(row.received_qty) : null,
    actualUnitPriceCents: row.actual_unit_price_cents,
    actualTotalCents: row.actual_total_cents,
    isReceived: row.is_received ?? false,
    isShorted: row.is_shorted ?? false,
    isDamaged: row.is_damaged ?? false,
    damageNotes: row.damage_notes,
    expiryDate: row.expiry_date,
    lotNumber: row.lot_number,
    notes: row.notes,
  }
}
