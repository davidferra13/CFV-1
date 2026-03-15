'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type SourceType =
  | 'local_farm'
  | 'farmers_market'
  | 'organic'
  | 'conventional'
  | 'imported'
  | 'foraged'
  | 'garden'
  | 'specialty'

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  local_farm: 'Local Farm',
  farmers_market: "Farmer's Market",
  organic: 'Organic Supplier',
  conventional: 'Conventional',
  imported: 'Imported',
  foraged: 'Foraged',
  garden: 'Garden Grown',
  specialty: 'Specialty Purveyor',
}

export const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  local_farm: '#22c55e',
  farmers_market: '#84cc16',
  organic: '#10b981',
  conventional: '#94a3b8',
  imported: '#f97316',
  foraged: '#06b6d4',
  garden: '#14b8a6',
  specialty: '#8b5cf6',
}

// CO2 estimates: lbs CO2 per lb of food (simplified model)
const CO2_PER_LB: Record<string, number> = {
  local: 0.5,
  conventional: 2.5,
  imported: 5.0,
}

function getCO2Category(sourceType: SourceType): string {
  if (['local_farm', 'farmers_market', 'foraged', 'garden'].includes(sourceType)) return 'local'
  if (sourceType === 'imported') return 'imported'
  return 'conventional'
}

export type SourcingEntryInput = {
  event_id?: string | null
  entry_date?: string
  ingredient_name: string
  source_type: SourceType
  source_name?: string | null
  distance_miles?: number | null
  cost_cents?: number | null
  weight_lbs?: number | null
  is_organic?: boolean
  is_local?: boolean
  notes?: string | null
}

export type SourcingEntry = SourcingEntryInput & {
  id: string
  chef_id: string
  created_at: string
}

export type SourcingStats = {
  totalEntries: number
  totalWeightLbs: number
  localPercent: number
  organicPercent: number
  avgFoodMiles: number
  co2SavedLbs: number
  sourceBreakdown: { source_type: SourceType; count: number; weight: number }[]
}

export type ScorecardGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export type Scorecard = {
  grade: ScorecardGrade
  localPercent: number
  organicPercent: number
  avgDistance: number
  details: string
}

// ============================================
// ACTIONS
// ============================================

export async function addSourcingEntry(input: SourcingEntryInput) {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('sourcing_entries')
    .insert({
      chef_id: chef.tenantId!,
      event_id: input.event_id || null,
      entry_date: input.entry_date || new Date().toISOString().split('T')[0],
      ingredient_name: input.ingredient_name,
      source_type: input.source_type,
      source_name: input.source_name || null,
      distance_miles: input.distance_miles ?? null,
      cost_cents: input.cost_cents ?? null,
      weight_lbs: input.weight_lbs ?? null,
      is_organic: input.is_organic ?? false,
      is_local: input.is_local ?? false,
      notes: input.notes || null,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/sourcing')
}

export async function getSourcingEntries(opts?: {
  dateFrom?: string
  dateTo?: string
  eventId?: string
  limit?: number
}) {
  const chef = await requireChef()
  const supabase = createServerClient()

  let query = (supabase as any)
    .from('sourcing_entries')
    .select('*')
    .eq('chef_id', chef.tenantId!)
    .order('entry_date', { ascending: false })

  if (opts?.dateFrom) query = query.gte('entry_date', opts.dateFrom)
  if (opts?.dateTo) query = query.lte('entry_date', opts.dateTo)
  if (opts?.eventId) query = query.eq('event_id', opts.eventId)
  if (opts?.limit) query = query.limit(opts.limit)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as SourcingEntry[]
}

export async function deleteSourcingEntry(id: string) {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('sourcing_entries')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.tenantId!)

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/sourcing')
}

export async function getSourcingStats(opts?: {
  dateFrom?: string
  dateTo?: string
}): Promise<SourcingStats> {
  const entries = await getSourcingEntries(opts)

  const totalEntries = entries.length
  if (totalEntries === 0) {
    return {
      totalEntries: 0,
      totalWeightLbs: 0,
      localPercent: 0,
      organicPercent: 0,
      avgFoodMiles: 0,
      co2SavedLbs: 0,
      sourceBreakdown: [],
    }
  }

  const totalWeightLbs = entries.reduce((sum, e) => sum + (Number(e.weight_lbs) || 0), 0)
  const localCount = entries.filter((e) => e.is_local).length
  const organicCount = entries.filter((e) => e.is_organic).length
  const entriesWithDistance = entries.filter((e) => e.distance_miles != null)
  const avgFoodMiles =
    entriesWithDistance.length > 0
      ? entriesWithDistance.reduce((sum, e) => sum + (e.distance_miles || 0), 0) /
        entriesWithDistance.length
      : 0

  // CO2 savings: compare actual sourcing vs if everything were conventional
  let actualCO2 = 0
  let conventionalCO2 = 0
  for (const entry of entries) {
    const weight = Number(entry.weight_lbs) || 0
    const category = getCO2Category(entry.source_type)
    actualCO2 += weight * CO2_PER_LB[category]
    conventionalCO2 += weight * CO2_PER_LB.conventional
  }
  const co2SavedLbs = Math.max(0, conventionalCO2 - actualCO2)

  // Source type breakdown
  const breakdownMap = new Map<SourceType, { count: number; weight: number }>()
  for (const entry of entries) {
    const existing = breakdownMap.get(entry.source_type as SourceType) || { count: 0, weight: 0 }
    existing.count++
    existing.weight += Number(entry.weight_lbs) || 0
    breakdownMap.set(entry.source_type as SourceType, existing)
  }
  const sourceBreakdown = Array.from(breakdownMap.entries()).map(([source_type, data]) => ({
    source_type,
    ...data,
  }))

  return {
    totalEntries,
    totalWeightLbs: Math.round(totalWeightLbs * 100) / 100,
    localPercent: Math.round((localCount / totalEntries) * 100),
    organicPercent: Math.round((organicCount / totalEntries) * 100),
    avgFoodMiles: Math.round(avgFoodMiles),
    co2SavedLbs: Math.round(co2SavedLbs * 100) / 100,
    sourceBreakdown,
  }
}

export async function getSourceBreakdown(opts?: {
  dateFrom?: string
  dateTo?: string
}): Promise<{ source_type: SourceType; count: number; weight: number; percent: number }[]> {
  const stats = await getSourcingStats(opts)
  const total = stats.sourceBreakdown.reduce((sum, b) => sum + b.count, 0)
  return stats.sourceBreakdown
    .map((b) => ({
      ...b,
      percent: total > 0 ? Math.round((b.count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export async function getMonthlyTrend(): Promise<
  { month: string; localPercent: number; organicPercent: number; entryCount: number }[]
> {
  const chef = await requireChef()
  const supabase = createServerClient()

  // Get last 12 months of entries
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const dateFrom = twelveMonthsAgo.toISOString().split('T')[0]

  const { data, error } = await (supabase as any)
    .from('sourcing_entries')
    .select('entry_date, is_local, is_organic')
    .eq('chef_id', chef.tenantId!)
    .gte('entry_date', dateFrom)
    .order('entry_date', { ascending: true })

  if (error) throw new Error(error.message)
  const entries = (data ?? []) as { entry_date: string; is_local: boolean; is_organic: boolean }[]

  // Group by month
  const monthMap = new Map<string, { total: number; local: number; organic: number }>()
  for (const entry of entries) {
    const month = entry.entry_date.substring(0, 7) // YYYY-MM
    const existing = monthMap.get(month) || { total: 0, local: 0, organic: 0 }
    existing.total++
    if (entry.is_local) existing.local++
    if (entry.is_organic) existing.organic++
    monthMap.set(month, existing)
  }

  return Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      localPercent: data.total > 0 ? Math.round((data.local / data.total) * 100) : 0,
      organicPercent: data.total > 0 ? Math.round((data.organic / data.total) * 100) : 0,
      entryCount: data.total,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

export async function getSourcingScorecard(opts?: {
  dateFrom?: string
  dateTo?: string
}): Promise<Scorecard> {
  const stats = await getSourcingStats(opts)

  if (stats.totalEntries === 0) {
    return {
      grade: 'F',
      localPercent: 0,
      organicPercent: 0,
      avgDistance: 0,
      details: 'No sourcing data logged yet. Start tracking your ingredients to see your score.',
    }
  }

  // Scoring: 0-100 points
  // Local % contributes up to 40 points
  // Organic % contributes up to 30 points
  // Avg distance contributes up to 30 points (lower = better)
  const localScore = (stats.localPercent / 100) * 40
  const organicScore = (stats.organicPercent / 100) * 30
  // Distance score: 0 miles = 30 pts, 100+ miles = 0 pts
  const distanceScore = Math.max(0, 30 - (stats.avgFoodMiles / 100) * 30)

  const totalScore = Math.round(localScore + organicScore + distanceScore)

  let grade: ScorecardGrade
  let details: string
  if (totalScore >= 85) {
    grade = 'A'
    details = 'Outstanding sourcing quality. Your ingredients are predominantly local and organic.'
  } else if (totalScore >= 70) {
    grade = 'B'
    details = 'Strong sourcing practices. Good mix of local and quality suppliers.'
  } else if (totalScore >= 55) {
    grade = 'C'
    details = 'Decent sourcing. Room to increase local and organic ingredient use.'
  } else if (totalScore >= 40) {
    grade = 'D'
    details = 'Below average sourcing quality. Consider partnering with local farms and markets.'
  } else {
    grade = 'F'
    details = 'Significant room for improvement. Start with one or two local suppliers.'
  }

  return {
    grade,
    localPercent: stats.localPercent,
    organicPercent: stats.organicPercent,
    avgDistance: stats.avgFoodMiles,
    details,
  }
}

export async function getEventSourcingReport(eventId: string) {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('sourcing_entries')
    .select('*')
    .eq('chef_id', chef.tenantId!)
    .eq('event_id', eventId)
    .order('ingredient_name', { ascending: true })

  if (error) throw new Error(error.message)
  const entries = (data ?? []) as SourcingEntry[]

  if (entries.length === 0) {
    return {
      entries: [],
      localPercent: 0,
      organicPercent: 0,
      totalCostCents: 0,
      totalWeightLbs: 0,
      co2SavedLbs: 0,
    }
  }

  const localCount = entries.filter((e) => e.is_local).length
  const organicCount = entries.filter((e) => e.is_organic).length
  const totalCostCents = entries.reduce((sum, e) => sum + (e.cost_cents || 0), 0)
  const totalWeightLbs = entries.reduce((sum, e) => sum + (Number(e.weight_lbs) || 0), 0)

  let actualCO2 = 0
  let conventionalCO2 = 0
  for (const entry of entries) {
    const weight = Number(entry.weight_lbs) || 0
    const category = getCO2Category(entry.source_type as SourceType)
    actualCO2 += weight * CO2_PER_LB[category]
    conventionalCO2 += weight * CO2_PER_LB.conventional
  }

  return {
    entries,
    localPercent: Math.round((localCount / entries.length) * 100),
    organicPercent: Math.round((organicCount / entries.length) * 100),
    totalCostCents,
    totalWeightLbs: Math.round(totalWeightLbs * 100) / 100,
    co2SavedLbs: Math.round(Math.max(0, conventionalCO2 - actualCO2) * 100) / 100,
  }
}
