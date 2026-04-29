'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  computePantryStockPositions,
  type PantryCountRow,
  type PantryMovementRow,
} from '@/lib/inventory/pantry-engine'

function db(db: any) {
  return {
    transactions: () => db.from('inventory_transactions' as any) as any,
    counts: () => db.from('inventory_counts' as any) as any,
  }
}

export async function getPantryStockPositions() {
  const user = await requireChef()
  const client: any = createServerClient()

  const [movementResult, countResult] = await Promise.all([
    fetchMovementRows(client, user.tenantId!),
    db(client).counts().select('*').eq('chef_id', user.tenantId!),
  ])

  if (movementResult.error) {
    throw new Error(`Failed to fetch pantry movements: ${movementResult.error.message}`)
  }
  if (countResult.error) {
    throw new Error(`Failed to fetch pantry counts: ${countResult.error.message}`)
  }

  return computePantryStockPositions({
    movements: ((movementResult.data ?? []) as any[]).map(mapMovementRow),
    counts: ((countResult.data ?? []) as any[]).map(mapCountRow),
  })
}

export async function getPantryReviewSummary() {
  const user = await requireChef()
  const client: any = createServerClient()

  const { data, error } = await db(client)
    .transactions()
    .select('id, confidence_status, review_status')
    .eq('chef_id', user.tenantId!)
    .in('review_status', ['pending_review'])

  if (error) {
    throw new Error(`Failed to fetch pantry review summary: ${error.message}`)
  }

  const rows = (data ?? []) as any[]
  return {
    pendingReviewCount: rows.length,
    conflictCount: rows.filter((row) => row.confidence_status === 'conflict').length,
  }
}

async function fetchMovementRows(client: any, chefId: string) {
  const result = await db(client)
    .transactions()
    .select(
      'id, ingredient_id, ingredient_name, transaction_type, quantity, unit, cost_cents, location_id, created_at, confidence_status, review_status'
    )
    .eq('chef_id', chefId)
    .order('created_at', { ascending: false })

  if (!result.error) return result

  if (!String(result.error.message ?? '').includes('confidence_status')) return result

  return db(client)
    .transactions()
    .select(
      'id, ingredient_id, ingredient_name, transaction_type, quantity, unit, cost_cents, location_id, created_at'
    )
    .eq('chef_id', chefId)
    .order('created_at', { ascending: false })
}

function mapMovementRow(row: any): PantryMovementRow {
  return {
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
  }
}

function mapCountRow(row: any): PantryCountRow {
  return {
    id: row.id,
    ingredient_id: row.ingredient_id ?? null,
    ingredient_name: row.ingredient_name,
    current_qty: row.current_qty,
    par_level: row.par_level ?? null,
    unit: row.unit,
    last_counted_at: row.last_counted_at ?? null,
    updated_at: row.updated_at ?? null,
    vendor_id: row.vendor_id ?? null,
  }
}
