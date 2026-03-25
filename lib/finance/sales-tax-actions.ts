'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SalesTaxSettings {
  id: string
  chefId: string
  enabled: boolean
  state: string | null
  stateRateBps: number
  localRateBps: number
  registrationNumber: string | null
  filingFrequency: 'monthly' | 'quarterly' | 'annually'
  notes: string | null
}

export interface EventSalesTax {
  id: string
  chefId: string
  eventId: string
  taxableAmountCents: number
  taxRateBps: number
  taxCollectedCents: number
  isExempt: boolean
  exemptionReason: string | null
  remitted: boolean
  remittedAt: string | null
  remittancePeriod: string | null
}

export interface SalesTaxRemittance {
  id: string
  chefId: string
  period: string
  periodStart: string
  periodEnd: string
  amountRemittedCents: number
  remittedAt: string
  confirmationNumber: string | null
  notes: string | null
  createdAt: string
}

export interface SalesTaxSummary {
  collectedCents: number
  remittedCents: number
  outstandingCents: number
  eventCount: number
  remittedEventCount: number
  pendingEventCount: number
  exemptEventCount: number
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function getSalesTaxSettings(): Promise<SalesTaxSettings | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('sales_tax_settings')
    .select('*')
    .eq('chef_id', user.entityId)
    .single()

  if (!data) return null
  return mapSettings(data)
}

export async function saveSalesTaxSettings(input: {
  enabled: boolean
  state: string | null
  stateRateBps: number
  localRateBps: number
  registrationNumber: string | null
  filingFrequency: 'monthly' | 'quarterly' | 'annually'
  notes: string | null
}): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db.from('sales_tax_settings').upsert(
    {
      chef_id: user.entityId,
      enabled: input.enabled,
      state: input.state,
      state_rate_bps: input.stateRateBps,
      local_rate_bps: input.localRateBps,
      registration_number: input.registrationNumber,
      filing_frequency: input.filingFrequency,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id' }
  )
}

// ─── Per-Event Sales Tax ─────────────────────────────────────────────────────

export async function setEventSalesTax(input: {
  eventId: string
  taxableAmountCents: number
  taxRateBps: number
  isExempt: boolean
  exemptionReason: string | null
}): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const taxCollectedCents = input.isExempt
    ? 0
    : Math.round((input.taxableAmountCents * input.taxRateBps) / 10000)

  await db.from('event_sales_tax').upsert(
    {
      chef_id: user.entityId,
      event_id: input.eventId,
      taxable_amount_cents: input.taxableAmountCents,
      tax_rate_bps: input.taxRateBps,
      tax_collected_cents: taxCollectedCents,
      is_exempt: input.isExempt,
      exemption_reason: input.exemptionReason,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'event_id' }
  )
}

export async function getEventSalesTax(eventId: string): Promise<EventSalesTax | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('event_sales_tax')
    .select('*')
    .eq('chef_id', user.entityId)
    .eq('event_id', eventId)
    .single()

  if (!data) return null
  return mapEventSalesTax(data)
}

export async function markEventSalesTaxRemitted(input: {
  eventId: string
  remittancePeriod: string
}): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db
    .from('event_sales_tax')
    .update({
      remitted: true,
      remitted_at: new Date().toISOString(),
      remittance_period: input.remittancePeriod,
      updated_at: new Date().toISOString(),
    })
    .eq('chef_id', user.entityId)
    .eq('event_id', input.eventId)
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export async function getSalesTaxSummary(filters?: {
  periodStart?: string
  periodEnd?: string
}): Promise<SalesTaxSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('event_sales_tax')
    .select('tax_collected_cents, remitted, is_exempt, remitted_at')
    .eq('chef_id', user.entityId)

  if (filters?.periodStart) query = query.gte('created_at', filters.periodStart)
  if (filters?.periodEnd) query = query.lte('created_at', filters.periodEnd)

  const { data } = await query
  const rows: Array<{
    tax_collected_cents: number
    remitted: boolean
    is_exempt: boolean
    remitted_at: string | null
  }> = data || []

  const collectedCents = rows.reduce((s, r) => s + (r.tax_collected_cents || 0), 0)
  const remittedCents = rows
    .filter((r) => r.remitted)
    .reduce((s, r) => s + (r.tax_collected_cents || 0), 0)
  const outstandingCents = collectedCents - remittedCents
  const eventCount = rows.length
  const remittedEventCount = rows.filter((r) => r.remitted).length
  const pendingEventCount = rows.filter((r) => !r.remitted && !r.is_exempt).length
  const exemptEventCount = rows.filter((r) => r.is_exempt).length

  return {
    collectedCents,
    remittedCents,
    outstandingCents,
    eventCount,
    remittedEventCount,
    pendingEventCount,
    exemptEventCount,
  }
}

// ─── Remittances ─────────────────────────────────────────────────────────────

export async function recordSalesTaxRemittance(input: {
  period: string
  periodStart: string
  periodEnd: string
  amountRemittedCents: number
  remittedAt: string
  confirmationNumber: string | null
  notes: string | null
}): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db.from('sales_tax_remittances').insert({
    chef_id: user.entityId,
    period: input.period,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    amount_remitted_cents: input.amountRemittedCents,
    remitted_at: input.remittedAt,
    confirmation_number: input.confirmationNumber,
    notes: input.notes,
  })
}

export async function getSalesTaxRemittances(): Promise<SalesTaxRemittance[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('sales_tax_remittances')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('period_start', { ascending: false })

  return (data || []).map(mapRemittance)
}

export async function getUnremittedEventTax(): Promise<
  Array<{
    eventId: string
    taxCollectedCents: number
    taxRateBps: number
    taxableAmountCents: number
    remittancePeriod: string | null
  }>
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('event_sales_tax')
    .select('event_id, tax_collected_cents, tax_rate_bps, taxable_amount_cents, remittance_period')
    .eq('chef_id', user.entityId)
    .eq('remitted', false)
    .eq('is_exempt', false)
    .order('created_at', { ascending: false })

  return (data || []).map((r: any) => ({
    eventId: r.event_id,
    taxCollectedCents: r.tax_collected_cents,
    taxRateBps: r.tax_rate_bps,
    taxableAmountCents: r.taxable_amount_cents,
    remittancePeriod: r.remittance_period,
  }))
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapSettings(r: any): SalesTaxSettings {
  return {
    id: r.id,
    chefId: r.chef_id,
    enabled: r.enabled,
    state: r.state,
    stateRateBps: r.state_rate_bps,
    localRateBps: r.local_rate_bps,
    registrationNumber: r.registration_number,
    filingFrequency: r.filing_frequency,
    notes: r.notes,
  }
}

function mapEventSalesTax(r: any): EventSalesTax {
  return {
    id: r.id,
    chefId: r.chef_id,
    eventId: r.event_id,
    taxableAmountCents: r.taxable_amount_cents,
    taxRateBps: r.tax_rate_bps,
    taxCollectedCents: r.tax_collected_cents,
    isExempt: r.is_exempt,
    exemptionReason: r.exemption_reason,
    remitted: r.remitted,
    remittedAt: r.remitted_at,
    remittancePeriod: r.remittance_period,
  }
}

function mapRemittance(r: any): SalesTaxRemittance {
  return {
    id: r.id,
    chefId: r.chef_id,
    period: r.period,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    amountRemittedCents: r.amount_remitted_cents,
    remittedAt: r.remitted_at,
    confirmationNumber: r.confirmation_number,
    notes: r.notes,
    createdAt: r.created_at,
  }
}
