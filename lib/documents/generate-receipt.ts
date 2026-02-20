import { format, parseISO } from 'date-fns'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout } from './pdf-layout'

type ReceiptLedgerEntry = {
  id: string
  description: string
  amount_cents: number
  entry_type: string
  payment_method: string
  created_at: string
  transaction_reference: string | null
}

type ReceiptData = {
  event: {
    id: string
    occasion: string | null
    event_date: string
    serve_time: string
    guest_count: number
    location_address: string
    location_city: string
    location_state: string
    location_zip: string
    quoted_price_cents: number | null
    deposit_amount_cents: number | null
  }
  client: {
    full_name: string
    email: string
    address: string | null
  }
  chef: {
    business_name: string
    email: string
    phone: string | null
  }
  ledger: ReceiptLedgerEntry[]
  summary: {
    quotedPriceCents: number
    totalPaidCents: number
    outstandingBalanceCents: number
  }
}

function money(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export async function fetchReceiptData(eventId: string): Promise<ReceiptData> {
  const user = await requireClient()
  const supabase = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select(`
      id, tenant_id, client_id, occasion, event_date, serve_time, guest_count,
      location_address, location_city, location_state, location_zip,
      quoted_price_cents, deposit_amount_cents
    `)
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  const [{ data: client }, { data: chef }, { data: ledger }, { data: financial }] = await Promise.all([
    supabase
      .from('clients')
      .select('full_name, email, address')
      .eq('id', event.client_id)
      .single(),
    supabase
      .from('chefs')
      .select('business_name, email, phone')
      .eq('id', event.tenant_id)
      .single(),
    supabase
      .from('ledger_entries')
      .select('id, description, amount_cents, entry_type, payment_method, created_at, transaction_reference')
      .eq('event_id', event.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('event_financial_summary')
      .select('quoted_price_cents, total_paid_cents, outstanding_balance_cents')
      .eq('event_id', event.id)
      .maybeSingle(),
  ])

  if (!client || !chef) {
    throw new Error('Receipt data is incomplete')
  }

  const quotedPriceCents = financial?.quoted_price_cents ?? event.quoted_price_cents ?? 0
  const totalPaidCents = financial?.total_paid_cents ?? (ledger || []).reduce((sum, entry) => sum + entry.amount_cents, 0)
  const outstandingBalanceCents = financial?.outstanding_balance_cents ?? Math.max(quotedPriceCents - totalPaidCents, 0)

  return {
    event: {
      id: event.id,
      occasion: event.occasion,
      event_date: event.event_date,
      serve_time: event.serve_time,
      guest_count: event.guest_count,
      location_address: event.location_address,
      location_city: event.location_city,
      location_state: event.location_state,
      location_zip: event.location_zip,
      quoted_price_cents: event.quoted_price_cents,
      deposit_amount_cents: event.deposit_amount_cents,
    },
    client,
    chef,
    ledger: (ledger || []) as ReceiptLedgerEntry[],
    summary: {
      quotedPriceCents,
      totalPaidCents,
      outstandingBalanceCents,
    },
  }
}

export function renderReceipt(pdf: PDFLayout, data: ReceiptData) {
  const receiptDate = format(new Date(), 'PPP')
  const eventDate = format(parseISO(data.event.event_date), 'PPP')
  const location = [
    data.event.location_address,
    data.event.location_city,
    data.event.location_state,
    data.event.location_zip,
  ].filter(Boolean).join(', ')

  pdf.title('EVENT RECEIPT')
  pdf.text(`Issued ${receiptDate}`, 9, 'italic')
  pdf.space(1)

  pdf.sectionHeader('Chef')
  pdf.keyValue('Business', data.chef.business_name)
  pdf.keyValue('Email', data.chef.email)
  if (data.chef.phone) pdf.keyValue('Phone', data.chef.phone)
  pdf.space(1)

  pdf.sectionHeader('Client')
  pdf.keyValue('Name', data.client.full_name)
  pdf.keyValue('Email', data.client.email)
  if (data.client.address) {
    pdf.text(`Address: ${data.client.address}`, 9)
  }
  pdf.space(1)

  pdf.sectionHeader('Event')
  pdf.keyValue('Event ID', data.event.id)
  pdf.keyValue('Occasion', data.event.occasion || 'Private Dining')
  pdf.keyValue('Date', `${eventDate} at ${data.event.serve_time}`)
  pdf.keyValue('Guests', String(data.event.guest_count))
  pdf.text(`Location: ${location}`, 9)
  pdf.space(1)

  pdf.sectionHeader('Payment History')
  if (data.ledger.length === 0) {
    pdf.text('No recorded ledger entries for this event.', 9, 'italic')
  } else {
    for (const entry of data.ledger) {
      const dateLabel = format(new Date(entry.created_at), 'PP')
      const details = `${dateLabel}  |  ${entry.description} (${entry.entry_type})`
      pdf.text(details, 9)
      pdf.text(`Method: ${entry.payment_method}  |  Amount: ${money(entry.amount_cents)}`, 8, 'italic', 4)
      if (entry.transaction_reference) {
        pdf.text(`Ref: ${entry.transaction_reference}`, 8, 'italic', 4)
      }
      pdf.space(0.5)
    }
  }

  pdf.space(1)
  pdf.sectionHeader('Financial Summary')
  pdf.keyValue('Quoted Price', money(data.summary.quotedPriceCents))
  pdf.keyValue('Total Paid', money(data.summary.totalPaidCents))
  pdf.keyValue('Outstanding Balance', money(data.summary.outstandingBalanceCents))

  pdf.footer('Generated by ChefFlow')
}

export async function generateReceipt(eventId: string) {
  const data = await fetchReceiptData(eventId)
  const pdf = new PDFLayout()
  renderReceipt(pdf, data)
  return pdf.toBuffer()
}

// ─── Chef-scoped receipt ──────────────────────────────────────────────────────

import { requireChef } from '@/lib/auth/get-user'

/**
 * Same receipt PDF but scoped to the chef's tenant — for chef records.
 */
export async function fetchReceiptDataForChef(eventId: string): Promise<ReceiptData> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select(`
      id, tenant_id, client_id, occasion, event_date, serve_time, guest_count,
      location_address, location_city, location_state, location_zip,
      quoted_price_cents, deposit_amount_cents
    `)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const [{ data: client }, { data: chef }, { data: ledger }, { data: financial }] = await Promise.all([
    supabase.from('clients').select('full_name, email, address').eq('id', event.client_id).single(),
    supabase.from('chefs').select('business_name, email, phone').eq('id', event.tenant_id).single(),
    supabase.from('ledger_entries')
      .select('id, description, amount_cents, entry_type, payment_method, created_at, transaction_reference')
      .eq('event_id', event.id)
      .order('created_at', { ascending: true }),
    supabase.from('event_financial_summary')
      .select('quoted_price_cents, total_paid_cents, outstanding_balance_cents')
      .eq('event_id', event.id)
      .maybeSingle(),
  ])

  if (!client || !chef) throw new Error('Receipt data is incomplete')

  const quotedPriceCents = financial?.quoted_price_cents ?? event.quoted_price_cents ?? 0
  const totalPaidCents = financial?.total_paid_cents ?? (ledger || []).reduce((sum, e) => sum + e.amount_cents, 0)
  const outstandingBalanceCents = financial?.outstanding_balance_cents ?? Math.max(quotedPriceCents - totalPaidCents, 0)

  return {
    event: {
      id: event.id,
      occasion: event.occasion,
      event_date: event.event_date,
      serve_time: event.serve_time,
      guest_count: event.guest_count,
      location_address: event.location_address,
      location_city: event.location_city,
      location_state: event.location_state,
      location_zip: event.location_zip,
      quoted_price_cents: event.quoted_price_cents,
      deposit_amount_cents: event.deposit_amount_cents,
    },
    client,
    chef,
    ledger: (ledger || []) as ReceiptLedgerEntry[],
    summary: { quotedPriceCents, totalPaidCents, outstandingBalanceCents },
  }
}

export async function generateReceiptForChef(eventId: string) {
  const data = await fetchReceiptDataForChef(eventId)
  const pdf = new PDFLayout()
  renderReceipt(pdf, data)
  return pdf.toBuffer()
}
