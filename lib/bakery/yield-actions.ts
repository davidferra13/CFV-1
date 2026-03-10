'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ---- Types ----

export type WasteReason = 'burnt' | 'misshapen' | 'underproofed' | 'overbaked' | 'dropped' | 'other'

export type YieldRecord = {
  id: string
  tenant_id: string
  batch_id: string | null
  bake_schedule_id: string | null
  product_name: string
  expected_yield: number
  actual_yield: number
  variance_pct: number
  waste_units: number
  waste_reason: WasteReason | null
  quality_rating: number | null
  notes: string | null
  recorded_at: string
  created_at: string
}

export type RecordYieldInput = {
  batch_id?: string | null
  bake_schedule_id?: string | null
  product_name: string
  expected_yield: number
  actual_yield: number
  waste_units?: number
  waste_reason?: WasteReason | null
  quality_rating?: number | null
  notes?: string | null
}

export type YieldSummary = {
  avgYieldRate: number
  consistencyScore: number
  totalWasteThisWeek: number
  totalBatchesThisWeek: number
}

// ---- Record Yield ----

export async function recordBatchYield(input: RecordYieldInput): Promise<YieldRecord> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Deterministic variance calculation
  const variancePct =
    input.expected_yield > 0
      ? ((input.actual_yield - input.expected_yield) / input.expected_yield) * 100
      : 0

  const { data, error } = await supabase
    .from('bakery_yield_records')
    .insert({
      tenant_id: user.tenantId!,
      batch_id: input.batch_id ?? null,
      bake_schedule_id: input.bake_schedule_id ?? null,
      product_name: input.product_name,
      expected_yield: input.expected_yield,
      actual_yield: input.actual_yield,
      variance_pct: Math.round(variancePct * 100) / 100,
      waste_units: input.waste_units ?? 0,
      waste_reason: input.waste_reason ?? null,
      quality_rating: input.quality_rating ?? null,
      notes: input.notes ?? null,
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to record yield: ${error.message}`)
  revalidatePath('/bakery/yield')
  return data as YieldRecord
}

// ---- Yield History ----

export async function getYieldHistory(days = 30): Promise<YieldRecord[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('bakery_yield_records')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('recorded_at', since.toISOString())
    .order('recorded_at', { ascending: false })

  if (error) throw new Error(`Failed to load yield history: ${error.message}`)
  return (data ?? []) as YieldRecord[]
}

// ---- Yield By Recipe ----

export async function getYieldByRecipe(
  recipeName?: string
): Promise<{ product_name: string; avg_variance: number; count: number; avg_quality: number }[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('bakery_yield_records')
    .select('product_name, variance_pct, quality_rating')
    .eq('tenant_id', user.tenantId!)

  if (recipeName) {
    query = query.eq('product_name', recipeName)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to load yield by recipe: ${error.message}`)

  // Group by product_name and compute averages (deterministic math)
  const groups: Record<string, { variances: number[]; qualities: number[] }> = {}
  for (const row of data ?? []) {
    if (!groups[row.product_name]) groups[row.product_name] = { variances: [], qualities: [] }
    groups[row.product_name].variances.push(Number(row.variance_pct))
    if (row.quality_rating != null) groups[row.product_name].qualities.push(row.quality_rating)
  }

  return Object.entries(groups).map(([name, g]) => ({
    product_name: name,
    avg_variance:
      Math.round((g.variances.reduce((a, b) => a + b, 0) / g.variances.length) * 100) / 100,
    count: g.variances.length,
    avg_quality:
      g.qualities.length > 0
        ? Math.round((g.qualities.reduce((a, b) => a + b, 0) / g.qualities.length) * 10) / 10
        : 0,
  }))
}

// ---- Yield Trend ----

export async function getYieldTrend(
  days = 30
): Promise<{ date: string; avg_variance: number; count: number }[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('bakery_yield_records')
    .select('recorded_at, variance_pct')
    .eq('tenant_id', user.tenantId!)
    .gte('recorded_at', since.toISOString())
    .order('recorded_at')

  if (error) throw new Error(`Failed to load yield trend: ${error.message}`)

  // Group by date
  const byDate: Record<string, number[]> = {}
  for (const row of data ?? []) {
    const dateKey = row.recorded_at.slice(0, 10)
    if (!byDate[dateKey]) byDate[dateKey] = []
    byDate[dateKey].push(Number(row.variance_pct))
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, variances]) => ({
      date,
      avg_variance:
        Math.round((variances.reduce((a, b) => a + b, 0) / variances.length) * 100) / 100,
      count: variances.length,
    }))
}

// ---- Waste Report ----

export async function getWasteReport(
  days = 7
): Promise<{ reason: string; total_units: number; count: number }[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('bakery_yield_records')
    .select('waste_reason, waste_units')
    .eq('tenant_id', user.tenantId!)
    .gte('recorded_at', since.toISOString())
    .gt('waste_units', 0)

  if (error) throw new Error(`Failed to load waste report: ${error.message}`)

  const byReason: Record<string, { total: number; count: number }> = {}
  for (const row of data ?? []) {
    const reason = row.waste_reason || 'unknown'
    if (!byReason[reason]) byReason[reason] = { total: 0, count: 0 }
    byReason[reason].total += row.waste_units ?? 0
    byReason[reason].count += 1
  }

  return Object.entries(byReason)
    .map(([reason, v]) => ({
      reason,
      total_units: v.total,
      count: v.count,
    }))
    .sort((a, b) => b.total_units - a.total_units)
}

// ---- Consistency Score ----

export async function getConsistencyScore(): Promise<YieldSummary> {
  const user = await requireChef()
  const supabase = createServerClient()

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('bakery_yield_records')
    .select('variance_pct, actual_yield, expected_yield, waste_units, recorded_at')
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to load consistency: ${error.message}`)

  const all = data ?? []
  if (all.length === 0) {
    return {
      avgYieldRate: 100,
      consistencyScore: 100,
      totalWasteThisWeek: 0,
      totalBatchesThisWeek: 0,
    }
  }

  // Consistency = % of batches within 5% of expected
  const withinTarget = all.filter((r) => Math.abs(Number(r.variance_pct)) <= 5).length
  const consistencyScore = Math.round((withinTarget / all.length) * 100)

  // Average yield rate
  const totalActual = all.reduce((s, r) => s + r.actual_yield, 0)
  const totalExpected = all.reduce((s, r) => s + r.expected_yield, 0)
  const avgYieldRate = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 100

  // This week stats
  const weekRecords = all.filter((r) => new Date(r.recorded_at) >= weekAgo)
  const totalWasteThisWeek = weekRecords.reduce((s, r) => s + (r.waste_units ?? 0), 0)

  return {
    avgYieldRate,
    consistencyScore,
    totalWasteThisWeek,
    totalBatchesThisWeek: weekRecords.length,
  }
}
