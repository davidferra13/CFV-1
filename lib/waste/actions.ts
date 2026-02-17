// @ts-nocheck
// TODO: References waste_entries table that doesn't exist in current schema.
// DEFERRED: Waste tracking system. Requires waste_entries table (Phase 2 schema). Do not remove - will be enabled when schema is extended.
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ─── Types ──────────────────────────────────────────────────────────────────

export type WasteReason =
  | 'OVERPRODUCTION'
  | 'SPOILAGE'
  | 'TRIM'
  | 'MISTAKE'
  | 'CLIENT_RETURN'
  | 'QUALITY_REJECT'
  | 'EXPIRED'
  | 'OTHER'

export const WASTE_REASONS: { value: WasteReason; label: string }[] = [
  { value: 'OVERPRODUCTION', label: 'Overproduction' },
  { value: 'SPOILAGE', label: 'Spoilage' },
  { value: 'TRIM', label: 'Trim / Yield Loss' },
  { value: 'MISTAKE', label: 'Preparation Mistake' },
  { value: 'CLIENT_RETURN', label: 'Client Return' },
  { value: 'QUALITY_REJECT', label: 'Quality Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'OTHER', label: 'Other' },
]

export type IngredientUnit = 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'L' | 'each' | 'bunch' | 'cup'

export const UNITS: IngredientUnit[] = ['g', 'kg', 'oz', 'lb', 'ml', 'L', 'each', 'bunch', 'cup']

export interface WasteEntry {
  id: string
  chef_id: string
  item_name: string
  qty: number
  unit: IngredientUnit
  reason: WasteReason
  cost_estimate: number | null  // cents
  event_id: string | null
  notes: string | null
  occurred_at: string
  created_at: string
}

export interface WasteStats {
  totalCost: number
  entryCount: number
  byReason: Map<WasteReason, number>
  topReason: [WasteReason, number] | null
}

// ─── Log Waste Entry ────────────────────────────────────────────────────────

export async function logWasteEntry(input: {
  itemName: string
  qty: number
  unit: IngredientUnit
  reason: WasteReason
  costEstimate?: number
  eventId?: string
  notes?: string
}) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('waste_entries')
    .insert({
      chef_id: chef.id,
      item_name: input.itemName,
      qty: input.qty,
      unit: input.unit,
      reason: input.reason,
      cost_estimate: input.costEstimate ?? null,
      event_id: input.eventId ?? null,
      notes: input.notes ?? null,
      occurred_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/waste')
  return data
}

// ─── Get Waste Entries ──────────────────────────────────────────────────────

export async function getWasteEntries(filters?: {
  reason?: WasteReason
  period?: 'week' | 'month' | 'all'
  eventId?: string
}): Promise<WasteEntry[]> {
  const chef = await requireChef()
  const supabase = await createServerClient()

  let query = supabase
    .from('waste_entries')
    .select('*')
    .eq('chef_id', chef.id)
    .order('occurred_at', { ascending: false })

  if (filters?.reason) {
    query = query.eq('reason', filters.reason)
  }
  if (filters?.eventId) {
    query = query.eq('event_id', filters.eventId)
  }
  if (filters?.period === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    query = query.gte('occurred_at', weekAgo)
  } else if (filters?.period === 'month') {
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    query = query.gte('occurred_at', monthAgo)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

// ─── Compute Waste Stats ────────────────────────────────────────────────────

export async function getWasteStats(period?: 'week' | 'month' | 'all'): Promise<WasteStats> {
  const entries = await getWasteEntries({ period })

  const byReason = new Map<WasteReason, number>()
  let totalCost = 0

  for (const entry of entries) {
    const cost = entry.cost_estimate || 0
    totalCost += cost
    byReason.set(entry.reason as WasteReason, (byReason.get(entry.reason as WasteReason) || 0) + cost)
  }

  let topReason: [WasteReason, number] | null = null
  for (const [reason, cost] of byReason.entries()) {
    if (!topReason || cost > topReason[1]) {
      topReason = [reason, cost]
    }
  }

  return {
    totalCost,
    entryCount: entries.length,
    byReason,
    topReason,
  }
}
