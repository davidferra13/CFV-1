// @ts-nocheck
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InquiryFunnelStats {
  totalInquiries: number
  quotedCount: number
  confirmedCount: number
  completedCount: number
  declinedCount: number
  expiredCount: number
  quoteRate: number // inquiries → quoted %
  confirmRate: number // quoted → confirmed %
  completionRate: number // confirmed → completed %
  overallConversionRate: number // inquiries → completed %
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
  avgLeadTimeDays: number // inquiry first_contact_at → event_date
  avgSalesCycleDays: number // inquiry created → quote accepted
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
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('inquiries')
    .select('status, converted_to_event_id')
    .eq('tenant_id', chef.id)

  const inquiries = data ?? []
  const total = inquiries.length
  const quotedCount = inquiries.filter((i) =>
    ['quoted', 'confirmed', 'declined', 'expired'].includes(i.status)
  ).length
  const confirmedCount = inquiries.filter((i) => i.status === 'confirmed').length
  const completedCount = inquiries.filter((i) => i.converted_to_event_id != null).length
  const declinedCount = inquiries.filter((i) => i.status === 'declined').length
  const expiredCount = inquiries.filter((i) => i.status === 'expired').length

  // Count completed events linked to inquiries
  const { count: completedFromInquiries } = await supabase
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', chef.id)
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
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('quotes')
    .select('status, total_quoted_cents')
    .eq('tenant_id', chef.id)
    .in('status', ['sent', 'accepted', 'rejected', 'expired'])

  const quotes = data ?? []
  const sent = quotes.length
  const accepted = quotes.filter((q) => q.status === 'accepted')
  const rejected = quotes.filter((q) => q.status === 'rejected').length
  const expired = quotes.filter((q) => q.status === 'expired').length
  const acceptedCount = accepted.length

  const avgValue =
    acceptedCount > 0
      ? Math.round(accepted.reduce((s, q) => s + (q.total_quoted_cents ?? 0), 0) / acceptedCount)
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

export async function getGhostRateStats(): Promise<GhostRateStats> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('inquiries')
    .select('status, ghost_at, created_at')
    .eq('tenant_id', chef.id)

  const all = data ?? []
  const ghosted = all.filter((i) => i.status === 'expired')

  const ghostDays = ghosted
    .map((i) => daysBetween(i.created_at, i.ghost_at ?? null))
    .filter((d): d is number => d !== null)

  const avgDays =
    ghostDays.length > 0 ? Math.round(ghostDays.reduce((a, b) => a + b, 0) / ghostDays.length) : 0

  return {
    totalInquiries: all.length,
    ghosted: ghosted.length,
    ghostRate: pct(ghosted.length, all.length),
    avgDaysToGhost: avgDays,
  }
}

export async function getLeadTimeStats(): Promise<LeadTimeStats> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('events')
    .select('inquiry_received_at, event_date')
    .eq('tenant_id', chef.id)
    .not('inquiry_received_at', 'is', null)
    .not('event_date', 'is', null)

  const events = (data ?? []).filter((e) => e.inquiry_received_at && e.event_date)
  const leadDays = events
    .map((e) => daysBetween(e.inquiry_received_at, e.event_date))
    .filter((d): d is number => d !== null && d >= 0)

  const avg =
    leadDays.length > 0 ? Math.round(leadDays.reduce((a, b) => a + b, 0) / leadDays.length) : 0

  const buckets = {
    under2weeks: leadDays.filter((d) => d < 14).length,
    twoTo4weeks: leadDays.filter((d) => d >= 14 && d < 28).length,
    oneToThreeMonths: leadDays.filter((d) => d >= 28 && d < 90).length,
    over3months: leadDays.filter((d) => d >= 90).length,
  }

  const total = leadDays.length

  // Sales cycle: inquiry created → quote accepted
  const { data: quotes } = await supabase
    .from('quotes')
    .select('created_at, accepted_at')
    .eq('tenant_id', chef.id)
    .eq('status', 'accepted')
    .not('accepted_at', 'is', null)

  const cycleDays = (quotes ?? [])
    .map((q) => daysBetween(q.created_at, q.accepted_at))
    .filter((d): d is number => d !== null && d >= 0)

  const avgCycle =
    cycleDays.length > 0 ? Math.round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length) : 0

  return {
    avgLeadTimeDays: avg,
    avgSalesCycleDays: avgCycle,
    buckets,
    bucketPercents: {
      under2weeks: pct(buckets.under2weeks, total),
      twoTo4weeks: pct(buckets.twoTo4weeks, total),
      oneToThreeMonths: pct(buckets.oneToThreeMonths, total),
      over3months: pct(buckets.over3months, total),
    },
  }
}

export async function getDeclineReasonStats(): Promise<DeclineReasonStats> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('inquiries')
    .select('decline_reason')
    .eq('tenant_id', chef.id)
    .not('decline_reason', 'is', null)

  const all = data ?? []
  const counts = new Map<string, number>()
  for (const i of all) {
    if (i.decline_reason) {
      counts.set(i.decline_reason, (counts.get(i.decline_reason) ?? 0) + 1)
    }
  }

  const sorted = Array.from(counts.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([reason, count]) => ({
      reason,
      count,
      percent: pct(count, all.length),
    }))

  return { reasons: sorted, totalDeclined: all.length }
}

export async function getNegotiationStats(): Promise<NegotiationStats> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('quotes')
    .select('total_quoted_cents, original_quoted_cents, negotiation_occurred')
    .eq('tenant_id', chef.id)
    .not('total_quoted_cents', 'is', null)

  const quotes = data ?? []
  const negotiated = quotes.filter((q) => q.negotiation_occurred)

  const discounts = negotiated
    .filter((q) => q.original_quoted_cents && q.total_quoted_cents)
    .map((q) => ({
      original: q.original_quoted_cents!,
      final: q.total_quoted_cents!,
      discountCents: q.original_quoted_cents! - q.total_quoted_cents!,
      discountPct: pct(q.original_quoted_cents! - q.total_quoted_cents!, q.original_quoted_cents!),
    }))

  const avgOriginal =
    discounts.length > 0
      ? Math.round(discounts.reduce((s, d) => s + d.original, 0) / discounts.length)
      : 0
  const avgFinal =
    discounts.length > 0
      ? Math.round(discounts.reduce((s, d) => s + d.final, 0) / discounts.length)
      : 0
  const avgDiscountCents =
    discounts.length > 0
      ? Math.round(discounts.reduce((s, d) => s + d.discountCents, 0) / discounts.length)
      : 0
  const avgDiscountPct =
    discounts.length > 0
      ? Math.round((discounts.reduce((s, d) => s + d.discountPct, 0) / discounts.length) * 10) / 10
      : 0

  return {
    totalQuotes: quotes.length,
    negotiatedCount: negotiated.length,
    negotiationRate: pct(negotiated.length, quotes.length),
    avgOriginalCents: avgOriginal,
    avgFinalCents: avgFinal,
    avgDiscountPercent: avgDiscountPct,
    avgDiscountCents: avgDiscountCents,
  }
}

export async function getAvgInquiryResponseTime(): Promise<ResponseTimeStats> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  // Find first outbound message per inquiry
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, created_at')
    .eq('tenant_id', chef.id)

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

  const inquiryIds = inquiries.map((i) => i.id)
  const { data: messages } = await supabase
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
  const under1h = responseTimes.filter((h) => h < 1).length
  const under4h = responseTimes.filter((h) => h < 4).length
  const under24h = responseTimes.filter((h) => h < 24).length
  const over24h = responseTimes.filter((h) => h >= 24).length

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
