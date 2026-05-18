'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ──────────────────────────────────────────────────────────────────

export type RevenueOpportunityType =
  | 'missing_course'
  | 'wine_pairing'
  | 'add_on'
  | 'guest_tier_upgrade'
  | 'seasonal_premium'
  | 'take_home'
  | 'repeat_discount'

export type RevenueOpportunity = {
  type: RevenueOpportunityType
  title: string
  description: string
  estimatedRevenueCents: number
  confidence: 'high' | 'medium' | 'low'
  eventId: string
}

export type RevenueScanSummary = {
  totalMissedCents: number
  opportunityCount: number
  topOpportunities: RevenueOpportunity[]
}

// ── Constants ──────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────

function getEventMonth(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? null : d.getMonth() + 1
}

function isFormalOccasion(occasion: string | null): boolean {
  if (!occasion) return false
  return FORMAL_OCCASIONS.has(occasion.toLowerCase().trim())
}

function isDinnerEvent(occasion: string | null, serviceStyle: string | null): boolean {
  const occ = occasion?.toLowerCase() ?? ''
  const style = serviceStyle?.toLowerCase() ?? ''
  if (occ.includes('dinner') || occ.includes('tasting') || occ.includes('formal')) return true
  if (style.includes('plated') || style.includes('coursed') || style.includes('tasting'))
    return true
  if (!occ && !style) return true
  return false
}

function monthLabel(month: number): string {
  const labels: Record<number, string> = {
    5: 'May, wedding season',
    6: 'June, wedding season',
    11: 'November, holiday season',
    12: 'December, holiday season',
  }
  return labels[month] ?? `month ${month}`
}

async function getMedianPerGuestForTier(
  db: any,
  tenantId: string,
  guestCount: number
): Promise<number | null> {
  if (guestCount <= 0) return null

  const brackets = [
    { min: 1, max: 4 },
    { min: 5, max: 8 },
    { min: 9, max: 15 },
    { min: 16, max: 25 },
    { min: 26, max: 40 },
    { min: 41, max: 9999 },
  ]

  const bracket = brackets.find((b) => guestCount >= b.min && guestCount <= b.max)
  if (!bracket) return null

  const { data: events } = await db
    .from('events')
    .select('quoted_price_cents, guest_count')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .not('quoted_price_cents', 'is', null)
    .gt('quoted_price_cents', 0)
    .not('guest_count', 'is', null)
    .gte('guest_count', bracket.min)
    .lte('guest_count', bracket.max)
    .eq('is_demo', false)

  if (!events?.length || events.length < 3) return null

  const perGuest = events
    .map((e: any) => Math.round(e.quoted_price_cents / e.guest_count))
    .sort((a: number, b: number) => a - b)

  return perGuest[Math.floor(perGuest.length / 2)]
}

async function getClientCompletedEventCount(
  db: any,
  tenantId: string,
  clientId: string
): Promise<number> {
  const { count, error } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .eq('is_demo', false)

  if (error) return 0
  return count ?? 0
}

// ── Main: Scan Single Event ────────────────────────────────────────────────

export async function scanEventOpportunities(eventId: string): Promise<RevenueOpportunity[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: event, error: eventErr } = await db
    .from('events')
    .select(
      'id, status, event_date, guest_count, occasion, service_style, quoted_price_cents, course_count, client_id'
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) return []

  const guests = event.guest_count ?? 0
  const quotedCents = event.quoted_price_cents ?? 0
  const perGuestCents = guests > 0 && quotedCents > 0 ? Math.round(quotedCents / guests) : 0

  const { data: lineItems } = await db
    .from('quote_line_items')
    .select('label')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)

  const labels = (lineItems ?? []).map((li: any) => (li.label ?? '').toLowerCase())
  const hasBeverage = labels.some(
    (l: string) =>
      l.includes('wine') ||
      l.includes('beverage') ||
      l.includes('pairing') ||
      l.includes('cocktail') ||
      l.includes('drink') ||
      l.includes('bar')
  )

  const hasSeasonalPremium = labels.some(
    (l: string) =>
      l.includes('seasonal') || l.includes('holiday') || l.includes('peak') || l.includes('premium')
  )

  const [medianPerGuest, clientEventCount] = await Promise.all([
    getMedianPerGuestForTier(db, tenantId, guests),
    event.client_id
      ? getClientCompletedEventCount(db, tenantId, event.client_id)
      : Promise.resolve(0),
  ])

  const opportunities: RevenueOpportunity[] = []

  // 1. Missing courses: formal events with fewer than 4 courses
  const courseCount = event.course_count ?? 0
  if (isFormalOccasion(event.occasion) && courseCount > 0 && courseCount < 4 && guests > 0) {
    const additionalPerHead = 1200
    opportunities.push({
      type: 'missing_course',
      title: 'Add another course',
      description: `${courseCount}-course menu for a ${event.occasion ?? 'formal'} event. Adding a course could elevate the experience.`,
      estimatedRevenueCents: additionalPerHead * guests,
      confidence: courseCount <= 2 ? 'high' : 'medium',
      eventId,
    })
  }

  // 2. Wine/beverage pairing
  if (!hasBeverage && isDinnerEvent(event.occasion, event.service_style) && guests > 0) {
    const pairingPerHead = 1500
    opportunities.push({
      type: 'wine_pairing',
      title: 'Beverage pairing service',
      description:
        'No beverage line items detected. A wine or cocktail pairing adds significant per-head revenue.',
      estimatedRevenueCents: pairingPerHead * guests,
      confidence: isFormalOccasion(event.occasion) ? 'high' : 'medium',
      eventId,
    })
  }

  // 3. Guest tier pricing gap
  if (medianPerGuest !== null && perGuestCents > 0 && perGuestCents < medianPerGuest) {
    const gapCents = medianPerGuest - perGuestCents
    const gapPercent = Math.round((gapCents / medianPerGuest) * 100)
    if (gapPercent >= 10) {
      opportunities.push({
        type: 'guest_tier_upgrade',
        title: 'Below your median rate',
        description: `Quoted $${Math.round(perGuestCents / 100)}/guest, but your median for this guest range is $${Math.round(medianPerGuest / 100)}/guest (${gapPercent}% gap).`,
        estimatedRevenueCents: gapCents * guests,
        confidence: gapPercent >= 25 ? 'high' : 'medium',
        eventId,
      })
    }
  }

  // 4. Take-home offering for larger events
  if (guests >= 8) {
    const takeHomePerHead = 700
    opportunities.push({
      type: 'take_home',
      title: 'Take-home offering',
      description: `${guests} guests makes a take-home dessert, bread basket, or party favor economically viable.`,
      estimatedRevenueCents: takeHomePerHead * guests,
      confidence: guests >= 15 ? 'high' : 'medium',
      eventId,
    })
  }

  // 5. Seasonal premium
  const month = getEventMonth(event.event_date)
  if (month !== null && PEAK_MONTHS.has(month) && !hasSeasonalPremium && quotedCents > 0) {
    const premiumPercent = 0.1
    opportunities.push({
      type: 'seasonal_premium',
      title: 'Peak season, no premium applied',
      description: `Event falls in peak season (${monthLabel(month)}) with no seasonal premium on the quote.`,
      estimatedRevenueCents: Math.round(quotedCents * premiumPercent),
      confidence: 'medium',
      eventId,
    })
  }

  // 6. Repeat client loyalty or volume pricing
  if (clientEventCount >= 3 && quotedCents > 0) {
    const loyaltyValue = Math.round(quotedCents * 0.05)
    opportunities.push({
      type: 'repeat_discount',
      title: `Repeat client (${clientEventCount} past events)`,
      description: `This client has ${clientEventCount} completed events. Consider a loyalty discount (retention) or premium positioning (they clearly value the service).`,
      estimatedRevenueCents: loyaltyValue > 0 ? loyaltyValue : 5000,
      confidence: clientEventCount >= 5 ? 'high' : 'medium',
      eventId,
    })
  }

  return opportunities
}

// ── Scan Upcoming ──────────────────────────────────────────────────────────

export async function scanUpcomingOpportunities(days: number = 30): Promise<RevenueOpportunity[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const today = new Date().toISOString().slice(0, 10)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const { data: events, error } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', SCANNABLE_STATUSES)
    .gte('event_date', today)
    .lte('event_date', cutoffStr)
    .eq('is_demo', false)
    .order('event_date', { ascending: true })
    .limit(50)

  if (error || !events?.length) return []

  const allOpportunities: RevenueOpportunity[] = []

  for (const evt of events) {
    const opps = await scanEventOpportunities(evt.id)
    allOpportunities.push(...opps)
  }

  allOpportunities.sort((a, b) => b.estimatedRevenueCents - a.estimatedRevenueCents)

  return allOpportunities
}

// ── Summary ────────────────────────────────────────────────────────────────

export async function getRevenueScanSummary(): Promise<RevenueScanSummary> {
  const opportunities = await scanUpcomingOpportunities(30)

  const totalMissedCents = opportunities.reduce((sum, o) => sum + o.estimatedRevenueCents, 0)

  return {
    totalMissedCents,
    opportunityCount: opportunities.length,
    topOpportunities: opportunities.slice(0, 5),
  }
}
