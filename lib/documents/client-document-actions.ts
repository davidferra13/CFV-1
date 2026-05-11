// Client Documents - aggregates contracts, invoices, proposals across all events
// Used by the /my-documents client portal page.

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ──────────────────────────────────────────────────────────────────────

export type DocumentType = 'contract' | 'invoice' | 'proposal'

export type ClientDocument = {
  id: string
  type: DocumentType
  title: string
  eventTitle: string | null
  date: string
  status: string
  viewUrl: string
}

// ── Server Action ──────────────────────────────────────────────────────────────

/**
 * Fetch all documents for the current client across all events.
 * Aggregates contracts, invoices (from event_financial_summary), and proposals.
 * Uses Promise.allSettled so one failing source does not block the rest.
 */
export async function getClientDocuments(): Promise<ClientDocument[]> {
  const user = await requireClient()
  const db: any = createServerClient()
  const clientId = user.entityId

  const [contractsResult, invoicesResult, proposalsResult] = await Promise.allSettled([
    fetchClientContracts(db, clientId),
    fetchClientInvoices(db, clientId),
    fetchClientProposals(db, clientId),
  ])

  const documents: ClientDocument[] = []

  if (contractsResult.status === 'fulfilled') {
    documents.push(...contractsResult.value)
  } else {
    console.error('[getClientDocuments] Contracts fetch failed:', contractsResult.reason)
  }

  if (invoicesResult.status === 'fulfilled') {
    documents.push(...invoicesResult.value)
  } else {
    console.error('[getClientDocuments] Invoices fetch failed:', invoicesResult.reason)
  }

  if (proposalsResult.status === 'fulfilled') {
    documents.push(...proposalsResult.value)
  } else {
    console.error('[getClientDocuments] Proposals fetch failed:', proposalsResult.reason)
  }

  // Sort by date descending (most recent first)
  documents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return documents
}

// ── Internal Fetchers ──────────────────────────────────────────────────────────

async function fetchClientContracts(db: any, clientId: string): Promise<ClientDocument[]> {
  const { data, error } = await db
    .from('event_contracts')
    .select(
      `
      id, status, created_at, signed_at,
      events (id, occasion, event_date)
    `
    )
    .eq('client_id', clientId)
    .not('status', 'eq', 'voided')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Contracts query failed: ${error.message}`)
  }

  return ((data as any[]) ?? []).map((row: any) => {
    const event = row.events
    const occasion = event?.occasion || 'Event'
    return {
      id: row.id,
      type: 'contract' as const,
      title: `Service Agreement: ${occasion}`,
      eventTitle: occasion,
      date: row.signed_at || row.created_at,
      status: mapContractStatus(row.status),
      viewUrl: `/my-events/${event?.id}/contract`,
    }
  })
}

async function fetchClientInvoices(db: any, clientId: string): Promise<ClientDocument[]> {
  // Invoices come from events that have financial data (quoted price set)
  const { data: events, error: eventsError } = await db
    .from('events')
    .select('id, occasion, event_date, quoted_price_cents, status')
    .eq('client_id', clientId)
    .not('status', 'eq', 'draft')
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: false })

  if (eventsError) {
    throw new Error(`Events query failed: ${eventsError.message}`)
  }

  if (!events || events.length === 0) return []

  const eventIds = events.map((e: any) => e.id)

  const { data: financials } = await db
    .from('event_financial_summary')
    .select('event_id, total_paid_cents, quoted_price_cents, payment_status')
    .in('event_id', eventIds)

  const financialMap = new Map<string, any>()
  for (const f of financials ?? []) {
    if (f.event_id) financialMap.set(f.event_id, f)
  }

  // Only include events that have a quoted price or payments recorded
  return events
    .filter((e: any) => {
      const fin = financialMap.get(e.id)
      return (e.quoted_price_cents && e.quoted_price_cents > 0) || (fin && fin.total_paid_cents > 0)
    })
    .map((e: any) => {
      const fin = financialMap.get(e.id)
      const occasion = e.occasion || 'Event'
      return {
        id: `invoice-${e.id}`,
        type: 'invoice' as const,
        title: `Invoice: ${occasion}`,
        eventTitle: occasion,
        date: e.event_date || e.created_at,
        status: mapInvoiceStatus(e.status, fin),
        viewUrl: `/my-events/${e.id}`,
      }
    })
}

async function fetchClientProposals(db: any, clientId: string): Promise<ClientDocument[]> {
  const { data, error } = await db
    .from('client_proposals')
    .select(
      `
      id, title, status, created_at, sent_at,
      events (id, occasion)
    `
    )
    .eq('client_id', clientId)
    .not('status', 'eq', 'draft')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Proposals query failed: ${error.message}`)
  }

  return ((data as any[]) ?? []).map((row: any) => {
    const event = row.events
    const occasion = event?.occasion || null
    return {
      id: row.id,
      type: 'proposal' as const,
      title: row.title || `Proposal${occasion ? `: ${occasion}` : ''}`,
      eventTitle: occasion,
      date: row.sent_at || row.created_at,
      status: mapProposalStatus(row.status),
      viewUrl: event?.id ? `/my-events/${event.id}` : `/my-events`,
    }
  })
}

// ── Status Mapping ─────────────────────────────────────────────────────────────

function mapContractStatus(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'sent':
      return 'Awaiting Signature'
    case 'viewed':
      return 'Viewed'
    case 'signed':
      return 'Signed'
    case 'voided':
      return 'Voided'
    default:
      return status
  }
}

function mapInvoiceStatus(eventStatus: string, financial: any): string {
  if (!financial) return 'Pending'
  const paid = financial.total_paid_cents ?? 0
  const quoted = financial.quoted_price_cents ?? 0
  if (quoted > 0 && paid >= quoted) return 'Paid'
  if (paid > 0) return 'Partial'
  if (eventStatus === 'completed') return 'Due'
  return 'Pending'
}

function mapProposalStatus(status: string): string {
  switch (status) {
    case 'sent':
      return 'Sent'
    case 'viewed':
      return 'Viewed'
    case 'approved':
      return 'Approved'
    case 'declined':
      return 'Declined'
    case 'expired':
      return 'Expired'
    default:
      return status
  }
}
