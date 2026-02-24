// Equipment Depreciation Calculator — Deterministic Formula
// Straight-line depreciation is a textbook formula: (cost - salvage) / useful life.
// No AI needed. This is the same math every accounting textbook uses.
//
// Reference: IRS Publication 946 — How To Depreciate Property
// Default method: Straight-line (most common for small business kitchen equipment)
// Default useful life: 5 years (IRS MACRS class for restaurant equipment)
// Default salvage value: $0 (standard for most kitchen equipment)

// ── Types (match the AI version's output exactly) ──────────────────────────

export type EquipmentExplanation = {
  itemName: string
  purchasePriceDollars: number
  purchaseDate: string
  depreciationMethod: string
  annualDeductionDollars: number
  yearInSchedule: number
  remainingValueDollars: number
  fullyDepreciatedDate: string
  plainEnglishExplanation: string
  bonusDepreciationNote: string | null
}

export type EquipmentDepreciationReport = {
  items: EquipmentExplanation[]
  totalAnnualDeductionDollars: number
  currentYearSummary: string
  disclaimer: string
  generatedAt: string
}

// ── Input type ─────────────────────────────────────────────────────────────

export type EquipmentItem = {
  name: string
  purchase_price_cents: number | null
  purchase_date: string | null
  depreciation_years: number | null
  depreciation_method: string | null
  category: string | null
}

// ── Section 179 threshold (2024 IRS limit — updated annually) ──────────────
// For 2024: $1,220,000 total limit, per-item no limit for most equipment
// Private chefs rarely hit this cap, but we note when it applies.
const SECTION_179_PER_ITEM_THRESHOLD_DOLLARS = 2500

// ── Formula ────────────────────────────────────────────────────────────────

/**
 * Calculates equipment depreciation using straight-line method.
 * Pure math — no AI, no network, no dependencies.
 * Returns the exact same type as the AI version for drop-in compatibility.
 */
export function calculateDepreciationFormula(
  equipment: EquipmentItem[],
  currentYear?: number
): EquipmentDepreciationReport {
  const year = currentYear ?? new Date().getFullYear()

  if (equipment.length === 0) {
    return {
      items: [],
      totalAnnualDeductionDollars: 0,
      currentYearSummary:
        'No equipment items with depreciation tracked yet. Add equipment items in the Equipment section.',
      disclaimer:
        'This is educational information only and does not constitute tax advice. Consult a licensed CPA for precise depreciation treatment for your specific situation.',
      generatedAt: new Date().toISOString(),
    }
  }

  const items: EquipmentExplanation[] = []
  let totalAnnualDeduction = 0

  for (const eq of equipment) {
    const priceCents = eq.purchase_price_cents ?? 0
    const priceDollars = priceCents / 100
    const purchaseDateStr = eq.purchase_date ?? `${year}-01-01`
    const usefulLife = eq.depreciation_years ?? 5
    const method = eq.depreciation_method ?? 'straight_line'

    // Parse purchase year
    const purchaseYear = parseInt(purchaseDateStr.slice(0, 4), 10) || year

    // Straight-line depreciation: cost / useful life (salvage = $0)
    const annualDeduction = usefulLife > 0 ? Math.round((priceDollars / usefulLife) * 100) / 100 : 0

    // Which year in the schedule are we?
    const yearsElapsed = year - purchaseYear
    const yearInSchedule = Math.min(yearsElapsed + 1, usefulLife)
    const isFullyDepreciated = yearsElapsed >= usefulLife

    // Remaining depreciable value
    const totalDepreciatedSoFar = Math.min(annualDeduction * yearsElapsed, priceDollars)
    const remainingValue = Math.max(priceDollars - totalDepreciatedSoFar, 0)

    // When fully depreciated
    const fullyDepreciatedYear = purchaseYear + usefulLife
    const fullyDepreciatedDate = `${fullyDepreciatedYear}`

    // Annual deduction this year (0 if fully depreciated)
    const thisYearDeduction = isFullyDepreciated ? 0 : annualDeduction

    // Plain English explanation
    let explanation: string
    if (isFullyDepreciated) {
      explanation = `Your ${eq.name} was fully depreciated in ${fullyDepreciatedYear}. It no longer provides a tax deduction, but you can continue using it.`
    } else if (yearInSchedule === 1) {
      explanation = `Your ${eq.name} is in its first year of a ${usefulLife}-year depreciation schedule. You can deduct $${annualDeduction.toFixed(2)} this year.`
    } else {
      explanation = `Your ${eq.name} is in year ${yearInSchedule} of ${usefulLife}. You can deduct $${annualDeduction.toFixed(2)} this year, with $${remainingValue.toFixed(2)} remaining to depreciate.`
    }

    // Section 179 note
    let bonusNote: string | null = null
    if (priceDollars <= SECTION_179_PER_ITEM_THRESHOLD_DOLLARS && yearInSchedule === 1) {
      bonusNote = `At $${priceDollars.toFixed(2)}, this item may qualify for full first-year expensing under IRS de minimis safe harbor (items ≤$2,500). Ask your CPA.`
    } else if (priceDollars > SECTION_179_PER_ITEM_THRESHOLD_DOLLARS && yearInSchedule === 1) {
      bonusNote = `This item may qualify for Section 179 immediate expensing or bonus depreciation. Consult your CPA for the most advantageous treatment.`
    }

    totalAnnualDeduction += thisYearDeduction

    items.push({
      itemName: eq.name,
      purchasePriceDollars: priceDollars,
      purchaseDate: purchaseDateStr,
      depreciationMethod:
        method === 'straight_line'
          ? `Straight-line over ${usefulLife} years`
          : `${method} over ${usefulLife} years`,
      annualDeductionDollars: thisYearDeduction,
      yearInSchedule,
      remainingValueDollars: Math.round(remainingValue * 100) / 100,
      fullyDepreciatedDate,
      plainEnglishExplanation: explanation,
      bonusDepreciationNote: bonusNote,
    })
  }

  totalAnnualDeduction = Math.round(totalAnnualDeduction * 100) / 100

  // Current year summary
  const activeItems = items.filter((i) => i.annualDeductionDollars > 0)
  const fullyDepreciatedItems = items.filter((i) => i.annualDeductionDollars === 0)
  let summary: string
  if (activeItems.length === 0) {
    summary = `All ${items.length} equipment items are fully depreciated. No deductions available for ${year}.`
  } else {
    summary = `For ${year}, you have $${totalAnnualDeduction.toFixed(2)} in total equipment depreciation deductions across ${activeItems.length} item${activeItems.length > 1 ? 's' : ''}.`
    if (fullyDepreciatedItems.length > 0) {
      summary += ` ${fullyDepreciatedItems.length} item${fullyDepreciatedItems.length > 1 ? 's are' : ' is'} fully depreciated.`
    }
  }

  return {
    items,
    totalAnnualDeductionDollars: totalAnnualDeduction,
    currentYearSummary: summary,
    disclaimer:
      'This is educational information only and does not constitute tax advice. Consult a licensed CPA for precise depreciation treatment for your specific situation.',
    generatedAt: new Date().toISOString(),
  }
}
