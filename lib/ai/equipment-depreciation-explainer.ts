// @ts-nocheck
'use server'

// Equipment Depreciation Plain-Language Explainer
// AI explains each piece of equipment's depreciation schedule in chef-friendly language.
// Routed to local Ollama (tax education, stays private).
// Output is INFORMATIONAL ONLY — always recommends consulting a CPA.
// Falls back to formula result if Ollama is offline (no data leak, just less pretty text).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from './parse-ollama'
import { OllamaOfflineError } from './ollama-errors'
import { z } from 'zod'
import { calculateDepreciationFormula } from '@/lib/formulas/depreciation'

export interface EquipmentExplanation {
  itemName: string
  purchasePriceDollars: number
  purchaseDate: string
  depreciationMethod: string // e.g. "Straight-line over 5 years"
  annualDeductionDollars: number
  yearInSchedule: number // e.g. "Year 2 of 5"
  remainingValueDollars: number
  fullyDepreciatedDate: string
  plainEnglishExplanation: string // what this means in simple terms
  bonusDepreciationNote: string | null // if Section 179 or bonus depreciation applies
}

export interface EquipmentDepreciationReport {
  items: EquipmentExplanation[]
  totalAnnualDeductionDollars: number
  currentYearSummary: string
  disclaimer: string
  generatedAt: string
}

const EquipmentExplanationSchema = z.object({
  itemName: z.string(),
  purchasePriceDollars: z.number(),
  purchaseDate: z.string(),
  depreciationMethod: z.string(),
  annualDeductionDollars: z.number(),
  yearInSchedule: z.number(),
  remainingValueDollars: z.number(),
  fullyDepreciatedDate: z.string(),
  plainEnglishExplanation: z.string(),
  bonusDepreciationNote: z.string().nullable(),
})

const EquipmentReportSchema = z.object({
  items: z.array(EquipmentExplanationSchema),
  totalAnnualDeductionDollars: z.number(),
  currentYearSummary: z.string(),
})

export async function explainEquipmentDepreciation(): Promise<EquipmentDepreciationReport> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: equipment } = await supabase
    .from('equipment_items')
    .select(
      'name, purchase_price_cents, purchase_date, depreciation_years, depreciation_method, category'
    )
    .eq('tenant_id', user.tenantId!)
    .gt('purchase_price_cents', 0)
    .order('purchase_date', { ascending: false })
    .limit(30)

  if (!equipment || equipment.length === 0) {
    return {
      items: [],
      totalAnnualDeductionDollars: 0,
      currentYearSummary:
        'No equipment items with depreciation tracked yet. Add equipment items in the Equipment section.',
      disclaimer:
        'This is educational information only. Consult a CPA for precise tax treatment of your equipment.',
      generatedAt: new Date().toISOString(),
    }
  }

  const currentYear = new Date().getFullYear()
  const equipmentList = equipment.map((e: any) => ({
    name: e.name,
    priceDollars: (e.purchase_price_cents ?? 0) / 100,
    purchaseDate: e.purchase_date ?? 'Unknown',
    depreciationYears: e.depreciation_years ?? 5,
    method: e.depreciation_method ?? 'straight_line',
  }))

  const systemPrompt = `You are a CPA explaining equipment depreciation to a private chef in plain English.
Explain each item's depreciation schedule without jargon.

For each item, calculate and explain:
1. Annual deduction (straight-line = cost / years; other methods as appropriate)
2. What year in the schedule they're in
3. Remaining depreciable value
4. When it's fully depreciated
5. Plain-English explanation the chef can understand
6. Note if Section 179 immediate expensing or bonus depreciation might apply

Return JSON with keys: items (array of objects with itemName, purchasePriceDollars, purchaseDate, depreciationMethod, annualDeductionDollars, yearInSchedule, remainingValueDollars, fullyDepreciatedDate, plainEnglishExplanation, bonusDepreciationNote), totalAnnualDeductionDollars (number), currentYearSummary (string).`

  const userContent = `Current year: ${currentYear}

Equipment items:
${equipmentList.map((e) => `- ${e.name}: $${e.priceDollars.toFixed(2)}, purchased ${e.purchaseDate}, depreciation: ${e.depreciationYears}-year ${e.method}`).join('\n')}`

  // Formula: straight-line depreciation — always runs first (pure math, always correct)
  const formulaResult = calculateDepreciationFormula(equipment, currentYear)

  // Try AI enhancement (Ollama) for richer plain-English explanations
  // If Ollama is offline → fall back to formulaResult (no data leak, just less pretty text)
  try {
    const parsed = await parseWithOllama(systemPrompt, userContent, EquipmentReportSchema, {
      modelTier: 'standard',
      timeoutMs: 60_000,
    })

    return {
      ...parsed,
      disclaimer:
        'This is educational information only and does not constitute tax advice. Consult a licensed CPA for precise depreciation treatment for your specific situation.',
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    // AI failed (offline, timeout, or other) — formula result is the reliable floor
    console.warn('[equipment-depreciation-explainer] AI unavailable, using formula result:', err)
    return formulaResult
  }
}
