'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UntappedOccasion {
  occasion: string
  inquiryCount: number
  conversionRate: number
  avgQuoteCents: number
  avgGuestCount: number
  status: 'strong' | 'underserved' | 'untapped'
  recommendation: string
}

export interface ServiceStyleGap {
  serviceStyle: string
  eventCount: number
  avgRevenueCents: number
  avgMarginPercent: number
  hasRecentEvent: boolean
  opportunity: string | null
}

export interface GuestCountOpportunity {
  bracket: string
  eventCount: number
  avgRevenueCents: number
  avgMarginPercent: number
  inquiryCount: number
  conversionRate: number
  recommendation: string | null
}

export interface UntappedMarketsResult {
  occasions: UntappedOccasion[]
  serviceStyles: ServiceStyleGap[]
  guestBrackets: GuestCountOpportunity[]
  topUntappedOccasion: string | null
  bestConvertingOccasion: string | null
  highestValueBracket: string | null
  totalInquiryOccasions: number
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getUntappedMarkets(): Promise<UntappedMarketsResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch all inquiries with occasion data
  const { data: inquiries, error: iqErr } = await db
    .from('inquiries')
    .select('id, status, occasion, guest_count, converted_to_event_id')
    .eq('tenant_id', tenantId)

  if (iqErr || !inquiries || inquiries.length < 3) return null

  // Fetch completed events
  const { data: events, error: evErr } = await db
    .from('events')
    .select('id, occasion, service_style, guest_count, quoted_price_cents, status, event_date')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'in_progress', 'paid', 'accepted'])

  if (evErr) return null

  // Fetch expenses for margin calculation
  const completedIds = (events || [])
    .filter((e: any) => e.status === 'completed')
    .map((e: any) => e.id)
  const { data: expenses } =
    completedIds.length > 0
      ? await db.from('expenses').select('event_id, amount_cents').in('event_id', completedIds)
      : { data: [] }

  const expenseByEvent = new Map<string, number>()
  for (const exp of expenses || []) {
    expenseByEvent.set(
      exp.event_id,
      (expenseByEvent.get(exp.event_id) || 0) + (exp.amount_cents || 0)
    )
  }

  const _n = new Date()
  const _3ma = new Date(_n.getFullYear(), _n.getMonth() - 3, _n.getDate())
  const threeMonthsAgo = `${_3ma.getFullYear()}-${String(_3ma.getMonth() + 1).padStart(2, '0')}-${String(_3ma.getDate()).padStart(2, '0')}`

  // ─── Occasion Analysis ───

  const occasionInquiries = new Map<
    string,
    { total: number; converted: number; quoteCents: number[]; guests: number[] }
  >()
  for (const inq of inquiries) {
    const occ = inq.occasion || 'unspecified'
    if (!occasionInquiries.has(occ))
      occasionInquiries.set(occ, { total: 0, converted: 0, quoteCents: [], guests: [] })
    const o = occasionInquiries.get(occ)!
    o.total++
    if (inq.converted_to_event_id) o.converted++
    if (inq.guest_count) o.guests.push(inq.guest_count)
  }

  // Enrich with event data
  const occasionEvents = new Map<string, number>()
  for (const ev of events || []) {
    const occ = ev.occasion || 'unspecified'
    occasionEvents.set(occ, (occasionEvents.get(occ) || 0) + 1)
  }

  // Fetch quotes for avg pricing
  const { data: quotes } = await db
    .from('quotes')
    .select('id, total_quoted_cents, inquiry_id')
    .eq('tenant_id', tenantId)
    .not('total_quoted_cents', 'is', null)

  const quoteByInquiry = new Map<string, number>()
  for (const q of quotes || []) {
    if (q.inquiry_id && q.total_quoted_cents) quoteByInquiry.set(q.inquiry_id, q.total_quoted_cents)
  }

  // Map quotes back to occasions
  for (const inq of inquiries) {
    const occ = inq.occasion || 'unspecified'
    const quoteCents = quoteByInquiry.get(inq.id)
    if (quoteCents && occasionInquiries.has(occ)) {
      occasionInquiries.get(occ)!.quoteCents.push(quoteCents)
    }
  }

  const occasions: UntappedOccasion[] = Array.from(occasionInquiries.entries())
    .filter(([, o]) => o.total >= 2)
    .map(([occasion, o]) => {
      const conversionRate = Math.round((o.converted / o.total) * 100)
      const avgQuote =
        o.quoteCents.length > 0
          ? Math.round(o.quoteCents.reduce((s, c) => s + c, 0) / o.quoteCents.length)
          : 0
      const avgGuests =
        o.guests.length > 0 ? Math.round(o.guests.reduce((s, g) => s + g, 0) / o.guests.length) : 0
      const eventCount = occasionEvents.get(occasion) || 0

      let status: UntappedOccasion['status'] = 'strong'
      let recommendation = ''

      if (eventCount === 0 && o.total >= 3) {
        status = 'untapped'
        recommendation = `${o.total} inquiries for ${occasion} but zero events. High-potential market to target.`
      } else if (conversionRate < 30 && o.total >= 3) {
        status = 'underserved'
        recommendation = `Only ${conversionRate}% conversion on ${occasion}. Review pricing or response time.`
      } else if (conversionRate >= 60) {
        recommendation = `Strong performer at ${conversionRate}% conversion. Consider marketing more.`
      } else {
        recommendation = `${conversionRate}% conversion - room for improvement.`
      }

      return {
        occasion,
        inquiryCount: o.total,
        conversionRate,
        avgQuoteCents: avgQuote,
        avgGuestCount: avgGuests,
        status,
        recommendation,
      }
    })
    .sort((a, b) => {
      const statusOrder = { untapped: 0, underserved: 1, strong: 2 }
      return statusOrder[a.status] - statusOrder[b.status] || b.inquiryCount - a.inquiryCount
    })

  // ─── Service Style Analysis ───

  const styleMap = new Map<
    string,
    { count: number; revenueCents: number; profitCents: number; lastDate: string }
  >()
  for (const ev of (events || []).filter((e: any) => e.service_style && e.quoted_price_cents)) {
    const style = ev.service_style
    if (!styleMap.has(style))
      styleMap.set(style, { count: 0, revenueCents: 0, profitCents: 0, lastDate: '' })
    const s = styleMap.get(style)!
    s.count++
    s.revenueCents += ev.quoted_price_cents || 0
    const expense = expenseByEvent.get(ev.id) || 0
    s.profitCents += (ev.quoted_price_cents || 0) - expense
    if (ev.event_date > s.lastDate) s.lastDate = ev.event_date
  }

  const serviceStyles: ServiceStyleGap[] = Array.from(styleMap.entries())
    .map(([serviceStyle, s]) => {
      const avgRevenue = Math.round(s.revenueCents / s.count)
      const avgMargin =
        s.revenueCents > 0 ? Math.round((s.profitCents / s.revenueCents) * 1000) / 10 : 0
      const hasRecent = s.lastDate >= threeMonthsAgo

      let opportunity: string | null = null
      if (!hasRecent && s.count >= 3) {
        opportunity = `No ${serviceStyle} events in 3 months despite ${s.count} historical. Re-activate?`
      } else if (avgMargin > 60 && s.count < 5) {
        opportunity = `${serviceStyle} has ${avgMargin}% margin but only ${s.count} events. Scale up.`
      }

      return {
        serviceStyle,
        eventCount: s.count,
        avgRevenueCents: avgRevenue,
        avgMarginPercent: avgMargin,
        hasRecentEvent: hasRecent,
        opportunity,
      }
    })
    .sort((a, b) => b.avgRevenueCents - a.avgRevenueCents)

  // ─── Guest Count Bracket Analysis ───

  const brackets = [
    { label: '1-4 intimate', min: 1, max: 4 },
    { label: '5-8 small', min: 5, max: 8 },
    { label: '9-15 medium', min: 9, max: 15 },
    { label: '16-30 large', min: 16, max: 30 },
    { label: '31+ enterprise', min: 31, max: 9999 },
  ]

  const guestBrackets: GuestCountOpportunity[] = brackets
    .map((b) => {
      const bracketEvents = (events || []).filter(
        (e: any) =>
          (e.guest_count || 0) >= b.min && (e.guest_count || 0) <= b.max && e.quoted_price_cents
      )
      const bracketInquiries = inquiries.filter(
        (i: any) => (i.guest_count || 0) >= b.min && (i.guest_count || 0) <= b.max
      )
      const converted = bracketInquiries.filter((i: any) => i.converted_to_event_id).length
      const conversionRate =
        bracketInquiries.length > 0 ? Math.round((converted / bracketInquiries.length) * 100) : 0

      const totalRevenue = bracketEvents.reduce(
        (s: number, e: any) => s + (e.quoted_price_cents || 0),
        0
      )
      const avgRevenue =
        bracketEvents.length > 0 ? Math.round(totalRevenue / bracketEvents.length) : 0

      const totalProfit = bracketEvents.reduce((s: number, e: any) => {
        const expense = expenseByEvent.get(e.id) || 0
        return s + ((e.quoted_price_cents || 0) - expense)
      }, 0)
      const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0

      let recommendation: string | null = null
      if (bracketInquiries.length >= 3 && bracketEvents.length === 0) {
        recommendation = `${bracketInquiries.length} inquiries but zero events. Untapped bracket.`
      } else if (conversionRate < 25 && bracketInquiries.length >= 3) {
        recommendation = `Low ${conversionRate}% conversion. Review pricing for this group size.`
      } else if (avgMargin > 50 && bracketEvents.length >= 3) {
        recommendation = `High-margin bracket (${avgMargin}%). Prioritize these bookings.`
      }

      return {
        bracket: b.label,
        eventCount: bracketEvents.length,
        avgRevenueCents: avgRevenue,
        avgMarginPercent: avgMargin,
        inquiryCount: bracketInquiries.length,
        conversionRate,
        recommendation,
      }
    })
    .filter((b) => b.eventCount > 0 || b.inquiryCount > 0)

  // Summary
  const untapped = occasions.filter((o) => o.status === 'untapped')
  const topUntapped = untapped.length > 0 ? untapped[0].occasion : null
  const bestConverting = [...occasions].sort((a, b) => b.conversionRate - a.conversionRate)
  const bestConvertingOcc = bestConverting.length > 0 ? bestConverting[0].occasion : null
  const highestValue = [...guestBrackets].sort((a, b) => b.avgRevenueCents - a.avgRevenueCents)
  const highestValueBrk = highestValue.length > 0 ? highestValue[0].bracket : null

  return {
    occasions,
    serviceStyles,
    guestBrackets,
    topUntappedOccasion: topUntapped,
    bestConvertingOccasion: bestConvertingOcc,
    highestValueBracket: highestValueBrk,
    totalInquiryOccasions: occasions.length,
  }
}
