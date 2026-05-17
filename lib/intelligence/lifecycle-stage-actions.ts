'use server'

// Service Lifecycle Stage Actions
// Gathers LifecycleContext from DB and calls the pure detector.
// Auth-gated, tenant-scoped, read-only queries.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  detectLifecycleStage,
  type LifecycleContext,
  type LifecycleDetection,
} from './lifecycle-stage-detector'

/**
 * Returns the detected lifecycle stage for a given client.
 * Gathers all relevant signals from DB, then runs pure detection.
 */
export async function getLifecycleStageForClient(
  tenantId: string,
  clientId: string
): Promise<LifecycleDetection> {
  const user = await requireChef()
  if (user.id !== tenantId) {
    throw new Error('Unauthorized: tenant mismatch')
  }

  const client = createServerClient()
  const now = Date.now()
  const today = new Date().toISOString().slice(0, 10)

  // 1. Latest event for this client
  const { data: latestEvents } = await client
    .from('events')
    .select('id, status, event_date')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .order('event_date', { ascending: false })
    .limit(1)

  const latestEvent = latestEvents?.[0] ?? null
  const latestEventStatus = latestEvent?.status ?? null
  const latestEventDate = latestEvent?.event_date ?? null

  // 2. Next upcoming event (future or today)
  const { data: upcomingEvents } = await client
    .from('events')
    .select('id, status, event_date')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .gte('event_date', today)
    .neq('status', 'cancelled')
    .order('event_date', { ascending: true })
    .limit(1)

  const nextEvent = upcomingEvents?.[0] ?? null
  let daysUntilNextEvent: number | null = null
  if (nextEvent) {
    const eventDate = new Date(nextEvent.event_date)
    const todayDate = new Date(today)
    daysUntilNextEvent = Math.round(
      (eventDate.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000)
    )
  }

  // 3. Days since last completed event
  let daysSinceLastEvent: number | null = null
  if (latestEvent && latestEvent.event_date < today) {
    const lastDate = new Date(latestEvent.event_date)
    daysSinceLastEvent = Math.round((now - lastDate.getTime()) / (24 * 60 * 60 * 1000))
  }

  // 4. Communication signals (last inbound/outbound)
  const { data: lastInbound } = await client
    .from('communication_events')
    .select('created_at')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)

  const { data: lastOutbound } = await client
    .from('communication_events')
    .select('created_at')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1)

  const lastInboundDate = lastInbound?.[0]?.created_at ?? null
  const lastOutboundDate = lastOutbound?.[0]?.created_at ?? null

  // Days since last contact (whichever is more recent)
  let daysSinceLastContact: number | null = null
  const contactDates = [lastInboundDate, lastOutboundDate].filter(Boolean) as string[]
  if (contactDates.length > 0) {
    const mostRecent = new Date(Math.max(...contactDates.map((d) => new Date(d).getTime())))
    daysSinceLastContact = Math.round((now - mostRecent.getTime()) / (24 * 60 * 60 * 1000))
  }

  // 5. Unresponded inquiry check
  const { data: openInquiries } = await client
    .from('inquiries')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .in('status', ['new', 'awaiting_chef'])
    .limit(1)

  const hasUnrespondedInquiry = (openInquiries?.length ?? 0) > 0

  // 6. Pending quote check
  const { data: pendingQuotes } = await client
    .from('quotes')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('status', 'sent')
    .limit(1)

  const hasPendingQuote = (pendingQuotes?.length ?? 0) > 0

  // 7. Deposit check (any payment for next upcoming event)
  let depositPaid = false
  if (nextEvent) {
    const { data: deposits } = await client
      .from('ledger_entries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('event_id', nextEvent.id)
      .eq('entry_type', 'deposit')
      .limit(1)

    depositPaid = (deposits?.length ?? 0) > 0
  }

  // 8. Unpaid invoice check
  const { data: unpaidInvoices } = await client
    .from('invoices')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('status', 'sent')
    .limit(1)

  const hasUnpaidInvoice = (unpaidInvoices?.length ?? 0) > 0

  // Build context and detect
  const context: LifecycleContext = {
    tenantId,
    clientId,
    latestEventStatus,
    latestEventDate,
    lastInboundMessageDate: lastInboundDate,
    lastOutboundMessageDate: lastOutboundDate,
    hasUnrespondedInquiry,
    hasUnpaidInvoice,
    hasPendingQuote,
    depositPaid,
    daysSinceLastEvent,
    daysSinceLastContact,
    daysUntilNextEvent,
  }

  return detectLifecycleStage(context)
}
