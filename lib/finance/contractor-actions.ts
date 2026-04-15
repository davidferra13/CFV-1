'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type ContractorPayment = {
  id: string
  staffMemberId: string
  staffName?: string
  amountCents: number
  paymentDate: string
  paymentMethod: string
  description: string | null
  taxYear: number
}

export type Contractor1099Summary = {
  staffMemberId: string
  staffName: string
  ytdPaymentsCents: number
  threshold1099: boolean // true if >= $600
  paymentCount: number
  contractorType: string | null
}

// ─── Schemas ─────────────────────────────────────────────────────

const RecordPaymentSchema = z.object({
  staffMemberId: z.string().uuid(),
  amountCents: z.number().int().min(0),
  paymentDate: z.string().min(1),
  paymentMethod: z.enum(['check', 'venmo', 'zelle', 'cash', 'direct_deposit', 'other']),
  description: z.string().optional(),
  taxYear: z.number().min(2024).max(2030),
})

// ─── Actions ─────────────────────────────────────────────────────

export async function recordContractorPayment(
  input: z.infer<typeof RecordPaymentSchema>
): Promise<ContractorPayment> {
  const user = await requireChef()
  const parsed = RecordPaymentSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('contractor_payments')
    .insert({
      chef_id: user.tenantId!,
      staff_member_id: parsed.staffMemberId,
      amount_cents: parsed.amountCents,
      payment_date: parsed.paymentDate,
      payment_method: parsed.paymentMethod,
      description: parsed.description || null,
      tax_year: parsed.taxYear,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to record payment: ${error.message}`)

  // Update YTD on staff_members
  await db.from('staff_members').update({
    ytd_payments_cents: db.rpc ? undefined : undefined, // handled via SQL below
  })

  // Recalculate YTD
  const { data: ytdData } = await db
    .from('contractor_payments')
    .select('amount_cents')
    .eq('chef_id', user.tenantId!)
    .eq('staff_member_id', parsed.staffMemberId)
    .eq('tax_year', parsed.taxYear)

  const ytdTotal = (ytdData || []).reduce((s: number, r: any) => s + r.amount_cents, 0)

  const { error: ytdError } = await db
    .from('staff_members')
    .update({ ytd_payments_cents: ytdTotal })
    .eq('id', parsed.staffMemberId)
    .eq('chef_id', user.tenantId!)
  if (ytdError) {
    console.error('[recordContractorPayment] Failed to update YTD:', ytdError)
    // Non-blocking - payment was recorded, YTD sync failure is recoverable
  }

  revalidatePath('/finance/contractors')

  return {
    id: data.id,
    staffMemberId: data.staff_member_id,
    amountCents: data.amount_cents,
    paymentDate: data.payment_date,
    paymentMethod: data.payment_method,
    description: data.description,
    taxYear: data.tax_year,
  }
}

export async function getContractorPayments(filters?: {
  staffMemberId?: string
  taxYear?: number
}): Promise<ContractorPayment[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('contractor_payments')
    .select('*, staff_members(name)')
    .eq('chef_id', user.tenantId!)
    .order('payment_date', { ascending: false })
    .limit(200)

  if (filters?.staffMemberId) query = query.eq('staff_member_id', filters.staffMemberId)
  if (filters?.taxYear) query = query.eq('tax_year', filters.taxYear)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch payments: ${error.message}`)

  return (data || []).map((row: any) => ({
    id: row.id,
    staffMemberId: row.staff_member_id,
    staffName: row.staff_members?.name || undefined,
    amountCents: row.amount_cents,
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method,
    description: row.description,
    taxYear: row.tax_year,
  }))
}

export async function get1099Summary(taxYear: number): Promise<Contractor1099Summary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all staff marked as contractors
  const { data: staff } = await db
    .from('staff_members')
    .select('id, name, contractor_type, ytd_payments_cents')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')

  if (!staff?.length) return []

  // Get actual payments for the year per staff
  const { data: payments } = await db
    .from('contractor_payments')
    .select('staff_member_id, amount_cents')
    .eq('chef_id', user.tenantId!)
    .eq('tax_year', taxYear)

  const paymentsByStaff: Record<string, { total: number; count: number }> = {}
  for (const p of payments || []) {
    if (!paymentsByStaff[p.staff_member_id]) {
      paymentsByStaff[p.staff_member_id] = { total: 0, count: 0 }
    }
    paymentsByStaff[p.staff_member_id].total += p.amount_cents
    paymentsByStaff[p.staff_member_id].count += 1
  }

  return staff
    .filter((s: any) => paymentsByStaff[s.id])
    .map((s: any) => ({
      staffMemberId: s.id,
      staffName: s.name,
      ytdPaymentsCents: paymentsByStaff[s.id]?.total || 0,
      threshold1099: (paymentsByStaff[s.id]?.total || 0) >= 60000, // $600 = 60000 cents
      paymentCount: paymentsByStaff[s.id]?.count || 0,
      contractorType: s.contractor_type,
    }))
    .sort(
      (a: Contractor1099Summary, b: Contractor1099Summary) =>
        b.ytdPaymentsCents - a.ytdPaymentsCents
    )
}

export async function export1099Data(taxYear: number): Promise<{
  year: number
  contractors: Contractor1099Summary[]
  totalPaidCents: number
  requiresFilingCount: number
}> {
  const contractors = await get1099Summary(taxYear)

  return {
    year: taxYear,
    contractors,
    totalPaidCents: contractors.reduce((s, c) => s + c.ytdPaymentsCents, 0),
    requiresFilingCount: contractors.filter((c) => c.threshold1099).length,
  }
}

// ─── Save W-9 Data ────────────────────────────────────────────────

const SaveW9Schema = z.object({
  staffMemberId: z.string().uuid(),
  contractorType: z.string().nullable().optional(),
  tin: z.string().nullable().optional(),
  tinType: z.enum(['ssn', 'ein']).nullable().optional(),
  businessName: z.string().nullable().optional(),
  addressStreet: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressState: z.string().nullable().optional(),
  addressZip: z.string().nullable().optional(),
  w9SignedDate: z.string().nullable().optional(),
  w9DocumentUrl: z.string().nullable().optional(),
  w9Collected: z.boolean().optional(),
})

export async function saveW9Data(
  input: z.infer<typeof SaveW9Schema>
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const parsed = SaveW9Schema.parse(input)
  const db: any = createServerClient()

  const { error } = await db
    .from('staff_members')
    .update({
      contractor_type: parsed.contractorType ?? null,
      tin: parsed.tin ?? null,
      tin_type: parsed.tinType ?? null,
      business_name: parsed.businessName ?? null,
      address_street: parsed.addressStreet ?? null,
      address_city: parsed.addressCity ?? null,
      address_state: parsed.addressState ?? null,
      address_zip: parsed.addressZip ?? null,
      w9_signed_date: parsed.w9SignedDate ?? null,
      w9_document_url: parsed.w9DocumentUrl ?? null,
      w9_collected: parsed.w9Collected ?? false,
    })
    .eq('id', parsed.staffMemberId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[saveW9Data] Error:', error)
    throw new Error('Failed to save W-9 data')
  }

  revalidatePath('/finance/staff')
  revalidatePath('/finance/tax')
  return { success: true }
}
