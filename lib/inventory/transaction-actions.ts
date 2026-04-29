// Inventory Transaction Server Actions
// Chef-only: Record inventory movements, query stock levels, and transaction history
// The inventory_transactions table is append-only (like the financial ledger).
// Current quantity = SUM(quantity) grouped by ingredient.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  computePantryStockPositions,
  type PantryCountRow,
  type PantryMovementRow,
} from '@/lib/inventory/pantry-engine'

// ─── Types ───────────────────────────────────────────────────────

export type InventoryTransactionType =
  | 'receive'
  | 'event_deduction'
  | 'waste'
  | 'staff_meal'
  | 'transfer_out'
  | 'transfer_in'
  | 'audit_adjustment'
  | 'return_from_event'
  | 'return_to_vendor'
  | 'manual_adjustment'
  | 'opening_balance'

export type InventoryTransaction = {
  id: string
  chefId: string
  ingredientId: string | null
  ingredientName: string
  transactionType: InventoryTransactionType
  quantity: number
  unit: string
  costCents: number | null
  locationId: string | null
  eventId: string | null
  photoUrl: string | null
  notes: string | null
  createdAt: string
}

export type StockItem = {
  chefId: string
  ingredientId: string | null
  ingredientName: string
  unit: string
  currentQty: number
  parLevel: number | null
  lastMovementAt: string
  transactionCount: number
}

export type StockByLocation = {
  chefId: string
  locationId: string | null
  locationName: string | null
  locationType: string | null
  ingredientId: string | null
  ingredientName: string
  unit: string
  currentQty: number
}

export type StockSummary = {
  totalItems: number
  totalValueCents: number
  belowParCount: number
}

// ─── Schemas ─────────────────────────────────────────────────────

const TransactionTypeEnum = z.enum([
  'receive',
  'event_deduction',
  'waste',
  'staff_meal',
  'transfer_out',
  'transfer_in',
  'audit_adjustment',
  'return_from_event',
  'return_to_vendor',
  'manual_adjustment',
  'opening_balance',
])

const RecordTransactionSchema = z.object({
  ingredientId: z.string().uuid().optional(),
  ingredientName: z.string().min(1, 'Ingredient name is required'),
  transactionType: TransactionTypeEnum,
  quantity: z.number().refine((v) => v !== 0, 'Quantity cannot be zero'),
  unit: z.string().min(1, 'Unit is required'),
  costCents: z.number().int().optional(),
  locationId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  purchaseOrderId: z.string().uuid().optional(),
  wasteLogId: z.string().uuid().optional(),
  auditId: z.string().uuid().optional(),
  transferPairId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
  expiryDate: z.string().optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().optional(),
})

export type RecordTransactionInput = z.infer<typeof RecordTransactionSchema>

// ─── DB helper ────────────────────────────────────────────
function db(db: any) {
  return {
    transactions: () => db.from('inventory_transactions' as any) as any,
    currentStock: () => db.from('inventory_current_stock' as any) as any,
    byLocation: () => db.from('inventory_by_location' as any) as any,
  }
}

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Record a single inventory transaction.
 * The inventory_transactions table is append-only - this creates a new ledger entry.
 */
export async function recordInventoryTransaction(
  input: RecordTransactionInput
): Promise<InventoryTransaction> {
  const user = await requireChef()
  const parsed = RecordTransactionSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db(db)
    .transactions()
    .insert({
      chef_id: user.tenantId!,
      ingredient_id: parsed.ingredientId ?? null,
      ingredient_name: parsed.ingredientName,
      transaction_type: parsed.transactionType,
      quantity: parsed.quantity,
      unit: parsed.unit,
      cost_cents: parsed.costCents ?? null,
      location_id: parsed.locationId ?? null,
      event_id: parsed.eventId ?? null,
      purchase_order_id: parsed.purchaseOrderId ?? null,
      waste_log_id: parsed.wasteLogId ?? null,
      audit_id: parsed.auditId ?? null,
      transfer_pair_id: parsed.transferPairId ?? null,
      batch_id: parsed.batchId ?? null,
      expiry_date: parsed.expiryDate ?? null,
      photo_url: parsed.photoUrl ?? null,
      notes: parsed.notes ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to record inventory transaction: ${(error as any).message}`)

  revalidatePath('/inventory')

  return mapTransaction(data)
}

/**
 * Record multiple inventory transactions in a single batch.
 * Each item creates a separate ledger entry, all inserted together.
 */
export async function recordBulkTransactions(
  items: RecordTransactionInput[]
): Promise<InventoryTransaction[]> {
  if (items.length === 0) return []

  const user = await requireChef()
  const db: any = createServerClient()

  const rows = items.map((item) => {
    const parsed = RecordTransactionSchema.parse(item)
    return {
      chef_id: user.tenantId!,
      ingredient_id: parsed.ingredientId ?? null,
      ingredient_name: parsed.ingredientName,
      transaction_type: parsed.transactionType,
      quantity: parsed.quantity,
      unit: parsed.unit,
      cost_cents: parsed.costCents ?? null,
      location_id: parsed.locationId ?? null,
      event_id: parsed.eventId ?? null,
      purchase_order_id: parsed.purchaseOrderId ?? null,
      waste_log_id: parsed.wasteLogId ?? null,
      audit_id: parsed.auditId ?? null,
      transfer_pair_id: parsed.transferPairId ?? null,
      batch_id: parsed.batchId ?? null,
      expiry_date: parsed.expiryDate ?? null,
      photo_url: parsed.photoUrl ?? null,
      notes: parsed.notes ?? null,
      created_by: user.id,
    }
  })

  const { data, error } = await db(db).transactions().insert(rows).select()

  if (error) throw new Error(`Failed to record bulk transactions: ${(error as any).message}`)

  revalidatePath('/inventory')

  return ((data || []) as any[]).map(mapTransaction)
}

/**
 * Get transaction history with optional filters and pagination.
 */
export async function getTransactionHistory(filters?: {
  ingredientId?: string
  transactionType?: InventoryTransactionType
  eventId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}): Promise<{ transactions: InventoryTransaction[]; total: number }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = db(db)
    .transactions()
    .select('*', { count: 'exact' })
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.ingredientId) {
    query = query.eq('ingredient_id', filters.ingredientId)
  }
  if (filters?.transactionType) {
    query = query.eq('transaction_type', filters.transactionType)
  }
  if (filters?.eventId) {
    query = query.eq('event_id', filters.eventId)
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw new Error(`Failed to fetch transaction history: ${(error as any).message}`)

  return {
    transactions: ((data || []) as any[]).map(mapTransaction),
    total: count ?? 0,
  }
}

/**
 * Get current stock levels derived from the inventory ledger.
 * Optionally filter by a specific ingredient.
 */
export async function getCurrentStock(ingredientId?: string): Promise<StockItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db(db).currentStock().select('*').eq('chef_id', user.tenantId!)

  if (ingredientId) {
    query = query.eq('ingredient_id', ingredientId)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch current stock: ${(error as any).message}`)

  return ((data || []) as any[]).map((row: any) => ({
    chefId: row.chef_id,
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    unit: row.unit,
    currentQty: Number(row.current_qty ?? 0),
    parLevel: row.par_level != null ? Number(row.par_level) : null,
    lastMovementAt: row.last_movement_at,
    transactionCount: parseInt(row.transaction_count ?? 0, 10),
  }))
}

/**
 * Get stock levels grouped by storage location.
 * Optionally filter by a specific location.
 */
export async function getStockByLocation(locationId?: string): Promise<StockByLocation[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db(db).byLocation().select('*').eq('chef_id', user.tenantId!)

  if (locationId) {
    query = query.eq('location_id', locationId)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch stock by location: ${(error as any).message}`)

  return ((data || []) as any[]).map((row: any) => ({
    chefId: row.chef_id,
    locationId: row.location_id,
    locationName: row.location_name,
    locationType: row.location_type,
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    unit: row.unit,
    currentQty: Number(row.current_qty ?? 0),
  }))
}

/**
 * Get a summary of all current stock: total items, total value, and items below par level.
 */
export async function getStockSummary(): Promise<StockSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [transactionResult, countResult] = await Promise.all([
    db(db)
      .transactions()
      .select(
        'id, ingredient_id, ingredient_name, transaction_type, quantity, unit, cost_cents, location_id, created_at, confidence_status, review_status'
      )
      .eq('chef_id', user.tenantId!),
    createServerClient()
      .from('inventory_counts' as any)
      .select('*')
      .eq('chef_id', user.tenantId!),
  ])

  if (transactionResult.error) {
    throw new Error(`Failed to fetch stock summary: ${(transactionResult.error as any).message}`)
  }
  if (countResult.error) {
    throw new Error(`Failed to fetch stock counts: ${(countResult.error as any).message}`)
  }

  const transactions = (transactionResult.data || []) as any[]
  const positions = computePantryStockPositions({
    movements: transactions.map(
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
    counts: ((countResult.data || []) as any[]).map(
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

  let totalItems = 0
  let totalValueCents = 0
  let belowParCount = 0

  for (const position of positions) {
    const trustworthy =
      position.confidenceStatus !== 'unknown' && position.confidenceStatus !== 'conflict'
    if (trustworthy && position.currentQty > 0) {
      totalItems++
    }
    if (trustworthy && position.deficit > 0) {
      belowParCount++
    }
  }

  const latestCostMap = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.ingredient_id && tx.cost_cents != null && !latestCostMap.has(tx.ingredient_id)) {
      const txQty = Math.abs(Number(tx.quantity ?? 1))
      const unitCost = txQty > 0 ? Math.round(tx.cost_cents / txQty) : tx.cost_cents
      latestCostMap.set(tx.ingredient_id, unitCost)
    }
  }

  for (const position of positions) {
    const trustworthy =
      position.confidenceStatus !== 'unknown' && position.confidenceStatus !== 'conflict'
    if (
      trustworthy &&
      position.currentQty > 0 &&
      position.ingredientId &&
      latestCostMap.has(position.ingredientId)
    ) {
      totalValueCents += Math.round(position.currentQty * latestCostMap.get(position.ingredientId)!)
    }
  }

  return {
    totalItems,
    totalValueCents,
    belowParCount,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function mapTransaction(row: any): InventoryTransaction {
  return {
    id: row.id,
    chefId: row.chef_id,
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    transactionType: row.transaction_type,
    quantity: Number(row.quantity),
    unit: row.unit,
    costCents: row.cost_cents,
    locationId: row.location_id,
    eventId: row.event_id,
    photoUrl: row.photo_url,
    notes: row.notes,
    createdAt: row.created_at,
  }
}
