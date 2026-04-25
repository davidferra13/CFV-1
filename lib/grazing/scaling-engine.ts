import type {
  GrazingCategory,
  GrazingDensity,
  GrazingEdibleCategory,
  GrazingFormat,
  GrazingLayoutPlan,
  GrazingLayoutZone,
  GrazingPlanInput,
  GrazingPlanOutput,
  GrazingPricingEstimate,
  GrazingQuantityLine,
  GrazingServiceStyle,
} from './types'

export const DEFAULT_GRAZING_COMPONENT_MIX: Record<GrazingEdibleCategory, number> = {
  cheese: 0.28,
  charcuterie: 0.2,
  fruit: 0.18,
  crackers_bread: 0.16,
  nuts: 0.06,
  dips_spreads: 0.07,
  garnish: 0.05,
}

const BASE_OZ_PER_GUEST: Record<GrazingServiceStyle, number> = {
  light_snack: 5,
  standard_grazing: 8,
  heavy_grazing: 11,
  meal_replacement: 14,
}

const DENSITY_MULTIPLIER: Record<GrazingDensity, number> = {
  light: 0.88,
  standard: 1,
  abundant: 1.18,
}

const FORMAT_MINIMUM_OZ: Record<GrazingFormat, number> = {
  small_board: 48,
  mid_spread: 180,
  large_table: 850,
}

const ROUNDING_INCREMENT: Record<GrazingCategory, number> = {
  cheese: 4,
  charcuterie: 4,
  fruit: 8,
  crackers_bread: 8,
  nuts: 4,
  dips_spreads: 0.5,
  garnish: 2,
  props: 1,
}

const CATEGORY_COST_CENTS: Record<GrazingCategory, number> = {
  cheese: 110,
  charcuterie: 145,
  fruit: 45,
  crackers_bread: 35,
  nuts: 80,
  dips_spreads: 350,
  garnish: 50,
  props: 1000,
}

const CATEGORY_LABELS: Record<GrazingCategory, string> = {
  cheese: 'Cheese',
  charcuterie: 'Charcuterie',
  fruit: 'Fruit',
  crackers_bread: 'Crackers and bread',
  nuts: 'Nuts',
  dips_spreads: 'Dips and spreads',
  garnish: 'Garnish',
  props: 'Props',
}

function roundUpToIncrement(value: number, increment: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.ceil(value / increment) * increment
}

function roundMoney(value: number): number {
  return Math.round(Number.isFinite(value) ? value : 0)
}

function roundQuantity(value: number): number {
  return Math.round(value * 100) / 100
}

export function normalizeGrazingComponentMix(
  componentMix?: Partial<Record<GrazingEdibleCategory, number>>
): Record<GrazingEdibleCategory, number> {
  const merged: Record<GrazingEdibleCategory, number> = {
    ...DEFAULT_GRAZING_COMPONENT_MIX,
  }

  if (componentMix) {
    for (const category of Object.keys(DEFAULT_GRAZING_COMPONENT_MIX) as GrazingEdibleCategory[]) {
      const value = componentMix[category]
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        merged[category] = value
      }
    }
  }

  const total = Object.values(merged).reduce((sum, value) => sum + value, 0)
  if (total <= 0) return { ...DEFAULT_GRAZING_COMPONENT_MIX }

  return Object.fromEntries(
    Object.entries(merged).map(([category, value]) => [category, value / total])
  ) as Record<GrazingEdibleCategory, number>
}

function estimateProps(input: GrazingPlanInput): GrazingQuantityLine {
  const surfaceSqFt =
    input.tableLengthFt && input.tableWidthFt && input.tableLengthFt > 0 && input.tableWidthFt > 0
      ? input.tableLengthFt * input.tableWidthFt
      : null

  const formatMinimums: Record<GrazingFormat, number> = {
    small_board: 3,
    mid_spread: 7,
    large_table: 14,
  }
  const fromSurface = surfaceSqFt ? Math.ceil(surfaceSqFt / 6) : 0
  const quantity = Math.max(formatMinimums[input.eventFormat], fromSurface)

  return {
    category: 'props',
    label: CATEGORY_LABELS.props,
    quantity,
    unit: 'each',
    edibleOz: 0,
    estimatedCostCents: quantity * CATEGORY_COST_CENTS.props,
    displayOrder: 90,
    notes: 'Non-edible boards, risers, bowls, utensils, liner, labels, and service tools.',
  }
}

function buildQuantityPlan(input: GrazingPlanInput, totalEdibleOz: number): GrazingQuantityLine[] {
  const mix = normalizeGrazingComponentMix(input.componentMix)
  const lines = (Object.keys(mix) as GrazingEdibleCategory[]).map((category, index) => {
    const rawOz = totalEdibleOz * mix[category]
    const isDip = category === 'dips_spreads'
    const quantity = isDip
      ? roundUpToIncrement(rawOz / 8, ROUNDING_INCREMENT[category])
      : roundUpToIncrement(rawOz, ROUNDING_INCREMENT[category])
    const edibleOz = isDip ? quantity * 8 : quantity
    const estimatedCostCents = isDip
      ? roundMoney(quantity * CATEGORY_COST_CENTS[category])
      : roundMoney(quantity * CATEGORY_COST_CENTS[category])

    return {
      category,
      label: CATEGORY_LABELS[category],
      quantity: roundQuantity(quantity),
      unit: isDip ? 'cup' : 'oz',
      edibleOz: roundQuantity(edibleOz),
      estimatedCostCents,
      displayOrder: index + 1,
      notes: isDip
        ? 'Rounded up to half-cup operational increments.'
        : `Rounded up to ${ROUNDING_INCREMENT[category]} oz operational increments.`,
    } satisfies GrazingQuantityLine
  })

  return [...lines, estimateProps(input)]
}

function buildLayoutPlan(input: GrazingPlanInput): {
  layoutPlan: GrazingLayoutPlan
  warnings: string[]
} {
  const hasTable =
    input.tableLengthFt !== null &&
    input.tableLengthFt !== undefined &&
    input.tableWidthFt !== null &&
    input.tableWidthFt !== undefined &&
    input.tableLengthFt > 0 &&
    input.tableWidthFt > 0

  const surfaceSqFt = hasTable ? input.tableLengthFt! * input.tableWidthFt! : null
  const sqFtPerGuest =
    surfaceSqFt && input.guestCount > 0 ? roundQuantity(surfaceSqFt / input.guestCount) : null

  let densityAssessment: GrazingLayoutPlan['densityAssessment'] = 'unknown'
  const warnings: string[] = []

  if (sqFtPerGuest !== null) {
    if (sqFtPerGuest < 0.65) {
      densityAssessment = 'tight'
      warnings.push('Layout warning: tight table area for guest count.')
    } else if (sqFtPerGuest <= 1.1) {
      densityAssessment = 'standard'
    } else {
      densityAssessment = 'spacious'
    }
  }

  const zones: GrazingLayoutZone[] = [
    {
      id: 'anchor-cheese-clusters',
      label: 'Anchor cheese clusters',
      kind: 'anchor_cheese',
      description: 'Place visual anchors first, spaced to pull guests through the board.',
      displayOrder: 1,
    },
    {
      id: 'charcuterie-ribbons',
      label: 'Charcuterie ribbons',
      kind: 'charcuterie_ribbon',
      description: 'Fold and ribbon meats between cheese anchors for flow and height.',
      displayOrder: 2,
    },
    {
      id: 'fruit-color-blocks',
      label: 'Fruit color blocks',
      kind: 'fruit_block',
      description: 'Group fruit by color and moisture level to protect dry goods.',
      displayOrder: 3,
    },
    {
      id: 'cracker-bread-perimeter',
      label: 'Cracker and bread perimeter',
      kind: 'cracker_bread_perimeter',
      description: 'Keep dry carriers on the edges and refill during service.',
      displayOrder: 4,
    },
    {
      id: 'dip-bowls',
      label: 'Dip bowls',
      kind: 'dip_bowl',
      description: 'Set bowls before loose items; keep spoons and drip zones contained.',
      displayOrder: 5,
    },
    {
      id: 'garnish-finish',
      label: 'Garnish finish',
      kind: 'garnish_finish',
      description: 'Finish with herbs, edible flowers, citrus, and small texture accents.',
      displayOrder: 6,
    },
    {
      id: 'service-flow',
      label: 'Service flow notes',
      kind: 'service_flow',
      description: 'Leave plate, napkin, utensil, and refill access clear before guests arrive.',
      displayOrder: 7,
    },
  ]

  return {
    layoutPlan: {
      surfaceSqFt: surfaceSqFt === null ? null : roundQuantity(surfaceSqFt),
      sqFtPerGuest,
      densityAssessment,
      zones,
      serviceFlowNotes: [
        'Set plates and napkins at the clearest guest entry point.',
        'Keep refill product staged off-table and labeled by zone.',
        'Protect cracker and bread perimeter from wet fruit, dips, and pickles.',
      ],
    },
    warnings,
  }
}

function buildPricingEstimate(
  input: GrazingPlanInput,
  quantityPlan: GrazingQuantityLine[]
): GrazingPricingEstimate {
  const estimatedFoodCostCents = quantityPlan
    .filter((line) => line.category !== 'props')
    .reduce((sum, line) => sum + line.estimatedCostCents, 0)
  const estimatedPropsCostCents = quantityPlan
    .filter((line) => line.category === 'props')
    .reduce((sum, line) => sum + line.estimatedCostCents, 0)
  const estimatedTotalCostCents = estimatedFoodCostCents + estimatedPropsCostCents
  const targetMarginPercent = input.targetMarginPercent ?? 65
  const marginRate = Math.min(Math.max(targetMarginPercent, 1), 95) / 100
  const suggestedQuoteCents = roundMoney(estimatedTotalCostCents / (1 - marginRate))
  const grossMarginCents = suggestedQuoteCents - estimatedTotalCostCents
  const grossMarginPercent =
    suggestedQuoteCents > 0 ? roundQuantity((grossMarginCents / suggestedQuoteCents) * 100) : 0

  return {
    estimatedFoodCostCents,
    estimatedPropsCostCents,
    estimatedTotalCostCents,
    costPerGuestCents: roundMoney(estimatedTotalCostCents / Math.max(input.guestCount, 1)),
    suggestedQuoteCents,
    quotePerGuestCents: roundMoney(suggestedQuoteCents / Math.max(input.guestCount, 1)),
    grossMarginCents,
    grossMarginPercent,
  }
}

export function calculateGrazingPricingEstimateFromCosts(input: {
  guestCount: number
  estimatedFoodCostCents: number
  estimatedPropsCostCents?: number
  targetMarginPercent?: number
}): GrazingPricingEstimate {
  const estimatedFoodCostCents = Math.max(0, roundMoney(input.estimatedFoodCostCents))
  const estimatedPropsCostCents = Math.max(0, roundMoney(input.estimatedPropsCostCents ?? 0))
  const estimatedTotalCostCents = estimatedFoodCostCents + estimatedPropsCostCents
  const targetMarginPercent = input.targetMarginPercent ?? 65
  const marginRate = Math.min(Math.max(targetMarginPercent, 1), 95) / 100
  const suggestedQuoteCents = roundMoney(estimatedTotalCostCents / (1 - marginRate))
  const grossMarginCents = suggestedQuoteCents - estimatedTotalCostCents
  const guestCount = Math.max(1, input.guestCount)

  return {
    estimatedFoodCostCents,
    estimatedPropsCostCents,
    estimatedTotalCostCents,
    costPerGuestCents: roundMoney(estimatedTotalCostCents / guestCount),
    suggestedQuoteCents,
    quotePerGuestCents: roundMoney(suggestedQuoteCents / guestCount),
    grossMarginCents,
    grossMarginPercent:
      suggestedQuoteCents > 0 ? roundQuantity((grossMarginCents / suggestedQuoteCents) * 100) : 0,
  }
}

export function buildGrazingPlan(input: GrazingPlanInput): GrazingPlanOutput {
  if (!Number.isFinite(input.guestCount) || input.guestCount <= 0) {
    throw new Error('guestCount must be a positive number')
  }

  const baseOz = BASE_OZ_PER_GUEST[input.serviceStyle]
  const densityMultiplier = DENSITY_MULTIPLIER[input.density]
  const minimumOz = FORMAT_MINIMUM_OZ[input.eventFormat]
  const calculatedOz = input.guestCount * baseOz * densityMultiplier
  const totalEdibleOz = roundQuantity(Math.max(minimumOz, calculatedOz))
  const quantityPlan = buildQuantityPlan(input, totalEdibleOz)
  const { layoutPlan, warnings } = buildLayoutPlan(input)
  const pricingEstimate = buildPricingEstimate(input, quantityPlan)

  if (
    input.budgetCents !== null &&
    input.budgetCents !== undefined &&
    pricingEstimate.suggestedQuoteCents > input.budgetCents
  ) {
    warnings.push('Budget warning: suggested quote exceeds budget at target margin.')
  }

  if (
    input.budgetCents !== null &&
    input.budgetCents !== undefined &&
    pricingEstimate.estimatedFoodCostCents > input.budgetCents
  ) {
    warnings.push('Budget warning: estimated food cost exceeds budget.')
  }

  return {
    totalEdibleOz,
    perGuestOz: roundQuantity(totalEdibleOz / input.guestCount),
    quantityPlan,
    layoutPlan,
    pricingEstimate,
    warnings,
  }
}
