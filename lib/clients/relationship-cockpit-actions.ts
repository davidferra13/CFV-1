'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ClientRelationshipProfile,
  RelationshipHealthFactors,
  ClientBookingPatterns,
} from './relationship-cockpit-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24))
}

function daysSinceNow(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.max(0, daysBetween(dateStr, new Date().toISOString()))
}

function healthLabel(daysSince: number | null): ClientRelationshipProfile['relationshipHealth'] {
  if (daysSince === null) return 'dormant'
  if (daysSince < 30) return 'thriving'
  if (daysSince < 90) return 'stable'
  if (daysSince < 180) return 'cooling'
  if (daysSince < 365) return 'at_risk'
  return 'dormant'
}

function computeHealthFactors(
  daysSince: number | null,
  frequencyDays: number | null,
  lifetimeCents: number,
  medianLtv: number,
  avgRating: number | null
): RelationshipHealthFactors {
  // Recency: 0-100 (weight 0.35)
  let recency = 0
  if (daysSince !== null) {
    if (daysSince <= 14) recency = 100
    else if (daysSince <= 30) recency = 85
    else if (daysSince <= 60) recency = 70
    else if (daysSince <= 90) recency = 55
    else if (daysSince <= 180) recency = 35
    else if (daysSince <= 365) recency = 15
    else recency = 0
  }

  // Frequency: 0-100 (weight 0.25)
  let frequency = 0
  if (frequencyDays !== null && frequencyDays > 0) {
    if (frequencyDays <= 30) frequency = 100
    else if (frequencyDays <= 60) frequency = 80
    else if (frequencyDays <= 90) frequency = 60
    else if (frequencyDays <= 180) frequency = 40
    else if (frequencyDays <= 365) frequency = 20
    else frequency = 5
  }

  // Value: 0-100 (weight 0.25)
  let value = 0
  if (medianLtv > 0 && lifetimeCents > 0) {
    const ratio = lifetimeCents / medianLtv
    if (ratio >= 2) value = 100
    else if (ratio >= 1.5) value = 85
    else if (ratio >= 1) value = 70
    else if (ratio >= 0.5) value = 50
    else if (ratio >= 0.25) value = 30
    else value = 10
  } else if (lifetimeCents > 0) {
    value = 50 // no median reference; default mid
  }

  // Satisfaction: 0-100 (weight 0.15)
  let satisfaction = 50 // default when no reviews
  if (avgRating !== null) {
    satisfaction = Math.min(100, Math.round((avgRating / 5) * 100))
  }

  const overall = Math.round(recency * 0.35 + frequency * 0.25 + value * 0.25 + satisfaction * 0.15)

  return { recency, frequency, value, satisfaction, overall }
}

// ---------------------------------------------------------------------------
// 1. getClientRelationshipProfile
// ---------------------------------------------------------------------------

export async function getClientRelationshipProfile(
  clientId: string
): Promise<ClientRelationshipProfile | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const [clientRes, eventsRes, commRes, reviewsRes, tagsRes] = await Promise.all([
    db
      .from('clients')
      .select(
        'id, full_name, lifetime_value_cents, total_events_count, first_event_date, last_event_date, dietary_restrictions, allergies, preferred_service_style'
      )
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .is('deleted_at' as any, null)
      .single(),
    db
      .from('events')
      .select('id, event_date, quoted_price_cents, status')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('event_date', { ascending: true }),
    db
      .from('communication_log')
      .select('id, created_at')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    db.from('client_reviews').select('rating').eq('tenant_id', tenantId).eq('client_id', clientId),
    db.from('client_tags').select('tag').eq('tenant_id', tenantId).eq('client_id', clientId),
  ])

  const client = clientRes.data
  if (!client) return null

  const events: any[] = eventsRes.data ?? []
  const comms: any[] = commRes.data ?? []
  const reviews: any[] = reviewsRes.data ?? []
  const tags: any[] = tagsRes.data ?? []

  const lifetimeValueCents: number = client.lifetime_value_cents ?? 0
  const totalEvents: number = client.total_events_count ?? events.length
  const avgEventValueCents = totalEvents > 0 ? Math.round(lifetimeValueCents / totalEvents) : 0

  const lastDate: string | null = client.last_event_date ?? null
  const dSince = daysSinceNow(lastDate)

  // Booking frequency: avg days between consecutive events
  let bookingFrequencyDays: number | null = null
  if (events.length >= 2) {
    const dates = events
      .map((e: any) => e.event_date)
      .filter(Boolean)
      .sort()
    if (dates.length >= 2) {
      let totalGap = 0
      for (let i = 1; i < dates.length; i++) {
        totalGap += daysBetween(dates[i - 1], dates[i])
      }
      bookingFrequencyDays = Math.round(totalGap / (dates.length - 1))
    }
  }

  // Avg rating
  let avgRating: number | null = null
  if (reviews.length > 0) {
    const sum = reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0)
    avgRating = Math.round((sum / reviews.length) * 10) / 10
  }

  // Dietary notes: merge restrictions + allergies
  const dietaryNotes: string[] = [
    ...(client.dietary_restrictions ?? []),
    ...(client.allergies ?? []),
  ].filter((d: string) => d && d.trim() !== '')

  return {
    clientId: client.id,
    name: client.full_name,
    lifetimeValueCents,
    totalEvents,
    avgEventValueCents,
    firstEventDate: client.first_event_date ?? null,
    lastEventDate: lastDate,
    daysSinceLastEvent: dSince,
    bookingFrequencyDays,
    communicationCount: comms.length,
    lastCommunicationDate: comms.length > 0 ? comms[0].created_at : null,
    avgRating,
    dietaryNotes,
    preferredServiceStyle: client.preferred_service_style ?? null,
    relationshipHealth: healthLabel(dSince),
    tags: tags.map((t: any) => t.tag),
  }
}

// ---------------------------------------------------------------------------
// 2. getRelationshipHealthScore
// ---------------------------------------------------------------------------

export async function getRelationshipHealthScore(
  clientId: string
): Promise<RelationshipHealthFactors | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch client basics + median LTV across all clients for this chef
  const [clientRes, medianRes, reviewsRes] = await Promise.all([
    db
      .from('clients')
      .select('id, lifetime_value_cents, total_events_count, first_event_date, last_event_date')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .is('deleted_at' as any, null)
      .single(),
    db
      .from('clients')
      .select('lifetime_value_cents')
      .eq('tenant_id', tenantId)
      .is('deleted_at' as any, null)
      .gt('lifetime_value_cents', 0),
    db.from('client_reviews').select('rating').eq('tenant_id', tenantId).eq('client_id', clientId),
  ])

  const client = clientRes.data
  if (!client) return null

  // Compute median LTV
  const ltvValues: number[] = (medianRes.data ?? [])
    .map((c: any) => c.lifetime_value_cents)
    .filter((v: number) => v > 0)
    .sort((a: number, b: number) => a - b)
  const medianLtv = ltvValues.length > 0 ? ltvValues[Math.floor(ltvValues.length / 2)] : 0

  const dSince = daysSinceNow(client.last_event_date)

  // Frequency: avg days between events
  let freqDays: number | null = null
  const totalEvents: number = client.total_events_count ?? 0
  if (totalEvents >= 2 && client.first_event_date && client.last_event_date) {
    const span = daysBetween(client.first_event_date, client.last_event_date)
    freqDays = span > 0 ? Math.round(span / (totalEvents - 1)) : null
  }

  // Avg rating
  const reviews: any[] = reviewsRes.data ?? []
  let avgRating: number | null = null
  if (reviews.length > 0) {
    const sum = reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0)
    avgRating = sum / reviews.length
  }

  return computeHealthFactors(
    dSince,
    freqDays,
    client.lifetime_value_cents ?? 0,
    medianLtv,
    avgRating
  )
}

// ---------------------------------------------------------------------------
// 3. getClientPortfolio
// ---------------------------------------------------------------------------

export async function getClientPortfolio(
  sortBy: 'value' | 'recency' | 'health' = 'value',
  limit: number = 50
): Promise<ClientRelationshipProfile[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Sort mapping to DB columns
  const orderCol = sortBy === 'recency' ? 'last_event_date' : 'lifetime_value_cents'

  const { data: rawClients } = await db
    .from('clients')
    .select(
      'id, full_name, lifetime_value_cents, total_events_count, first_event_date, last_event_date, dietary_restrictions, allergies, preferred_service_style'
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .order(orderCol, { ascending: false })
    .limit(limit)

  if (!rawClients || rawClients.length === 0) return []

  const clientIds: string[] = rawClients.map((c: any) => c.id)

  // Batch fetch tags and comms counts
  const [tagsRes, commsRes, reviewsRes] = await Promise.all([
    db
      .from('client_tags')
      .select('client_id, tag')
      .eq('tenant_id', tenantId)
      .in('client_id', clientIds),
    db
      .from('communication_log')
      .select('client_id, created_at')
      .eq('tenant_id', tenantId)
      .in('client_id', clientIds)
      .order('created_at', { ascending: false }),
    db
      .from('client_reviews')
      .select('client_id, rating')
      .eq('tenant_id', tenantId)
      .in('client_id', clientIds),
  ])

  // Index tags by client
  const tagsByClient: Record<string, string[]> = {}
  for (const t of (tagsRes.data ?? []) as any[]) {
    if (!tagsByClient[t.client_id]) tagsByClient[t.client_id] = []
    tagsByClient[t.client_id].push(t.tag)
  }

  // Index comms: count + last date per client
  const commsByClient: Record<string, { count: number; last: string | null }> = {}
  for (const c of (commsRes.data ?? []) as any[]) {
    if (!commsByClient[c.client_id]) {
      commsByClient[c.client_id] = { count: 0, last: c.created_at }
    }
    commsByClient[c.client_id].count++
  }

  // Index reviews: avg per client
  const reviewsByClient: Record<string, number[]> = {}
  for (const r of (reviewsRes.data ?? []) as any[]) {
    if (!reviewsByClient[r.client_id]) reviewsByClient[r.client_id] = []
    reviewsByClient[r.client_id].push(r.rating)
  }

  const profiles: ClientRelationshipProfile[] = rawClients.map((c: any) => {
    const ltv: number = c.lifetime_value_cents ?? 0
    const total: number = c.total_events_count ?? 0
    const dSince = daysSinceNow(c.last_event_date)
    const ratings = reviewsByClient[c.id] ?? []
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((s: number, v: number) => s + v, 0) / ratings.length) * 10) /
          10
        : null

    const dietary: string[] = [...(c.dietary_restrictions ?? []), ...(c.allergies ?? [])].filter(
      (d: string) => d && d.trim() !== ''
    )

    const comm = commsByClient[c.id]

    return {
      clientId: c.id,
      name: c.full_name,
      lifetimeValueCents: ltv,
      totalEvents: total,
      avgEventValueCents: total > 0 ? Math.round(ltv / total) : 0,
      firstEventDate: c.first_event_date ?? null,
      lastEventDate: c.last_event_date ?? null,
      daysSinceLastEvent: dSince,
      bookingFrequencyDays: null, // skip per-client event query for portfolio
      communicationCount: comm?.count ?? 0,
      lastCommunicationDate: comm?.last ?? null,
      avgRating,
      dietaryNotes: dietary,
      preferredServiceStyle: c.preferred_service_style ?? null,
      relationshipHealth: healthLabel(dSince),
      tags: tagsByClient[c.id] ?? [],
    }
  })

  // If sorting by health, re-sort by health tier priority
  if (sortBy === 'health') {
    const tierOrder: Record<string, number> = {
      thriving: 0,
      stable: 1,
      cooling: 2,
      at_risk: 3,
      dormant: 4,
    }
    profiles.sort(
      (a, b) => (tierOrder[a.relationshipHealth] ?? 5) - (tierOrder[b.relationshipHealth] ?? 5)
    )
  }

  return profiles
}

// ---------------------------------------------------------------------------
// 4. getAtRiskClients
// ---------------------------------------------------------------------------

export async function getAtRiskClients(limit: number = 25): Promise<ClientRelationshipProfile[]> {
  const portfolio = await getClientPortfolio('recency', 200)
  const atRisk = portfolio.filter(
    (c) =>
      c.relationshipHealth === 'cooling' ||
      c.relationshipHealth === 'at_risk' ||
      c.relationshipHealth === 'dormant'
  )

  // Sort: at_risk first, then cooling, then dormant
  const tierPriority: Record<string, number> = {
    at_risk: 0,
    cooling: 1,
    dormant: 2,
  }
  atRisk.sort(
    (a, b) => (tierPriority[a.relationshipHealth] ?? 3) - (tierPriority[b.relationshipHealth] ?? 3)
  )

  return atRisk.slice(0, limit)
}

// ---------------------------------------------------------------------------
// 5. getClientBookingPatterns
// ---------------------------------------------------------------------------

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function getClientBookingPatterns(
  clientId: string
): Promise<ClientBookingPatterns | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const [clientRes, eventsRes] = await Promise.all([
    db
      .from('clients')
      .select('id, preferred_service_style')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .is('deleted_at' as any, null)
      .single(),
    db
      .from('events')
      .select('id, event_date, created_at, guest_count, service_style')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('event_date', { ascending: true }),
  ])

  if (!clientRes.data) return null

  const events: any[] = eventsRes.data ?? []
  if (events.length === 0) {
    return {
      clientId,
      totalEvents: 0,
      avgLeadTimeDays: null,
      preferredDaysOfWeek: [],
      preferredMonths: [],
      avgGuestCount: null,
      preferredServiceStyle: clientRes.data.preferred_service_style ?? null,
      seasonalBreakdown: {},
    }
  }

  // Lead time: days between created_at and event_date
  const leadTimes: number[] = []
  for (const e of events) {
    if (e.created_at && e.event_date) {
      const lead = daysBetween(e.created_at, new Date(e.event_date).toISOString())
      if (lead >= 0) leadTimes.push(lead)
    }
  }
  const avgLeadTimeDays =
    leadTimes.length > 0
      ? Math.round(leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length)
      : null

  // Day of week frequency
  const dayFreq: Record<string, number> = {}
  const monthFreq: Record<number, number> = {}
  const seasonFreq: Record<string, number> = {
    spring: 0,
    summer: 0,
    fall: 0,
    winter: 0,
  }

  for (const e of events) {
    if (!e.event_date) continue
    const d = new Date(e.event_date)
    const dayName = DAY_NAMES[d.getUTCDay()]
    dayFreq[dayName] = (dayFreq[dayName] ?? 0) + 1
    const month = d.getUTCMonth() + 1
    monthFreq[month] = (monthFreq[month] ?? 0) + 1

    if (month >= 3 && month <= 5) seasonFreq.spring++
    else if (month >= 6 && month <= 8) seasonFreq.summer++
    else if (month >= 9 && month <= 11) seasonFreq.fall++
    else seasonFreq.winter++
  }

  // Top days
  const preferredDays = Object.entries(dayFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day]) => day)

  // Top months
  const preferredMonths = Object.entries(monthFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => Number(m))

  // Avg guest count
  const guestCounts = events
    .map((e: any) => e.guest_count)
    .filter((g: number | null) => g !== null && g > 0)
  const avgGuestCount =
    guestCounts.length > 0
      ? Math.round(guestCounts.reduce((s: number, v: number) => s + v, 0) / guestCounts.length)
      : null

  return {
    clientId,
    totalEvents: events.length,
    avgLeadTimeDays,
    preferredDaysOfWeek: preferredDays,
    preferredMonths,
    avgGuestCount,
    preferredServiceStyle: clientRes.data.preferred_service_style ?? null,
    seasonalBreakdown: seasonFreq,
  }
}
