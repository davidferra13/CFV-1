'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DietaryTrend {
  restriction: string
  totalOccurrences: number
  percentOfEvents: number
  percentOfClients: number
  trend: 'growing' | 'stable' | 'declining'
  recentMonthCount: number // occurrences in last 3 months
  priorMonthCount: number // occurrences in 3-6 months ago
}

export interface CrossClientDietaryInsight {
  type: 'common_combo' | 'rising_demand' | 'specialization_opportunity' | 'menu_suggestion'
  title: string
  description: string
  data?: Record<string, any>
}

export interface DietaryIntelligenceResult {
  trends: DietaryTrend[]
  insights: CrossClientDietaryInsight[]
  topRestrictions: string[]
  risingRestrictions: string[]
  commonCombinations: { restrictions: string[]; count: number }[]
  clientsWithRestrictions: number
  clientsWithoutRestrictions: number
  percentWithRestrictions: number
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getDietaryIntelligence(): Promise<DietaryIntelligenceResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch clients with dietary restrictions
  const { data: clients, error: clientError } = await db
    .from('clients')
    .select('id, dietary_restrictions')
    .eq('tenant_id', tenantId)

  // Fetch events with dietary data and dates (for trend analysis)
  const { data: events, error: eventError } = await db
    .from('events')
    .select('id, event_date, dietary_restrictions, guest_count, client_id')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'paid', 'in_progress'])
    .order('event_date', { ascending: true })

  if ((clientError && eventError) || (!clients && !events)) return null

  const allClients = clients || []
  const allEvents = events || []

  // Count dietary restrictions across clients
  const clientRestrictionCount = new Map<string, number>()
  let clientsWithRestrictions = 0

  for (const client of allClients) {
    const restrictions = (client.dietary_restrictions as string[]) || []
    if (restrictions.length > 0) clientsWithRestrictions++
    for (const r of restrictions) {
      const normalized = r.toLowerCase().trim()
      if (normalized)
        clientRestrictionCount.set(normalized, (clientRestrictionCount.get(normalized) || 0) + 1)
    }
  }

  // Count dietary restrictions across events (for time-based trends)
  const threeMonthsAgo = Date.now() - 90 * 86400000
  const sixMonthsAgo = Date.now() - 180 * 86400000
  const eventRestrictionCount = new Map<string, number>()
  const recentCount = new Map<string, number>() // last 3 months
  const priorCount = new Map<string, number>() // 3-6 months ago
  let totalEventsWithRestrictions = 0

  for (const event of allEvents) {
    const restrictions = (event.dietary_restrictions as string[]) || []
    if (restrictions.length > 0) totalEventsWithRestrictions++
    const eventTime = new Date(event.event_date).getTime()

    for (const r of restrictions) {
      const normalized = r.toLowerCase().trim()
      if (!normalized) continue
      eventRestrictionCount.set(normalized, (eventRestrictionCount.get(normalized) || 0) + 1)

      if (eventTime >= threeMonthsAgo) {
        recentCount.set(normalized, (recentCount.get(normalized) || 0) + 1)
      } else if (eventTime >= sixMonthsAgo) {
        priorCount.set(normalized, (priorCount.get(normalized) || 0) + 1)
      }
    }
  }

  // Build trend data
  const allRestrictions = new Set([
    ...clientRestrictionCount.keys(),
    ...eventRestrictionCount.keys(),
  ])
  const trends: DietaryTrend[] = []

  for (const restriction of allRestrictions) {
    const recent = recentCount.get(restriction) || 0
    const prior = priorCount.get(restriction) || 0

    let trend: DietaryTrend['trend'] = 'stable'
    if (recent > prior * 1.3 && recent >= 2) trend = 'growing'
    else if (recent < prior * 0.7 && prior >= 2) trend = 'declining'

    trends.push({
      restriction,
      totalOccurrences:
        (clientRestrictionCount.get(restriction) || 0) +
        (eventRestrictionCount.get(restriction) || 0),
      percentOfEvents:
        allEvents.length > 0
          ? Math.round(((eventRestrictionCount.get(restriction) || 0) / allEvents.length) * 100)
          : 0,
      percentOfClients:
        allClients.length > 0
          ? Math.round(((clientRestrictionCount.get(restriction) || 0) / allClients.length) * 100)
          : 0,
      trend,
      recentMonthCount: recent,
      priorMonthCount: prior,
    })
  }

  trends.sort((a, b) => b.totalOccurrences - a.totalOccurrences)

  // Find common combinations (pairs that appear together on the same client)
  const comboCounts = new Map<string, number>()
  for (const client of allClients) {
    const restrictions = ((client.dietary_restrictions as string[]) || [])
      .map((r: string) => r.toLowerCase().trim())
      .filter(Boolean)
    if (restrictions.length < 2) continue

    // Generate pairs
    for (let i = 0; i < restrictions.length; i++) {
      for (let j = i + 1; j < restrictions.length; j++) {
        const key = [restrictions[i], restrictions[j]].sort().join(' + ')
        comboCounts.set(key, (comboCounts.get(key) || 0) + 1)
      }
    }
  }

  const commonCombinations = Array.from(comboCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => ({ restrictions: key.split(' + '), count }))

  // Generate insights
  const insights: CrossClientDietaryInsight[] = []

  // Rising demand insight
  const risingRestrictions = trends.filter((t) => t.trend === 'growing')
  if (risingRestrictions.length > 0) {
    insights.push({
      type: 'rising_demand',
      title: 'Growing dietary demand',
      description: `${risingRestrictions.map((r) => r.restriction).join(', ')} ${risingRestrictions.length === 1 ? 'is' : 'are'} trending up in the last 3 months. Consider expanding your menu options in ${risingRestrictions.length === 1 ? 'this area' : 'these areas'}.`,
    })
  }

  // High concentration insight
  const topRestriction = trends[0]
  if (topRestriction && topRestriction.percentOfClients >= 30) {
    insights.push({
      type: 'specialization_opportunity',
      title: `${topRestriction.restriction} specialization opportunity`,
      description: `${topRestriction.percentOfClients}% of your clients have ${topRestriction.restriction} needs. You could market this as a specialty to attract more clients with this preference.`,
    })
  }

  // Common combo insight
  if (commonCombinations.length > 0) {
    const topCombo = commonCombinations[0]
    insights.push({
      type: 'common_combo',
      title: 'Common dietary combination',
      description: `${topCombo.count} clients need both ${topCombo.restrictions.join(' and ')}. Having a go-to menu that satisfies both will save prep time.`,
    })
  }

  // Menu suggestion based on data
  if (trends.length >= 3) {
    const top3 = trends.slice(0, 3).map((t) => t.restriction)
    insights.push({
      type: 'menu_suggestion',
      title: 'Default menu consideration',
      description: `Your top 3 dietary needs are ${top3.join(', ')}. A default menu accommodating all three would cover ${Math.round(trends.slice(0, 3).reduce((s, t) => Math.max(s, t.percentOfClients), 0))}% of your client base.`,
    })
  }

  const clientsWithout = allClients.length - clientsWithRestrictions
  const percentWith =
    allClients.length > 0 ? Math.round((clientsWithRestrictions / allClients.length) * 100) : 0

  return {
    trends: trends.slice(0, 15),
    insights,
    topRestrictions: trends.slice(0, 5).map((t) => t.restriction),
    risingRestrictions: risingRestrictions.map((r) => r.restriction),
    commonCombinations,
    clientsWithRestrictions,
    clientsWithoutRestrictions: clientsWithout,
    percentWithRestrictions: percentWith,
  }
}
