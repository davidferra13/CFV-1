// Tax Deduction Identifier - Deterministic Rule-Based Analysis
// Scans expenses for common missed deductions using IRS-defined rules.
// No AI needed - these are well-known tax categories with clear rules.
//
// References:
//   IRS Publication 463 - Travel, Gift, and Car Expenses
//   IRS Publication 587 - Business Use of Your Home
//   IRS Publication 946 - How To Depreciate Property
//   Schedule C (Form 1040) - Profit or Loss from Business

// ── Types (match the AI version exactly) ───────────────────────────────────

export type DeductionFlag = {
  category: string
  description: string
  estimatedAnnualValueCents: number | null
  affectedEntries: string[]
  action: string
  priority: 'high' | 'medium' | 'low'
}

export type TaxDeductionResult = {
  flags: DeductionFlag[]
  totalEstimatedMissedCents: number
  summary: string
  disclaimer: string
  confidence: 'high' | 'medium' | 'low'
}

// ── Input types ────────────────────────────────────────────────────────────

export type ExpenseEntry = {
  description: string | null
  amount_cents: number | null
  category: string | null
  date: string | null
  notes: string | null
}

export type MileageEntry = {
  miles: number | null
  purpose: string | null
  date: string | null
}

// ── IRS Constants (2024 rates) ─────────────────────────────────────────────

/** IRS standard mileage rate: 67 cents/mile for 2024 */
const IRS_MILEAGE_RATE_CENTS = 67

/** Equipment depreciation threshold - items >$2,500 should be depreciated */
const DEPRECIATION_THRESHOLD_CENTS = 250000

/** Home office simplified method: $5/sq ft, max 300 sq ft = $1,500 */
const HOME_OFFICE_SIMPLIFIED_MAX_CENTS = 150000

// ── Rule Engine ────────────────────────────────────────────────────────────

/**
 * Identifies potentially missed or miscategorized tax deductions.
 * Pure rule-based analysis - no AI, no network, deterministic.
 * Returns the exact same type as the AI version for drop-in compatibility.
 */
export function identifyDeductionsFormula(
  expenses: ExpenseEntry[],
  mileageLogs: MileageEntry[]
): TaxDeductionResult {
  const flags: DeductionFlag[] = []

  // ── 1. Mileage Deduction Check ──────────────────────────────────────

  const totalMiles = mileageLogs.reduce((sum, m) => sum + (m.miles ?? 0), 0)

  if (mileageLogs.length === 0) {
    // No mileage tracked at all
    flags.push({
      category: 'Mileage',
      description:
        'No mileage logs found. Private chefs typically drive to grocery stores, events, and supply runs. This is often the single largest missed deduction.',
      estimatedAnnualValueCents: IRS_MILEAGE_RATE_CENTS * 5000, // estimate 5000 miles/year
      affectedEntries: [],
      action:
        'Start tracking mileage for all business-related driving: grocery runs, event travel, supply pickups. Use an app like MileIQ or Everlance.',
      priority: 'high',
    })
  } else if (totalMiles < 1000) {
    // Suspiciously low mileage for a working chef
    flags.push({
      category: 'Mileage',
      description: `Only ${totalMiles} miles logged. Most private chefs drive 3,000–10,000 business miles/year. You may be missing trips.`,
      estimatedAnnualValueCents: IRS_MILEAGE_RATE_CENTS * (3000 - totalMiles),
      affectedEntries: [],
      action: 'Review your trips - are you logging grocery runs, event travel, and supply pickups?',
      priority: 'medium',
    })
  }

  // ── 2. Home Office Deduction ────────────────────────────────────────

  const hasHomeOffice = expenses.some(
    (e) =>
      (e.category === 'rent' || e.description?.toLowerCase().includes('home office')) &&
      e.description?.toLowerCase().includes('home')
  )

  if (!hasHomeOffice) {
    flags.push({
      category: 'Home Office',
      description:
        'No home office deduction found. If you use a dedicated space at home for meal planning, admin work, or client communications, you may qualify.',
      estimatedAnnualValueCents: HOME_OFFICE_SIMPLIFIED_MAX_CENTS,
      affectedEntries: [],
      action:
        'If you use a regular, exclusive space at home for business, consider the simplified deduction ($5/sq ft, max 300 sq ft = $1,500/year).',
      priority: 'medium',
    })
  }

  // ── 3. Equipment Depreciation Check ─────────────────────────────────

  const potentialEquipment = expenses.filter((e) => {
    const desc = (e.description ?? '').toLowerCase()
    const amt = e.amount_cents ?? 0
    const cat = e.category ?? ''
    // High-value items categorized as supplies instead of equipment
    return (
      (cat === 'supplies' || cat === 'food_cost' || cat === 'other') &&
      amt > DEPRECIATION_THRESHOLD_CENTS
    )
  })

  if (potentialEquipment.length > 0) {
    flags.push({
      category: 'Equipment Depreciation',
      description: `${potentialEquipment.length} expense${potentialEquipment.length > 1 ? 's' : ''} over $${(DEPRECIATION_THRESHOLD_CENTS / 100).toFixed(0)} may be equipment that should be depreciated or expensed under Section 179.`,
      estimatedAnnualValueCents: null,
      affectedEntries: potentialEquipment.map(
        (e) =>
          `${e.description ?? 'Unknown'}: $${((e.amount_cents ?? 0) / 100).toFixed(2)} (${e.category ?? 'uncategorized'})`
      ),
      action:
        'Review these items. Equipment over $2,500 should typically be depreciated over its useful life or immediately expensed under Section 179.',
      priority: 'high',
    })
  }

  // ── 4. Miscategorized Expenses ──────────────────────────────────────

  // Food items categorized as "other"
  const foodAsOther = expenses.filter((e) => {
    const desc = (e.description ?? '').toLowerCase()
    return (
      e.category === 'other' &&
      (desc.includes('grocery') ||
        desc.includes('whole foods') ||
        desc.includes('produce') ||
        desc.includes('meat') ||
        desc.includes('fish'))
    )
  })

  if (foodAsOther.length > 0) {
    const totalMissed = foodAsOther.reduce((sum, e) => sum + (e.amount_cents ?? 0), 0)
    flags.push({
      category: 'Miscategorized Food Costs',
      description: `${foodAsOther.length} expense${foodAsOther.length > 1 ? 's' : ''} appear to be food costs but are categorized as "other."`,
      estimatedAnnualValueCents: totalMissed,
      affectedEntries: foodAsOther.map(
        (e) => `${e.description ?? 'Unknown'}: $${((e.amount_cents ?? 0) / 100).toFixed(2)}`
      ),
      action: 'Recategorize these as "food_cost" for accurate Schedule C reporting.',
      priority: 'low',
    })
  }

  // ── 5. Professional Development ─────────────────────────────────────

  const hasProfDev = expenses.some((e) => {
    const desc = (e.description ?? '').toLowerCase()
    return (
      desc.includes('class') ||
      desc.includes('course') ||
      desc.includes('workshop') ||
      desc.includes('book') ||
      desc.includes('subscription') ||
      desc.includes('masterclass') ||
      desc.includes('training')
    )
  })

  if (!hasProfDev) {
    flags.push({
      category: 'Professional Development',
      description:
        'No professional development expenses found. Cooking classes, books, subscriptions, and industry conferences are deductible.',
      estimatedAnnualValueCents: null,
      affectedEntries: [],
      action:
        'If you take any cooking classes, buy cookbooks, subscribe to culinary publications, or attend food industry events - log these as deductible expenses.',
      priority: 'low',
    })
  }

  // ── 6. Health Insurance ─────────────────────────────────────────────

  const hasHealthInsurance = expenses.some((e) => {
    const desc = (e.description ?? '').toLowerCase()
    return (
      desc.includes('health insurance') ||
      desc.includes('medical insurance') ||
      desc.includes('dental insurance') ||
      desc.includes('vision insurance') ||
      (e.category === 'insurance' && desc.includes('health'))
    )
  })

  if (!hasHealthInsurance) {
    flags.push({
      category: 'Health Insurance Premium',
      description:
        'No health insurance premiums found. Self-employed individuals can deduct health, dental, and vision insurance premiums.',
      estimatedAnnualValueCents: null,
      affectedEntries: [],
      action:
        'If you pay for your own health insurance, log the premiums as a business deduction. This goes on Form 1040, not Schedule C.',
      priority: 'medium',
    })
  }

  // ── 7. Marketing & Advertising ──────────────────────────────────────

  const hasMarketing = expenses.some((e) => e.category === 'marketing')

  if (!hasMarketing && expenses.length > 20) {
    flags.push({
      category: 'Marketing & Advertising',
      description:
        'No marketing expenses logged. Website hosting, business cards, photography, and social media costs are deductible.',
      estimatedAnnualValueCents: null,
      affectedEntries: [],
      action:
        'Log any business card printing, website costs, food photography, or social media advertising as marketing expenses.',
      priority: 'low',
    })
  }

  // ── Calculate totals ────────────────────────────────────────────────

  const totalEstimatedMissed = flags.reduce((sum, f) => sum + (f.estimatedAnnualValueCents ?? 0), 0)

  // Build summary
  const highPriority = flags.filter((f) => f.priority === 'high').length
  const medPriority = flags.filter((f) => f.priority === 'medium').length

  let summary: string
  if (flags.length === 0) {
    summary = 'No obvious missed deductions found. Your expense tracking appears thorough.'
  } else {
    summary = `Found ${flags.length} potential deduction issue${flags.length > 1 ? 's' : ''}`
    if (highPriority > 0) summary += ` (${highPriority} high priority)`
    if (totalEstimatedMissed > 0) {
      summary += `. Estimated missed deductions: $${(totalEstimatedMissed / 100).toFixed(0)}/year`
    }
    summary += '.'
  }

  return {
    flags,
    totalEstimatedMissedCents: totalEstimatedMissed,
    summary,
    disclaimer:
      'This analysis is for informational purposes only and does not constitute tax advice. Tax rules vary by state and situation. Always consult a licensed CPA or tax professional for your specific circumstances.',
    confidence: expenses.length >= 50 ? 'high' : expenses.length >= 20 ? 'medium' : 'low',
  }
}
