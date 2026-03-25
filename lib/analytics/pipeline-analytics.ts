'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InquiryFunnelStats {
  totalInquiries: number
  quotedCount: number
  confirmedCount: number
  completedCount: number
  declinedCount: number
  expiredCount: number
  quoteRate: number // inquiries -> quoted %
  confirmRate: number // quoted -> confirmed %
  completionRate: number // confirmed -> completed %
  overallConversionRate: number // inquiries -> completed %
}

export interface QuoteAcceptanceStats {
  totalSent: number
  accepted: number
  rejected: number
  expired: number
  acceptanceRate: number
  rejectionRate: number
  expiryRate: number
  avgValueCents: number // average accepted quote value
}

export interface GhostRateStats {
  totalInquiries: number
  ghosted: number // status = expired
  ghostRate: number
  avgDaysToGhost: number
}

export interface LeadTimeStats {
  avgLeadTimeDays: number // inquiry first_contact_at -> event_date
  avgSalesCycleDays: number // inquiry created -> quote accepted
  buckets: {
    under2weeks: number
    twoTo4weeks: number
    oneToThreeMonths: number
    over3months: number
  }
  bucketPercents: {
    under2weeks: number
    twoTo4weeks: number
    oneToThreeMonths: number
    over3months: number
  }
}

export interface DeclineReasonStats {
  reasons: Array<{
    reason: string
    count: number
    percent: number
  }>
  totalDeclined: number
}

export interface NegotiationStats {
  totalQuotes: number
  negotiatedCount: number
  negotiationRate: number
  avgOriginalCents: number
  avgFinalCents: number
  avgDiscountPercent: number
  avgDiscountCents: number
}

export interface ResponseTimeStats {
  avgHoursToFirstResponse: number
  under1hour: number
  under4hours: number
  under24hours: number
  over24hours: number
  under1hourPercent: number
  under4hoursPercent: number
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function getInquiryFunnelStats(): Promise<InquiryFunnelStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('inquiries')
    .select('status, converted_to_event_id')
    .eq('tenant_id', chef.tenantId!)

  const inquiries = data ?? []
  const total = inquiries.length
  const quotedCount = inquiries.filter((i: any) =>
    ['quoted', 'confirmed', 'declined', 'expired'].includes(i.status)
  ).length
  const confirmedCount = inquiries.filter((i: any) => i.status === 'confirmed').length
  const declinedCount = inquiries.filter((i: any) => i.status === 'declined').length
  const expiredCount = inquiries.filter((i: any) => i.status === 'expired').length

  // Count completed events linked to inquiries
  const { count: completedFromInquiries } = await db
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', chef.tenantId!)
    .not('converted_to_event_id', 'is', null)

  return {
    totalInquiries: total,
    quotedCount,
    confirmedCount,
    completedCount: completedFromInquiries ?? 0,
    declinedCount,
    expiredCount,
    quoteRate: pct(quotedCount, total),
    confirmRate: pct(confirmedCount, quotedCount),
    completionRate: pct(completedFromInquiries ?? 0, confirmedCount),
    overallConversionRate: pct(completedFromInquiries ?? 0, total),
  }
}

export async function getQuoteAcceptanceStats(): Promise<QuoteAcceptanceStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('quotes')
    .select('status, total_quoted_cents')
    .eq('tenant_id', chef.tenantId!)
    .in('status', ['sent', 'accepted', 'rejected', 'expired'])

  const quotes = data ?? []
  const sent = quotes.length
  const accepted = quotes.filter((q: any) => q.status === 'accepted')
  const rejected = quotes.filter((q: any) => q.status === 'rejected').length
  const expired = quotes.filter((q: any) => q.status === 'expired').length
  const acceptedCount = accepted.length

  const avgValue =
    acceptedCount > 0
      ? Math.round(
          accepted.reduce((s: any, q: any) => s + (q.total_quoted_cents ?? 0), 0) / acceptedCount
        )
      : 0

  return {
    totalSent: sent,
    accepted: acceptedCount,
    rejected,
    expired,
    acceptanceRate: pct(acceptedCount, sent),
    rejectionRate: pct(rejected, sent),
    expiryRate: pct(expired, sent),
    avgValueCents: avgValue,
  }
}

// DEFERRED: getGhostRateStats requires inquiries.ghost_at column (not yet in schema).
// Returns safe defaults until the column migration is applied.
export async function getGhostRateStats(): Promise<GhostRateStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // We can still count expired inquiries (ghosted) even without ghost_at
  const { data } = await db
    .from('inquiries')
    .select('status, created_at')
    .eq('tenant_id', chef.tenantId!)

  const all = data ?? []
  const ghosted = all.filter((i: any) => i.status === 'expired')

  return {
    totalInquiries: all.length,
    ghosted: ghosted.length,
    ghostRate: pct(ghosted.length, all.length),
    avgDaysToGhost: 0, // DEFERRED: needs inquiries.ghost_at column
  }
}

// DEFERRED: getLeadTimeStats partially requires events.inquiry_received_at column (not yet in schema).
// Lead time calculation is deferred; sales cycle from quotes still works.
export async function getLeadTimeStats(): Promise<LeadTimeStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const emptyBuckets = { under2weeks: 0, twoTo4weeks: 0, oneToThreeMonths: 0, over3months: 0 }

  // Sales cycle: inquiry created -> quote accepted (this part works)
  const { data: quotes } = await db
    .from('quotes')
    .select('created_at, accepted_at')
    .eq('tenant_id', chef.tenantId!)
    .eq('status', 'accepted')
    .not('accepted_at', 'is', null)

  const cycleDays = (quotes ?? [])
    .map((q: any) => daysBetween(q.created_at, q.accepted_at))
    .filter((d: any): d is number => d !== null && d >= 0)

  const avgCycle =
    cycleDays.length > 0
      ? Math.round(cycleDays.reduce((a: any, b: any) => a + b, 0) / cycleDays.length)
      : 0

  return {
    avgLeadTimeDays: 0, // DEFERRED: needs events.inquiry_received_at column
    avgSalesCycleDays: avgCycle,
    buckets: emptyBuckets,
    bucketPercents: emptyBuckets,
  }
}

// DEFERRED: getDeclineReasonStats requires inquiries.decline_reason column (not yet in schema).
// Returns empty data until the column migration is applied.
export async function getDeclineReasonStats(): Promise<DeclineReasonStats> {
  await requireChef() // still enforce auth
  return { reasons: [], totalDeclined: 0 }
}

// DEFERRED: getNegotiationStats requires quotes.negotiation_occurred and quotes.original_quoted_cents
// columns (not yet in schema). Returns empty data until the column migration is applied.
export async function getNegotiationStats(): Promise<NegotiationStats> {
  await requireChef() // still enforce auth
  return {
    totalQuotes: 0,
    negotiatedCount: 0,
    negotiationRate: 0,
    avgOriginalCents: 0,
    avgFinalCents: 0,
    avgDiscountPercent: 0,
    avgDiscountCents: 0,
  }
}

export async function getAvgInquiryResponseTime(): Promise<ResponseTimeStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Find first outbound message per inquiry
  const { data: inquiries } = await db
    .from('inquiries')
    .select('id, created_at')
    .eq('tenant_id', chef.tenantId!)

  if (!inquiries?.length) {
    return {
      avgHoursToFirstResponse: 0,
      under1hour: 0,
      under4hours: 0,
      under24hours: 0,
      over24hours: 0,
      under1hourPercent: 0,
      under4hoursPercent: 0,
    }
  }

  const inquiryIds = inquiries.map((i: any) => i.id)
  const { data: messages } = await db
    .from('messages')
    .select('inquiry_id, created_at')
    .in('inquiry_id', inquiryIds)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: true })

  // First response per inquiry
  const firstResponse = new Map<string, string>()
  for (const m of messages ?? []) {
    if (m.inquiry_id && !firstResponse.has(m.inquiry_id)) {
      firstResponse.set(m.inquiry_id, m.created_at)
    }
  }

  const responseTimes: number[] = []
  for (const inq of inquiries) {
    const first = firstResponse.get(inq.id)
    if (first) {
      const hours =
        (new Date(first).getTime() - new Date(inq.created_at).getTime()) / (1000 * 60 * 60)
      if (hours >= 0) responseTimes.push(hours)
    }
  }

  const total = responseTimes.length
  const avgHours =
    total > 0 ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / total) * 10) / 10 : 0
  const under1h = responseTimes.filter((h: any) => h < 1).length
  const under4h = responseTimes.filter((h: any) => h < 4).length
  const under24h = responseTimes.filter((h: any) => h < 24).length
  const over24h = responseTimes.filter((h: any) => h >= 24).length

  return {
    avgHoursToFirstResponse: avgHours,
    under1hour: under1h,
    under4hours: under4h,
    under24hours: under24h,
    over24hours: over24h,
    under1hourPercent: pct(under1h, total),
    under4hoursPercent: pct(under4h, total),
  }
}
