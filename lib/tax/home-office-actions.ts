'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  SIMPLIFIED_RATE_CENTS_PER_SQFT,
  SIMPLIFIED_MAX_SQFT,
  SIMPLIFIED_MAX_DEDUCTION_CENTS,
} from '@/lib/tax/home-office-constants'

// ─── Types ───────────────────────────────────────────────────────

export type HomeOfficeSettings = {
  taxYear: number
  homeDeductionMethod: 'simplified' | 'actual'
  homeOfficeSqft: number | null
  homeTotalSqft: number | null
  annualRentMortgageCents: number | null
  annualUtilitiesCents: number | null
  annualInsuranceHomeCents: number | null
  annualRepairsCents: number | null
  homeOfficeNotes: string | null
}

export type HomeOfficeDeductionResult = {
  settings: HomeOfficeSettings | null
  homeOfficeSqft: number
  homeTotalSqft: number
  sqftPercentage: number // homeOfficeSqft / homeTotalSqft
  simplifiedDeductionCents: number // min(sqft, 300) × $5
  totalHomeExpensesCents: number // sum of actual home expenses
  actualDeductionCents: number // sqftPercentage × totalHomeExpensesCents
  selectedMethodDeductionCents: number // what the chef has chosen
  recommendedMethodDeductionCents: number // whichever is larger
  recommendedMethod: 'simplified' | 'actual'
}

// ─── Schema ──────────────────────────────────────────────────────

const SaveSchema = z.object({
  taxYear: z.number().min(2024).max(2030),
  homeDeductionMethod: z.enum(['simplified', 'actual']),
  homeOfficeSqft: z.number().int().min(0).nullable().optional(),
  homeTotalSqft: z.number().int().min(0).nullable().optional(),
  annualRentMortgageCents: z.number().int().min(0).nullable().optional(),
  annualUtilitiesCents: z.number().int().min(0).nullable().optional(),
  annualInsuranceHomeCents: z.number().int().min(0).nullable().optional(),
  annualRepairsCents: z.number().int().min(0).nullable().optional(),
  homeOfficeNotes: z.string().nullable().optional(),
})

// ─── Actions ─────────────────────────────────────────────────────

export async function saveHomeOfficeSettings(input: z.infer<typeof SaveSchema>): Promise<void> {
  const user = await requireChef()
  const parsed = SaveSchema.parse(input)
  const supabase = createServerClient()

  const { error } = await (supabase as any).from('tax_settings').upsert(
    {
      chef_id: user.tenantId!,
      tax_year: parsed.taxYear,
      home_deduction_method: parsed.homeDeductionMethod,
      home_office_sqft: parsed.homeOfficeSqft ?? null,
      home_total_sqft: parsed.homeTotalSqft ?? null,
      annual_rent_mortgage_cents: parsed.annualRentMortgageCents ?? null,
      annual_utilities_cents: parsed.annualUtilitiesCents ?? null,
      annual_insurance_home_cents: parsed.annualInsuranceHomeCents ?? null,
      annual_repairs_cents: parsed.annualRepairsCents ?? null,
      home_office_notes: parsed.homeOfficeNotes ?? null,
    },
    { onConflict: 'chef_id,tax_year' }
  )

  if (error) throw new Error(`Failed to save home office settings: ${error.message}`)
  revalidatePath('/finance/tax/home-office')
  revalidatePath('/finance/tax/year-end')
}

export async function getHomeOfficeDeduction(taxYear: number): Promise<HomeOfficeDeductionResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await (supabase as any)
    .from('tax_settings')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('tax_year', taxYear)
    .maybeSingle()

  const settings: HomeOfficeSettings | null = data
    ? {
        taxYear: data.tax_year,
        homeDeductionMethod: data.home_deduction_method || 'simplified',
        homeOfficeSqft: data.home_office_sqft,
        homeTotalSqft: data.home_total_sqft,
        annualRentMortgageCents: data.annual_rent_mortgage_cents,
        annualUtilitiesCents: data.annual_utilities_cents,
        annualInsuranceHomeCents: data.annual_insurance_home_cents,
        annualRepairsCents: data.annual_repairs_cents,
        homeOfficeNotes: data.home_office_notes,
      }
    : null

  const homeOfficeSqft = settings?.homeOfficeSqft ?? 0
  const homeTotalSqft = settings?.homeTotalSqft ?? 0
  const sqftPercentage = homeTotalSqft > 0 ? homeOfficeSqft / homeTotalSqft : 0

  // Simplified method
  const effectiveSqft = Math.min(homeOfficeSqft, SIMPLIFIED_MAX_SQFT)
  const simplifiedDeductionCents = Math.min(
    effectiveSqft * SIMPLIFIED_RATE_CENTS_PER_SQFT,
    SIMPLIFIED_MAX_DEDUCTION_CENTS
  )

  // Actual method
  const totalHomeExpensesCents =
    (settings?.annualRentMortgageCents ?? 0) +
    (settings?.annualUtilitiesCents ?? 0) +
    (settings?.annualInsuranceHomeCents ?? 0) +
    (settings?.annualRepairsCents ?? 0)
  const actualDeductionCents = Math.round(totalHomeExpensesCents * sqftPercentage)

  const recommendedMethod: 'simplified' | 'actual' =
    actualDeductionCents > simplifiedDeductionCents ? 'actual' : 'simplified'
  const recommendedMethodDeductionCents = Math.max(simplifiedDeductionCents, actualDeductionCents)

  const selectedMethod = settings?.homeDeductionMethod ?? 'simplified'
  const selectedMethodDeductionCents =
    selectedMethod === 'actual' ? actualDeductionCents : simplifiedDeductionCents

  return {
    settings,
    homeOfficeSqft,
    homeTotalSqft,
    sqftPercentage,
    simplifiedDeductionCents,
    totalHomeExpensesCents,
    actualDeductionCents,
    selectedMethodDeductionCents,
    recommendedMethodDeductionCents,
    recommendedMethod,
  }
}
