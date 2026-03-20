// Intelligence Hub - Dietary Restriction Trends
// Aggregates dietary restriction and allergy frequency across clients and events.
// Pure database queries and math, no AI. Formula > AI.

'use server'

import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface DietaryFrequency {
  restriction: string
  clientCount: number
  percentOfClients: number // 0-100
}

export interface AllergyFrequency {
  allergen: string
  clientCount: number
  percentOfClients: number
}

export interface DietaryTrendPoint {
  period: string // "YYYY-MM" or "YYYY-Q1", etc.
  restriction: string
  eventCount: number
}

export interface DietaryTrendsReport {
  topDietaryRestrictions: DietaryFrequency[]
  topAllergies: AllergyFrequency[]
  totalClientsWithRestrictions: number
  totalClientsWithAllergies: number
  totalClients: number
  quarterlyTrends: DietaryTrendPoint[]
  generatedAt: string
}

// ============================================
// HELPERS
// ============================================

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}

function getQuarter(dateStr: string): string {
  const date = new Date(dateStr)
  const q = Math.ceil((date.getMonth() + 1) / 3)
  return `${date.getFullYear()}-Q${q}`
}

// ============================================
// ACTIONS
// ============================================

/**
 * Get a full dietary trends report for the chef's client base.
 * Aggregates dietary restrictions and allergies from the clients table,
 * and tracks trends over time based on event dates.
 */
export async function getDietaryTrendsReport(): Promise<DietaryTrendsReport> {
  const user = await requirePro('intelligence-hub')
  const supabase: any = createServerClient()

  // Get all clients with their dietary data
  const { data: clients } = await supabase
    .from('clients')
    .select('id, dietary_restrictions, allergies')
    .eq('tenant_id', user.tenantId!)

  const totalClients = clients?.length ?? 0
  if (!totalClients) {
    return {
      topDietaryRestrictions: [],
      topAllergies: [],
      totalClientsWithRestrictions: 0,
      totalClientsWithAllergies: 0,
      totalClients: 0,
      quarterlyTrends: [],
      generatedAt: new Date().toISOString(),
    }
  }

  // Count dietary restriction frequency
  const restrictionCounts = new Map<string, Set<string>>()
  let clientsWithRestrictions = 0

  for (const c of clients!) {
    const restrictions = c.dietary_restrictions
    if (restrictions?.length) {
      clientsWithRestrictions++
      for (const r of restrictions) {
        const normalized = r.toLowerCase().trim()
        if (!normalized) continue
        const set = restrictionCounts.get(normalized) ?? new Set()
        set.add(c.id)
        restrictionCounts.set(normalized, set)
      }
    }
  }

  // Count allergy frequency
  const allergyCounts = new Map<string, Set<string>>()
  let clientsWithAllergies = 0

  for (const c of clients!) {
    const allergies = c.allergies
    if (allergies?.length) {
      clientsWithAllergies++
      for (const a of allergies) {
        const normalized = a.toLowerCase().trim()
        if (!normalized) continue
        const set = allergyCounts.get(normalized) ?? new Set()
        set.add(c.id)
        allergyCounts.set(normalized, set)
      }
    }
  }

  // Build sorted frequency lists
  const topDietaryRestrictions: DietaryFrequency[] = Array.from(restrictionCounts.entries())
    .map(([restriction, clientSet]) => ({
      restriction,
      clientCount: clientSet.size,
      percentOfClients: pct(clientSet.size, totalClients),
    }))
    .sort((a, b) => b.clientCount - a.clientCount)
    .slice(0, 20)

  const topAllergies: AllergyFrequency[] = Array.from(allergyCounts.entries())
    .map(([allergen, clientSet]) => ({
      allergen,
      clientCount: clientSet.size,
      percentOfClients: pct(clientSet.size, totalClients),
    }))
    .sort((a, b) => b.clientCount - a.clientCount)
    .slice(0, 20)

  // Quarterly trends: track how dietary restrictions appear in events over time
  // Join clients with events to see trends by quarter
  const { data: events } = await supabase
    .from('events')
    .select('client_id, event_date')
    .eq('tenant_id', user.tenantId!)
    .not('client_id', 'is', null)
    .in('status', ['completed', 'confirmed', 'in_progress'])
    .order('event_date')

  // Build a map of client_id -> dietary_restrictions for quick lookup
  const clientRestrictionMap = new Map<string, string[]>()
  for (const c of clients!) {
    if (c.dietary_restrictions?.length) {
      clientRestrictionMap.set(
        c.id,
        c.dietary_restrictions.map((r: any) => r.toLowerCase().trim())
      )
    }
  }

  // Count restrictions per quarter
  const quarterCounts = new Map<string, Map<string, number>>() // quarter -> restriction -> count

  for (const e of events ?? []) {
    if (!e.client_id || !e.event_date) continue
    const restrictions = clientRestrictionMap.get(e.client_id)
    if (!restrictions?.length) continue

    const quarter = getQuarter(e.event_date)
    for (const r of restrictions) {
      const qMap = quarterCounts.get(quarter) ?? new Map()
      qMap.set(r, (qMap.get(r) ?? 0) + 1)
      quarterCounts.set(quarter, qMap)
    }
  }

  // Flatten to trend points, limited to top 5 restrictions
  const topRestrictionNames = topDietaryRestrictions.slice(0, 5).map((r) => r.restriction)
  const quarterlyTrends: DietaryTrendPoint[] = []

  for (const [quarter, rMap] of Array.from(quarterCounts.entries()).sort()) {
    for (const name of topRestrictionNames) {
      const count = rMap.get(name) ?? 0
      if (count > 0) {
        quarterlyTrends.push({ period: quarter, restriction: name, eventCount: count })
      }
    }
  }

  return {
    topDietaryRestrictions,
    topAllergies,
    totalClientsWithRestrictions: clientsWithRestrictions,
    totalClientsWithAllergies: clientsWithAllergies,
    totalClients,
    quarterlyTrends,
    generatedAt: new Date().toISOString(),
  }
}
