'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Types ──────────────────────────────────────────────────────────────────

export interface TaxJurisdiction {
  id: string
  tenantId: string
  name: string
  ratePercent: number
  jurisdictionType: 'state' | 'county' | 'city' | 'district'
  isActive: boolean
  filingFrequency: 'monthly' | 'quarterly' | 'annual'
  nextFilingDate: string | null
  createdAt: string
  updatedAt: string
}

export interface TaxCollectedRecord {
  id: string
  tenantId: string
  saleDate: string
  saleId: string | null
  taxableAmountCents: number
  taxAmountCents: number
  jurisdictionId: string | null
  notes: string | null
  createdAt: string
}

export interface TaxFiling {
  id: string
  tenantId: string
  periodStart: string
  periodEnd: string
  totalTaxableCents: number
  totalTaxCents: number
  status: 'pending' | 'filed' | 'paid'
  filedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface TaxStats {
  currentLiabilityCents: number
  thisMonthCollectedCents: number
  combinedRatePercent: number
  totalCollectedYearCents: number
  totalFiledYearCents: number
  pendingFilingsCount: number
}

export interface TaxByJurisdiction {
  jurisdictionId: string | null
  jurisdictionName: string
  totalTaxableAmountCents: number
  totalTaxAmountCents: number
  count: number
}

// ── Mappers ────────────────────────────────────────────────────────────────

function mapJurisdiction(r: any): TaxJurisdiction {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    ratePercent: Number(r.rate_percent),
    jurisdictionType: r.jurisdiction_type,
    isActive: r.is_active,
    filingFrequency: r.filing_frequency,
    nextFilingDate: r.next_filing_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function mapTaxCollected(r: any): TaxCollectedRecord {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    saleDate: r.sale_date,
    saleId: r.sale_id,
    taxableAmountCents: r.taxable_amount_cents,
    taxAmountCents: r.tax_amount_cents,
    jurisdictionId: r.jurisdiction_id,
    notes: r.notes,
    createdAt: r.created_at,
  }
}

function mapFiling(r: any): TaxFiling {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    totalTaxableCents: r.total_taxable_cents,
    totalTaxCents: r.total_tax_cents,
    status: r.status,
    filedAt: r.filed_at,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// ── Jurisdiction CRUD ──────────────────────────────────────────────────────

export async function createTaxJurisdiction(data: {
  name: string
  ratePercent: number
  jurisdictionType: 'state' | 'county' | 'city' | 'district'
  filingFrequency: 'monthly' | 'quarterly' | 'annual'
  nextFilingDate?: string
}): Promise<TaxJurisdiction> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: row, error } = await supabase
    .from('tax_jurisdictions')
    .insert({
      tenant_id: user.tenantId!,
      name: data.name,
      rate_percent: data.ratePercent,
      jurisdiction_type: data.jurisdictionType,
      filing_frequency: data.filingFrequency,
      next_filing_date: data.nextFilingDate || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create jurisdiction: ${error.message}`)
  revalidatePath('/finance/sales-tax')
  return mapJurisdiction(row)
}

export async function updateTaxJurisdiction(
  id: string,
  data: {
    name?: string
    ratePercent?: number
    jurisdictionType?: 'state' | 'county' | 'city' | 'district'
    isActive?: boolean
    filingFrequency?: 'monthly' | 'quarterly' | 'annual'
    nextFilingDate?: string | null
  }
): Promise<TaxJurisdiction> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const update: any = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) update.name = data.name
  if (data.ratePercent !== undefined) update.rate_percent = data.ratePercent
  if (data.jurisdictionType !== undefined) update.jurisdiction_type = data.jurisdictionType
  if (data.isActive !== undefined) update.is_active = data.isActive
  if (data.filingFrequency !== undefined) update.filing_frequency = data.filingFrequency
  if (data.nextFilingDate !== undefined) update.next_filing_date = data.nextFilingDate

  const { data: row, error } = await supabase
    .from('tax_jurisdictions')
    .update(update)
    .eq('tenant_id', user.tenantId!)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update jurisdiction: ${error.message}`)
  revalidatePath('/finance/sales-tax')
  return mapJurisdiction(row)
}

export async function deleteTaxJurisdiction(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Soft delete: deactivate rather than hard delete to preserve references
  await supabase
    .from('tax_jurisdictions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('tenant_id', user.tenantId!)
    .eq('id', id)

  revalidatePath('/finance/sales-tax')
}

export async function getTaxJurisdictions(activeOnly?: boolean): Promise<TaxJurisdiction[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('tax_jurisdictions')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('jurisdiction_type')
    .order('name')

  if (activeOnly) query = query.eq('is_active', true)

  const { data } = await query
  return (data || []).map(mapJurisdiction)
}

// ── Tax Collection ─────────────────────────────────────────────────────────

export async function recordTaxCollected(data: {
  saleDate: string
  taxableAmountCents: number
  taxAmountCents: number
  jurisdictionId?: string
  saleId?: string
  notes?: string
}): Promise<TaxCollectedRecord> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: row, error } = await supabase
    .from('tax_collected')
    .insert({
      tenant_id: user.tenantId!,
      sale_date: data.saleDate,
      taxable_amount_cents: data.taxableAmountCents,
      tax_amount_cents: data.taxAmountCents,
      jurisdiction_id: data.jurisdictionId || null,
      sale_id: data.saleId || null,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to record tax: ${error.message}`)
  revalidatePath('/finance/sales-tax')
  return mapTaxCollected(row)
}

export async function getTaxCollectedForPeriod(
  start: string,
  end: string
): Promise<TaxCollectedRecord[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('tax_collected')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('sale_date', start)
    .lte('sale_date', end)
    .order('sale_date', { ascending: false })

  return (data || []).map(mapTaxCollected)
}

export async function getTaxLiability(): Promise<number> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Total collected
  const { data: collected } = await supabase
    .from('tax_collected')
    .select('tax_amount_cents')
    .eq('tenant_id', user.tenantId!)

  const totalCollected = (collected || []).reduce(
    (s: number, r: any) => s + (r.tax_amount_cents || 0),
    0
  )

  // Total paid in filings
  const { data: filings } = await supabase
    .from('tax_filings')
    .select('total_tax_cents, status')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'paid')

  const totalPaid = (filings || []).reduce((s: number, r: any) => s + (r.total_tax_cents || 0), 0)

  return totalCollected - totalPaid
}

export async function getTaxByJurisdiction(
  start: string,
  end: string
): Promise<TaxByJurisdiction[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: records } = await supabase
    .from('tax_collected')
    .select('jurisdiction_id, taxable_amount_cents, tax_amount_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('sale_date', start)
    .lte('sale_date', end)

  const { data: jurisdictions } = await supabase
    .from('tax_jurisdictions')
    .select('id, name')
    .eq('tenant_id', user.tenantId!)

  const jurisdictionMap = new Map<string, string>()
  for (const j of jurisdictions || []) {
    jurisdictionMap.set(j.id, j.name)
  }

  // Group by jurisdiction
  const grouped = new Map<string | null, TaxByJurisdiction>()
  for (const r of records || []) {
    const key = r.jurisdiction_id || '__none__'
    const existing = grouped.get(key) || {
      jurisdictionId: r.jurisdiction_id,
      jurisdictionName: r.jurisdiction_id
        ? jurisdictionMap.get(r.jurisdiction_id) || 'Unknown'
        : 'Unassigned',
      totalTaxableAmountCents: 0,
      totalTaxAmountCents: 0,
      count: 0,
    }
    existing.totalTaxableAmountCents += r.taxable_amount_cents || 0
    existing.totalTaxAmountCents += r.tax_amount_cents || 0
    existing.count += 1
    grouped.set(key, existing)
  }

  return Array.from(grouped.values())
}

// ── Filings ────────────────────────────────────────────────────────────────

export async function getUpcomingFilings(): Promise<TaxJurisdiction[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('tax_jurisdictions')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .not('next_filing_date', 'is', null)
    .order('next_filing_date')

  return (data || []).map(mapJurisdiction)
}

export async function generateFilingSummary(
  periodStart: string,
  periodEnd: string,
  notes?: string
): Promise<TaxFiling> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Calculate totals for the period
  const { data: records } = await supabase
    .from('tax_collected')
    .select('taxable_amount_cents, tax_amount_cents')
    .eq('tenant_id', tenantId)
    .gte('sale_date', periodStart)
    .lte('sale_date', periodEnd)

  const totalTaxableCents = (records || []).reduce(
    (s: number, r: any) => s + (r.taxable_amount_cents || 0),
    0
  )
  const totalTaxCents = (records || []).reduce(
    (s: number, r: any) => s + (r.tax_amount_cents || 0),
    0
  )

  const { data: filing, error } = await supabase
    .from('tax_filings')
    .insert({
      tenant_id: tenantId,
      period_start: periodStart,
      period_end: periodEnd,
      total_taxable_cents: totalTaxableCents,
      total_tax_cents: totalTaxCents,
      status: 'pending',
      notes: notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to generate filing: ${error.message}`)
  revalidatePath('/finance/sales-tax')
  return mapFiling(filing)
}

export async function markFiled(filingId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase
    .from('tax_filings')
    .update({
      status: 'filed',
      filed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', user.tenantId!)
    .eq('id', filingId)

  revalidatePath('/finance/sales-tax')
}

export async function markPaid(filingId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase
    .from('tax_filings')
    .update({
      status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', user.tenantId!)
    .eq('id', filingId)

  revalidatePath('/finance/sales-tax')
}

export async function getTaxFilings(): Promise<TaxFiling[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('tax_filings')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('period_start', { ascending: false })

  return (data || []).map(mapFiling)
}

export async function getCombinedTaxRate(): Promise<number> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('tax_jurisdictions')
    .select('rate_percent')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)

  return (data || []).reduce((s: number, r: any) => s + Number(r.rate_percent || 0), 0)
}

export async function getTaxStats(year?: number): Promise<TaxStats> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const targetYear = year || new Date().getFullYear()
  const yearStart = `${targetYear}-01-01`
  const yearEnd = `${targetYear}-12-31`
  const now = new Date()
  const monthStart = `${targetYear}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = now.toISOString().split('T')[0]

  // Year totals
  const { data: yearRecords } = await supabase
    .from('tax_collected')
    .select('tax_amount_cents')
    .eq('tenant_id', tenantId)
    .gte('sale_date', yearStart)
    .lte('sale_date', yearEnd)

  const totalCollectedYearCents = (yearRecords || []).reduce(
    (s: number, r: any) => s + (r.tax_amount_cents || 0),
    0
  )

  // This month
  const { data: monthRecords } = await supabase
    .from('tax_collected')
    .select('tax_amount_cents')
    .eq('tenant_id', tenantId)
    .gte('sale_date', monthStart)
    .lte('sale_date', monthEnd)

  const thisMonthCollectedCents = (monthRecords || []).reduce(
    (s: number, r: any) => s + (r.tax_amount_cents || 0),
    0
  )

  // Filed totals for year
  const { data: yearFilings } = await supabase
    .from('tax_filings')
    .select('total_tax_cents, status')
    .eq('tenant_id', tenantId)
    .gte('period_start', yearStart)
    .lte('period_end', yearEnd)
    .in('status', ['filed', 'paid'])

  const totalFiledYearCents = (yearFilings || []).reduce(
    (s: number, r: any) => s + (r.total_tax_cents || 0),
    0
  )

  // Pending filings count
  const { data: pendingFilings } = await supabase
    .from('tax_filings')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')

  const pendingFilingsCount = (pendingFilings || []).length

  // Combined rate
  const combinedRatePercent = await getCombinedTaxRate()

  // Current liability
  const currentLiabilityCents = await getTaxLiability()

  return {
    currentLiabilityCents,
    thisMonthCollectedCents,
    combinedRatePercent,
    totalCollectedYearCents,
    totalFiledYearCents,
    pendingFilingsCount,
  }
}
