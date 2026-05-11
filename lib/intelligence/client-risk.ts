// Client Risk Radar - proactive churn detection engine
// Analyzes client patterns: contact recency, booking cadence, revenue trends,
// engagement depth, and feedback signals. Produces a ranked risk report.
// Pure computation; no 'use server' - called from server actions.

// ── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RiskFactor {
  type:
    | 'contact_recency'
    | 'booking_overdue'
    | 'declining_spend'
    | 'declining_engagement'
    | 'rejected_quote'
    | 'stale_inquiry'
    | 'long_silence'
    | 'declining_frequency'
  label: string
  description: string
  weight: number // 0-30 contribution to risk score
  severity: 'critical' | 'warning' | 'info'
}

export interface ClientRiskReport {
  clientId: string
  clientName: string
  riskScore: number // 0-100
  riskLevel: RiskLevel
  factors: RiskFactor[]
  lastContact: string | null // ISO date of most recent interaction (any type)
  daysSinceContact: number
  lastEventDate: string | null
  daysSinceLastEvent: number
  expectedNextBooking: string | null // estimated date based on cadence
  totalEvents: number
  totalRevenueCents: number
  avgBookingCadenceDays: number | null
  recommendation: string
  dismissed: boolean
}

export interface ClientRiskSummary {
  totalClients: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  totalRevenueAtRiskCents: number
  topRecommendation: string | null
}

export interface ClientRiskRadarResult {
  reports: ClientRiskReport[]
  summary: ClientRiskSummary
}

// ── Input data shapes (what the server action fetches and passes in) ─────────

export interface ClientData {
  id: string
  fullName: string
  createdAt: string
  vibeNotes: string | null
}

export interface EventData {
  id: string
  clientId: string
  eventDate: string
  status: string
  quotedPriceCents: number | null
  guestCount: number | null
}

export interface TimelineEntry {
  clientId: string
  date: string
  type: string
}

export interface InquiryData {
  id: string
  clientId: string
  status: string
  updatedAt: string
}

export interface QuoteData {
  id: string
  inquiryId: string
  status: string
}

// ── Engine ───────────────────────────────────────────────────────────────────

export function computeClientRiskRadar(
  clients: ClientData[],
  events: EventData[],
  timeline: TimelineEntry[],
  inquiries: InquiryData[],
  quotes: QuoteData[],
  dismissedIds: Set<string>
): ClientRiskRadarResult {
  const now = Date.now()

  // Index events by client
  const clientEvents = new Map<string, EventData[]>()
  for (const ev of events) {
    if (!ev.clientId) continue
    if (!clientEvents.has(ev.clientId)) clientEvents.set(ev.clientId, [])
    clientEvents.get(ev.clientId)!.push(ev)
  }
  // Sort each client's events by date
  for (const [, evts] of clientEvents) {
    evts.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
  }

  // Index timeline entries by client (most recent first)
  const clientTimeline = new Map<string, TimelineEntry[]>()
  for (const entry of timeline) {
    if (!entry.clientId) continue
    if (!clientTimeline.has(entry.clientId)) clientTimeline.set(entry.clientId, [])
    clientTimeline.get(entry.clientId)!.push(entry)
  }
  for (const [, entries] of clientTimeline) {
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // Index inquiries by client
  const clientInquiries = new Map<string, InquiryData[]>()
  for (const inq of inquiries) {
    if (!inq.clientId) continue
    if (!clientInquiries.has(inq.clientId)) clientInquiries.set(inq.clientId, [])
    clientInquiries.get(inq.clientId)!.push(inq)
  }

  // Rejected quotes by inquiry ID
  const rejectedQuoteInquiries = new Set<string>()
  for (const q of quotes) {
    if (q.status === 'rejected' && q.inquiryId) rejectedQuoteInquiries.add(q.inquiryId)
  }

  const reports: ClientRiskReport[] = []

  for (const client of clients) {
    // Skip intentionally inactive
    if (client.vibeNotes?.includes('[INTENTIONALLY_INACTIVE]')) continue

    const evts = clientEvents.get(client.id) || []
    if (evts.length === 0) continue // prospects, not churn candidates

    const tl = clientTimeline.get(client.id) || []
    const inqs = clientInquiries.get(client.id) || []

    const factors: RiskFactor[] = []
    let riskScore = 0

    // ── Factor 1: Contact recency ────────────────────────────────────────
    const lastContactEntry = tl[0]
    const lastContactDate = lastContactEntry?.date ?? null
    const daysSinceContact = lastContactDate
      ? Math.floor((now - new Date(lastContactDate).getTime()) / 86400000)
      : 999

    if (daysSinceContact > 90) {
      const weight = daysSinceContact > 180 ? 25 : 15
      riskScore += weight
      factors.push({
        type: 'contact_recency',
        label: 'No recent contact',
        description:
          daysSinceContact >= 999
            ? 'No recorded interactions found'
            : `${daysSinceContact} days since last contact of any kind`,
        weight,
        severity: daysSinceContact > 180 ? 'critical' : 'warning',
      })
    } else if (daysSinceContact > 45) {
      riskScore += 8
      factors.push({
        type: 'contact_recency',
        label: 'Contact gap growing',
        description: `${daysSinceContact} days since last contact`,
        weight: 8,
        severity: 'info',
      })
    }

    // ── Factor 2: Booking cadence (overdue) ──────────────────────────────
    const lastEvent = evts[evts.length - 1]
    const daysSinceLastEvent = Math.floor(
      (now - new Date(lastEvent.eventDate).getTime()) / 86400000
    )
    let avgCadenceDays: number | null = null
    let expectedNext: string | null = null

    if (evts.length >= 2) {
      const gaps: number[] = []
      for (let i = 1; i < evts.length; i++) {
        const gap =
          (new Date(evts[i].eventDate).getTime() - new Date(evts[i - 1].eventDate).getTime()) /
          86400000
        if (gap > 0) gaps.push(gap)
      }
      if (gaps.length > 0) {
        avgCadenceDays = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length)
        const expectedMs = new Date(lastEvent.eventDate).getTime() + avgCadenceDays * 86400000
        expectedNext = new Date(expectedMs).toISOString().slice(0, 10)

        if (daysSinceLastEvent > avgCadenceDays * 2) {
          riskScore += 25
          factors.push({
            type: 'booking_overdue',
            label: 'Significantly overdue',
            description: `${daysSinceLastEvent} days since last event (avg cadence: every ${avgCadenceDays} days)`,
            weight: 25,
            severity: 'critical',
          })
        } else if (daysSinceLastEvent > avgCadenceDays * 1.5) {
          riskScore += 12
          factors.push({
            type: 'booking_overdue',
            label: 'Approaching overdue',
            description: `${daysSinceLastEvent} days since last event, typically books every ${avgCadenceDays} days`,
            weight: 12,
            severity: 'warning',
          })
        }
      }
    }

    // ── Factor 3: Long absolute silence ──────────────────────────────────
    if (daysSinceLastEvent > 180) {
      const weight = daysSinceLastEvent > 365 ? 20 : 10
      riskScore += weight
      factors.push({
        type: 'long_silence',
        label: daysSinceLastEvent > 365 ? 'Dormant client' : 'Extended silence',
        description: `No events in ${Math.round(daysSinceLastEvent / 30)} months`,
        weight,
        severity: daysSinceLastEvent > 365 ? 'critical' : 'warning',
      })
    }

    // ── Factor 4: Declining spend ────────────────────────────────────────
    if (evts.length >= 4) {
      const halfIdx = Math.floor(evts.length / 2)
      const firstHalfAvg =
        evts.slice(0, halfIdx).reduce((s, e) => s + (e.quotedPriceCents || 0), 0) / halfIdx
      const secondHalfAvg =
        evts.slice(halfIdx).reduce((s, e) => s + (e.quotedPriceCents || 0), 0) /
        (evts.length - halfIdx)
      if (firstHalfAvg > 0 && secondHalfAvg < firstHalfAvg * 0.7) {
        const pctDrop = Math.round(((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100)
        riskScore += 15
        factors.push({
          type: 'declining_spend',
          label: 'Spending is declining',
          description: `Average spend down ${pctDrop}% compared to earlier bookings`,
          weight: 15,
          severity: 'warning',
        })
      }
    }

    // ── Factor 5: Declining frequency ────────────────────────────────────
    if (evts.length >= 4) {
      const halfIdx = Math.floor(evts.length / 2)
      const firstSpan =
        (new Date(evts[halfIdx - 1].eventDate).getTime() -
          new Date(evts[0].eventDate).getTime()) /
        86400000
      const secondSpan =
        (new Date(evts[evts.length - 1].eventDate).getTime() -
          new Date(evts[halfIdx].eventDate).getTime()) /
        86400000
      const firstFreq = halfIdx / Math.max(firstSpan, 1)
      const secondFreq = (evts.length - halfIdx) / Math.max(secondSpan, 1)
      if (firstFreq > 0 && secondFreq < firstFreq * 0.6) {
        riskScore += 12
        factors.push({
          type: 'declining_frequency',
          label: 'Booking less often',
          description: 'Booking frequency has significantly slowed over time',
          weight: 12,
          severity: 'warning',
        })
      }
    }

    // ── Factor 6: Declining engagement (guest count) ─────────────────────
    const evtsWithGuests = evts.filter((e) => e.guestCount && e.guestCount > 0)
    if (evtsWithGuests.length >= 4) {
      const halfIdx = Math.floor(evtsWithGuests.length / 2)
      const firstHalfAvg =
        evtsWithGuests.slice(0, halfIdx).reduce((s, e) => s + (e.guestCount || 0), 0) / halfIdx
      const secondHalfAvg =
        evtsWithGuests.slice(halfIdx).reduce((s, e) => s + (e.guestCount || 0), 0) /
        (evtsWithGuests.length - halfIdx)
      if (firstHalfAvg > 0 && secondHalfAvg < firstHalfAvg * 0.6) {
        riskScore += 8
        factors.push({
          type: 'declining_engagement',
          label: 'Smaller events',
          description: 'Guest counts declining over recent bookings',
          weight: 8,
          severity: 'info',
        })
      }
    }

    // ── Factor 7: Rejected quote ─────────────────────────────────────────
    const recentRejections = inqs.filter(
      (inq) =>
        rejectedQuoteInquiries.has(inq.id) &&
        now - new Date(inq.updatedAt).getTime() < 180 * 86400000
    )
    if (recentRejections.length > 0) {
      riskScore += 18
      factors.push({
        type: 'rejected_quote',
        label: 'Rejected recent quote',
        description: `${recentRejections.length} rejected quote(s) in last 6 months`,
        weight: 18,
        severity: 'warning',
      })
    }

    // ── Factor 8: Stale inquiry ──────────────────────────────────────────
    const staleInqs = inqs.filter(
      (inq) =>
        ['new', 'awaiting_client', 'quoted'].includes(inq.status) &&
        now - new Date(inq.updatedAt).getTime() > 14 * 86400000
    )
    if (staleInqs.length > 0) {
      riskScore += 8
      factors.push({
        type: 'stale_inquiry',
        label: 'Stale inquiry',
        description: `${staleInqs.length} open inquiry/inquiries with no recent activity`,
        weight: 8,
        severity: 'info',
      })
    }

    // ── Finalize ─────────────────────────────────────────────────────────
    riskScore = Math.min(100, riskScore)
    if (factors.length === 0) continue

    const riskLevel: RiskLevel =
      riskScore >= 60 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low'

    const totalRevenue = evts.reduce((s, e) => s + (e.quotedPriceCents || 0), 0)

    // Recommendation
    let recommendation = 'Monitor for changes'
    if (riskLevel === 'critical') {
      recommendation = factors.some((f) => f.type === 'rejected_quote')
        ? 'Send a personalized offer or adjusted pricing to re-engage'
        : 'Reach out personally to check in about upcoming plans'
    } else if (riskLevel === 'high') {
      recommendation = 'Send a check-in message with seasonal menu ideas'
    } else if (riskLevel === 'medium') {
      recommendation = 'Include in your next outreach or newsletter'
    }

    // Sort factors by weight descending
    factors.sort((a, b) => b.weight - a.weight)

    reports.push({
      clientId: client.id,
      clientName: client.fullName || 'Unknown',
      riskScore,
      riskLevel,
      factors,
      lastContact: lastContactDate,
      daysSinceContact,
      lastEventDate: lastEvent.eventDate,
      daysSinceLastEvent,
      expectedNextBooking: expectedNext,
      totalEvents: evts.length,
      totalRevenueCents: totalRevenue,
      avgBookingCadenceDays: avgCadenceDays,
      recommendation,
      dismissed: dismissedIds.has(client.id),
    })
  }

  // Sort by risk score descending
  reports.sort((a, b) => b.riskScore - a.riskScore)

  // Build summary
  const nonDismissed = reports.filter((r) => !r.dismissed)
  const summary: ClientRiskSummary = {
    totalClients: reports.length,
    criticalCount: nonDismissed.filter((r) => r.riskLevel === 'critical').length,
    highCount: nonDismissed.filter((r) => r.riskLevel === 'high').length,
    mediumCount: nonDismissed.filter((r) => r.riskLevel === 'medium').length,
    lowCount: nonDismissed.filter((r) => r.riskLevel === 'low').length,
    totalRevenueAtRiskCents: nonDismissed
      .filter((r) => r.riskLevel === 'critical' || r.riskLevel === 'high')
      .reduce((s, r) => s + r.totalRevenueCents, 0),
    topRecommendation: nonDismissed[0]?.recommendation ?? null,
  }

  return { reports, summary }
}
