'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChurnRiskClient {
  clientId: string
  clientName: string
  riskScore: number // 0-100
  riskLevel: 'critical' | 'high' | 'moderate' | 'low'
  triggers: ChurnTrigger[]
  lastEventDate: string | null
  daysSinceLastEvent: number
  totalEvents: number
  totalRevenueCents: number
  suggestedAction: string
}

export interface ChurnTrigger {
  type:
    | 'overdue'
    | 'declining_frequency'
    | 'declining_spend'
    | 'rejected_quote'
    | 'no_response'
    | 'long_silence'
  description: string
  severity: 'critical' | 'warning' | 'info'
}

export interface ChurnPreventionResult {
  atRiskClients: ChurnRiskClient[]
  recentlyLost: ChurnRiskClient[] // clients who went dormant (365+ days)
  churnRate: number // % of active clients who've gone dormant in last 12 months
  avgDaysBeforeChurn: number // average silence period before a client is "lost"
  totalAtRisk: number
  totalRevenueAtRiskCents: number
  topPreventionAction: string | null
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getChurnPreventionTriggers(): Promise<ChurnPreventionResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Fetch clients with events
  const { data: clients, error: cErr } = await supabase
    .from('clients')
    .select('id, full_name, created_at')
    .eq('tenant_id', tenantId)

  if (cErr || !clients || clients.length < 3) return null

  const { data: events } = await supabase
    .from('events')
    .select('id, client_id, event_date, quoted_price_cents, status')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'in_progress', 'paid', 'accepted'])
    .order('event_date', { ascending: true })

  // Fetch quotes for rejection tracking
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, inquiry_id, status, sent_at')
    .eq('tenant_id', tenantId)

  // Fetch inquiries for client mapping
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, client_id, status, updated_at')
    .eq('tenant_id', tenantId)

  const now = Date.now()

  // Group events by client
  const clientEvents = new Map<string, any[]>()
  for (const ev of events || []) {
    if (!ev.client_id) continue
    if (!clientEvents.has(ev.client_id)) clientEvents.set(ev.client_id, [])
    clientEvents.get(ev.client_id)!.push(ev)
  }

  // Group inquiries by client
  const clientInquiries = new Map<string, any[]>()
  for (const inq of inquiries || []) {
    if (!inq.client_id) continue
    if (!clientInquiries.has(inq.client_id)) clientInquiries.set(inq.client_id, [])
    clientInquiries.get(inq.client_id)!.push(inq)
  }

  // Rejected quotes by inquiry
  const rejectedQuotesByInquiry = new Set<string>()
  for (const q of quotes || []) {
    if (q.status === 'rejected' && q.inquiry_id) rejectedQuotesByInquiry.add(q.inquiry_id)
  }

  // Build churn risk profiles
  const riskClients: ChurnRiskClient[] = []

  for (const client of clients) {
    const evts = clientEvents.get(client.id) || []
    if (evts.length === 0) continue // prospects not relevant for churn

    const lastEvent = evts[evts.length - 1]
    const daysSinceLast = Math.floor((now - new Date(lastEvent.event_date).getTime()) / 86400000)
    const totalRevenue = evts.reduce((s: number, e: any) => s + (e.quoted_price_cents || 0), 0)

    const triggers: ChurnTrigger[] = []
    let riskScore = 0

    // Trigger 1: Overdue based on their booking cadence
    if (evts.length >= 2) {
      const gaps: number[] = []
      for (let i = 1; i < evts.length; i++) {
        const gap =
          (new Date(evts[i].event_date).getTime() - new Date(evts[i - 1].event_date).getTime()) /
          86400000
        if (gap > 0) gaps.push(gap)
      }
      if (gaps.length > 0) {
        const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length
        if (daysSinceLast > avgGap * 2) {
          riskScore += 30
          triggers.push({
            type: 'overdue',
            description: `${daysSinceLast} days since last event (avg cadence: ${Math.round(avgGap)} days)`,
            severity: 'critical',
          })
        } else if (daysSinceLast > avgGap * 1.5) {
          riskScore += 15
          triggers.push({
            type: 'overdue',
            description: `${daysSinceLast} days since last event - approaching overdue`,
            severity: 'warning',
          })
        }
      }
    }

    // Trigger 2: Long silence (absolute threshold)
    if (daysSinceLast > 180) {
      riskScore += 25
      triggers.push({
        type: 'long_silence',
        description: `No events in ${Math.round(daysSinceLast / 30)} months`,
        severity: daysSinceLast > 365 ? 'critical' : 'warning',
      })
    } else if (daysSinceLast > 90) {
      riskScore += 10
      triggers.push({
        type: 'long_silence',
        description: `${daysSinceLast} days since last event`,
        severity: 'info',
      })
    }

    // Trigger 3: Declining spend
    if (evts.length >= 4) {
      const halfIdx = Math.floor(evts.length / 2)
      const firstHalfAvg =
        evts.slice(0, halfIdx).reduce((s: number, e: any) => s + (e.quoted_price_cents || 0), 0) /
        halfIdx
      const secondHalfAvg =
        evts.slice(halfIdx).reduce((s: number, e: any) => s + (e.quoted_price_cents || 0), 0) /
        (evts.length - halfIdx)
      if (firstHalfAvg > 0 && secondHalfAvg < firstHalfAvg * 0.7) {
        riskScore += 15
        triggers.push({
          type: 'declining_spend',
          description: `Spending down ${Math.round(((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100)}% from early bookings`,
          severity: 'warning',
        })
      }
    }

    // Trigger 4: Declining frequency
    if (evts.length >= 4) {
      const halfIdx = Math.floor(evts.length / 2)
      const firstHalfSpan =
        (new Date(evts[halfIdx - 1].event_date).getTime() -
          new Date(evts[0].event_date).getTime()) /
        86400000
      const secondHalfSpan =
        (new Date(evts[evts.length - 1].event_date).getTime() -
          new Date(evts[halfIdx].event_date).getTime()) /
        86400000
      const firstFreq = halfIdx / Math.max(firstHalfSpan, 1)
      const secondFreq = (evts.length - halfIdx) / Math.max(secondHalfSpan, 1)
      if (firstFreq > 0 && secondFreq < firstFreq * 0.6) {
        riskScore += 15
        triggers.push({
          type: 'declining_frequency',
          description: 'Booking frequency has significantly slowed',
          severity: 'warning',
        })
      }
    }

    // Trigger 5: Recent rejected quote
    const clientInqs = clientInquiries.get(client.id) || []
    const recentRejections = clientInqs.filter(
      (inq: any) =>
        rejectedQuotesByInquiry.has(inq.id) &&
        now - new Date(inq.updated_at).getTime() < 180 * 86400000
    )
    if (recentRejections.length > 0) {
      riskScore += 20
      triggers.push({
        type: 'rejected_quote',
        description: `${recentRejections.length} rejected quote(s) in last 6 months`,
        severity: 'warning',
      })
    }

    // Trigger 6: Open inquiry with no response
    const staleInquiries = clientInqs.filter(
      (inq: any) =>
        ['new', 'awaiting_client', 'quoted'].includes(inq.status) &&
        now - new Date(inq.updated_at).getTime() > 14 * 86400000
    )
    if (staleInquiries.length > 0) {
      riskScore += 10
      triggers.push({
        type: 'no_response',
        description: `${staleInquiries.length} stale inquiry(ies) without response`,
        severity: 'info',
      })
    }

    riskScore = Math.min(100, riskScore)
    if (triggers.length === 0) continue // no risk signals

    const riskLevel: ChurnRiskClient['riskLevel'] =
      riskScore >= 60 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'moderate' : 'low'

    // Suggested action
    let suggestedAction = 'Monitor'
    if (riskLevel === 'critical') {
      suggestedAction = triggers.some((t) => t.type === 'rejected_quote')
        ? 'Send a personalized offer or discount to re-engage'
        : 'Reach out personally - ask about upcoming events'
    } else if (riskLevel === 'high') {
      suggestedAction = 'Send a check-in message or seasonal menu update'
    } else if (riskLevel === 'moderate') {
      suggestedAction = 'Add to next marketing campaign or newsletter'
    }

    riskClients.push({
      clientId: client.id,
      clientName: client.full_name || 'Unknown',
      riskScore,
      riskLevel,
      triggers,
      lastEventDate: lastEvent.event_date,
      daysSinceLastEvent: daysSinceLast,
      totalEvents: evts.length,
      totalRevenueCents: totalRevenue,
      suggestedAction,
    })
  }

  // Sort by risk score
  riskClients.sort((a, b) => b.riskScore - a.riskScore)

  const atRisk = riskClients.filter((c) => c.riskLevel !== 'low')
  const recentlyLost = riskClients.filter((c) => c.daysSinceLastEvent > 365)

  // Churn rate: clients who went dormant (365+ days) out of all clients who had events
  const allWithEvents = clients.filter((c: any) => clientEvents.has(c.id))
  const churnRate =
    allWithEvents.length > 0 ? Math.round((recentlyLost.length / allWithEvents.length) * 100) : 0

  // Average silence before churn
  const dormantSilence = recentlyLost.map((c) => c.daysSinceLastEvent)
  const avgDaysBeforeChurn =
    dormantSilence.length > 0
      ? Math.round(dormantSilence.reduce((s, d) => s + d, 0) / dormantSilence.length)
      : 0

  const totalRevenueAtRisk = atRisk.reduce((s, c) => s + c.totalRevenueCents, 0)

  // Top prevention action
  const triggerCounts = new Map<string, number>()
  for (const c of atRisk) {
    for (const t of c.triggers) {
      triggerCounts.set(t.type, (triggerCounts.get(t.type) || 0) + 1)
    }
  }
  const topTrigger =
    triggerCounts.size > 0
      ? Array.from(triggerCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null

  const actionMap: Record<string, string> = {
    overdue: 'Proactive outreach to overdue clients - schedule check-ins',
    long_silence: 'Re-engagement campaign for silent clients',
    declining_spend: 'Value-add offers for clients with declining spend',
    rejected_quote: 'Follow up on rejected quotes with adjusted pricing',
    no_response: 'Clear stale inquiries - close or follow up',
    declining_frequency: 'Loyalty incentives for clients booking less often',
  }

  return {
    atRiskClients: atRisk.slice(0, 15),
    recentlyLost: recentlyLost.slice(0, 10),
    churnRate,
    avgDaysBeforeChurn,
    totalAtRisk: atRisk.length,
    totalRevenueAtRiskCents: totalRevenueAtRisk,
    topPreventionAction: topTrigger ? actionMap[topTrigger] || null : null,
  }
}
