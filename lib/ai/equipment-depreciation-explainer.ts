'use server'

// Equipment Depreciation Plain-Language Explainer
// Pure formula: straight-line depreciation is textbook math. No AI needed.
// Output is INFORMATIONAL ONLY - always recommends consulting a CPA.
//
// Previously used Ollama for "prettier" plain-English explanations.
// Removed: the formula already generates clear explanations, and AI adds
// hallucination risk to financial/tax information with zero accuracy benefit.
// Reference: IRS Publication 946.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { calculateDepreciationFormula } from '@/lib/formulas/depreciation'
import type { EquipmentItem, EquipmentDepreciationReport } from '@/lib/formulas/depreciation'

// Re-export types for consumers
export type { EquipmentExplanation, EquipmentDepreciationReport } from '@/lib/formulas/depreciation'

export async function explainEquipmentDepreciation(): Promise<EquipmentDepreciationReport> {
  const user = await requireChef()
  const supabase = createServerClient()

  // equipment_items uses chef_id (not tenant_id) and useful_life_years (not depreciation_years)
  const { data: equipment } = await supabase
    .from('equipment_items')
    .select(
      'name, purchase_price_cents, purchase_date, useful_life_years, depreciation_method, category'
    )
    .eq('chef_id', user.tenantId!)
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

  // Map DB columns to formula's expected EquipmentItem shape
  const formulaEquipment: EquipmentItem[] = equipment.map((e) => ({
    name: e.name,
    purchase_price_cents: e.purchase_price_cents,
    purchase_date: e.purchase_date,
    depreciation_years: e.useful_life_years,
    depreciation_method: e.depreciation_method,
    category: e.category,
  }))

  // Pure math. Same answer every time. Instant. Free. No hallucination risk.
  return calculateDepreciationFormula(formulaEquipment, currentYear)
}
