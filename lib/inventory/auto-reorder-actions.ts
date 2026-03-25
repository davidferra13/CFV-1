// Auto-Reorder Server Actions
// Generates draft purchase orders from par-level shortfalls and demand forecasts.
// Uses existing PO creation infrastructure. Formula > AI.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getReorderSuggestions } from './demand-forecast-actions'
import { createPurchaseOrder, addPOItem } from './purchase-order-actions'

// ── Types ────────────────────────────────────────────────────────────────────

export type AutoReorderPreview = {
  vendorName: string | null
  vendorId: string | null
  items: Array<{
    ingredientId: string
    ingredientName: string
    reorderQty: number
    unit: string
    estimatedCostCents: number
  }>
  totalCostCents: number
}

export type AutoReorderResult = {
  purchaseOrderIds: string[]
  totalPOs: number
  totalItems: number
  totalEstimatedCostCents: number
}

// ── Preview ──────────────────────────────────────────────────────────────────

/**
 * Preview what purchase orders would be created by auto-reorder.
 * Read-only: does not create any POs.
 * Uses reorder_settings.reorder_qty when set, otherwise uses the deficit quantity.
 */
export async function previewAutoReorder(): Promise<AutoReorderPreview[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const suggestions = await getReorderSuggestions()
  if (suggestions.length === 0) return []

  // Look up reorder settings for custom reorder quantities
  const ingredientIds = suggestions.flatMap((g) => g.items.map((i) => i.ingredientId))
  const reorderQtyMap = await getReorderQuantities(db, user.tenantId!, ingredientIds)

  return suggestions.map((group) => ({
    vendorName: group.vendorName,
    vendorId: group.vendorId,
    items: group.items.map((item) => {
      // Use reorder_qty from settings if set, otherwise use calculated deficit
      const customQty = reorderQtyMap.get(item.ingredientId)
      const reorderQty = customQty != null && customQty > 0 ? customQty : item.deficit

      return {
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        reorderQty: Math.ceil(reorderQty), // Round up to whole units
        unit: item.unit,
        estimatedCostCents: item.estimatedCostCents,
      }
    }),
    totalCostCents: group.totalCostCents,
  }))
}

// ── Generate POs ─────────────────────────────────────────────────────────────

/**
 * Generate draft purchase orders from auto-reorder suggestions.
 * Creates one PO per vendor group (items without a vendor go into a single "unassigned" PO).
 * All POs start in draft status for chef review before submission.
 */
export async function generateAutoReorderPOs(): Promise<AutoReorderResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const preview = await previewAutoReorder()
  if (preview.length === 0) {
    return { purchaseOrderIds: [], totalPOs: 0, totalItems: 0, totalEstimatedCostCents: 0 }
  }

  const purchaseOrderIds: string[] = []
  let totalItems = 0
  let totalEstimatedCostCents = 0

  for (const group of preview) {
    // Only create PO if there are items to order
    if (group.items.length === 0) continue

    // Create the draft PO
    const po = await createPurchaseOrder({
      vendorId: group.vendorId ?? undefined,
      notes: `Auto-generated reorder (${group.items.length} items)`,
      orderDate: new Date().toISOString().split('T')[0],
    })

    // Add each item to the PO
    for (const item of group.items) {
      try {
        await addPOItem(po.id, {
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          orderedQty: item.reorderQty,
          unit: item.unit,
          estimatedUnitPriceCents:
            item.estimatedCostCents > 0
              ? Math.round(item.estimatedCostCents / item.reorderQty)
              : undefined,
        })
        totalItems++
        totalEstimatedCostCents += item.estimatedCostCents
      } catch (err) {
        // Non-blocking: individual item failure shouldn't stop other items
        console.error(`[non-blocking] Failed to add PO item ${item.ingredientName}:`, err)
      }
    }

    purchaseOrderIds.push(po.id)
  }

  return {
    purchaseOrderIds,
    totalPOs: purchaseOrderIds.length,
    totalItems,
    totalEstimatedCostCents,
  }
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Look up custom reorder quantities from reorder_settings.
 */
async function getReorderQuantities(
  db: any,
  chefId: string,
  ingredientIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (ingredientIds.length === 0) return map

  const { data } = await db
    .from('reorder_settings')
    .select('ingredient_id, reorder_qty')
    .eq('chef_id', chefId)
    .in('ingredient_id', ingredientIds)
    .not('reorder_qty', 'is', null)

  for (const row of (data as any[]) || []) {
    if (row.ingredient_id && row.reorder_qty > 0) {
      map.set(row.ingredient_id, Number(row.reorder_qty))
    }
  }

  return map
}
