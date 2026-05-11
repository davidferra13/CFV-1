// Client Receipt Actions - View receipts from events

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type ClientReceipt = {
  id: string
  photoUrl: string
  storeName: string | null
  storeLocation: string | null
  purchaseDate: string | null
  totalCents: number | null
  eventName: string | null
  eventDate: string | null
  status: 'pending' | 'processing' | 'extracted' | 'approved'
  createdAt: string
}

export async function getMyReceipts(): Promise<ClientReceipt[]> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Get all events for this client
  const { data: events } = await db
    .from('events')
    .select('id, title, event_date')
    .eq('client_id', user.entityId)

  if (!events?.length) return []

  const eventIds = events.map((e: any) => e.id)
  const eventMap = new Map<string, any>(events.map((e: any) => [e.id, e]))

  // Get receipt photos for those events
  const { data: photos, error } = await db
    .from('receipt_photos')
    .select('id, photo_url, upload_status, event_id, created_at')
    .in('event_id', eventIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getMyReceipts] Query failed:', error)
    return []
  }

  if (!photos?.length) return []

  // Get extractions for these receipts
  const photoIds = photos.map((p: any) => p.id)
  const { data: extractions } = await db
    .from('receipt_extractions')
    .select('receipt_photo_id, store_name, store_location, purchase_date, total_cents')
    .in('receipt_photo_id', photoIds)

  const extractionMap = new Map<string, any>(
    (extractions ?? []).map((e: any) => [e.receipt_photo_id, e])
  )

  return photos.map((p: any) => {
    const evt = eventMap.get(p.event_id)
    const ext = extractionMap.get(p.id)
    return {
      id: p.id,
      photoUrl: p.photo_url,
      storeName: ext?.store_name || null,
      storeLocation: ext?.store_location || null,
      purchaseDate: ext?.purchase_date || null,
      totalCents: ext?.total_cents ?? null,
      eventName: evt?.title || null,
      eventDate: evt?.event_date || null,
      status: p.upload_status,
      createdAt: p.created_at,
    }
  })
}

// ============================================
// Event Receipt Detail - Single event invoice/receipt
// ============================================

export interface ReceiptLineItem {
  label: string
  amount_cents: number
}

export interface ReceiptPayment {
  description: string | null
  amount_cents: number
  paid_at: string | null
}

export interface EventReceiptDetail {
  event_id: string
  occasion: string | null
  event_date: string | null
  guest_count: number | null
  chef_name: string | null
  quoted_price_cents: number
  total_paid_cents: number
  line_items: ReceiptLineItem[]
  payments: ReceiptPayment[]
}

/**
 * Get full receipt/invoice detail for a single event.
 * Includes line items from the quote and payment history from ledger entries.
 */
export async function getEventReceiptDetail(eventId: string): Promise<EventReceiptDetail | null> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Verify event belongs to this client
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, tenant_id, quoted_price_cents')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (eventError || !event) return null

  // Get chef name
  const { data: chef } = await db
    .from('chefs')
    .select('business_name')
    .eq('id', event.tenant_id)
    .single()

  // Get quote line items (visible to client)
  const { data: quotes } = await db
    .from('quotes')
    .select('id')
    .eq('event_id', eventId)
    .eq('client_id', user.entityId)
    .eq('status', 'accepted')
    .limit(1)

  let lineItems: ReceiptLineItem[] = []
  if (quotes?.length) {
    const { data: items } = await db
      .from('quote_line_items')
      .select('label, amount_cents, sort_order')
      .eq('quote_id', quotes[0].id)
      .eq('is_visible_to_client', true)
      .order('sort_order', { ascending: true })

    if (items?.length) {
      lineItems = items.map((i: any) => ({
        label: i.label,
        amount_cents: i.amount_cents,
      }))
    }
  }

  // Get payment ledger entries
  const { data: ledgerEntries } = await db
    .from('ledger_entries')
    .select('description, amount_cents, created_at')
    .eq('event_id', eventId)
    .eq('entry_type', 'payment')
    .order('created_at', { ascending: true })

  const payments: ReceiptPayment[] = (ledgerEntries ?? []).map((le: any) => ({
    description: le.description,
    amount_cents: le.amount_cents ?? 0,
    paid_at: le.created_at,
  }))

  const totalPaid = payments.reduce((sum, p) => sum + p.amount_cents, 0)

  return {
    event_id: event.id,
    occasion: event.occasion,
    event_date: event.event_date,
    guest_count: event.guest_count,
    chef_name: chef?.business_name ?? null,
    quoted_price_cents: event.quoted_price_cents ?? 0,
    total_paid_cents: totalPaid,
    line_items: lineItems,
    payments,
  }
}
