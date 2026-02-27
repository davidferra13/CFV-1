'use server'

// Invoice Actions
// Computes invoice data from the ledger-first financial model.
// There is no separate invoices table — the invoice is a live view over:
//   events (quoted price, occasion, dates) + ledger_entries (payment history) + clients + chefs

import { requireChef } from '@/lib/auth/get-user'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { calculateSalesTax } from '@/lib/tax/api-ninjas'

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoicePaymentEntry = {
  id: string
  date: string // formatted display date
  description: string
  entryType: string
  paymentMethod: string
  amountCents: number
  isTip: boolean
  isRefund: boolean
  transactionReference: string | null
}

export type InvoiceData = {
  invoiceNumber: string | null
  invoiceIssuedAt: string | null
  // Chef (issuer)
  chef: {
    businessName: string
    email: string
    phone: string | null
  }
  // Client (recipient)
  client: {
    displayName: string
    email: string
  }
  // Event
  event: {
    id: string
    occasion: string | null
    eventDate: string
    formattedDate: string
    guestCount: number
    locationCity: string | null
    locationState: string | null
    status: string
    pricingModel: string | null
  }
  // Financials
  quotedPriceCents: number | null
  pricePerPersonCents: number | null
  depositAmountCents: number | null
  paymentStatus: string
  paymentEntries: InvoicePaymentEntry[]
  totalPaidCents: number
  totalRefundedCents: number
  tipAmountCents: number
  balanceDueCents: number
  isPaidInFull: boolean
  // Sales tax (computed from event zip code via API Ninjas)
  salesTax: {
    taxRate: number // combined rate as decimal (e.g. 0.0825)
    taxAmountCents: number // tax on the quoted price
    breakdown: {
      state: number
      county: number
      city: number
    }
    zipCode: string
  } | null // null = tax lookup failed or no zip code — treat as $0 tax
}

// ─── generateInvoiceNumber ────────────────────────────────────────────────────

/**
 * Generate a sequential invoice number for a tenant.
 * Format: INV-YYYY-NNN (e.g. INV-2026-001)
 * Counts existing invoices for the tenant in the current year.
 */
export async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const supabase = createServerClient()
  const year = new Date().getFullYear()

  // Count how many invoices this tenant already has this year
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .like('invoice_number', `INV-${year}-%`)

  const seq = (count ?? 0) + 1
  return `INV-${year}-${String(seq).padStart(3, '0')}`
}

// ─── assignInvoiceNumber ──────────────────────────────────────────────────────

/**
 * Assign an invoice number to an event if one doesn't exist yet.
 * Called when the event first receives a payment.
 * Idempotent — does nothing if invoice_number is already set.
 */
export async function assignInvoiceNumber(eventId: string) {
  const supabase = createServerClient({ admin: true })

  // Check if already assigned
  const { data: event } = await supabase
    .from('events')
    .select('id, invoice_number, tenant_id')
    .eq('id', eventId)
    .single()

  if (!event || event.invoice_number) return // already set, nothing to do

  const invoiceNumber = await generateInvoiceNumber(event.tenant_id)

  await supabase
    .from('events')
    .update({
      invoice_number: invoiceNumber,
      invoice_issued_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('tenant_id', event.tenant_id)

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/invoice`)
  revalidatePath(`/my-events/${eventId}`)
}

// ─── getInvoiceData (chef) ────────────────────────────────────────────────────

/**
 * Fetch all data needed to render an invoice for a chef.
 * Returns null if event not found or not accessible.
 */
export async function getInvoiceData(eventId: string): Promise<InvoiceData | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status, tenant_id,
      quoted_price_cents, deposit_amount_cents, payment_status,
      tip_amount_cents, pricing_model,
      invoice_number, invoice_issued_at,
      location_city, location_state, location_zip,
      client:clients(id, full_name, email)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, email, phone')
    .eq('id', user.tenantId!)
    .single()

  if (!chef) return null

  // Fetch ledger entries for this event
  const { data: ledgerEntries } = await supabase
    .from('ledger_entries')
    .select(
      'id, amount_cents, entry_type, payment_method, received_at, created_at, description, transaction_reference, is_refund'
    )
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  // Sales tax lookup — non-blocking, defaults to null on failure
  const taxCalc = await lookupSalesTax(event.quoted_price_cents ?? 0, event.location_zip ?? null)

  return buildInvoiceData(event, chef, ledgerEntries ?? [], taxCalc)
}

// ─── getInvoiceDataForClient ──────────────────────────────────────────────────

/**
 * Fetch invoice data for a client viewing their own event.
 * Scoped to the client's own entity — no cross-client access.
 */
export async function getInvoiceDataForClient(eventId: string): Promise<InvoiceData | null> {
  const user = await requireClient()
  const supabase = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status, tenant_id,
      quoted_price_cents, deposit_amount_cents, payment_status,
      tip_amount_cents, pricing_model,
      invoice_number, invoice_issued_at,
      location_city, location_state, location_zip,
      client:clients(id, full_name, email)
    `
    )
    .eq('id', eventId)
    .eq('client_id', user.entityId!)
    .single()

  if (!event) return null

  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, email, phone')
    .eq('id', event.tenant_id as string)
    .single()

  if (!chef) return null

  const { data: ledgerEntries } = await supabase
    .from('ledger_entries')
    .select(
      'id, amount_cents, entry_type, payment_method, received_at, created_at, description, transaction_reference, is_refund'
    )
    .eq('event_id', eventId)
    .eq('client_id', user.entityId!)
    .order('created_at', { ascending: true })

  // Sales tax lookup — non-blocking, defaults to null on failure
  const taxCalc = await lookupSalesTax(event.quoted_price_cents ?? 0, event.location_zip ?? null)

  return buildInvoiceData(event, chef, ledgerEntries ?? [], taxCalc)
}

// ─── buildInvoiceData ─────────────────────────────────────────────────────────

type RawEvent = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number
  status: string
  quoted_price_cents: number | null
  deposit_amount_cents: number | null
  payment_status: string
  tip_amount_cents: number
  pricing_model: string | null
  invoice_number: string | null
  invoice_issued_at: string | null
  location_city: string | null
  location_state: string | null
  location_zip: string | null
  client: unknown
  tenant_id?: string
}

type RawChef = {
  business_name: string
  email: string
  phone: string | null
}

type RawLedgerEntry = {
  id: string
  amount_cents: number
  entry_type: string
  payment_method: string
  received_at: string | null
  created_at: string
  description: string
  transaction_reference: string | null
  is_refund: boolean
}

// ─── lookupSalesTax ──────────────────────────────────────────────────────────

type SalesTaxInfo = {
  taxRate: number
  taxAmountCents: number
  breakdown: { state: number; county: number; city: number }
  zipCode: string
}

/**
 * Non-blocking sales tax lookup.
 * If the API is down, the key is missing, or the zip is empty, returns null.
 * The caller treats null as $0 tax — the invoice is still valid without it.
 */
async function lookupSalesTax(
  subtotalCents: number,
  zipCode: string | null
): Promise<SalesTaxInfo | null> {
  if (!zipCode || subtotalCents <= 0) return null

  try {
    const calc = await calculateSalesTax(subtotalCents, zipCode)
    if (!calc) return null

    return {
      taxRate: calc.taxRate,
      taxAmountCents: calc.taxAmountCents,
      breakdown: calc.breakdown,
      zipCode,
    }
  } catch (err) {
    console.error('[non-blocking] Sales tax lookup failed', err)
    return null
  }
}

// ─── buildInvoiceData ─────────────────────────────────────────────────────────

function buildInvoiceData(
  event: RawEvent,
  chef: RawChef,
  entries: RawLedgerEntry[],
  salesTax: SalesTaxInfo | null = null
): InvoiceData {
  const clientData = event.client as { id: string; full_name: string; email: string } | null

  const paymentEntries: InvoicePaymentEntry[] = entries.map((e) => {
    const dateStr = e.received_at ?? e.created_at
    return {
      id: e.id,
      date: format(new Date(dateStr), 'MMM d, yyyy'),
      description: e.description,
      entryType: e.entry_type,
      paymentMethod: e.payment_method,
      amountCents: e.amount_cents,
      isTip: e.entry_type === 'tip',
      isRefund: e.is_refund,
      transactionReference: e.transaction_reference,
    }
  })

  // Total paid = sum of non-refund, non-tip entries
  const totalPaidCents = entries
    .filter((e) => !e.is_refund)
    .reduce((sum, e) => sum + e.amount_cents, 0)

  // Total refunded = sum of refund entries (stored as positive, applied as deduction)
  const totalRefundedCents = entries
    .filter((e) => e.is_refund)
    .reduce((sum, e) => sum + Math.abs(e.amount_cents), 0)

  const quotedPriceCents = event.quoted_price_cents ?? 0
  const taxAmountCents = salesTax?.taxAmountCents ?? 0
  const servicePaid = entries
    .filter((e) => !e.is_refund && e.entry_type !== 'tip')
    .reduce((sum, e) => sum + e.amount_cents, 0)

  // Balance due includes tax: (service + tax) - paid + refunded
  const balanceDueCents = Math.max(
    0,
    quotedPriceCents + taxAmountCents - servicePaid + totalRefundedCents
  )

  return {
    invoiceNumber: event.invoice_number,
    invoiceIssuedAt: event.invoice_issued_at,
    chef: {
      businessName: chef.business_name,
      email: chef.email,
      phone: chef.phone,
    },
    client: {
      displayName: clientData?.full_name ?? 'Client',
      email: clientData?.email ?? '',
    },
    event: {
      id: event.id,
      occasion: event.occasion,
      eventDate: event.event_date,
      formattedDate: format(new Date(event.event_date), 'MMMM d, yyyy'),
      guestCount: event.guest_count,
      locationCity: event.location_city,
      locationState: event.location_state,
      status: event.status,
      pricingModel: event.pricing_model,
    },
    quotedPriceCents: event.quoted_price_cents,
    pricePerPersonCents:
      event.pricing_model === 'per_person' && event.quoted_price_cents && event.guest_count
        ? Math.round(event.quoted_price_cents / event.guest_count)
        : null,
    depositAmountCents: event.deposit_amount_cents,
    paymentStatus: event.payment_status,
    paymentEntries,
    totalPaidCents,
    totalRefundedCents,
    tipAmountCents: event.tip_amount_cents,
    balanceDueCents,
    isPaidInFull: balanceDueCents === 0 && quotedPriceCents > 0,
    salesTax,
  }
}
