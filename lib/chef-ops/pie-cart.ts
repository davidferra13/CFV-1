import { classifyPieReliability, summarizeReliabilityBuckets } from '@/lib/pricing/pie-reliability'

export type PieCartArtifactType = 'saved_cart' | 'logged_estimate' | 'snapshot_plan'
export type PieCartOptimizationMode =
  | 'balanced'
  | 'cheapest'
  | 'highest_confidence'
  | 'one_stop'
  | 'closest'
  | 'margin_rescue'
export type PieCartLockLevel = 'none' | 'quantity' | 'price' | 'store' | 'budget' | 'snapshot'
export type PieCartRiskFlag =
  | 'synthetic_price'
  | 'low_confidence'
  | 'stale_price'
  | 'price_spike'
  | 'budget_pressure'
  | 'margin_pressure'
  | 'availability_risk'
  | 'unit_conversion_review'
export type PieCartTaskKind =
  | 'review_price'
  | 'refresh_pie'
  | 'call_vendor'
  | 'substitute_item'
  | 'log_estimate'
  | 'create_snapshot'
  | 'shop'
  | 'reconcile_receipt'
  | 'rescue_margin'
  | 'create_procurement_brief'

export interface PieCartLineInput {
  id?: string
  ingredientName: string
  requiredQuantity: number
  unit: string
  unitPriceCents?: number | null
  lastSavedUnitPriceCents?: number | null
  actualUnitPriceCents?: number | null
  confidence?: number
  resolutionTier?:
    | 'chef_override'
    | 'chef_receipt'
    | 'wholesale'
    | 'zip_local'
    | 'regional'
    | 'market_state'
    | 'market_national'
    | 'government'
    | 'historical'
    | 'category_baseline'
    | 'synthetic'
    | 'none'
  freshness?: 'current' | 'recent' | 'stale' | 'unknown'
  sourceLabel?: string
  storeName?: string
  category?: 'protein' | 'produce' | 'dairy' | 'dry_goods' | 'spice' | 'bakery' | 'other'
  availability?: 'available' | 'limited' | 'unavailable' | 'unknown'
  volatility?: 'low' | 'medium' | 'high'
  substitutionAllowed?: boolean
  lockLevel?: PieCartLockLevel
  vendorContact?: {
    name: string
    phone?: string
    email?: string
    orderCutoff?: string
  }
  packSize?: {
    quantity: number
    unit: string
    priceCents?: number | null
  } | null
}

export interface PieCartLine {
  id: string
  ingredientName: string
  requiredQuantity: number
  unit: string
  unitPriceCents: number
  extendedPriceCents: number
  actualExtendedPriceCents: number | null
  fallbackUsed: boolean
  confidenceLabel: 'exact' | 'strong' | 'usable' | 'estimate' | 'synthetic_needs_review'
  provenanceLabel: string
  sourceLabel: string
  priceDriftCents: number
  priceDriftPct: number
  actualVarianceCents: number | null
  riskFlags: PieCartRiskFlag[]
  recommendedAction: PieCartTaskKind
  lockLevel: PieCartLockLevel
  purchasePlan: {
    packs: number
    packLabel: string
    buyQuantity: number
    leftoverQuantity: number
    leftoverValueCents: number
  }
}

export interface PieCartPlan {
  artifactType: PieCartArtifactType
  lines: PieCartLine[]
  totalCents: number
  actualTotalCents: number | null
  readiness: 'ready_to_shop' | 'needs_chef_review' | 'margin_risk' | 'low_confidence'
  nextActions: string[]
  intelligence: {
    optimizationMode: PieCartOptimizationMode
    reliability: ReturnType<typeof summarizeReliabilityBuckets>
    confidenceSla: 'green' | 'yellow' | 'red'
    driftCents: number
    driftPct: number
    highestRiskIngredients: string[]
    sourceTransparency: Array<{ label: string; count: number }>
  }
  economics: {
    quoteTotalCents: number | null
    budgetCeilingCents: number | null
    targetMarginPercent: number | null
    projectedMarginPercent: number | null
    marginProtected: boolean | null
    rescueActions: string[]
  }
  procurement: {
    itemCount: number
    fallbackCount: number
    reviewCount: number
    vendorCallCount: number
    lockedLineCount: number
    taskBoard: Array<{
      kind: PieCartTaskKind
      label: string
      ingredientName?: string
      priority: 'low' | 'medium' | 'high'
    }>
    commandCenter: Array<{ metric: string; value: string; status: 'ok' | 'watch' | 'block' }>
  }
}

export interface PieCartBuildOptions {
  optimizationMode?: PieCartOptimizationMode
  quoteTotalCents?: number | null
  budgetCeilingCents?: number | null
  targetMarginPercent?: number | null
}

const CATEGORY_FLOORS_CENTS: Record<NonNullable<PieCartLineInput['category']>, number> = {
  protein: 599,
  produce: 249,
  dairy: 399,
  dry_goods: 199,
  spice: 899,
  bakery: 349,
  other: 350,
}

function fallbackPrice(input: PieCartLineInput): number {
  if (input.unitPriceCents && input.unitPriceCents > 0) return input.unitPriceCents
  return CATEGORY_FLOORS_CENTS[input.category ?? 'other']
}

function confidenceLabel(
  confidence: number,
  fallbackUsed: boolean
): PieCartLine['confidenceLabel'] {
  if (fallbackUsed) return 'synthetic_needs_review'
  if (confidence >= 0.9) return 'exact'
  if (confidence >= 0.75) return 'strong'
  if (confidence >= 0.55) return 'usable'
  return 'estimate'
}

function lineId(line: PieCartLineInput, index: number): string {
  return line.id ?? `${line.ingredientName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index + 1}`
}

function provenanceLabel(line: PieCartLineInput, fallbackUsed: boolean): string {
  if (fallbackUsed) return 'Synthetic PIE fallback'
  if (line.sourceLabel) return line.sourceLabel
  switch (line.resolutionTier) {
    case 'chef_override':
      return 'Chef override'
    case 'chef_receipt':
      return 'Chef receipt'
    case 'wholesale':
      return 'Wholesale observation'
    case 'zip_local':
      return 'Local store observation'
    case 'regional':
    case 'market_state':
      return 'Regional PIE observation'
    case 'market_national':
    case 'government':
    case 'historical':
      return 'Non-local PIE estimate'
    case 'category_baseline':
      return 'Category baseline'
    case 'synthetic':
    case 'none':
    default:
      return 'Synthetic PIE fallback'
  }
}

function drift(currentCents: number, previousCents?: number | null) {
  if (!previousCents || previousCents <= 0) return { cents: 0, pct: 0 }
  const cents = currentCents - previousCents
  return { cents, pct: Math.round((cents / previousCents) * 100) }
}

function sourceTransparency(lines: PieCartLine[]) {
  const counts = new Map<string, number>()
  for (const line of lines)
    counts.set(line.provenanceLabel, (counts.get(line.provenanceLabel) ?? 0) + 1)
  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }))
}

function riskFlags(
  input: PieCartLineInput,
  fallbackUsed: boolean,
  priceDriftPct: number
): PieCartRiskFlag[] {
  const flags: PieCartRiskFlag[] = []
  const confidence = input.confidence ?? 0.35
  if (fallbackUsed || input.resolutionTier === 'synthetic' || input.resolutionTier === 'none') {
    flags.push('synthetic_price')
  }
  if (confidence < 0.55) flags.push('low_confidence')
  if (input.freshness === 'stale') flags.push('stale_price')
  if (priceDriftPct >= 15) flags.push('price_spike')
  if (input.availability === 'limited' || input.availability === 'unavailable') {
    flags.push('availability_risk')
  }
  if (input.unit.trim().length === 0 || input.requiredQuantity <= 0)
    flags.push('unit_conversion_review')
  return flags
}

function recommendedAction(flags: PieCartRiskFlag[], input: PieCartLineInput): PieCartTaskKind {
  if (flags.includes('availability_risk') && input.substitutionAllowed !== false)
    return 'substitute_item'
  if (input.vendorContact && (flags.includes('low_confidence') || flags.includes('stale_price'))) {
    return 'call_vendor'
  }
  if (flags.includes('synthetic_price') || flags.includes('low_confidence')) return 'review_price'
  if (flags.includes('stale_price')) return 'refresh_pie'
  return 'shop'
}

function buildPurchasePlan(line: PieCartLineInput, unitPriceCents: number) {
  const packQuantity =
    line.packSize?.unit === line.unit && line.packSize.quantity > 0 ? line.packSize.quantity : 1
  const packs = Math.max(1, Math.ceil(Math.max(0, line.requiredQuantity) / packQuantity))
  const buyQuantity = packs * packQuantity
  const leftoverQuantity = Math.max(0, buyQuantity - Math.max(0, line.requiredQuantity))
  const packUnitPriceCents =
    line.packSize?.priceCents && line.packSize.priceCents > 0
      ? line.packSize.priceCents / packQuantity
      : unitPriceCents

  return {
    packs,
    packLabel:
      line.packSize?.unit === line.unit && line.packSize.quantity > 0
        ? `${packs} x ${line.packSize.quantity} ${line.packSize.unit}`
        : `${Math.max(0, line.requiredQuantity)} ${line.unit}`,
    buyQuantity,
    leftoverQuantity,
    leftoverValueCents: Math.round(leftoverQuantity * packUnitPriceCents),
  }
}

function taskLabel(kind: PieCartTaskKind, ingredientName?: string): string {
  const subject = ingredientName ? `: ${ingredientName}` : ''
  switch (kind) {
    case 'review_price':
      return `Review PIE confidence${subject}`
    case 'refresh_pie':
      return `Refresh PIE price${subject}`
    case 'call_vendor':
      return `Confirm vendor quote${subject}`
    case 'substitute_item':
      return `Find substitution${subject}`
    case 'log_estimate':
      return 'Log immutable estimate'
    case 'create_snapshot':
      return 'Create snapshot plan'
    case 'shop':
      return `Shop item${subject}`
    case 'reconcile_receipt':
      return 'Reconcile receipt against expected cost'
    case 'rescue_margin':
      return 'Run margin rescue plan'
    case 'create_procurement_brief':
      return 'Create procurement brief'
  }
}

export function buildPieCartPlan(
  lines: PieCartLineInput[],
  artifactType: PieCartArtifactType,
  options: PieCartBuildOptions = {}
): PieCartPlan {
  const pricedLines = lines.map((line, index) => {
    const unitPriceCents = fallbackPrice(line)
    const fallbackUsed = !line.unitPriceCents || line.unitPriceCents <= 0
    const lineDrift = drift(unitPriceCents, line.lastSavedUnitPriceCents)
    const flags = riskFlags(line, fallbackUsed, lineDrift.pct)
    const purchasePlan = buildPurchasePlan(line, unitPriceCents)
    const actualExtendedPriceCents =
      line.actualUnitPriceCents && line.actualUnitPriceCents > 0
        ? Math.round(line.actualUnitPriceCents * line.requiredQuantity)
        : null
    const extendedPriceCents = Math.round(unitPriceCents * line.requiredQuantity)
    return {
      id: lineId(line, index),
      ingredientName: line.ingredientName,
      requiredQuantity: line.requiredQuantity,
      unit: line.unit,
      unitPriceCents,
      extendedPriceCents,
      actualExtendedPriceCents,
      fallbackUsed,
      confidenceLabel: confidenceLabel(line.confidence ?? 0.35, fallbackUsed),
      provenanceLabel: provenanceLabel(line, fallbackUsed),
      sourceLabel: line.storeName ?? line.sourceLabel ?? provenanceLabel(line, fallbackUsed),
      priceDriftCents: lineDrift.cents,
      priceDriftPct: lineDrift.pct,
      actualVarianceCents:
        actualExtendedPriceCents === null ? null : actualExtendedPriceCents - extendedPriceCents,
      riskFlags: flags,
      recommendedAction: recommendedAction(flags, line),
      lockLevel: line.lockLevel ?? 'none',
      purchasePlan,
    }
  })

  const reliability = summarizeReliabilityBuckets(
    lines.map((line) =>
      classifyPieReliability({
        resolutionTier: line.resolutionTier ?? (line.unitPriceCents ? 'regional' : 'synthetic'),
        confidence: line.confidence ?? 0.35,
        effectiveConfidence: line.confidence ?? 0.35,
        freshness: line.freshness ?? 'unknown',
      })
    )
  )
  const totalCents = pricedLines.reduce((total, line) => total + line.extendedPriceCents, 0)
  const actualLines = pricedLines.filter((line) => line.actualExtendedPriceCents !== null)
  const actualTotalCents =
    actualLines.length === 0
      ? null
      : actualLines.reduce((total, line) => total + (line.actualExtendedPriceCents ?? 0), 0)
  const fallbackCount = pricedLines.filter((line) => line.fallbackUsed).length
  const reviewCount = pricedLines.filter((line) => line.riskFlags.length > 0).length
  const vendorCallCount = pricedLines.filter(
    (line) => line.recommendedAction === 'call_vendor'
  ).length
  const lockedLineCount = pricedLines.filter((line) => line.lockLevel !== 'none').length
  const previousTotalCents = pricedLines.reduce((total, line, index) => {
    const previous = lines[index]?.lastSavedUnitPriceCents
    return (
      total +
      (previous && previous > 0 ? previous * line.requiredQuantity : line.extendedPriceCents)
    )
  }, 0)
  const totalDrift = drift(totalCents, previousTotalCents)
  const targetMarginPercent = options.targetMarginPercent ?? null
  const quoteTotalCents = options.quoteTotalCents ?? null
  const budgetCeilingCents = options.budgetCeilingCents ?? null
  const projectedMarginPercent =
    quoteTotalCents && quoteTotalCents > 0
      ? Math.round(((quoteTotalCents - totalCents) / quoteTotalCents) * 100)
      : null
  const marginProtected =
    projectedMarginPercent === null || targetMarginPercent === null
      ? null
      : projectedMarginPercent >= targetMarginPercent
  const overBudget = budgetCeilingCents !== null && totalCents > budgetCeilingCents
  const marginRisk = marginProtected === false || overBudget
  const readiness =
    reliability.trustGateStatus === 'block'
      ? 'low_confidence'
      : marginRisk
        ? 'margin_risk'
        : fallbackCount > 0 || reviewCount > 0
          ? 'needs_chef_review'
          : 'ready_to_shop'
  const highestRiskIngredients = pricedLines
    .filter((line) => line.riskFlags.length > 0)
    .sort(
      (a, b) =>
        b.riskFlags.length - a.riskFlags.length || b.extendedPriceCents - a.extendedPriceCents
    )
    .slice(0, 5)
    .map((line) => line.ingredientName)
  const taskBoard = [
    ...pricedLines
      .filter((line) => line.recommendedAction !== 'shop')
      .map((line) => ({
        kind: line.recommendedAction,
        label: taskLabel(line.recommendedAction, line.ingredientName),
        ingredientName: line.ingredientName,
        priority:
          line.riskFlags.includes('synthetic_price') || line.riskFlags.includes('availability_risk')
            ? ('high' as const)
            : ('medium' as const),
      })),
    artifactType === 'saved_cart'
      ? {
          kind: 'log_estimate' as const,
          label: taskLabel('log_estimate'),
          priority: 'medium' as const,
        }
      : {
          kind: 'create_procurement_brief' as const,
          label: taskLabel('create_procurement_brief'),
          priority: 'medium' as const,
        },
    {
      kind: 'reconcile_receipt' as const,
      label: taskLabel('reconcile_receipt'),
      priority: 'low' as const,
    },
  ]
  const rescueActions = [
    overBudget ? 'reduce_or_substitute_high_cost_lines' : null,
    marginProtected === false ? 'raise_quote_or_run_margin_rescue_mode' : null,
    reliability.trustGateStatus !== 'pass' ? 'verify_low_confidence_prices_before_commit' : null,
  ].filter((action): action is string => Boolean(action))

  return {
    artifactType,
    lines: pricedLines,
    totalCents,
    actualTotalCents,
    readiness,
    nextActions: [
      fallbackCount > 0 ? 'review_synthetic_prices' : 'log_estimate',
      marginRisk ? 'run_margin_rescue' : 'refresh_pie_prices',
      artifactType === 'snapshot_plan' ? 'create_procurement_brief' : 'create_snapshot_plan',
    ],
    intelligence: {
      optimizationMode: options.optimizationMode ?? (marginRisk ? 'margin_rescue' : 'balanced'),
      reliability,
      confidenceSla:
        reliability.trustGateStatus === 'pass'
          ? 'green'
          : reliability.trustGateStatus === 'watch'
            ? 'yellow'
            : 'red',
      driftCents: totalDrift.cents,
      driftPct: totalDrift.pct,
      highestRiskIngredients,
      sourceTransparency: sourceTransparency(pricedLines),
    },
    economics: {
      quoteTotalCents,
      budgetCeilingCents,
      targetMarginPercent,
      projectedMarginPercent,
      marginProtected,
      rescueActions,
    },
    procurement: {
      itemCount: pricedLines.length,
      fallbackCount,
      reviewCount,
      vendorCallCount,
      lockedLineCount,
      taskBoard,
      commandCenter: [
        {
          metric: 'PIE trust gate',
          value: reliability.trustGateStatus,
          status:
            reliability.trustGateStatus === 'pass'
              ? 'ok'
              : reliability.trustGateStatus === 'watch'
                ? 'watch'
                : 'block',
        },
        {
          metric: 'Price drift',
          value: `${totalDrift.pct}%`,
          status:
            Math.abs(totalDrift.pct) >= 15
              ? 'block'
              : Math.abs(totalDrift.pct) >= 8
                ? 'watch'
                : 'ok',
        },
        {
          metric: 'Margin',
          value: projectedMarginPercent === null ? 'not quoted' : `${projectedMarginPercent}%`,
          status: marginProtected === false ? 'block' : marginProtected === null ? 'watch' : 'ok',
        },
        {
          metric: 'Leftover value',
          value: `$${(
            pricedLines.reduce((total, line) => total + line.purchasePlan.leftoverValueCents, 0) /
            100
          ).toFixed(2)}`,
          status: pricedLines.some((line) => line.purchasePlan.leftoverValueCents > 2000)
            ? 'watch'
            : 'ok',
        },
      ],
    },
  }
}
