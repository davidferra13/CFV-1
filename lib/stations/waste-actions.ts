// Station Clipboard System - Waste Tracking Actions
// Chef-only. Logs waste events and provides summaries by reason, station, and value.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const LogWasteSchema = z.object({
  station_id: z.string().uuid(),
  component_id: z.string().uuid(),
  staff_member_id: z.string().uuid().nullable().optional(),
  quantity: z.number().min(0.01, 'Quantity must be positive'),
  unit: z.string().min(1, 'Unit required'),
  reason: z.enum(['expired', 'damaged', 'overproduced', 'dropped', 'other']),
  estimated_value_cents: z.number().int().min(0).nullable().optional(),
  notes: z.string().optional(),
})

export type LogWasteInput = z.infer<typeof LogWasteSchema>

const REASON_LABELS: Record<string, string> = {
  expired: 'Expired',
  damaged: 'Damaged',
  overproduced: 'Over Production',
  dropped: 'Dropped',
  other: 'Other',
}

// ============================================
// WASTE LOG
// ============================================

/**
 * Log a waste event for a specific component at a station.
 */
export async function logWaste(input: LogWasteInput) {
  const user = await requireChef()
  const validated = LogWasteSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('waste_log')
    .insert({
      chef_id: user.tenantId!,
      station_id: validated.station_id,
      component_id: validated.component_id,
      staff_member_id: validated.staff_member_id ?? null,
      quantity: validated.quantity,
      unit: validated.unit,
      reason: validated.reason,
      estimated_value_cents: validated.estimated_value_cents ?? null,
      notes: validated.notes ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[logWaste] Error:', error)
    throw new Error('Failed to log waste')
  }

  revalidatePath('/stations')
  revalidatePath(`/stations/${validated.station_id}`)
  return data
}

/**
 * Get waste log entries, optionally filtered by station, within a date range.
 */
export async function getWasteLog(startDate: string, endDate: string, stationId?: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('waste_log')
    .select(
      `
      *,
      station_components (id, name, unit),
      stations (id, name)
    `
    )
    .eq('chef_id', user.tenantId!)
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`)
    .order('created_at', { ascending: false })

  if (stationId) {
    query = query.eq('station_id', stationId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getWasteLog] Error:', error)
    throw new Error('Failed to load waste log')
  }

  return data ?? []
}

/**
 * Compute waste summary for a date range:
 * - Total waste by reason
 * - Total waste by station
 * - Total estimated value
 */
export async function getWasteSummary(startDate: string, endDate: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('waste_log')
    .select(
      `
      id,
      reason,
      quantity,
      unit,
      estimated_value_cents,
      station_id,
      stations (id, name)
    `
    )
    .eq('chef_id', user.tenantId!)
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`)

  if (error) {
    console.error('[getWasteSummary] Error:', error)
    throw new Error('Failed to load waste summary')
  }

  const entries = data ?? []

  // By reason
  const byReason: Record<string, { count: number; total_value_cents: number }> = {}
  for (const entry of entries) {
    const reason = (entry as any).reason ?? 'other'
    if (!byReason[reason]) byReason[reason] = { count: 0, total_value_cents: 0 }
    byReason[reason].count += 1
    byReason[reason].total_value_cents += (entry as any).estimated_value_cents ?? 0
  }

  // By station
  const byStation: Record<
    string,
    { station_name: string; count: number; total_value_cents: number }
  > = {}
  for (const entry of entries) {
    const sid = (entry as any).station_id
    const sname = (entry as any).stations?.name ?? 'Unknown'
    if (!byStation[sid]) byStation[sid] = { station_name: sname, count: 0, total_value_cents: 0 }
    byStation[sid].count += 1
    byStation[sid].total_value_cents += (entry as any).estimated_value_cents ?? 0
  }

  // Total value
  const totalValueCents = entries.reduce(
    (sum: number, e: any) => sum + (e.estimated_value_cents ?? 0),
    0
  )

  return {
    total_entries: entries.length,
    total_value_cents: totalValueCents,
    by_reason: Object.entries(byReason).map(([reason, data]) => ({
      reason,
      reason_label: REASON_LABELS[reason] ?? reason,
      ...data,
    })),
    by_station: Object.entries(byStation).map(([station_id, data]) => ({
      station_id,
      ...data,
    })),
  }
}

/**
 * Analyze waste patterns over a time window.
 * Returns: repeat offender components, day-of-week distribution, per-station breakdown.
 * Pure math aggregation, no AI.
 */
export async function getWastePatterns(days: number = 30) {
  const user = await requireChef()
  const db: any = createServerClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`

  const { data, error } = await db
    .from('waste_log')
    .select(
      `
      id,
      quantity,
      unit,
      reason,
      estimated_value_cents,
      created_at,
      station_id,
      component_id,
      stations (id, name),
      station_components (id, name)
    `
    )
    .eq('chef_id', user.tenantId!)
    .gte('created_at', `${startStr}T00:00:00`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getWastePatterns] Error:', error)
    throw new Error('Failed to load waste patterns')
  }

  const entries = data ?? []

  // === Repeat offenders: group by component, sort by count descending ===
  const byComponent: Record<
    string,
    {
      componentName: string
      stationName: string
      count: number
      totalValueCents: number
      reasons: Record<string, number>
    }
  > = {}

  for (const e of entries) {
    const cid = (e as any).component_id
    const cname = (e as any).station_components?.name ?? 'Unknown'
    const sname = (e as any).stations?.name ?? 'Unknown'
    const reason = (e as any).reason ?? 'other'
    if (!byComponent[cid]) {
      byComponent[cid] = {
        componentName: cname,
        stationName: sname,
        count: 0,
        totalValueCents: 0,
        reasons: {},
      }
    }
    byComponent[cid].count += 1
    byComponent[cid].totalValueCents += (e as any).estimated_value_cents ?? 0
    byComponent[cid].reasons[reason] = (byComponent[cid].reasons[reason] ?? 0) + 1
  }

  const repeatOffenders = Object.entries(byComponent)
    .map(([componentId, data]) => ({
      componentId,
      ...data,
      topReason: Object.entries(data.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // === Day-of-week distribution ===
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const byDay: number[] = [0, 0, 0, 0, 0, 0, 0]
  for (const e of entries) {
    const day = new Date((e as any).created_at).getDay()
    byDay[day] += 1
  }
  const dayDistribution = dayNames.map((name, idx) => ({ day: name, count: byDay[idx] }))

  // === Per-station totals ===
  const byStation: Record<string, { stationName: string; count: number; totalValueCents: number }> =
    {}
  for (const e of entries) {
    const sid = (e as any).station_id
    const sname = (e as any).stations?.name ?? 'Unknown'
    if (!byStation[sid]) byStation[sid] = { stationName: sname, count: 0, totalValueCents: 0 }
    byStation[sid].count += 1
    byStation[sid].totalValueCents += (e as any).estimated_value_cents ?? 0
  }
  const stationBreakdown = Object.entries(byStation)
    .map(([stationId, data]) => ({ stationId, ...data }))
    .sort((a, b) => b.count - a.count)

  return {
    totalEntries: entries.length,
    days,
    repeatOffenders,
    dayDistribution,
    stationBreakdown,
  }
}
