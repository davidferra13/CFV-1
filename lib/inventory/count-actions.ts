// Inventory Count Server Actions
// Chef-only: Track ingredient inventory levels, par alerts, and reorder suggestions

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { pgClient } from '@/lib/db'
import { createNotification } from '@/lib/notifications/actions'
import {
  computePantryStockPositions,
  decideCountAdjustment,
  type PantryCountRow,
  type PantryMovementRow,
} from '@/lib/inventory/pantry-engine'

// ─── Types ───────────────────────────────────────────────────────

type InventoryCount = {
  id: string
  chefId: string
  ingredientId: string | null
  ingredientName: string
  currentQty: number
  parLevel: number | null
  unit: string
  lastCountedAt: string
  vendorId: string | null
  createdAt: string
  updatedAt: string
}

type ParAlert = {
  id: string
  ingredientName: string
  currentQty: number
  parLevel: number
  unit: string
  deficit: number
  vendorId: string | null
  confidenceStatus?: string
}

type ReorderGroup = {
  vendorId: string | null
  items: {
    id: string
    ingredientName: string
    currentQty: number
    parLevel: number
    unit: string
    deficit: number
  }[]
}

// ─── Schemas ─────────────────────────────────────────────────────

const UpdateInventoryCountSchema = z.object({
  ingredientName: z.string().min(1, 'Ingredient name is required'),
  currentQty: z.number().min(0, 'Quantity cannot be negative'),
  parLevel: z.number().min(0).optional(),
  unit: z.string().min(1, 'Unit is required'),
  vendorId: z.string().uuid().optional(),
})

type UpdateInventoryCountInput = z.infer<typeof UpdateInventoryCountSchema>

async function notifyLowInventory({
  tenantId,
  recipientId,
  inventoryCountId,
  ingredientName,
  currentQty,
  parLevel,
  unit,
  vendorId,
}: {
  tenantId: string
  recipientId: string
  inventoryCountId: string
  ingredientName: string
  currentQty: number
  parLevel: number
  unit: string
  vendorId: string | null
}) {
  if (currentQty >= parLevel) return

  const deficit = parLevel - currentQty

  try {
    await createNotification({
      tenantId,
      recipientId,
      category: 'ops',
      action: 'low_stock',
      title: `Low stock: ${ingredientName}`,
      body: `${ingredientName} is at ${currentQty} ${unit}, below the par level of ${parLevel} ${unit}. Deficit: ${deficit} ${unit}.`,
      actionUrl: '/ops/inventory',
      metadata: {
        inventory_count_id: inventoryCountId,
        ingredient_name: ingredientName,
        current_qty: currentQty,
        par_level: parLevel,
        deficit,
        unit,
        vendor_id: vendorId,
        source: 'inventory_count',
      },
    })
  } catch (err) {
    console.error('[non-blocking] Failed to send low stock notification', err)
  }
}

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Upsert an inventory count by chef_id + ingredient_name.
 * Creates the record if it doesn't exist, updates if it does.
 */
export async function updateInventoryCount(
  input: UpdateInventoryCountInput
): Promise<InventoryCount> {
  const user = await requireChef()
  const parsed = UpdateInventoryCountSchema.parse(input)
  let data: any

  await pgClient.begin(async (txSql: any) => {
    const [ledger] = await txSql`
      SELECT
        COALESCE(SUM(quantity), 0)::numeric AS ledger_qty,
        COUNT(*)::int AS movement_count
      FROM inventory_transactions
      WHERE chef_id = ${user.tenantId!}
        AND lower(ingredient_name) = lower(${parsed.ingredientName})
        AND unit = ${parsed.unit}
        AND COALESCE(review_status, 'approved') <> 'rejected'
    `

    const ledgerQty = Number(ledger?.ledger_qty ?? 0)
    const movementCount = Number(ledger?.movement_count ?? 0)
    const decision = decideCountAdjustment({
      targetQty: parsed.currentQty,
      ledgerQty,
      hasLedgerMovements: movementCount > 0,
    })

    if (decision) {
      const [evidence] = await txSql`
        INSERT INTO inventory_evidence_sources (
          chef_id,
          source_type,
          confidence_status,
          confidence_score,
          reviewed_at,
          reviewed_by,
          notes
        )
        VALUES (
          ${user.tenantId!},
          ${decision.evidenceSourceType},
          ${decision.confidenceStatus},
          ${1},
          NOW(),
          ${user.id},
          ${
            decision.transactionType === 'opening_balance'
              ? 'Chef baseline inventory count'
              : 'Chef manual inventory correction'
          }
        )
        RETURNING id
      `

      await txSql`
        INSERT INTO inventory_transactions (
          chef_id,
          ingredient_name,
          transaction_type,
          quantity,
          unit,
          notes,
          created_by,
          evidence_source_id,
          confidence_status,
          confidence_score,
          source_quantity,
          source_unit,
          canonical_quantity,
          canonical_unit,
          conversion_status,
          review_status
        )
        VALUES (
          ${user.tenantId!},
          ${parsed.ingredientName},
          ${decision.transactionType},
          ${decision.quantity},
          ${parsed.unit},
          ${
            decision.transactionType === 'opening_balance'
              ? `Opening balance from chef count: ${parsed.currentQty} ${parsed.unit}`
              : `Manual correction from ${ledgerQty} ${parsed.unit} to ${parsed.currentQty} ${parsed.unit}`
          },
          ${user.id},
          ${evidence.id},
          ${decision.confidenceStatus},
          ${1},
          ${parsed.currentQty},
          ${parsed.unit},
          ${parsed.currentQty},
          ${parsed.unit},
          ${'not_required'},
          ${'approved'}
        )
      `
    }

    const [upserted] = await txSql`
      INSERT INTO inventory_counts (
        chef_id,
        ingredient_name,
        current_qty,
        par_level,
        unit,
        vendor_id,
        last_counted_at
      )
      VALUES (
        ${user.tenantId!},
        ${parsed.ingredientName},
        ${parsed.currentQty},
        ${parsed.parLevel ?? null},
        ${parsed.unit},
        ${parsed.vendorId ?? null},
        NOW()
      )
      ON CONFLICT (chef_id, ingredient_name)
      DO UPDATE SET
        current_qty = EXCLUDED.current_qty,
        par_level = EXCLUDED.par_level,
        unit = EXCLUDED.unit,
        vendor_id = EXCLUDED.vendor_id,
        last_counted_at = EXCLUDED.last_counted_at,
        updated_at = NOW()
      RETURNING *
    `

    data = upserted
  })

  const currentQty = Number((data as any).current_qty)
  const parLevel = (data as any).par_level != null ? Number((data as any).par_level) : null
  const vendorId = (data as any).vendor_id

  if (parLevel != null) {
    await notifyLowInventory({
      tenantId: user.tenantId!,
      recipientId: user.id,
      inventoryCountId: (data as any).id,
      ingredientName: (data as any).ingredient_name,
      currentQty,
      parLevel,
      unit: (data as any).unit,
      vendorId,
    })
  }

  revalidatePath('/inventory')
  revalidatePath('/inventory/counts')
  revalidatePath('/ops/inventory')

  return {
    id: (data as any).id,
    chefId: (data as any).chef_id,
    ingredientId: (data as any).ingredient_id,
    ingredientName: (data as any).ingredient_name,
    currentQty,
    parLevel,
    unit: (data as any).unit,
    lastCountedAt: (data as any).last_counted_at,
    vendorId,
    createdAt: (data as any).created_at,
    updatedAt: (data as any).updated_at,
  }
}

/**
 * Get all inventory items for the current chef, ordered by ingredient name.
 */
export async function getInventoryCounts(): Promise<InventoryCount[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('inventory_counts')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('ingredient_name', { ascending: true })

  if (error) throw new Error(`Failed to fetch inventory counts: ${error.message}`)

  return ((data || []) as any[]).map((row: any) => ({
    id: row.id,
    chefId: row.chef_id,
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    currentQty: Number(row.current_qty),
    parLevel: row.par_level != null ? Number(row.par_level) : null,
    unit: row.unit,
    lastCountedAt: row.last_counted_at,
    vendorId: row.vendor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

/**
 * Get items where current_qty < par_level (items needing restock).
 */
export async function getParAlerts(): Promise<ParAlert[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: counts, error: countError } = await db
    .from('inventory_counts')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .not('par_level', 'is', null)
    .order('ingredient_name', { ascending: true })

  if (countError) throw new Error(`Failed to fetch par alerts: ${countError.message}`)

  const { data: movements, error: movementError } = await db
    .from('inventory_transactions' as any)
    .select(
      'id, ingredient_id, ingredient_name, transaction_type, quantity, unit, cost_cents, location_id, created_at, confidence_status, review_status'
    )
    .eq('chef_id', user.tenantId!)

  if (movementError)
    throw new Error(`Failed to fetch inventory movements: ${movementError.message}`)

  const positions = computePantryStockPositions({
    movements: ((movements ?? []) as any[]).map(
      (row: any): PantryMovementRow => ({
        id: row.id,
        ingredient_id: row.ingredient_id ?? null,
        ingredient_name: row.ingredient_name,
        transaction_type: row.transaction_type,
        quantity: row.quantity,
        unit: row.unit,
        cost_cents: row.cost_cents ?? null,
        location_id: row.location_id ?? null,
        created_at: row.created_at ?? null,
        confidence_status: row.confidence_status ?? 'confirmed',
        review_status: row.review_status ?? 'approved',
      })
    ),
    counts: ((counts ?? []) as any[]).map(
      (row: any): PantryCountRow => ({
        id: row.id,
        ingredient_id: row.ingredient_id ?? null,
        ingredient_name: row.ingredient_name,
        current_qty: row.current_qty,
        par_level: row.par_level ?? null,
        unit: row.unit,
        last_counted_at: row.last_counted_at ?? null,
        updated_at: row.updated_at ?? null,
        vendor_id: row.vendor_id ?? null,
      })
    ),
  })

  const vendorByKey = new Map(
    ((counts ?? []) as any[]).map((row: any) => [
      `${row.ingredient_id ?? row.ingredient_name.toLowerCase()}::${row.unit.toLowerCase()}`,
      row.vendor_id ?? null,
    ])
  )

  return positions
    .filter((position) => position.parLevel != null && position.deficit > 0)
    .filter((position) => position.confidenceStatus !== 'unknown')
    .filter((position) => position.confidenceStatus !== 'conflict')
    .map((position) => ({
      id: position.key,
      ingredientName: position.ingredientName,
      currentQty: position.currentQty,
      parLevel: position.parLevel!,
      unit: position.unit,
      deficit: position.deficit,
      vendorId: vendorByKey.get(position.key) ?? null,
      confidenceStatus: position.confidenceStatus,
    }))
}

/**
 * Get items below par level grouped by vendor for easy reordering.
 * Items without a vendor are grouped under vendorId = null.
 */
export async function getReorderSuggestions(): Promise<ReorderGroup[]> {
  const alerts = await getParAlerts()

  // Group by vendor_id
  const groups = new Map<string | null, ReorderGroup>()

  for (const alert of alerts) {
    const key = alert.vendorId
    if (!groups.has(key)) {
      groups.set(key, { vendorId: key, items: [] })
    }
    groups.get(key)!.items.push({
      id: alert.id,
      ingredientName: alert.ingredientName,
      currentQty: alert.currentQty,
      parLevel: alert.parLevel,
      unit: alert.unit,
      deficit: alert.deficit,
    })
  }

  // Sort groups: named vendors first, null vendor last
  return Array.from(groups.values()).sort((a, b) => {
    if (a.vendorId === null) return 1
    if (b.vendorId === null) return -1
    return 0
  })
}
