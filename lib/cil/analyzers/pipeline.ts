// CIL Proactive Analyzer: Pipeline
// Detects stale leads, expiring proposals, and unsigned contracts

import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export async function analyzePipeline(tenantId: string): Promise<ProactiveSignal[]> {
  try {
    const client = createServerClient()
    const signals: ProactiveSignal[] = []
    const now = Date.now()

    // 1. Stale leads: inquiries older than 7 days with no response
    await analyzeStaleLeads(client, tenantId, signals, now)

    // 2. Expiring proposals: quotes sent > 5 days ago, unsigned
    await analyzeExpiringProposals(client, tenantId, signals, now)

    // 3. Unsigned contracts: confirmed events with no signed contract
    await analyzeUnsignedContracts(client, tenantId, signals, now)

    return signals
  } catch (err) {
    console.error(
      '[CIL/pipeline] analyzer failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
    return []
  }
}

async function analyzeStaleLeads(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Inquiries in 'new' or 'awaiting_chef' status older than 7 days
  const { data: staleInquiries } = await client
    .from('inquiries')
    .select('id, status, channel, confirmed_occasion, first_contact_at')
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_chef'])
    .lte('first_contact_at', sevenDaysAgo.toISOString())

  if (!staleInquiries || staleInquiries.length === 0) return

  for (const inquiry of staleInquiries) {
    const daysSince = Math.round(
      (Date.now() - new Date(inquiry.first_contact_at).getTime()) / (24 * 60 * 60 * 1000)
    )

    signals.push({
      id: generateId(),
      domain: 'pipeline',
      urgency: 5,
      confidence: 0.9,
      title: `Stale lead: ${daysSince} days`,
      detail: `${inquiry.confirmed_occasion || inquiry.channel || 'Inquiry'} from ${daysSince} days ago has not been responded to. Leads go cold fast.`,
      suggestedAction: 'Respond to this inquiry immediately',
      actionType: 'navigate',
      actionPayload: { path: `/pipeline`, inquiryId: inquiry.id },
      entityIds: [inquiry.id],
      source: 'pipeline.staleLeads',
      createdAt: now,
    })
  }
}

async function analyzeExpiringProposals(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)

  // Quotes in 'sent' status that were sent > 5 days ago
  const { data: pendingQuotes } = await client
    .from('quotes')
    .select('id, client_id, total_quoted_cents, sent_at, valid_until, quote_name')
    .eq('tenant_id', tenantId)
    .eq('status', 'sent')
    .lte('sent_at', fiveDaysAgo.toISOString())

  if (!pendingQuotes || pendingQuotes.length === 0) return

  for (const quote of pendingQuotes) {
    const daysSinceSent = Math.round(
      (Date.now() - new Date(quote.sent_at).getTime()) / (24 * 60 * 60 * 1000)
    )

    // Check if it is past the valid_until date
    const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date()
    const urgency: 1 | 2 | 3 | 4 | 5 = isExpired ? 5 : 4

    // Get client name
    const { data: clientData } = await client
      .from('clients')
      .select('full_name')
      .eq('id', quote.client_id)
      .limit(1)

    const clientName = clientData?.[0]?.full_name || 'client'

    signals.push({
      id: generateId(),
      domain: 'pipeline',
      urgency,
      confidence: 0.85,
      title: isExpired ? `Expired quote: ${clientName}` : `Pending quote: ${clientName}`,
      detail: `$${((quote.total_quoted_cents || 0) / 100).toFixed(0)} quote "${quote.quote_name || 'Untitled'}" sent ${daysSinceSent} days ago${isExpired ? ' (past expiry)' : ''}. Follow up to close the deal.`,
      suggestedAction: isExpired
        ? 'Resend with updated pricing or follow up'
        : 'Follow up with client on pending quote',
      actionType: 'navigate',
      actionPayload: { path: `/pipeline`, quoteId: quote.id },
      entityIds: [quote.id, quote.client_id].filter(Boolean),
      source: 'pipeline.expiringProposals',
      createdAt: now,
    })
  }
}

async function analyzeUnsignedContracts(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  // Events in confirmed/paid status
  const { data: confirmedEvents } = await client
    .from('events')
    .select('id, client_id, occasion, event_date')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'accepted'])

  if (!confirmedEvents || confirmedEvents.length === 0) return

  // Get contracts that exist for these events
  const { data: contracts } = await client
    .from('event_contracts')
    .select('event_id, status')
    .eq('chef_id', tenantId)

  const contractMap = new Map<string, string>()
  if (contracts) {
    for (const c of contracts) {
      contractMap.set(c.event_id, c.status)
    }
  }

  for (const event of confirmedEvents) {
    const contractStatus = contractMap.get(event.id)

    // No contract at all, or contract not yet signed
    if (!contractStatus || (contractStatus !== 'signed' && contractStatus !== 'voided')) {
      const label = !contractStatus ? 'No contract' : `Contract ${contractStatus}`

      // Get client name
      const { data: clientData } = await client
        .from('clients')
        .select('full_name')
        .eq('id', event.client_id)
        .limit(1)

      const clientName = clientData?.[0]?.full_name || 'client'

      signals.push({
        id: generateId(),
        domain: 'pipeline',
        urgency: 3,
        confidence: 0.8,
        title: `${label}: ${clientName}`,
        detail: `Event "${event.occasion || 'Untitled'}" on ${event.event_date} for ${clientName} has no signed contract.`,
        suggestedAction: 'Generate and send contract for signature',
        actionType: 'navigate',
        actionPayload: { path: `/events/${event.id}`, tab: 'contract' },
        entityIds: [event.id, event.client_id].filter(Boolean),
        source: 'pipeline.unsignedContracts',
        createdAt: now,
      })
    }
  }
}
