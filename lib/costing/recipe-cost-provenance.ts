// Recipe Cost Provenance
// Computes a structured confidence assessment for a recipe's cost data.
// Pure function: no DB calls, no AI. Consumes data already fetched by getRecipeById().
// This is the foundation layer: recipe confidence -> menu confidence -> quote confidence.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CostConfidenceLevel = 'high' | 'moderate' | 'low' | 'insufficient'

export type ProvenanceIssue = {
  severity: 'info' | 'warning' | 'critical'
  code: string
  message: string
  ingredientName?: string
}

export type IngredientProvenance = {
  name: string
  costCents: number | null
  costStatus: 'reconciled' | 'accurate' | 'estimated' | 'stale' | 'no_price'
  priceSource: string | null
  priceConfidence: number | null
  priceFreshnessDays: number | null
  yieldPct: number | null
  isDefaultYield: boolean
  trendDirection: 'up' | 'down' | 'flat' | null
  trendPct: number | null
}

export type RecipeCostProvenance = {
  // Confidence verdict
  confidenceLevel: CostConfidenceLevel
  confidenceScore: number // 0-100
  confidenceLabel: string // human-readable sentence

  // Coverage
  totalIngredients: number
  pricedCount: number
  coveragePct: number

  // Freshness breakdown
  freshCount: number // price within 7 days
  recentCount: number // price 8-30 days
  agingCount: number // price 31-90 days
  staleCount: number // price > 90 days
  noPriceCount: number

  // Quality signals
  avgPriceConfidence: number | null // 0-1 from PIE
  lowConfidenceCount: number // ingredients below 0.5 confidence
  unitMismatchCount: number
  defaultYieldCount: number

  // Per-ingredient detail (for expandable UI)
  ingredients: IngredientProvenance[]

  // Actionable issues
  issues: ProvenanceIssue[]
}

// ---------------------------------------------------------------------------
// Input type (matches getRecipeById() return shape)
// ---------------------------------------------------------------------------

export type RecipeProvenanceInput = {
  ingredients: Array<{
    ingredient: {
      name: string
      last_price_source: string | null
      last_price_confidence: number | null
      price_trend_direction: string | null
      price_trend_pct: number | null
    }
    quantity: number
    unit: string
    computedCostCents: number | null
    costStatus: 'reconciled' | 'accurate' | 'estimated' | 'stale' | 'no_price'
  }>
  costSummary: {
    ingredientCount: number
    totalCostCents: number | null
    hasAllPrices: boolean
    avgPriceConfidence: number | null
    lowConfidenceCount: number
    lastPriceUpdatedAt: string | null
  } | null
  costIssues: {
    missingPrices: number
    unitMismatches: number
    stalePrices: number
  }
  // Optional: raw ingredient data for freshness/yield analysis
  rawIngredients?: Array<{
    name: string
    lastPriceDate: string | null
    yieldPct: number | null
    defaultYieldPct: number | null
  }>
}

// ---------------------------------------------------------------------------
// Computation
// ---------------------------------------------------------------------------

export function computeRecipeCostProvenance(input: RecipeProvenanceInput): RecipeCostProvenance {
  const { ingredients, costSummary, costIssues } = input

  const total = costSummary?.ingredientCount ?? ingredients.length
  const missingPrices = costIssues.missingPrices
  const pricedCount = total - missingPrices
  const coveragePct = total > 0 ? Math.round((pricedCount / total) * 100) : 0

  // Freshness breakdown from ingredient price dates
  let freshCount = 0
  let recentCount = 0
  let agingCount = 0
  let staleCount = costIssues.stalePrices
  let defaultYieldCount = 0

  const now = Date.now()
  const ingredientProvenances: IngredientProvenance[] = []

  for (const ri of ingredients) {
    const ing = ri.ingredient
    const lastPriceDate = input.rawIngredients?.find((raw) => raw.name === ing.name)?.lastPriceDate

    let freshnessDays: number | null = null
    if (lastPriceDate) {
      freshnessDays = Math.floor((now - new Date(lastPriceDate).getTime()) / 86_400_000)
    }

    // Freshness bucketing (only for priced ingredients)
    if (ri.costStatus !== 'no_price' && freshnessDays != null) {
      if (freshnessDays <= 7) freshCount++
      else if (freshnessDays <= 30) recentCount++
      else if (freshnessDays <= 90) agingCount++
      // staleCount already computed from costIssues
    }

    // Yield check
    const rawIng = input.rawIngredients?.find((raw) => raw.name === ing.name)
    const yieldPct = rawIng?.yieldPct ?? null
    const defaultYield = rawIng?.defaultYieldPct ?? 1.0
    const isDefaultYield = yieldPct == null || yieldPct === 1.0 || yieldPct === defaultYield

    // Only flag default yield for ingredients that typically have trim loss
    // (proteins, produce, seafood, herbs)
    if (isDefaultYield && ri.costStatus !== 'no_price') {
      defaultYieldCount++
    }

    ingredientProvenances.push({
      name: ing.name,
      costCents: ri.computedCostCents,
      costStatus: ri.costStatus,
      priceSource: ing.last_price_source,
      priceConfidence: ing.last_price_confidence,
      priceFreshnessDays: freshnessDays,
      yieldPct,
      isDefaultYield,
      trendDirection: (ing.price_trend_direction as 'up' | 'down' | 'flat') ?? null,
      trendPct: ing.price_trend_pct ?? null,
    })
  }

  // Compute confidence score (0-100)
  let score = 0

  // Coverage (40 points max)
  score += Math.round(coveragePct * 0.4)

  // Freshness (25 points max)
  if (pricedCount > 0) {
    const freshPct = (freshCount + recentCount) / pricedCount
    score += Math.round(freshPct * 25)
  }

  // Price confidence quality (20 points max)
  const avgConf = costSummary?.avgPriceConfidence ?? null
  if (avgConf != null) {
    score += Math.round(avgConf * 20)
  } else if (pricedCount > 0) {
    // No confidence data but has prices: give partial credit
    score += 10
  }

  // No unit mismatches (10 points max)
  if (total > 0) {
    const cleanPct = Math.max(0, 1 - costIssues.unitMismatches / total)
    score += Math.round(cleanPct * 10)
  }

  // Bonus for reconciled (receipt-confirmed) ingredients: +5 max
  const reconciledCount = ingredients.filter((i) => i.costStatus === 'reconciled').length
  if (reconciledCount > 0 && total > 0) {
    score += Math.round((reconciledCount / total) * 5)
  }

  // Penalty for low confidence ingredients
  const lowConf = costSummary?.lowConfidenceCount ?? 0
  if (lowConf > 0 && total > 0) {
    score -= Math.min(10, Math.round((lowConf / total) * 15))
  }

  score = Math.max(0, Math.min(100, score))

  // Determine confidence level
  let confidenceLevel: CostConfidenceLevel
  if (total === 0 || coveragePct === 0) {
    confidenceLevel = 'insufficient'
  } else if (score >= 75) {
    confidenceLevel = 'high'
  } else if (score >= 45) {
    confidenceLevel = 'moderate'
  } else {
    confidenceLevel = 'low'
  }

  // Build human-readable label
  const confidenceLabel = buildConfidenceLabel(
    confidenceLevel,
    pricedCount,
    total,
    freshCount + recentCount,
    staleCount,
    missingPrices,
    costIssues.unitMismatches
  )

  // Build issues list
  const issues = buildIssues(
    costIssues,
    staleCount,
    lowConf,
    defaultYieldCount,
    total,
    pricedCount,
    ingredientProvenances
  )

  return {
    confidenceLevel,
    confidenceScore: score,
    confidenceLabel,
    totalIngredients: total,
    pricedCount,
    coveragePct,
    freshCount,
    recentCount,
    agingCount,
    staleCount,
    noPriceCount: missingPrices,
    avgPriceConfidence: avgConf,
    lowConfidenceCount: lowConf,
    unitMismatchCount: costIssues.unitMismatches,
    defaultYieldCount,
    ingredients: ingredientProvenances,
    issues,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildConfidenceLabel(
  level: CostConfidenceLevel,
  priced: number,
  total: number,
  fresh: number,
  stale: number,
  missing: number,
  unitMismatches: number
): string {
  if (level === 'insufficient') {
    if (total === 0) return 'No ingredients added yet.'
    return `${missing} of ${total} ingredients have no price data. Cost cannot be calculated.`
  }

  const parts: string[] = []
  parts.push(`${priced}/${total} ingredients priced`)

  if (fresh > 0 && fresh === priced) {
    parts.push('all prices current')
  } else if (stale > 0) {
    parts.push(`${stale} stale`)
  }

  if (unitMismatches > 0) {
    parts.push(`${unitMismatches} estimated`)
  }

  if (missing > 0 && missing < total) {
    parts.push(`${missing} missing`)
  }

  return parts.join(', ') + '.'
}

function buildIssues(
  costIssues: RecipeProvenanceInput['costIssues'],
  staleCount: number,
  lowConfidenceCount: number,
  defaultYieldCount: number,
  total: number,
  priced: number,
  ingredients: IngredientProvenance[]
): ProvenanceIssue[] {
  const issues: ProvenanceIssue[] = []

  // Critical: majority unpriced
  if (total > 0 && costIssues.missingPrices > total * 0.5) {
    issues.push({
      severity: 'critical',
      code: 'majority_unpriced',
      message: `${costIssues.missingPrices} of ${total} ingredients have no price. Cost total is unreliable.`,
    })
  } else if (costIssues.missingPrices > 0) {
    // Warning: some unpriced
    const unpriced = ingredients.filter((i) => i.costStatus === 'no_price').map((i) => i.name)
    issues.push({
      severity: 'warning',
      code: 'missing_prices',
      message: `${costIssues.missingPrices} ingredient${costIssues.missingPrices > 1 ? 's' : ''} missing price data: ${unpriced.slice(0, 3).join(', ')}${unpriced.length > 3 ? ` (+${unpriced.length - 3} more)` : ''}.`,
    })
  }

  // Warning: stale prices
  if (staleCount > 0) {
    const staleNames = ingredients.filter((i) => i.costStatus === 'stale').map((i) => i.name)
    issues.push({
      severity: staleCount > 2 ? 'warning' : 'info',
      code: 'stale_prices',
      message: `${staleCount} ingredient${staleCount > 1 ? 's' : ''} priced over 90 days ago: ${staleNames.slice(0, 3).join(', ')}${staleNames.length > 3 ? ` (+${staleNames.length - 3} more)` : ''}.`,
    })
  }

  // Info: unit mismatches
  if (costIssues.unitMismatches > 0) {
    issues.push({
      severity: 'info',
      code: 'unit_mismatches',
      message: `${costIssues.unitMismatches} ingredient${costIssues.unitMismatches > 1 ? 's' : ''} with unit mismatch (cost is estimated, not exact).`,
    })
  }

  // Info: low confidence prices
  if (lowConfidenceCount > 0) {
    const lowNames = ingredients
      .filter((i) => i.priceConfidence != null && i.priceConfidence < 0.5)
      .map((i) => i.name)
    issues.push({
      severity: lowConfidenceCount > 2 ? 'warning' : 'info',
      code: 'low_confidence',
      message: `${lowConfidenceCount} ingredient${lowConfidenceCount > 1 ? 's' : ''} with low price confidence: ${lowNames.slice(0, 3).join(', ')}${lowNames.length > 3 ? ` (+${lowNames.length - 3} more)` : ''}.`,
    })
  }

  // Info: price volatility
  const risingFast = ingredients.filter((i) => i.trendDirection === 'up' && (i.trendPct ?? 0) >= 10)
  if (risingFast.length > 0) {
    issues.push({
      severity: 'warning',
      code: 'price_volatility',
      message: `${risingFast.length} ingredient${risingFast.length > 1 ? 's' : ''} trending up 10%+: ${risingFast
        .map((i) => i.name)
        .slice(0, 3)
        .join(', ')}. Re-cost before quoting.`,
    })
  }

  return issues
}

// ---------------------------------------------------------------------------
// Confidence level utilities
// ---------------------------------------------------------------------------

export const CONFIDENCE_COLORS: Record<
  CostConfidenceLevel,
  { text: string; bg: string; border: string }
> = {
  high: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-900/60',
    border: 'border-emerald-700/40',
  },
  moderate: {
    text: 'text-amber-400',
    bg: 'bg-amber-900/60',
    border: 'border-amber-700/40',
  },
  low: {
    text: 'text-red-400',
    bg: 'bg-red-900/60',
    border: 'border-red-700/40',
  },
  insufficient: {
    text: 'text-stone-500',
    bg: 'bg-stone-800/60',
    border: 'border-stone-700/40',
  },
}

export const CONFIDENCE_LABELS: Record<CostConfidenceLevel, string> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  low: 'Low confidence',
  insufficient: 'Insufficient data',
}
