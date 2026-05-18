import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

const SCANNABLE_STATUSES = ['draft', 'proposed', 'accepted']
const PEAK_MONTHS = new Set([5, 6, 11, 12])

const FORMAL_OCCASIONS = new Set([
  'tasting',
  'tasting menu',
  'formal',
  'formal dinner',
  'wedding',
  'rehearsal dinner',
  'anniversary',
  'gala',
  'corporate',
])

type EventRow = {
  id: string
  eventName: string | null
  eventDate: string
  guestCount: number | null
  occasion: string | null
  serviceStyle: string | null
  quotedPriceCents: number | null
  courseCount: number | null
  clientId: string | null
}

type Opportunity = {
  type: string
  title: string
  description: string
  estimatedRevenueCents: number
  confidence: 'high' | 'medium' | 'low'
  eventId: string
  eventName: string
}

/**
 * Surfaces revenue opportunities on upcoming events as rail items.
 * Pure deterministic logic; no AI calls.
 */
export async function resolveRevenueOpportunities(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  const nowDate = new Date(ctx.now.getFullYear(), ctx.now.getMonth(), ctx.now.getDate())
  const cutoff = new Date(nowDate.getTime() + 30 * MS_DAY)
  const todayStr = nowDate.toISOString().slice(0, 10)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  let events: EventRow[]
  try {
    const result = await pgClient`
      SELECT
        e.id,
        e.event_name as "eventName",
        e.event_date as "eventDate",
        e.guest_count as "guestCount",
        e.occasion,
        e.service_style as "serviceStyle",
        e.quoted_price_cents as "quotedPriceCents",
        e.course_count as "courseCount",
        e.client_id as "clientId"
      FROM events e
      WHERE e.tenant_id = ${ctx.tenantId}
        AND e.status = ANY(${SCANNABLE_STATUSES})
        AND e.event_date >= ${todayStr}
        AND e.event_date <= ${cutoffStr}
        AND (e.is_demo = false OR e.is_demo IS NULL)
      ORDER BY e.event_date ASC
      LIMIT 50
    `
    events = result as unknown as EventRow[]
  } catch (err) {
    console.error('[revenue-opportunity-resolver] Query failed:', err)
    return []
  }

  if (!events.length) return []

  // Fetch median per-guest data for all completed events in this tenant
  let completedPerGuest: { guestCount: number; perGuestCents: number }[] = []
  try {
    const completed = await pgClient`
      SELECT guest_count as "guestCount", quoted_price_cents as "quotedPriceCents"
      FROM events
      WHERE tenant_id = ${ctx.tenantId}
        AND status = 'completed'
        AND quoted_price_cents > 0
        AND guest_count > 0
        AND (is_demo = false OR is_demo IS NULL)
    `
    completedPerGuest = (completed as any[]).map((r) => ({
      guestCount: Number(r.guestCount),
      perGuestCents: Math.round(Number(r.quotedPriceCents) / Number(r.guestCount)),
    }))
  } catch {
    // proceed without historical data
  }

  // Fetch client event counts for repeat detection
  const clientIdSet = new Set<string>()
  for (const e of events) {
    if (e.clientId) clientIdSet.add(e.clientId)
  }
  const clientIds = Array.from(clientIdSet)
  const clientEventCounts = new Map<string, number>()
  if (clientIds.length > 0) {
    try {
      const counts = await pgClient`
        SELECT client_id as "clientId", COUNT(*)::int as "cnt"
        FROM events
        WHERE tenant_id = ${ctx.tenantId}
          AND client_id = ANY(${clientIds})
          AND status = 'completed'
          AND (is_demo = false OR is_demo IS NULL)
        GROUP BY client_id
      `
      for (const row of counts as any[]) {
        clientEventCounts.set(row.clientId, Number(row.cnt))
      }
    } catch {
      // proceed without client history
    }
  }

  // Fetch line item labels for all events in one query
  const eventIds = events.map((e) => e.id)
  const eventLineLabels = new Map<string, string[]>()
  try {
    const items = await pgClient`
      SELECT event_id as "eventId", label
      FROM quote_line_items
      WHERE tenant_id = ${ctx.tenantId}
        AND event_id = ANY(${eventIds})
    `
    for (const row of items as any[]) {
      const arr = eventLineLabels.get(row.eventId) ?? []
      arr.push((row.label ?? '').toLowerCase())
      eventLineLabels.set(row.eventId, arr)
    }
  } catch {
    // proceed without line items
  }

  const allOpps: Opportunity[] = []

  for (const evt of events) {
    const guests = evt.guestCount ?? 0
    const quotedCents = Number(evt.quotedPriceCents) || 0
    const perGuestCents = guests > 0 && quotedCents > 0 ? Math.round(quotedCents / guests) : 0
    const name = evt.eventName || evt.occasion || 'Upcoming event'
    const labels = eventLineLabels.get(evt.id) ?? []

    const hasBeverage = labels.some(
      (l) =>
        l.includes('wine') ||
        l.includes('beverage') ||
        l.includes('pairing') ||
        l.includes('cocktail') ||
        l.includes('drink') ||
        l.includes('bar')
    )

    const hasSeasonalPremium = labels.some(
      (l) =>
        l.includes('seasonal') ||
        l.includes('holiday') ||
        l.includes('peak') ||
        l.includes('premium')
    )

    const isFormal = evt.occasion ? FORMAL_OCCASIONS.has(evt.occasion.toLowerCase().trim()) : false

    const isDinner = (() => {
      const occ = evt.occasion?.toLowerCase() ?? ''
      const style = evt.serviceStyle?.toLowerCase() ?? ''
      if (occ.includes('dinner') || occ.includes('tasting') || occ.includes('formal')) return true
      if (style.includes('plated') || style.includes('coursed') || style.includes('tasting'))
        return true
      if (!occ && !style) return true
      return false
    })()

    // 1. Missing courses
    const courseCount = evt.courseCount ?? 0
    if (isFormal && courseCount > 0 && courseCount < 4 && guests > 0) {
      allOpps.push({
        type: 'missing_course',
        title: 'Add another course',
        description: `${courseCount}-course menu for a formal event`,
        estimatedRevenueCents: 1200 * guests,
        confidence: courseCount <= 2 ? 'high' : 'medium',
        eventId: evt.id,
        eventName: name,
      })
    }

    // 2. Wine/beverage pairing
    if (!hasBeverage && isDinner && guests > 0) {
      allOpps.push({
        type: 'wine_pairing',
        title: 'Beverage pairing service',
        description: 'No beverage line items detected',
        estimatedRevenueCents: 1500 * guests,
        confidence: isFormal ? 'high' : 'medium',
        eventId: evt.id,
        eventName: name,
      })
    }

    // 3. Guest tier pricing gap
    if (perGuestCents > 0 && completedPerGuest.length >= 3) {
      const brackets = [
        { min: 1, max: 4 },
        { min: 5, max: 8 },
        { min: 9, max: 15 },
        { min: 16, max: 25 },
        { min: 26, max: 40 },
        { min: 41, max: 9999 },
      ]
      const bracket = brackets.find((b) => guests >= b.min && guests <= b.max)
      if (bracket) {
        const tierData = completedPerGuest
          .filter((d) => d.guestCount >= bracket.min && d.guestCount <= bracket.max)
          .map((d) => d.perGuestCents)
          .sort((a, b) => a - b)

        if (tierData.length >= 3) {
          const median = tierData[Math.floor(tierData.length / 2)]
          if (perGuestCents < median) {
            const gapCents = median - perGuestCents
            const gapPercent = Math.round((gapCents / median) * 100)
            if (gapPercent >= 10) {
              allOpps.push({
                type: 'guest_tier_upgrade',
                title: 'Below your median rate',
                description: `$${Math.round(perGuestCents / 100)}/guest vs $${Math.round(median / 100)} median (${gapPercent}% gap)`,
                estimatedRevenueCents: gapCents * guests,
                confidence: gapPercent >= 25 ? 'high' : 'medium',
                eventId: evt.id,
                eventName: name,
              })
            }
          }
        }
      }
    }

    // 4. Take-home offering
    if (guests >= 8) {
      allOpps.push({
        type: 'take_home',
        title: 'Take-home offering',
        description: `${guests} guests, viable for take-home dessert or bread basket`,
        estimatedRevenueCents: 700 * guests,
        confidence: guests >= 15 ? 'high' : 'medium',
        eventId: evt.id,
        eventName: name,
      })
    }

    // 5. Seasonal premium
    const month = evt.eventDate ? new Date(evt.eventDate + 'T00:00:00').getMonth() + 1 : null
    if (month !== null && PEAK_MONTHS.has(month) && !hasSeasonalPremium && quotedCents > 0) {
      allOpps.push({
        type: 'seasonal_premium',
        title: 'Peak season, no premium',
        description: 'Event in peak season without seasonal premium applied',
        estimatedRevenueCents: Math.round(quotedCents * 0.1),
        confidence: 'medium',
        eventId: evt.id,
        eventName: name,
      })
    }

    // 6. Repeat client
    const clientCount = evt.clientId ? (clientEventCounts.get(evt.clientId) ?? 0) : 0
    if (clientCount >= 3 && quotedCents > 0) {
      allOpps.push({
        type: 'repeat_discount',
        title: `Repeat client (${clientCount} past events)`,
        description: 'Consider loyalty discount or premium positioning',
        estimatedRevenueCents: Math.round(quotedCents * 0.05) || 5000,
        confidence: clientCount >= 5 ? 'high' : 'medium',
        eventId: evt.id,
        eventName: name,
      })
    }
  }

  // Sort by revenue descending
  allOpps.sort((a, b) => b.estimatedRevenueCents - a.estimatedRevenueCents)

  const items: GodModeResolvedItem[] = []

  for (const opp of allOpps) {
    const dollars = Math.round(opp.estimatedRevenueCents / 100)

    let tier: RailTier = 'p3'
    if (opp.confidence === 'high' && dollars > 50) tier = 'p2'
    if (opp.confidence === 'high' && dollars > 200) tier = 'p2'

    items.push({
      definitionId: `chef.revenue_opportunity.${opp.eventId}.${opp.type}`,
      tier,
      label: `Revenue opportunity: ${opp.title} for ${opp.eventName} (+$${dollars})`,
      context: opp.description,
      destination: `/chef/events/${opp.eventId}`,
      icon: 'dollar-sign',
      loopState: 'active',
      sourceKind: 'system',
      evidenceLabel: 'computed',
      confidence: opp.confidence === 'high' ? 0.9 : opp.confidence === 'medium' ? 0.7 : 0.5,
      nextAction: 'Review and apply to quote',
      data: {
        opportunityType: opp.type,
        estimatedRevenueCents: opp.estimatedRevenueCents,
        eventId: opp.eventId,
      },
    })
  }

  // Aggregate summary if total missed > $200
  const totalMissedCents = allOpps.reduce((sum, o) => sum + o.estimatedRevenueCents, 0)
  const totalDollars = Math.round(totalMissedCents / 100)

  if (totalDollars > 200 && allOpps.length > 1) {
    items.unshift({
      definitionId: 'chef.revenue_opportunity.summary',
      tier: 'p2',
      label: `$${totalDollars} in potential revenue across ${allOpps.length} opportunities`,
      context: `${events.length} upcoming events scanned, ${allOpps.length} opportunities found`,
      destination: '/chef/intelligence',
      icon: 'trending-up',
      loopState: 'active',
      sourceKind: 'system',
      evidenceLabel: 'computed',
      confidence: 0.8,
      nextAction: 'Review revenue opportunities',
      data: {
        totalMissedCents,
        opportunityCount: allOpps.length,
        eventsScanned: events.length,
      },
    })
  }

  return items
}
