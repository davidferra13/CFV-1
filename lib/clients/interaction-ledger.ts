'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  HIGH_SIGNAL_CLIENT_ACTIVITY_TYPES,
  buildClientInteractionLedgerEntries,
  type ClientInteractionLedgerEntry,
  type DocumentVersionLedgerRow,
  type EventLedgerRow,
  type InquiryLedgerRow,
  type LedgerEntryRow,
  type MenuLedgerRow,
  type MenuRevisionLedgerRow,
  type MessageLedgerRow,
  type NoteLedgerRow,
  type QuoteLedgerRow,
  type ReviewLedgerRow,
} from './interaction-ledger-core'

export type { ClientInteractionLedgerEntry } from './interaction-ledger-core'

export async function getClientInteractionLedger(
  clientId: string,
  limit = 80
): Promise<ClientInteractionLedgerEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const [
    eventsResponse,
    inquiriesResponse,
    messagesResponse,
    notesResponse,
    quotesResponse,
    ledgerResponse,
    reviewsResponse,
    activityResponse,
  ] = await Promise.all([
    db
      .from('events')
      .select(
        'id, created_at, event_date, status, occasion, guest_count, quoted_price_cents, cancelled_at'
      )
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(40),
    db
      .from('inquiries')
      .select('id, created_at, first_contact_at, last_response_at, status, channel')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(30),
    db
      .from('messages')
      .select('id, created_at, sent_at, channel, direction, body, status, subject')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(40),
    db
      .from('client_notes')
      .select('id, created_at, note_text, category, pinned, source')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(40),
    db
      .from('quotes')
      .select(
        'id, created_at, sent_at, accepted_at, rejected_at, valid_until, status, quote_name, total_quoted_cents, event_id, inquiry_id, version, previous_version_id, is_superseded'
      )
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .is('deleted_at' as any, null)
      .order('created_at', { ascending: false })
      .limit(40),
    db
      .from('ledger_entries')
      .select('id, created_at, received_at, entry_type, amount_cents, payment_method, description')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(40),
    db
      .from('client_reviews')
      .select('id, created_at, rating, what_they_loved, what_could_improve')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(20),
    db
      .from('activity_events')
      .select('id, created_at, event_type, entity_type, entity_id, metadata')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .in('event_type', HIGH_SIGNAL_CLIENT_ACTIVITY_TYPES)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const events = (eventsResponse.data ?? []) as EventLedgerRow[]
  const quotes = (quotesResponse.data ?? []) as QuoteLedgerRow[]
  const eventIds = events.map((event) => event.id)

  let menus: MenuLedgerRow[] = []
  let menuRevisions: MenuRevisionLedgerRow[] = []

  if (eventIds.length > 0) {
    const [menusResponse, menuRevisionsResponse] = await Promise.all([
      db
        .from('menus')
        .select('id, event_id, name')
        .eq('tenant_id', tenantId)
        .in('event_id', eventIds)
        .order('created_at', { ascending: false })
        .limit(40),
      db
        .from('menu_revisions')
        .select('id, menu_id, event_id, version, revision_type, changes_summary, created_at')
        .eq('tenant_id', tenantId)
        .in('event_id', eventIds)
        .order('created_at', { ascending: false })
        .limit(40),
    ])

    menus = (menusResponse.data ?? []) as MenuLedgerRow[]
    menuRevisions = (menuRevisionsResponse.data ?? []) as MenuRevisionLedgerRow[]
  }

  const quoteIds = quotes.map((quote) => quote.id)
  const menuIds = menus.map((menu) => menu.id)
  const documentVersions: DocumentVersionLedgerRow[] = []

  if (quoteIds.length > 0) {
    const { data } = await db
      .from('document_versions')
      .select('id, entity_type, entity_id, version_number, change_summary, created_at')
      .eq('tenant_id', tenantId)
      .eq('entity_type', 'quote')
      .in('entity_id', quoteIds)
      .order('created_at', { ascending: false })
      .limit(30)
    documentVersions.push(...((data ?? []) as DocumentVersionLedgerRow[]))
  }

  if (menuIds.length > 0) {
    const { data } = await db
      .from('document_versions')
      .select('id, entity_type, entity_id, version_number, change_summary, created_at')
      .eq('tenant_id', tenantId)
      .eq('entity_type', 'menu')
      .in('entity_id', menuIds)
      .order('created_at', { ascending: false })
      .limit(30)
    documentVersions.push(...((data ?? []) as DocumentVersionLedgerRow[]))
  }

  return buildClientInteractionLedgerEntries({
    clientId,
    events,
    inquiries: (inquiriesResponse.data ?? []) as InquiryLedgerRow[],
    messages: (messagesResponse.data ?? []) as MessageLedgerRow[],
    notes: (notesResponse.data ?? []) as NoteLedgerRow[],
    quotes,
    ledgerEntries: (ledgerResponse.data ?? []) as LedgerEntryRow[],
    reviews: (reviewsResponse.data ?? []) as ReviewLedgerRow[],
    activityEvents: (activityResponse.data ?? []) as any[],
    menus,
    menuRevisions,
    documentVersions,
  }).slice(0, Math.max(limit, 1))
}
