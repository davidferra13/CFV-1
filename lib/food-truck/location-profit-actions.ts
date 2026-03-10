'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ── Types ──

export type LocationProfitability = {
  locationId: string
  locationName: string
  address: string | null
  totalRevenueCents: number
  totalVisits: number
  completedVisits: number
  avgRevenueCentsPerVisit: number
  avgCoversPerVisit: number
  totalCovers: number
  permitRequired: boolean
  profitScore: number // 0-100 composite score
}

export type LocationDetail = {
  profitability: LocationProfitability
  visitHistory: VisitEntry[]
  bestDayOfWeek: string | null
  worstDayOfWeek: string | null
  dayBreakdown: DayBreakdown[]
}

export type VisitEntry = {
  id: string
  date: string
  startTime: string
  endTime: string
  revenueCents: number | null
  actualCovers: number | null
  expectedCovers: number | null
  status: string
  notes: string | null
  weatherNotes: string | null
}

export type DayBreakdown = {
  day: string
  visits: number
  avgRevenueCents: number
  avgCovers: number
}

export type LocationRanking = LocationProfitability & {
  rank: number
}

export type TimeSlotPerformance = {
  locationName: string
  locationId: string
  dayOfWeek: string
  avgRevenueCents: number
  visits: number
}

// ── Helpers ──

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function computeProfitScore(
  avgRevenueCents: number,
  completedVisits: number,
  avgCovers: number
): number {
  // Weighted composite: revenue consistency (50%), volume (30%), covers (20%)
  // Normalize each factor to 0-100 range with reasonable caps
  const revenueScore = Math.min(100, (avgRevenueCents / 50000) * 100) // $500 avg = 100
  const volumeScore = Math.min(100, (completedVisits / 20) * 100) // 20 visits = 100
  const coversScore = Math.min(100, (avgCovers / 100) * 100) // 100 avg covers = 100

  return Math.round(revenueScore * 0.5 + volumeScore * 0.3 + coversScore * 0.2)
}

// ── Actions ──

export async function getLocationProfitability(
  locationId: string,
  dateRange?: { start: string; end: string }
): Promise<LocationDetail> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // Get the location
  const { data: location, error: locError } = await supabase
    .from('truck_locations')
    .select('id, name, address, permit_required')
    .eq('id', locationId)
    .eq('tenant_id', tenantId)
    .single()

  if (locError || !location) {
    throw new Error('Location not found')
  }

  // Get schedule entries for this location
  let query = supabase
    .from('truck_schedule')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('location_id', locationId)
    .order('date', { ascending: false })

  if (dateRange) {
    query = query.gte('date', dateRange.start).lte('date', dateRange.end)
  }

  const { data: visits, error: visitError } = await query

  if (visitError) {
    throw new Error('Failed to load visit history')
  }

  const entries = visits || []
  const completed = entries.filter((v) => v.status === 'completed')

  const totalRevenueCents = completed.reduce((sum, v) => sum + (v.revenue_cents || 0), 0)
  const totalCovers = completed.reduce((sum, v) => sum + (v.actual_covers || 0), 0)
  const completedCount = completed.length

  const avgRevenueCentsPerVisit =
    completedCount > 0 ? Math.round(totalRevenueCents / completedCount) : 0
  const avgCoversPerVisit = completedCount > 0 ? Math.round(totalCovers / completedCount) : 0

  // Day-of-week breakdown
  const dayMap: Record<string, { visits: number; totalRevenue: number; totalCovers: number }> = {}
  for (const visit of completed) {
    const d = new Date(visit.date)
    const dayName = DAY_NAMES[d.getDay()]
    if (!dayMap[dayName]) {
      dayMap[dayName] = { visits: 0, totalRevenue: 0, totalCovers: 0 }
    }
    dayMap[dayName].visits++
    dayMap[dayName].totalRevenue += visit.revenue_cents || 0
    dayMap[dayName].totalCovers += visit.actual_covers || 0
  }

  const dayBreakdown: DayBreakdown[] = Object.entries(dayMap)
    .map(([day, data]) => ({
      day,
      visits: data.visits,
      avgRevenueCents: data.visits > 0 ? Math.round(data.totalRevenue / data.visits) : 0,
      avgCovers: data.visits > 0 ? Math.round(data.totalCovers / data.visits) : 0,
    }))
    .sort((a, b) => b.avgRevenueCents - a.avgRevenueCents)

  const bestDayOfWeek = dayBreakdown.length > 0 ? dayBreakdown[0].day : null
  const worstDayOfWeek = dayBreakdown.length > 0 ? dayBreakdown[dayBreakdown.length - 1].day : null

  const visitHistory: VisitEntry[] = entries.map((v) => ({
    id: v.id,
    date: v.date,
    startTime: v.start_time,
    endTime: v.end_time,
    revenueCents: v.revenue_cents,
    actualCovers: v.actual_covers,
    expectedCovers: v.expected_covers,
    status: v.status,
    notes: v.notes,
    weatherNotes: v.weather_notes,
  }))

  const profitability: LocationProfitability = {
    locationId: location.id,
    locationName: location.name,
    address: location.address,
    totalRevenueCents,
    totalVisits: entries.length,
    completedVisits: completedCount,
    avgRevenueCentsPerVisit,
    avgCoversPerVisit,
    totalCovers,
    permitRequired: location.permit_required,
    profitScore: computeProfitScore(avgRevenueCentsPerVisit, completedCount, avgCoversPerVisit),
  }

  return {
    profitability,
    visitHistory,
    bestDayOfWeek,
    worstDayOfWeek,
    dayBreakdown,
  }
}

export async function getAllLocationRankings(days?: number): Promise<LocationRanking[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // Get all active locations
  const { data: locations, error: locError } = await supabase
    .from('truck_locations')
    .select('id, name, address, permit_required')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (locError) {
    throw new Error('Failed to load locations')
  }

  if (!locations || locations.length === 0) {
    return []
  }

  // Build date filter
  let scheduleQuery = supabase.from('truck_schedule').select('*').eq('tenant_id', tenantId)

  if (days) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    scheduleQuery = scheduleQuery.gte('date', cutoff.toISOString().slice(0, 10))
  }

  const { data: allVisits, error: visitError } = await scheduleQuery

  if (visitError) {
    throw new Error('Failed to load schedule data')
  }

  const visits = allVisits || []

  // Group by location
  const locationMap = new Map<string, typeof visits>()
  for (const visit of visits) {
    const existing = locationMap.get(visit.location_id) || []
    existing.push(visit)
    locationMap.set(visit.location_id, existing)
  }

  // Calculate profitability for each
  const rankings: LocationProfitability[] = locations.map((loc) => {
    const locVisits = locationMap.get(loc.id) || []
    const completed = locVisits.filter((v) => v.status === 'completed')
    const totalRevenueCents = completed.reduce((sum, v) => sum + (v.revenue_cents || 0), 0)
    const totalCovers = completed.reduce((sum, v) => sum + (v.actual_covers || 0), 0)
    const completedCount = completed.length
    const avgRevenueCentsPerVisit =
      completedCount > 0 ? Math.round(totalRevenueCents / completedCount) : 0
    const avgCoversPerVisit = completedCount > 0 ? Math.round(totalCovers / completedCount) : 0

    return {
      locationId: loc.id,
      locationName: loc.name,
      address: loc.address,
      totalRevenueCents,
      totalVisits: locVisits.length,
      completedVisits: completedCount,
      avgRevenueCentsPerVisit,
      avgCoversPerVisit,
      totalCovers,
      permitRequired: loc.permit_required,
      profitScore: computeProfitScore(avgRevenueCentsPerVisit, completedCount, avgCoversPerVisit),
    }
  })

  // Sort by profit score descending
  rankings.sort((a, b) => b.profitScore - a.profitScore)

  return rankings.map((r, i) => ({ ...r, rank: i + 1 }))
}

export async function getLocationTrends(locationId: string): Promise<{
  revenueByVisit: { date: string; revenueCents: number }[]
  coversByVisit: { date: string; covers: number }[]
  bestDayOfWeek: string | null
  worstDayOfWeek: string | null
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const { data: visits, error } = await supabase
    .from('truck_schedule')
    .select('date, revenue_cents, actual_covers, status')
    .eq('tenant_id', tenantId)
    .eq('location_id', locationId)
    .eq('status', 'completed')
    .order('date', { ascending: true })
    .limit(12)

  if (error) {
    throw new Error('Failed to load trends')
  }

  const entries = visits || []

  const revenueByVisit = entries.map((v) => ({
    date: v.date,
    revenueCents: v.revenue_cents || 0,
  }))

  const coversByVisit = entries.map((v) => ({
    date: v.date,
    covers: v.actual_covers || 0,
  }))

  // Day-of-week analysis
  const dayStats: Record<string, { total: number; count: number }> = {}
  for (const v of entries) {
    const dayName = DAY_NAMES[new Date(v.date).getDay()]
    if (!dayStats[dayName]) dayStats[dayName] = { total: 0, count: 0 }
    dayStats[dayName].total += v.revenue_cents || 0
    dayStats[dayName].count++
  }

  const dayAvgs = Object.entries(dayStats)
    .map(([day, s]) => ({ day, avg: s.count > 0 ? s.total / s.count : 0 }))
    .sort((a, b) => b.avg - a.avg)

  return {
    revenueByVisit,
    coversByVisit,
    bestDayOfWeek: dayAvgs.length > 0 ? dayAvgs[0].day : null,
    worstDayOfWeek: dayAvgs.length > 0 ? dayAvgs[dayAvgs.length - 1].day : null,
  }
}

export async function getBestTimeSlots(): Promise<TimeSlotPerformance[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // Get all completed visits with location info
  const { data: visits, error } = await supabase
    .from('truck_schedule')
    .select('location_id, date, revenue_cents, actual_covers, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')

  if (error) {
    throw new Error('Failed to load schedule data')
  }

  if (!visits || visits.length === 0) return []

  // Get location names
  const locationIds = [...new Set(visits.map((v) => v.location_id))]
  const { data: locations } = await supabase
    .from('truck_locations')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .in('id', locationIds)

  const locNameMap = new Map((locations || []).map((l) => [l.id, l.name]))

  // Group by location + day of week
  const slotMap = new Map<
    string,
    { totalRevenue: number; count: number; locationId: string; locationName: string; day: string }
  >()

  for (const visit of visits) {
    const dayName = DAY_NAMES[new Date(visit.date).getDay()]
    const key = `${visit.location_id}__${dayName}`
    const existing = slotMap.get(key)
    if (existing) {
      existing.totalRevenue += visit.revenue_cents || 0
      existing.count++
    } else {
      slotMap.set(key, {
        totalRevenue: visit.revenue_cents || 0,
        count: 1,
        locationId: visit.location_id,
        locationName: locNameMap.get(visit.location_id) || 'Unknown',
        day: dayName,
      })
    }
  }

  const results: TimeSlotPerformance[] = Array.from(slotMap.values())
    .map((s) => ({
      locationId: s.locationId,
      locationName: s.locationName,
      dayOfWeek: s.day,
      avgRevenueCents: s.count > 0 ? Math.round(s.totalRevenue / s.count) : 0,
      visits: s.count,
    }))
    .sort((a, b) => b.avgRevenueCents - a.avgRevenueCents)

  return results.slice(0, 20) // Top 20 combos
}
