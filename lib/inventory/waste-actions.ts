// Waste Log Server Actions
// Chef-only: Log food waste, view dashboard summaries, and trend analysis

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type WasteReason =
  | 'overcooked'
  | 'leftover'
  | 'spoilage'
  | 'overportioned'
  | 'trim'
  | 'mistake'
  | 'expired'
  | 'other'

export type WasteEntry = {
  id: string
  chefId: string
  eventId: string | null
  ingredientName: string
  quantity: number
  unit: string
  estimatedCostCents: number
  reason: WasteReason
  notes: string | null
  createdAt: string
}

export type WasteDashboardRow = {
  reason: WasteReason
  entryCount: number
  totalCostCents: number
  totalQuantity: number
}

export type WasteDashboard = {
  rows: WasteDashboardRow[]
  grandTotalCostCents: number
  grandTotalEntries: number
}

export type WasteTrendPoint = {
  month: string // YYYY-MM
  totalCostCents: number
  entryCount: number
}

// ─── Schemas ─────────────────────────────────────────────────────

const WasteReasonEnum = z.enum([
  'overcooked',
  'leftover',
  'spoilage',
  'overportioned',
  'trim',
  'mistake',
  'expired',
  'other',
])

const LogWasteSchema = z.object({
  eventId: z.string().uuid().optional(),
  ingredientName: z.string().min(1, 'Ingredient name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  estimatedCostCents: z.number().int().min(0, 'Cost cannot be negative'),
  reason: WasteReasonEnum,
  notes: z.string().optional(),
})

export type LogWasteInput = z.infer<typeof LogWasteSchema>

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Log a food waste entry.
 */
export async function logWaste(input: LogWasteInput): Promise<WasteEntry> {
  const user = await requireChef()
  const parsed = LogWasteSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await (db.from('waste_logs') as any)
    .insert({
      chef_id: user.tenantId!,
      event_id: parsed.eventId ?? null,
      ingredient_name: parsed.ingredientName,
      quantity: parsed.quantity,
      unit: parsed.unit,
      estimated_cost_cents: parsed.estimatedCostCents,
      reason: parsed.reason,
      notes: parsed.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to log waste: ${(error as any).message}`)

  revalidatePath('/inventory/waste')
  if (parsed.eventId) {
    revalidatePath(`/events/${parsed.eventId}`)
  }

  return {
    id: (data as any).id,
    chefId: (data as any).chef_id,
    eventId: (data as any).event_id,
    ingredientName: (data as any).ingredient_name,
    quantity: Number((data as any).quantity),
    unit: (data as any).unit,
    estimatedCostCents: (data as any).estimated_cost_cents,
    reason: (data as any).reason,
    notes: (data as any).notes,
    createdAt: (data as any).created_at,
  }
}

/**
 * Get waste dashboard: totals grouped by reason with cost sums.
 * Optionally filtered by date range.
 */
export async function getWasteDashboard(
  startDate?: string,
  endDate?: string
): Promise<WasteDashboard> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = (db.from('waste_logs') as any)
    .select('reason, estimated_cost_cents, quantity')
    .eq('chef_id', user.tenantId!)

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch waste dashboard: ${(error as any).message}`)

  const rows = (data || []) as any[]

  // Aggregate by reason
  const byReason = new Map<WasteReason, { count: number; costCents: number; qty: number }>()

  for (const row of rows) {
    const reason = row.reason as WasteReason
    const existing = byReason.get(reason) || { count: 0, costCents: 0, qty: 0 }
    existing.count += 1
    existing.costCents += row.estimated_cost_cents
    existing.qty += Number(row.quantity)
    byReason.set(reason, existing)
  }

  const dashboardRows: WasteDashboardRow[] = Array.from(byReason.entries())
    .map(([reason, agg]) => ({
      reason,
      entryCount: agg.count,
      totalCostCents: agg.costCents,
      totalQuantity: agg.qty,
    }))
    .sort((a, b) => b.totalCostCents - a.totalCostCents)

  const grandTotalCostCents = dashboardRows.reduce((sum, r) => sum + r.totalCostCents, 0)
  const grandTotalEntries = dashboardRows.reduce((sum, r) => sum + r.entryCount, 0)

  return {
    rows: dashboardRows,
    grandTotalCostCents,
    grandTotalEntries,
  }
}

/**
 * Get monthly waste cost trend over the specified number of months.
 */
export async function getWasteTrend(months: number = 6): Promise<WasteTrendPoint[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Compute start date: beginning of the month N months ago
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
  const startDate = start.toISOString()

  const { data, error } = await (db.from('waste_logs') as any)
    .select('created_at, estimated_cost_cents')
    .eq('chef_id', user.tenantId!)
    .gte('created_at', startDate)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch waste trend: ${(error as any).message}`)

  // Bucket by YYYY-MM
  const buckets = new Map<string, { costCents: number; count: number }>()

  for (const row of (data || []) as any[]) {
    const date = new Date(row.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const existing = buckets.get(key) || { costCents: 0, count: 0 }
    existing.costCents += row.estimated_cost_cents
    existing.count += 1
    buckets.set(key, existing)
  }

  // Build ordered trend points (fill gaps with zeros)
  const result: WasteTrendPoint[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)

  while (cursor <= now) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    const bucket = buckets.get(key) || { costCents: 0, count: 0 }
    result.push({
      month: key,
      totalCostCents: bucket.costCents,
      entryCount: bucket.count,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return result
}

/**
 * Get all waste entries for a specific event.
 */
export async function getWasteByEvent(eventId: string): Promise<WasteEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await (db.from('waste_logs') as any)
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch waste for event: ${(error as any).message}`)

  return ((data || []) as any[]).map((row: any) => ({
    id: row.id,
    chefId: row.chef_id,
    eventId: row.event_id,
    ingredientName: row.ingredient_name,
    quantity: Number(row.quantity),
    unit: row.unit,
    estimatedCostCents: row.estimated_cost_cents,
    reason: row.reason,
    notes: row.notes,
    createdAt: row.created_at,
  }))
}
