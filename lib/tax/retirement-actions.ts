'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { SEP_IRA_RATE, SEP_IRA_MAX_CENTS } from '@/lib/tax/retirement-constants'

// ─── Types ───────────────────────────────────────────────────────

export type RetirementContribution = {
  id: string
  taxYear: number
  accountType: string
  contributionCents: number
  contributedAt: string | null
  notes: string | null
}

export type HealthInsurancePremium = {
  id: string
  taxYear: number
  premiumType: string
  annualPremiumCents: number
  notes: string | null
}

export type AboveLineDeductions = {
  retirementContributions: RetirementContribution[]
  retirementTotalCents: number
  sepIraMaxCents: number // computed from current year net SE income estimate
  healthPremiums: HealthInsurancePremium[]
  healthInsuranceTotalCents: number
  combinedAboveLineCents: number
}

// ─── Schemas ─────────────────────────────────────────────────────

const AddContributionSchema = z.object({
  taxYear: z.number().min(2024).max(2030),
  accountType: z.enum(['sep_ira', 'solo_401k', 'simple_ira', 'traditional_ira']),
  contributionCents: z.number().int().min(0),
  contributedAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

const AddPremiumSchema = z.object({
  taxYear: z.number().min(2024).max(2030),
  premiumType: z.enum(['self', 'spouse', 'dependents', 'long_term_care']),
  annualPremiumCents: z.number().int().min(0),
  notes: z.string().nullable().optional(),
})

// ─── Actions ─────────────────────────────────────────────────────

export async function addRetirementContribution(
  input: z.infer<typeof AddContributionSchema>
): Promise<RetirementContribution> {
  const user = await requireChef()
  const parsed = AddContributionSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('retirement_contributions')
    .insert({
      chef_id: user.tenantId!,
      tax_year: parsed.taxYear,
      account_type: parsed.accountType,
      contribution_cents: parsed.contributionCents,
      contributed_at: parsed.contributedAt || null,
      notes: parsed.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add contribution: ${error.message}`)
  revalidatePath('/finance/tax/retirement')

  return {
    id: data.id,
    taxYear: data.tax_year,
    accountType: data.account_type,
    contributionCents: data.contribution_cents,
    contributedAt: data.contributed_at,
    notes: data.notes,
  }
}

export async function deleteRetirementContribution(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('retirement_contributions')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete contribution: ${error.message}`)
  revalidatePath('/finance/tax/retirement')
}

export async function getRetirementContributions(taxYear: number): Promise<{
  contributions: RetirementContribution[]
  totalContributionCents: number
  sepIraMaxCents: number
  remainingCapacityCents: number
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('retirement_contributions')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('tax_year', taxYear)
    .order('contributed_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch contributions: ${error.message}`)

  const contributions: RetirementContribution[] = (data || []).map((r: any) => ({
    id: r.id,
    taxYear: r.tax_year,
    accountType: r.account_type,
    contributionCents: r.contribution_cents,
    contributedAt: r.contributed_at,
    notes: r.notes,
  }))

  const totalContributionCents = contributions.reduce((s, c) => s + c.contributionCents, 0)

  // Estimate SEP-IRA limit from current year net income in ledger
  const { data: ledger } = await db
    .from('ledger_entries')
    .select('amount_cents, entry_type')
    .eq('tenant_id', user.tenantId!)
    .gte('received_at', `${taxYear}-01-01`)
    .lte('received_at', `${taxYear}-12-31`)

  const grossIncomeCents = (ledger || [])
    .filter((e: any) =>
      ['payment', 'deposit', 'installment', 'final_payment', 'add_on', 'tip'].includes(e.entry_type)
    )
    .reduce((s: number, e: any) => s + (e.amount_cents || 0), 0)

  const refundsCents = (ledger || [])
    .filter((e: any) => e.entry_type === 'refund')
    .reduce((s: number, e: any) => s + (e.amount_cents || 0), 0)

  const netIncomeCents = Math.max(0, grossIncomeCents - refundsCents)
  const sepIraMaxCents = Math.min(Math.floor(netIncomeCents * SEP_IRA_RATE), SEP_IRA_MAX_CENTS)
  const remainingCapacityCents = Math.max(0, sepIraMaxCents - totalContributionCents)

  return {
    contributions,
    totalContributionCents,
    sepIraMaxCents,
    remainingCapacityCents,
  }
}

export async function addHealthInsurancePremium(
  input: z.infer<typeof AddPremiumSchema>
): Promise<HealthInsurancePremium> {
  const user = await requireChef()
  const parsed = AddPremiumSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('health_insurance_premiums')
    .insert({
      chef_id: user.tenantId!,
      tax_year: parsed.taxYear,
      premium_type: parsed.premiumType,
      annual_premium_cents: parsed.annualPremiumCents,
      notes: parsed.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add premium: ${error.message}`)
  revalidatePath('/finance/tax/retirement')

  return {
    id: data.id,
    taxYear: data.tax_year,
    premiumType: data.premium_type,
    annualPremiumCents: data.annual_premium_cents,
    notes: data.notes,
  }
}

export async function deleteHealthInsurancePremium(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('health_insurance_premiums')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete premium: ${error.message}`)
  revalidatePath('/finance/tax/retirement')
}

export async function getHealthInsurancePremiums(taxYear: number): Promise<{
  premiums: HealthInsurancePremium[]
  totalPremiumCents: number
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('health_insurance_premiums')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('tax_year', taxYear)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch premiums: ${error.message}`)

  const premiums: HealthInsurancePremium[] = (data || []).map((r: any) => ({
    id: r.id,
    taxYear: r.tax_year,
    premiumType: r.premium_type,
    annualPremiumCents: r.annual_premium_cents,
    notes: r.notes,
  }))

  return {
    premiums,
    totalPremiumCents: premiums.reduce((s, p) => s + p.annualPremiumCents, 0),
  }
}

export async function getAboveLineDeductions(taxYear: number): Promise<AboveLineDeductions> {
  const [retirementData, healthData] = await Promise.all([
    getRetirementContributions(taxYear),
    getHealthInsurancePremiums(taxYear),
  ])

  return {
    retirementContributions: retirementData.contributions,
    retirementTotalCents: retirementData.totalContributionCents,
    sepIraMaxCents: retirementData.sepIraMaxCents,
    healthPremiums: healthData.premiums,
    healthInsuranceTotalCents: healthData.totalPremiumCents,
    combinedAboveLineCents: retirementData.totalContributionCents + healthData.totalPremiumCents,
  }
}
