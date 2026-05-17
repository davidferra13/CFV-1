// Corporate Procurement Server Actions
// Chef-only: manage corporate billing profiles for clients,
// generate corporate invoices, and pull spend reports.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  CorporateProfile,
  CorporateInvoice,
  SpendReport,
  PaymentTerms,
} from './corporate-types'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CorporateProfileSchema = z.object({
  companyName: z.string().min(1, 'Company name required').max(200),
  billingAddress: z.string().max(500).nullable().optional(),
  billingCity: z.string().max(100).nullable().optional(),
  billingState: z.string().max(50).nullable().optional(),
  billingZip: z.string().max(20).nullable().optional(),
  taxId: z.string().max(50).nullable().optional(),
  defaultPoNumber: z.string().max(100).nullable().optional(),
  paymentTerms: z.enum(['net30', 'net60', 'net90', 'due_on_receipt']).default('due_on_receipt'),
  billingContactName: z.string().max(200).nullable().optional(),
  billingContactEmail: z.string().email().max(320).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

const DateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// ---------------------------------------------------------------------------
// createCorporateProfile
// ---------------------------------------------------------------------------

export async function createCorporateProfile(
  clientId: string,
  input: z.infer<typeof CorporateProfileSchema>
): Promise<{ success: true; id: string }> {
  const user = await requireChef()
  const parsed = CorporateProfileSchema.parse(input)
  const db: any = createServerClient()

  // Verify the client belongs to this tenant
  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) throw new Error('Client not found')

  // Check for existing profile (unique constraint: client_id + tenant_id)
  const { data: existing } = await db
    .from('corporate_profiles')
    .select('id')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (existing) throw new Error('Corporate profile already exists for this client')

  const { data, error } = await db
    .from('corporate_profiles')
    .insert({
      client_id: clientId,
      tenant_id: user.tenantId!,
      company_name: parsed.companyName.trim(),
      billing_address: parsed.billingAddress?.trim() || null,
      billing_city: parsed.billingCity?.trim() || null,
      billing_state: parsed.billingState?.trim() || null,
      billing_zip: parsed.billingZip?.trim() || null,
      tax_id: parsed.taxId?.trim() || null,
      default_po_number: parsed.defaultPoNumber?.trim() || null,
      payment_terms: parsed.paymentTerms,
      billing_contact_name: parsed.billingContactName?.trim() || null,
      billing_contact_email: parsed.billingContactEmail?.trim() || null,
      notes: parsed.notes?.trim() || null,
    })
    .select('id')
    .single()

  if (error) throw new Error('Failed to create corporate profile')

  revalidatePath(`/clients/${clientId}`)
  return { success: true, id: data.id }
}

// ---------------------------------------------------------------------------
// getCorporateProfile
// ---------------------------------------------------------------------------

export async function getCorporateProfile(clientId: string): Promise<CorporateProfile | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('corporate_profiles')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    clientId: data.client_id,
    tenantId: data.tenant_id,
    companyName: data.company_name,
    billingAddress: data.billing_address,
    billingCity: data.billing_city,
    billingState: data.billing_state,
    billingZip: data.billing_zip,
    taxId: data.tax_id,
    defaultPoNumber: data.default_po_number,
    paymentTerms: data.payment_terms as PaymentTerms,
    billingContactName: data.billing_contact_name,
    billingContactEmail: data.billing_contact_email,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

// ---------------------------------------------------------------------------
// updateCorporateProfile
// ---------------------------------------------------------------------------

export async function updateCorporateProfile(
  clientId: string,
  input: z.infer<typeof CorporateProfileSchema>
): Promise<{ success: true }> {
  const user = await requireChef()
  const parsed = CorporateProfileSchema.parse(input)
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('corporate_profiles')
    .select('id')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!existing) throw new Error('Corporate profile not found')

  const { error } = await db
    .from('corporate_profiles')
    .update({
      company_name: parsed.companyName.trim(),
      billing_address: parsed.billingAddress?.trim() || null,
      billing_city: parsed.billingCity?.trim() || null,
      billing_state: parsed.billingState?.trim() || null,
      billing_zip: parsed.billingZip?.trim() || null,
      tax_id: parsed.taxId?.trim() || null,
      default_po_number: parsed.defaultPoNumber?.trim() || null,
      payment_terms: parsed.paymentTerms,
      billing_contact_name: parsed.billingContactName?.trim() || null,
      billing_contact_email: parsed.billingContactEmail?.trim() || null,
      notes: parsed.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)

  if (error) throw new Error('Failed to update corporate profile')

  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// getCorporateClients
// ---------------------------------------------------------------------------

export async function getCorporateClients(): Promise<
  Array<CorporateProfile & { clientName: string; clientEmail: string | null }>
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: profiles, error } = await db
    .from('corporate_profiles')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('company_name', { ascending: true })

  if (error || !profiles) return []

  // Fetch associated client names
  const clientIds = profiles.map((p: any) => p.client_id)
  if (clientIds.length === 0) return []

  const { data: clients } = await db
    .from('clients')
    .select('id, full_name, email')
    .in('id', clientIds)

  const clientMap = new Map<string, { full_name: string; email: string | null }>()
  for (const c of clients ?? []) {
    clientMap.set(c.id, { full_name: c.full_name, email: c.email })
  }

  return profiles.map((p: any) => {
    const client = clientMap.get(p.client_id)
    return {
      id: p.id,
      clientId: p.client_id,
      tenantId: p.tenant_id,
      companyName: p.company_name,
      billingAddress: p.billing_address,
      billingCity: p.billing_city,
      billingState: p.billing_state,
      billingZip: p.billing_zip,
      taxId: p.tax_id,
      defaultPoNumber: p.default_po_number,
      paymentTerms: p.payment_terms as PaymentTerms,
      billingContactName: p.billing_contact_name,
      billingContactEmail: p.billing_contact_email,
      notes: p.notes,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      clientName: client?.full_name ?? 'Unknown',
      clientEmail: client?.email ?? null,
    }
  })
}

// ---------------------------------------------------------------------------
// generateCorporateInvoice
// ---------------------------------------------------------------------------

export async function generateCorporateInvoice(eventId: string): Promise<CorporateInvoice | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event with client info
  const { data: event } = await db
    .from('events')
    .select(
      `id, event_date, occasion, guest_count, client_id,
       bill_to_company, bill_to_attention, bill_to_po_number`
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Fetch corporate profile for this client
  const { data: profile } = await db
    .from('corporate_profiles')
    .select('*')
    .eq('client_id', event.client_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!profile) return null

  // Fetch client name/email
  const { data: client } = await db
    .from('clients')
    .select('full_name, email')
    .eq('id', event.client_id)
    .single()

  // Fetch financial summary
  const { data: financial } = await db
    .from('event_financial_summary')
    .select('total_charge_cents, total_paid_cents, outstanding_balance_cents')
    .eq('event_id', eventId)
    .single()

  // Fetch ledger line items
  const { data: ledger } = await db
    .from('ledger_entries')
    .select('entry_type, amount_cents, description')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  const invoiceNumber = `INV-${eventId.slice(0, 8).toUpperCase()}`

  return {
    invoiceNumber,
    invoiceDate: new Date().toISOString(),
    billTo: {
      companyName: event.bill_to_company || profile.company_name,
      billingAddress: profile.billing_address,
      billingCity: profile.billing_city,
      billingState: profile.billing_state,
      billingZip: profile.billing_zip,
      attention: event.bill_to_attention || profile.billing_contact_name,
      poNumber: event.bill_to_po_number || profile.default_po_number,
    },
    paymentTerms: profile.payment_terms as PaymentTerms,
    taxId: profile.tax_id,
    event: {
      id: event.id,
      eventDate: event.event_date,
      occasion: event.occasion,
      guestCount: event.guest_count ?? 0,
    },
    client: {
      fullName: client?.full_name ?? 'Unknown',
      email: client?.email ?? null,
    },
    financial: {
      totalChargeCents: financial?.total_charge_cents ?? 0,
      totalPaidCents: financial?.total_paid_cents ?? 0,
      outstandingBalanceCents: financial?.outstanding_balance_cents ?? 0,
    },
    lineItems: (ledger ?? []).map((l: any) => ({
      description: l.description ?? l.entry_type,
      amountCents: l.amount_cents,
      entryType: l.entry_type,
    })),
  }
}

// ---------------------------------------------------------------------------
// getCorporateSpendReport
// ---------------------------------------------------------------------------

export async function getCorporateSpendReport(
  clientId: string,
  dateRange: { from: string; to: string }
): Promise<SpendReport | null> {
  const user = await requireChef()
  const parsed = DateRangeSchema.parse(dateRange)
  const db: any = createServerClient()

  // Fetch corporate profile
  const { data: profile } = await db
    .from('corporate_profiles')
    .select('company_name')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!profile) return null

  // Fetch events in date range for this client
  const { data: events, error } = await db
    .from('events')
    .select('id, event_date, occasion')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', parsed.from)
    .lte('event_date', parsed.to)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: true })

  if (error || !events || events.length === 0) {
    return {
      clientId,
      companyName: profile.company_name,
      dateRange: parsed,
      totalSpendCents: 0,
      totalPaidCents: 0,
      totalOutstandingCents: 0,
      eventCount: 0,
      entries: [],
    }
  }

  const eventIds = events.map((e: any) => e.id)

  // Fetch financials for all events
  const { data: financials } = await db
    .from('event_financial_summary')
    .select('event_id, total_charge_cents, total_paid_cents, outstanding_balance_cents')
    .in('event_id', eventIds)

  const financialMap = new Map<
    string,
    { total_charge_cents: number; total_paid_cents: number; outstanding_balance_cents: number }
  >()
  for (const f of financials ?? []) {
    financialMap.set(f.event_id, f)
  }

  let totalSpendCents = 0
  let totalPaidCents = 0
  let totalOutstandingCents = 0

  const entries = events.map((e: any) => {
    const fin = financialMap.get(e.id)
    const charge = fin?.total_charge_cents ?? 0
    const paid = fin?.total_paid_cents ?? 0
    const outstanding = fin?.outstanding_balance_cents ?? 0

    totalSpendCents += charge
    totalPaidCents += paid
    totalOutstandingCents += outstanding

    return {
      eventId: e.id,
      eventDate: e.event_date,
      occasion: e.occasion,
      totalChargeCents: charge,
      totalPaidCents: paid,
      outstandingCents: outstanding,
    }
  })

  return {
    clientId,
    companyName: profile.company_name,
    dateRange: parsed,
    totalSpendCents,
    totalPaidCents,
    totalOutstandingCents,
    eventCount: events.length,
    entries,
  }
}
