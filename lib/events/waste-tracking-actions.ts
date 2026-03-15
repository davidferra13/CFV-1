'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Types ──────────────────────────────────────────────────────────────────────

export type WasteCategory = 'protein' | 'produce' | 'dairy' | 'grain' | 'prepared_dish' | 'other'
export type WasteReason =
  | 'overproduction'
  | 'spoilage'
  | 'guest_no_show'
  | 'dietary_change'
  | 'quality_issue'
  | 'other'

export type WasteEntry = {
  id: string
  tenant_id: string
  event_id: string
  item_name: string
  category: WasteCategory
  quantity_description: string | null
  estimated_cost_cents: number | null
  reason: WasteReason
  notes: string | null
  logged_at: string
  created_at: string
  updated_at: string
}

export type WasteEntryInput = {
  item_name: string
  category: WasteCategory
  quantity_description?: string
  estimated_cost_cents?: number
  reason: WasteReason
  notes?: string
}

// ── Add Waste Entry ────────────────────────────────────────────────────────────

export async function addWasteEntry(eventId: string, data: WasteEntryInput) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data: entry, error } = await supabase
    .from('event_waste_logs')
    .insert({
      tenant_id: tenantId,
      event_id: eventId,
      item_name: data.item_name,
      category: data.category,
      quantity_description: data.quantity_description ?? null,
      estimated_cost_cents: data.estimated_cost_cents ?? null,
      reason: data.reason,
      notes: data.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error('Failed to log waste entry')

  revalidatePath(`/events/${eventId}`)
  return entry as WasteEntry
}

// ── Get Event Waste ────────────────────────────────────────────────────────────

export async function getEventWaste(eventId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_waste_logs')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('logged_at', { ascending: false })

  if (error) throw new Error('Failed to fetch waste entries')

  return (data ?? []) as WasteEntry[]
}

// ── Update Waste Entry ─────────────────────────────────────────────────────────

export async function updateWasteEntry(entryId: string, data: Partial<WasteEntryInput>) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const updatePayload: Record<string, unknown> = {}
  if (data.item_name !== undefined) updatePayload.item_name = data.item_name
  if (data.category !== undefined) updatePayload.category = data.category
  if (data.quantity_description !== undefined)
    updatePayload.quantity_description = data.quantity_description
  if (data.estimated_cost_cents !== undefined)
    updatePayload.estimated_cost_cents = data.estimated_cost_cents
  if (data.reason !== undefined) updatePayload.reason = data.reason
  if (data.notes !== undefined) updatePayload.notes = data.notes

  const { data: entry, error } = await supabase
    .from('event_waste_logs')
    .update(updatePayload)
    .eq('id', entryId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error('Failed to update waste entry')

  revalidatePath(`/events/${entry.event_id}`)
  return entry as WasteEntry
}

// ── Delete Waste Entry ─────────────────────────────────────────────────────────

export async function deleteWasteEntry(entryId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Fetch first to get event_id for revalidation
  const { data: existing, error: fetchError } = await supabase
    .from('event_waste_logs')
    .select('event_id')
    .eq('id', entryId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !existing) throw new Error('Waste entry not found')

  const { error } = await supabase
    .from('event_waste_logs')
    .delete()
    .eq('id', entryId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error('Failed to delete waste entry')

  revalidatePath(`/events/${existing.event_id}`)
}

// ── Waste Summary (Aggregated) ─────────────────────────────────────────────────

export type WasteSummary = {
  totalWasteCostCents: number
  entryCount: number
  eventCount: number
  avgWasteCostPerEventCents: number
  byCategory: { category: WasteCategory; totalCents: number; count: number }[]
  byReason: { reason: WasteReason; totalCents: number; count: number }[]
  topItems: { item_name: string; totalCents: number; count: number }[]
  monthlyTrend: { month: string; totalCents: number; eventCount: number }[]
}

export async function getWasteSummary(dateRange?: {
  from: string
  to: string
}): Promise<WasteSummary> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  let query = supabase.from('event_waste_logs').select('*').eq('tenant_id', tenantId)

  if (dateRange?.from) query = query.gte('logged_at', dateRange.from)
  if (dateRange?.to) query = query.lte('logged_at', dateRange.to)

  const { data, error } = await query.order('logged_at', { ascending: true })
  if (error) throw new Error('Failed to fetch waste summary')

  const entries = (data ?? []) as WasteEntry[]

  // Total waste cost
  const totalWasteCostCents = entries.reduce((sum, e) => sum + (e.estimated_cost_cents ?? 0), 0)

  // Unique events
  const uniqueEvents = new Set(entries.map((e) => e.event_id))
  const eventCount = uniqueEvents.size

  // Avg per event
  const avgWasteCostPerEventCents =
    eventCount > 0 ? Math.round(totalWasteCostCents / eventCount) : 0

  // By category
  const categoryMap = new Map<WasteCategory, { totalCents: number; count: number }>()
  for (const e of entries) {
    const existing = categoryMap.get(e.category) ?? { totalCents: 0, count: 0 }
    existing.totalCents += e.estimated_cost_cents ?? 0
    existing.count += 1
    categoryMap.set(e.category, existing)
  }
  const byCategory = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.totalCents - a.totalCents)

  // By reason
  const reasonMap = new Map<WasteReason, { totalCents: number; count: number }>()
  for (const e of entries) {
    const existing = reasonMap.get(e.reason) ?? { totalCents: 0, count: 0 }
    existing.totalCents += e.estimated_cost_cents ?? 0
    existing.count += 1
    reasonMap.set(e.reason, existing)
  }
  const byReason = Array.from(reasonMap.entries())
    .map(([reason, stats]) => ({ reason, ...stats }))
    .sort((a, b) => b.totalCents - a.totalCents)

  // Top items (by total cost)
  const itemMap = new Map<string, { totalCents: number; count: number }>()
  for (const e of entries) {
    const key = e.item_name.toLowerCase().trim()
    const existing = itemMap.get(key) ?? { totalCents: 0, count: 0 }
    existing.totalCents += e.estimated_cost_cents ?? 0
    existing.count += 1
    itemMap.set(key, existing)
  }
  const topItems = Array.from(itemMap.entries())
    .map(([item_name, stats]) => ({ item_name, ...stats }))
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 10)

  // Monthly trend
  const monthMap = new Map<string, { totalCents: number; events: Set<string> }>()
  for (const e of entries) {
    const month = e.logged_at.slice(0, 7) // YYYY-MM
    const existing = monthMap.get(month) ?? { totalCents: 0, events: new Set<string>() }
    existing.totalCents += e.estimated_cost_cents ?? 0
    existing.events.add(e.event_id)
    monthMap.set(month, existing)
  }
  const monthlyTrend = Array.from(monthMap.entries())
    .map(([month, stats]) => ({
      month,
      totalCents: stats.totalCents,
      eventCount: stats.events.size,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    totalWasteCostCents,
    entryCount: entries.length,
    eventCount,
    avgWasteCostPerEventCents,
    byCategory,
    byReason,
    topItems,
    monthlyTrend,
  }
}

// ── Waste Insights (Deterministic) ─────────────────────────────────────────────

export type WasteInsight = {
  type: 'overproduction' | 'no_show' | 'spoilage' | 'high_waste_ratio'
  severity: 'info' | 'warning' | 'critical'
  message: string
  metric: string
}

export async function getWasteInsights(): Promise<WasteInsight[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Get all waste entries
  const { data: wasteData, error: wasteError } = await supabase
    .from('event_waste_logs')
    .select('*')
    .eq('tenant_id', tenantId)

  if (wasteError) throw new Error('Failed to fetch waste data for insights')

  const entries = (wasteData ?? []) as WasteEntry[]
  if (entries.length === 0) return []

  const insights: WasteInsight[] = []
  const totalEntries = entries.length

  // Count by reason
  const reasonCounts = new Map<string, number>()
  for (const e of entries) {
    reasonCounts.set(e.reason, (reasonCounts.get(e.reason) ?? 0) + 1)
  }

  // 1. Overproduction check
  const overproductionCount = reasonCounts.get('overproduction') ?? 0
  const overproductionPct = Math.round((overproductionCount / totalEntries) * 100)
  if (overproductionPct > 50) {
    insights.push({
      type: 'overproduction',
      severity: 'warning',
      message:
        'Over half your waste comes from overproduction. Consider scaling down portion counts or batch sizes by 10-15%.',
      metric: `${overproductionPct}% of waste entries`,
    })
  } else if (overproductionPct > 30) {
    insights.push({
      type: 'overproduction',
      severity: 'info',
      message:
        'Overproduction is a notable waste driver. Track guest counts more closely and adjust prep quantities.',
      metric: `${overproductionPct}% of waste entries`,
    })
  }

  // 2. No-show check
  const noShowCount = reasonCounts.get('guest_no_show') ?? 0
  const noShowPct = Math.round((noShowCount / totalEntries) * 100)
  if (noShowPct > 20) {
    insights.push({
      type: 'no_show',
      severity: 'warning',
      message:
        'Guest no-shows are causing significant waste. Consider requiring deposits or day-before confirmations.',
      metric: `${noShowPct}% of waste entries`,
    })
  }

  // 3. Spoilage check
  const spoilageCount = reasonCounts.get('spoilage') ?? 0
  const spoilagePct = Math.round((spoilageCount / totalEntries) * 100)
  if (spoilagePct > 25) {
    insights.push({
      type: 'spoilage',
      severity: 'warning',
      message:
        'Spoilage is a top waste category. Review storage practices, supplier delivery timing, and consider sourcing closer to event dates.',
      metric: `${spoilagePct}% of waste entries`,
    })
  }

  // 4. Waste cost vs food cost ratio (per event)
  // Get events with their food cost from the financial summary view
  const uniqueEventIds = [...new Set(entries.map((e) => e.event_id))]
  const { data: eventFinancials } = await supabase
    .from('event_financial_summary')
    .select('event_id, total_expense_cents')
    .eq('tenant_id', tenantId)
    .in('event_id', uniqueEventIds)

  if (eventFinancials && eventFinancials.length > 0) {
    let highRatioCount = 0
    for (const ef of eventFinancials) {
      if (!ef.total_expense_cents || ef.total_expense_cents === 0) continue
      const eventWasteCents = entries
        .filter((e) => e.event_id === ef.event_id)
        .reduce((sum, e) => sum + (e.estimated_cost_cents ?? 0), 0)
      const ratio = eventWasteCents / ef.total_expense_cents
      if (ratio > 0.15) highRatioCount++
    }
    if (highRatioCount > 0) {
      insights.push({
        type: 'high_waste_ratio',
        severity: highRatioCount >= 3 ? 'critical' : 'warning',
        message: `${highRatioCount} event(s) had waste exceeding 15% of total food cost. Review those events to find patterns.`,
        metric: `${highRatioCount} events over 15% waste ratio`,
      })
    }
  }

  return insights
}
