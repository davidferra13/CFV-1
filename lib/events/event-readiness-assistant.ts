export type EventReadinessMode = 'off' | 'quiet' | 'normal'
export type EventReadinessStatus = 'ready' | 'review' | 'at_risk' | 'unknown'
export type EventReadinessCheckStatus = 'pass' | 'review' | 'fail' | 'unknown'
export type EventReadinessSeverity = 'info' | 'low' | 'medium' | 'high'

export type EventReadinessSuggestionType =
  | 'price_adjustment'
  | 'menu_repricing'
  | 'ingredient_confidence'
  | 'stale_pricing'
  | 'margin_risk'
  | 'food_cost_risk'
  | 'missing_cost'
  | 'ops_readiness'
  | 'shopping_optimization'
  | 'role_prompt'
  | 'supply_risk'
  | 'event_momentum'
  | 'contextual_sharing'
  | 'micro_confirmation'
  | 'guest_expectation'
  | 'contributor_balance'
  | 'incident_logging'
  | 'reality_snapshot'
  | 'auto_cleanup'
  | 'quality_flag'
  | 'time_nudge'
  | 'accessibility'

export interface EventReadinessCheck {
  id: string
  label: string
  status: EventReadinessCheckStatus
  severity: EventReadinessSeverity
  message: string
  recommendation: string
  canDismiss: boolean
}

export interface EventReadinessSuggestion {
  id: string
  type: EventReadinessSuggestionType
  title: string
  message: string
  impactLabel: string
  estimatedImpact: number | null
  actionLabel: string
  actionHref: string
  canDismiss: boolean
}

export interface EventReadinessAssistantResult {
  enabled: boolean
  mode: EventReadinessMode
  status: EventReadinessStatus
  score: number
  summary: string
  checks: EventReadinessCheck[]
  suggestions: EventReadinessSuggestion[]
  hiddenSuggestionCount: number
  hiddenSuggestions?: EventReadinessSuggestion[]
}

export interface EventReadinessAssistantInput {
  enabled: boolean
  mode: EventReadinessMode
  categories?: {
    financial?: boolean
    pricingConfidence?: boolean
    ops?: boolean
  }
  event: {
    id: string
    status?: string | null
    createdAt?: string | null
    eventDate?: string | null
    serveTime?: string | null
    guestCount?: number | null
    guestCountConfirmed?: boolean | null
    hasMenu?: boolean
    menuIds?: string[]
    hasAllRecipeCosts?: boolean | null
    costNeedsRefresh?: boolean
    travelTimeMinutes?: number | null
    mileageMiles?: number | null
    timeLoggedMinutes?: number | null
    locationText?: string | null
    locationNotes?: string | null
    siteNotes?: string | null
    kitchenNotes?: string | null
    accessInstructions?: string | null
    serviceStyle?: string | null
    preEventChecklistConfirmedAt?: string | null
    debriefCompletedAt?: string | null
    resetComplete?: boolean | null
    aarFiled?: boolean | null
    financialClosed?: boolean | null
    archived?: boolean | null
    hasPublicShare?: boolean | null
  }
  tickets?: {
    enabled?: boolean
    totalCapacity?: number | null
    soldCount?: number | null
    pendingCount?: number | null
    paidOrderCount?: number | null
    firstSaleAt?: string | null
    lastSaleAt?: string | null
    shareCreatedAt?: string | null
    publicShareUrl?: string | null
  }
  collaborators?: {
    acceptedCount?: number
    pendingCount?: number
    roles?: string[]
  }
  publicPage?: {
    photoCount?: number
    storyLength?: number
    supplierLineCount?: number
    sourceLinkCount?: number
    layoutZoneCount?: number
    timelineItemCount?: number
    farmEnabled?: boolean
    socialPostCount?: number
    showChefName?: boolean
    showMenu?: boolean
    showLocation?: boolean
  }
  pricing: {
    quoteOrRevenueCents?: number | null
    projectedFoodCostCents?: number | null
    projectedFoodCostPercent?: number | null
    suggestedPriceCents?: number | null
    targetFoodCostPercent?: number | null
    targetMarginPercent?: number | null
    expectedMarginPercent?: number | null
    actualFoodCostCents?: number | null
    actualTotalCostCents?: number | null
    actualFoodCostPercent?: number | null
    actualMarginPercent?: number | null
    estimatedVsActualPercent?: number | null
    estimatedVsActualCostCents?: number | null
    fallbackUsed?: boolean
    stalePriceCount?: number
    lowConfidenceIngredientCount?: number
    missingPriceCount?: number
    totalIngredientCount?: number
  }
}

function positive(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function numberOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10
}

function money(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

function pct(value: number): string {
  return `${roundOne(value)}%`
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function wholeDaysBetween(left: Date, right: Date): number {
  const dayMs = 24 * 60 * 60 * 1000
  return Math.ceil((right.getTime() - left.getTime()) / dayMs)
}

function includesAny(value: string, words: string[]): boolean {
  const normalized = value.toLowerCase()
  return words.some((word) => normalized.includes(word))
}

function buildDisabledResult(mode: EventReadinessMode): EventReadinessAssistantResult {
  return {
    enabled: false,
    mode,
    status: 'unknown',
    score: 0,
    summary: 'Event Readiness Assistant is off.',
    checks: [],
    suggestions: [],
    hiddenSuggestionCount: 0,
  }
}

function statusPenalty(check: EventReadinessCheck): number {
  if (check.status === 'pass') return 0
  if (check.status === 'unknown') return check.severity === 'medium' ? 8 : 4
  if (check.status === 'review') {
    if (check.severity === 'high') return 22
    if (check.severity === 'medium') return 14
    return 7
  }
  if (check.severity === 'high') return 32
  if (check.severity === 'medium') return 22
  return 12
}

function rankCheck(check: EventReadinessCheck): number {
  const statusRank: Record<EventReadinessCheckStatus, number> = {
    fail: 0,
    review: 1,
    unknown: 2,
    pass: 3,
  }
  const severityRank: Record<EventReadinessSeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
    info: 3,
  }
  return statusRank[check.status] * 10 + severityRank[check.severity]
}

export function summarizeEventReadinessAssistant(
  status: EventReadinessStatus,
  score: number,
  suggestionCount: number
): string {
  if (status === 'ready') {
    return suggestionCount > 0
      ? `Ready with ${suggestionCount} optional suggestion${suggestionCount === 1 ? '' : 's'}.`
      : 'Ready based on the data available.'
  }
  if (status === 'at_risk') {
    return `Review recommended. Score ${score}; ${suggestionCount} suggestion${suggestionCount === 1 ? '' : 's'} available.`
  }
  if (status === 'review') {
    return `A few items could use review. ${suggestionCount} suggestion${suggestionCount === 1 ? '' : 's'} available.`
  }
  return 'Not enough event data to evaluate readiness yet.'
}

export function filterDismissedEventReadinessSuggestions(
  result: EventReadinessAssistantResult,
  dismissedSuggestionIds: Iterable<string>
): EventReadinessAssistantResult {
  const dismissed = new Set(dismissedSuggestionIds)
  if (dismissed.size === 0) return result

  const filterDismissible = (suggestion: EventReadinessSuggestion) =>
    !(suggestion.canDismiss && dismissed.has(suggestion.id))
  const suggestions = result.suggestions.filter(filterDismissible)
  const hiddenSuggestions = result.hiddenSuggestions?.filter(filterDismissible)
  const suggestionCount =
    result.mode === 'quiet' ? (hiddenSuggestions ?? []).length : suggestions.length

  return {
    ...result,
    summary: result.enabled
      ? summarizeEventReadinessAssistant(result.status, result.score, suggestionCount)
      : result.summary,
    suggestions,
    hiddenSuggestionCount: result.mode === 'quiet' ? suggestionCount : 0,
    hiddenSuggestions,
  }
}

export function evaluateEventReadinessAssistant(
  input: EventReadinessAssistantInput
): EventReadinessAssistantResult {
  const mode = input.mode
  if (!input.enabled || mode === 'off') {
    return buildDisabledResult(mode)
  }

  const categories = {
    financial: input.categories?.financial !== false,
    pricingConfidence: input.categories?.pricingConfidence !== false,
    ops: input.categories?.ops !== false,
  }
  const eventHref = `/events/${input.event.id}?tab=money`
  const menuHref = input.event.menuIds?.[0] ? `/menus/${input.event.menuIds[0]}/editor` : eventHref
  const checks: EventReadinessCheck[] = []
  const suggestions: EventReadinessSuggestion[] = []

  const quoteOrRevenueCents = positive(input.pricing.quoteOrRevenueCents)
  const suggestedPriceCents = positive(input.pricing.suggestedPriceCents)
  const projectedFoodCostCents = positive(input.pricing.projectedFoodCostCents)
  const actualFoodCostCents = positive(input.pricing.actualFoodCostCents)
  const targetFoodCostPercent = positive(input.pricing.targetFoodCostPercent)
  const targetMarginPercent = positive(input.pricing.targetMarginPercent)
  const projectedFoodCostPercent = numberOrNull(input.pricing.projectedFoodCostPercent)
  const actualFoodCostPercent = numberOrNull(input.pricing.actualFoodCostPercent)
  const expectedMarginPercent = numberOrNull(input.pricing.expectedMarginPercent)
  const actualMarginPercent = numberOrNull(input.pricing.actualMarginPercent)
  const estimatedVsActualPercent = numberOrNull(input.pricing.estimatedVsActualPercent)
  const estimatedVsActualCostCents = numberOrNull(input.pricing.estimatedVsActualCostCents)
  const stalePriceCount = positive(input.pricing.stalePriceCount)
  const lowConfidenceIngredientCount = positive(input.pricing.lowConfidenceIngredientCount)
  const missingPriceCount = positive(input.pricing.missingPriceCount)
  const totalIngredientCount = positive(input.pricing.totalIngredientCount)
  const now = new Date()
  const eventDate = parseDate(input.event.eventDate)
  const createdAt = parseDate(input.event.createdAt)
  const shareCreatedAt = parseDate(input.tickets?.shareCreatedAt) ?? createdAt
  const firstSaleAt = parseDate(input.tickets?.firstSaleAt)
  const daysUntilEvent = eventDate ? wholeDaysBetween(now, eventDate) : null
  const daysSinceLaunch = shareCreatedAt ? wholeDaysBetween(shareCreatedAt, now) : null
  const statusValue = String(input.event.status ?? '').toLowerCase()
  const guestCount = positive(input.event.guestCount)
  const ticketsEnabled = input.tickets?.enabled === true
  const totalCapacity = positive(input.tickets?.totalCapacity)
  const soldCount = positive(input.tickets?.soldCount)
  const pendingCount = positive(input.tickets?.pendingCount)
  const paidOrderCount = positive(input.tickets?.paidOrderCount)
  const remainingCapacity =
    totalCapacity > 0 ? Math.max(0, totalCapacity - soldCount - pendingCount) : null
  const soldRatio = totalCapacity > 0 ? soldCount / totalCapacity : null
  const publicPhotoCount = positive(input.publicPage?.photoCount)
  const publicStoryLength = positive(input.publicPage?.storyLength)
  const supplierLineCount = positive(input.publicPage?.supplierLineCount)
  const sourceLinkCount = positive(input.publicPage?.sourceLinkCount)
  const timelineItemCount = positive(input.publicPage?.timelineItemCount)
  const layoutZoneCount = positive(input.publicPage?.layoutZoneCount)
  const acceptedCollaboratorCount = positive(input.collaborators?.acceptedCount)
  const pendingCollaboratorCount = positive(input.collaborators?.pendingCount)
  const eventText = [
    input.event.locationText,
    input.event.locationNotes,
    input.event.siteNotes,
    input.event.kitchenNotes,
  ]
    .filter(Boolean)
    .join(' ')
  const looksOutdoor = includesAny(eventText, [
    'outdoor',
    'outside',
    'garden',
    'farm',
    'field',
    'patio',
    'yard',
    'terrain',
  ])
  const looksSeasonal =
    includesAny(eventText, ['farm', 'market', 'seasonal', 'harvest']) ||
    input.publicPage?.farmEnabled === true ||
    sourceLinkCount > 0
  const activeStatuses = ['draft', 'accepted', 'paid', 'confirmed']
  const postEventStatuses = ['completed', 'cancelled']

  if (categories.financial) {
    checks.push({
      id: 'quote_revenue',
      label: 'Quote or revenue',
      status: quoteOrRevenueCents > 0 ? 'pass' : 'review',
      severity: quoteOrRevenueCents > 0 ? 'info' : 'medium',
      message:
        quoteOrRevenueCents > 0
          ? `Price basis is ${money(quoteOrRevenueCents)}.`
          : 'No quote or collected revenue is available yet.',
      recommendation:
        quoteOrRevenueCents > 0
          ? 'Use this as the current pricing baseline.'
          : 'Add a quote total before relying on margin projections.',
      canDismiss: false,
    })

    checks.push({
      id: 'projected_food_cost',
      label: 'Projected food cost',
      status: projectedFoodCostCents > 0 || actualFoodCostCents > 0 ? 'pass' : 'review',
      severity: projectedFoodCostCents > 0 || actualFoodCostCents > 0 ? 'info' : 'medium',
      message:
        projectedFoodCostCents > 0
          ? `Projected food cost is ${money(projectedFoodCostCents)}.`
          : actualFoodCostCents > 0
            ? `Using actual food spend of ${money(actualFoodCostCents)} as a fallback.`
            : 'No projected menu food cost is available yet.',
      recommendation:
        projectedFoodCostCents > 0
          ? 'Keep menu costing current before sending or revising a quote.'
          : 'Attach a costed menu or add an estimated food cost.',
      canDismiss: true,
    })

    const marginForCheck = actualMarginPercent ?? expectedMarginPercent
    if (marginForCheck != null && targetMarginPercent > 0) {
      const belowBy = roundOne(targetMarginPercent - marginForCheck)
      checks.push({
        id: 'target_margin',
        label: 'Target margin',
        status: marginForCheck >= targetMarginPercent ? 'pass' : belowBy >= 10 ? 'fail' : 'review',
        severity:
          marginForCheck >= targetMarginPercent ? 'info' : belowBy >= 10 ? 'high' : 'medium',
        message:
          marginForCheck >= targetMarginPercent
            ? `Margin is ${pct(marginForCheck)} against a ${pct(targetMarginPercent)} target.`
            : `Margin is ${pct(marginForCheck)}, ${pct(belowBy)} below target.`,
        recommendation:
          marginForCheck >= targetMarginPercent
            ? 'Margin target is protected with current data.'
            : 'Review price, menu mix, labor, or expenses before treating this quote as final.',
        canDismiss: true,
      })
    }

    const foodCostForCheck = actualFoodCostPercent ?? projectedFoodCostPercent
    if (foodCostForCheck != null && targetFoodCostPercent > 0) {
      const overBy = roundOne(foodCostForCheck - targetFoodCostPercent)
      checks.push({
        id: 'food_cost_target',
        label: 'Food cost target',
        status:
          foodCostForCheck <= targetFoodCostPercent ? 'pass' : overBy >= 10 ? 'fail' : 'review',
        severity:
          foodCostForCheck <= targetFoodCostPercent ? 'info' : overBy >= 10 ? 'high' : 'medium',
        message:
          foodCostForCheck <= targetFoodCostPercent
            ? `Food cost is ${pct(foodCostForCheck)} against a ${pct(targetFoodCostPercent)} target.`
            : `Food cost is ${pct(foodCostForCheck)}, above the ${pct(targetFoodCostPercent)} target.`,
        recommendation:
          foodCostForCheck <= targetFoodCostPercent
            ? 'Food cost is within the selected target.'
            : 'Consider repricing, portion changes, or lower-cost substitutions.',
        canDismiss: true,
      })
    }

    if (estimatedVsActualPercent != null && projectedFoodCostCents > 0 && actualFoodCostCents > 0) {
      const overEstimate = estimatedVsActualPercent > 10
      checks.push({
        id: 'actual_spend_variance',
        label: 'Actual spend variance',
        status: overEstimate ? (estimatedVsActualPercent >= 20 ? 'fail' : 'review') : 'pass',
        severity: overEstimate ? (estimatedVsActualPercent >= 20 ? 'high' : 'medium') : 'info',
        message: overEstimate
          ? `Actual food spend is ${pct(estimatedVsActualPercent)} above estimate.`
          : `Actual food spend is within ${pct(Math.abs(estimatedVsActualPercent))} of estimate.`,
        recommendation: overEstimate
          ? 'Compare receipt line items to recipe quantities before repeating this menu price.'
          : 'No spend variance action needed from current actuals.',
        canDismiss: true,
      })
    }

    if (suggestedPriceCents > 0 && quoteOrRevenueCents > 0) {
      const shortfall = suggestedPriceCents - quoteOrRevenueCents
      if (shortfall > Math.max(5000, suggestedPriceCents * 0.03)) {
        suggestions.push({
          id: 'quote_below_suggested_price',
          type: 'price_adjustment',
          title: 'Quote is below suggested price',
          message: `Quote is below suggested price by ${money(shortfall)}.`,
          impactLabel: `${money(shortfall)} revenue gap`,
          estimatedImpact: shortfall,
          actionLabel: 'Review pricing',
          actionHref: eventHref,
          canDismiss: true,
        })
        suggestions.push({
          id: 'menu_may_need_repricing',
          type: 'menu_repricing',
          title: 'Menu may need repricing',
          message: 'Current ingredient cost suggests this menu may need a price review.',
          impactLabel: 'Margin protection',
          estimatedImpact: shortfall,
          actionLabel: 'Open menu costing',
          actionHref: menuHref,
          canDismiss: true,
        })
      }
    }

    const marginForSuggestion = actualMarginPercent ?? expectedMarginPercent
    if (
      marginForSuggestion != null &&
      targetMarginPercent > 0 &&
      marginForSuggestion < targetMarginPercent
    ) {
      suggestions.push({
        id: 'margin_below_target',
        type: 'margin_risk',
        title: 'Margin is below target',
        message: `Margin is ${pct(marginForSuggestion)}; target is ${pct(targetMarginPercent)}.`,
        impactLabel: `${pct(targetMarginPercent - marginForSuggestion)} below target`,
        estimatedImpact: null,
        actionLabel: 'Review financials',
        actionHref: eventHref,
        canDismiss: true,
      })
    }

    const foodCostForSuggestion = actualFoodCostPercent ?? projectedFoodCostPercent
    if (
      foodCostForSuggestion != null &&
      targetFoodCostPercent > 0 &&
      foodCostForSuggestion > targetFoodCostPercent
    ) {
      suggestions.push({
        id: 'food_cost_above_target',
        type: 'food_cost_risk',
        title: 'Food cost is above target',
        message: `Food cost is projected at ${pct(foodCostForSuggestion)}; target is ${pct(targetFoodCostPercent)}.`,
        impactLabel: `${pct(foodCostForSuggestion - targetFoodCostPercent)} above target`,
        estimatedImpact: null,
        actionLabel: 'Open menu costing',
        actionHref: menuHref,
        canDismiss: true,
      })
    }

    if (projectedFoodCostCents <= 0 && actualFoodCostCents <= 0) {
      suggestions.push({
        id: 'missing_food_cost',
        type: 'missing_cost',
        title: 'Food cost is missing',
        message:
          'Add menu costing or an estimated food cost before relying on pricing projections.',
        impactLabel: 'Improves confidence',
        estimatedImpact: null,
        actionLabel: 'Open event money',
        actionHref: eventHref,
        canDismiss: true,
      })
    }

    if (estimatedVsActualPercent != null && estimatedVsActualPercent > 10) {
      suggestions.push({
        id: 'actual_spend_over_estimate',
        type: 'shopping_optimization',
        title: 'Actual spend is above estimate',
        message: `Actual grocery spend is ${pct(estimatedVsActualPercent)} above estimate.`,
        impactLabel:
          estimatedVsActualCostCents != null
            ? `${money(Math.max(0, estimatedVsActualCostCents))} variance`
            : 'Spend variance',
        estimatedImpact: estimatedVsActualCostCents,
        actionLabel: 'Review receipts',
        actionHref: `/events/${input.event.id}/receipts`,
        canDismiss: true,
      })
    }
  }

  if (categories.pricingConfidence) {
    if (totalIngredientCount > 0) {
      checks.push({
        id: 'ingredient_pricing_confidence',
        label: 'Ingredient price confidence',
        status: lowConfidenceIngredientCount > 0 || missingPriceCount > 0 ? 'review' : 'pass',
        severity:
          lowConfidenceIngredientCount + missingPriceCount > 4
            ? 'medium'
            : lowConfidenceIngredientCount + missingPriceCount > 0
              ? 'low'
              : 'info',
        message:
          lowConfidenceIngredientCount > 0 || missingPriceCount > 0
            ? `${lowConfidenceIngredientCount} low-confidence and ${missingPriceCount} missing ingredient price${lowConfidenceIngredientCount + missingPriceCount === 1 ? '' : 's'}.`
            : 'Ingredient prices look usable for this menu.',
        recommendation:
          lowConfidenceIngredientCount > 0 || missingPriceCount > 0
            ? 'Refresh or confirm the ingredient prices that drive this menu.'
            : 'No pricing confidence action needed right now.',
        canDismiss: true,
      })
    }

    if (stalePriceCount > 0) {
      checks.push({
        id: 'stale_ingredient_prices',
        label: 'Stale prices',
        status: stalePriceCount > 4 ? 'review' : 'unknown',
        severity: stalePriceCount > 4 ? 'medium' : 'low',
        message: `${stalePriceCount} ingredient price${stalePriceCount === 1 ? '' : 's'} look stale.`,
        recommendation:
          'Refresh prices before sending another quote if the menu uses volatile items.',
        canDismiss: true,
      })
    }

    if (lowConfidenceIngredientCount > 0) {
      suggestions.push({
        id: 'low_confidence_ingredients',
        type: 'ingredient_confidence',
        title: 'Some ingredient prices have low confidence',
        message: `${lowConfidenceIngredientCount} ingredient price${lowConfidenceIngredientCount === 1 ? '' : 's'} should be confirmed before quoting tightly.`,
        impactLabel: 'Improves pricing confidence',
        estimatedImpact: null,
        actionLabel: 'Open ingredients',
        actionHref: '/culinary/ingredients',
        canDismiss: true,
      })
    }

    if (stalePriceCount > 0 || input.event.costNeedsRefresh) {
      suggestions.push({
        id: 'refresh_stale_pricing',
        type: 'stale_pricing',
        title: 'Refresh stale pricing',
        message:
          stalePriceCount > 0
            ? `${stalePriceCount} ingredient price${stalePriceCount === 1 ? '' : 's'} may need a refresh.`
            : 'Ingredient costs changed since this event was last costed.',
        impactLabel: 'Current costs',
        estimatedImpact: null,
        actionLabel: 'Review cost refresh',
        actionHref: menuHref,
        canDismiss: true,
      })
    }
  }

  if (categories.ops) {
    if (input.event.hasMenu) {
      checks.push({
        id: 'menu_costing_coverage',
        label: 'Menu costing coverage',
        status: input.event.hasAllRecipeCosts === false ? 'review' : 'pass',
        severity: input.event.hasAllRecipeCosts === false ? 'medium' : 'info',
        message:
          input.event.hasAllRecipeCosts === false
            ? 'Menu has components without complete recipe cost data.'
            : 'Attached menu has costing coverage.',
        recommendation:
          input.event.hasAllRecipeCosts === false
            ? 'Cost remaining menu components before treating projected margin as final.'
            : 'Menu costing can support this readiness view.',
        canDismiss: true,
      })
    } else {
      checks.push({
        id: 'menu_attached',
        label: 'Menu attached',
        status: 'unknown',
        severity: 'low',
        message: 'No attached menu was found for this event.',
        recommendation: 'Attach a menu when you want menu-level costing and prep suggestions.',
        canDismiss: true,
      })
    }

    const hasAnyOpsCost =
      positive(input.pricing.actualTotalCostCents) > positive(input.pricing.actualFoodCostCents) ||
      positive(input.event.timeLoggedMinutes) > 0 ||
      positive(input.event.travelTimeMinutes) > 0 ||
      positive(input.event.mileageMiles) > 0
    checks.push({
      id: 'ops_cost_assumptions',
      label: 'Ops cost assumptions',
      status: hasAnyOpsCost ? 'pass' : 'unknown',
      severity: hasAnyOpsCost ? 'info' : 'low',
      message: hasAnyOpsCost
        ? 'At least one labor, travel, mileage, or overhead signal is present.'
        : 'No labor, travel, rental, or overhead assumptions are recorded yet.',
      recommendation: hasAnyOpsCost
        ? 'Use actual expenses and time logs as they become available.'
        : 'Add ops costs if they materially affect this event.',
      canDismiss: true,
    })

    if (
      !hasAnyOpsCost &&
      ['accepted', 'paid', 'confirmed', 'in_progress'].includes(String(input.event.status))
    ) {
      suggestions.push({
        id: 'ops_cost_assumptions_missing',
        type: 'ops_readiness',
        title: 'Ops costs are not modeled yet',
        message:
          'Labor, travel, rental, or overhead costs can be added if they materially affect this event.',
        impactLabel: 'Completes margin picture',
        estimatedImpact: null,
        actionLabel: 'Open event money',
        actionHref: eventHref,
        canDismiss: true,
      })
    }
  }

  if (ticketsEnabled && totalCapacity > 0) {
    checks.push({
      id: 'ticket_momentum',
      label: 'Ticket momentum',
      status:
        soldCount > 0
          ? soldRatio != null && soldRatio >= 0.8
            ? 'pass'
            : 'review'
          : daysSinceLaunch != null && daysSinceLaunch >= 1
            ? 'review'
            : 'unknown',
      severity:
        soldCount > 0
          ? soldRatio != null && soldRatio >= 0.8
            ? 'info'
            : 'low'
          : daysSinceLaunch != null && daysSinceLaunch >= 2
            ? 'medium'
            : 'low',
      message:
        soldCount > 0
          ? `${soldCount} of ${totalCapacity} spots are sold.`
          : daysSinceLaunch != null && daysSinceLaunch >= 1
            ? 'No paid tickets recorded since the public page launched.'
            : 'Waiting for early ticket activity.',
      recommendation:
        soldCount > 0
          ? 'Use early demand to decide whether to share again or protect the last seats.'
          : 'Add photos, confirm the offer, or share the event again if sales stay quiet.',
      canDismiss: true,
    })

    if (soldCount === 0 && daysSinceLaunch != null && daysSinceLaunch >= 1) {
      suggestions.push({
        id: 'ticket_momentum_no_first_sale',
        type: 'event_momentum',
        title: 'First sale has not landed yet',
        message:
          daysSinceLaunch >= 2
            ? `The public page has been live for ${daysSinceLaunch} days without a paid ticket.`
            : 'The public page is live, but no paid ticket has posted yet.',
        impactLabel: 'Early demand signal',
        estimatedImpact: null,
        actionLabel: 'Review tickets',
        actionHref: `/events/${input.event.id}?tab=tickets`,
        canDismiss: true,
      })
    }

    if (firstSaleAt && shareCreatedAt && wholeDaysBetween(shareCreatedAt, firstSaleAt) >= 2) {
      suggestions.push({
        id: 'ticket_momentum_slow_first_sale',
        type: 'event_momentum',
        title: 'First sale took longer than usual',
        message: 'Early conversion was slow enough to justify another share or page tune-up.',
        impactLabel: 'Promotion timing',
        estimatedImpact: null,
        actionLabel: 'Open ticketing',
        actionHref: `/events/${input.event.id}?tab=tickets`,
        canDismiss: true,
      })
    }
  }

  if (ticketsEnabled && remainingCapacity !== null && remainingCapacity > 0) {
    if (input.tickets?.publicShareUrl || input.event.hasPublicShare) {
      suggestions.push({
        id: 'share_public_event_copy',
        type: 'contextual_sharing',
        title: 'Share copy is ready',
        message:
          remainingCapacity <= 3
            ? 'Use the last-spots copy before the page fills up.'
            : 'Use the event share link with a short text or social post.',
        impactLabel: 'Lower promotion friction',
        estimatedImpact: null,
        actionLabel: 'Open public page',
        actionHref: input.tickets?.publicShareUrl ?? `/events/${input.event.id}?tab=tickets`,
        canDismiss: true,
      })
    }
  }

  if (guestCount > 0 && supplierLineCount > 0) {
    const minimumSignals = Math.max(3, Math.ceil(guestCount / 12))
    if (supplierLineCount < minimumSignals) {
      suggestions.push({
        id: 'supplier_plan_thin_for_guest_count',
        type: 'supply_risk',
        title: 'Supplier plan looks thin for guest count',
        message: `${supplierLineCount} supplier line${supplierLineCount === 1 ? '' : 's'} captured for ${guestCount} guests.`,
        impactLabel: 'Supply backup',
        estimatedImpact: null,
        actionLabel: 'Open event ops',
        actionHref: `/events/${input.event.id}?tab=ops`,
        canDismiss: true,
      })
    }
  }

  if (looksSeasonal && (stalePriceCount > 0 || sourceLinkCount > 0 || supplierLineCount > 0)) {
    suggestions.push({
      id: 'seasonal_supply_backup',
      type: 'supply_risk',
      title: 'Seasonal supply may need a backup',
      message:
        'Seasonal or supplier-driven ingredients are present; confirm availability before the event goes live.',
      impactLabel: 'Availability risk',
      estimatedImpact: null,
      actionLabel: 'Review sources',
      actionHref: `/events/${input.event.id}?tab=ops`,
      canDismiss: true,
    })
  }

  if (acceptedCollaboratorCount > 0) {
    if (timelineItemCount === 0) {
      suggestions.push({
        id: 'role_prompt_host_service_timing',
        type: 'role_prompt',
        title: 'Host should confirm service timing',
        message: 'Collaborators are attached, but the public/service timeline is still empty.',
        impactLabel: 'Role clarity',
        estimatedImpact: null,
        actionLabel: 'Open prep',
        actionHref: `/events/${input.event.id}?tab=prep`,
        canDismiss: true,
      })
    }

    if (supplierLineCount > 0 && sourceLinkCount === 0) {
      suggestions.push({
        id: 'role_prompt_supplier_window',
        type: 'role_prompt',
        title: 'Supplier should confirm availability window',
        message: 'Supplier ingredients are listed without source confirmations or pickup windows.',
        impactLabel: 'Fewer assumptions',
        estimatedImpact: null,
        actionLabel: 'Open ops',
        actionHref: `/events/${input.event.id}?tab=ops`,
        canDismiss: true,
      })
    }
  }

  if (
    activeStatuses.includes(statusValue) &&
    daysUntilEvent != null &&
    daysUntilEvent >= 0 &&
    daysUntilEvent <= 14 &&
    !input.event.preEventChecklistConfirmedAt
  ) {
    suggestions.push({
      id: 'micro_confirm_service_assumptions',
      type: 'micro_confirmation',
      title: 'Confirm the service assumptions',
      message:
        'Check the small things now: cooking on-site, fixed vs flexible seating, and service timing.',
      impactLabel: 'Prevents silent mismatches',
      estimatedImpact: null,
      actionLabel: 'Open ops',
      actionHref: `/events/${input.event.id}?tab=ops`,
      canDismiss: true,
    })
  }

  if (
    guestCount > 0 &&
    input.event.guestCountConfirmed === false &&
    daysUntilEvent != null &&
    daysUntilEvent >= 0 &&
    daysUntilEvent <= 7
  ) {
    suggestions.push({
      id: 'micro_confirm_guest_count',
      type: 'micro_confirmation',
      title: 'Confirm guest count',
      message: 'The event is close and guest count is still unconfirmed.',
      impactLabel: 'Portion and seating accuracy',
      estimatedImpact: null,
      actionLabel: 'Open event',
      actionHref: `/events/${input.event.id}`,
      canDismiss: true,
    })
  }

  if (
    activeStatuses.includes(statusValue) &&
    (looksOutdoor || input.publicPage?.farmEnabled || layoutZoneCount > 0) &&
    publicStoryLength < 120
  ) {
    suggestions.push({
      id: 'guest_expectations_missing_details',
      type: 'guest_expectation',
      title: 'Guest expectations need a little more context',
      message:
        'Add dress, outdoor setting, terrain, parking, or arrival notes so guests are not guessing.',
      impactLabel: 'Clearer guest arrival',
      estimatedImpact: null,
      actionLabel: 'Open public page',
      actionHref: `/events/${input.event.id}?tab=tickets`,
      canDismiss: true,
    })
  }

  if (
    activeStatuses.includes(statusValue) &&
    (ticketsEnabled ||
      input.event.hasPublicShare === true ||
      (daysUntilEvent != null && daysUntilEvent >= 0 && daysUntilEvent <= 30)) &&
    !input.event.accessInstructions &&
    !includesAny(eventText, ['accessible', 'wheelchair', 'step-free', 'mobility', 'stairs'])
  ) {
    suggestions.push({
      id: 'accessibility_basics_unconfirmed',
      type: 'accessibility',
      title: 'Accessibility basics are not confirmed',
      message:
        'Confirm entry, stairs, parking, walking distance, and seating constraints before guests ask.',
      impactLabel: 'Guest accessibility clarity',
      estimatedImpact: null,
      actionLabel: 'Open ops',
      actionHref: `/events/${input.event.id}?tab=ops`,
      canDismiss: true,
    })
  }

  if (acceptedCollaboratorCount > 0 && input.publicPage?.showChefName === false) {
    suggestions.push({
      id: 'contributor_visibility_hidden_host',
      type: 'contributor_balance',
      title: 'Host attribution is hidden',
      message: 'Collaborators are present, but host visibility is turned off on the public page.',
      impactLabel: 'Balanced attribution',
      estimatedImpact: null,
      actionLabel: 'Review public page',
      actionHref: `/events/${input.event.id}?tab=tickets`,
      canDismiss: true,
    })
  }

  if (pendingCollaboratorCount > 0 && activeStatuses.includes(statusValue)) {
    suggestions.push({
      id: 'pending_collaborator_visibility',
      type: 'contributor_balance',
      title: 'A collaborator has not accepted yet',
      message:
        'Resolve pending collaborators before relying on their name, role, or responsibilities.',
      impactLabel: 'Cleaner collaboration',
      estimatedImpact: null,
      actionLabel: 'Open ops',
      actionHref: `/events/${input.event.id}?tab=ops`,
      canDismiss: true,
    })
  }

  if (publicPhotoCount === 0 && (ticketsEnabled || input.event.hasPublicShare)) {
    suggestions.push({
      id: 'quality_missing_public_photos',
      type: 'quality_flag',
      title: 'Public page has no photos',
      message: 'A few real photos usually reduce hesitation before guests buy or share.',
      impactLabel: 'Page confidence',
      estimatedImpact: null,
      actionLabel: 'Add photos',
      actionHref: `/events/${input.event.id}?tab=overview`,
      canDismiss: true,
    })
  }

  if (
    publicStoryLength > 0 &&
    publicStoryLength < 80 &&
    (ticketsEnabled || input.event.hasPublicShare)
  ) {
    suggestions.push({
      id: 'quality_short_public_description',
      type: 'quality_flag',
      title: 'Public description is very short',
      message: 'Clarify the experience, setting, menu, or host before sharing widely.',
      impactLabel: 'Clearer offer',
      estimatedImpact: null,
      actionLabel: 'Review public page',
      actionHref: `/events/${input.event.id}?tab=tickets`,
      canDismiss: true,
    })
  }

  if (
    activeStatuses.includes(statusValue) &&
    daysUntilEvent != null &&
    daysUntilEvent >= 0 &&
    daysUntilEvent <= 3
  ) {
    suggestions.push({
      id: 'time_nudge_event_close',
      type: 'time_nudge',
      title: 'Event is close',
      message: 'Finalize timing, guest count, supply backups, access, and day-of responsibilities.',
      impactLabel: `${daysUntilEvent} day${daysUntilEvent === 1 ? '' : 's'} out`,
      estimatedImpact: null,
      actionLabel: 'Open prep',
      actionHref: `/events/${input.event.id}?tab=prep`,
      canDismiss: true,
    })
  }

  if (
    (statusValue === 'in_progress' || statusValue === 'completed') &&
    !input.event.debriefCompletedAt &&
    input.event.aarFiled !== true
  ) {
    suggestions.push({
      id: 'incident_log_private_note',
      type: 'incident_logging',
      title: 'Capture a private incident note',
      message: 'If anything went wrong, log the short version now while the details are fresh.',
      impactLabel: 'Future improvement',
      estimatedImpact: null,
      actionLabel: 'Open wrap-up',
      actionHref: `/events/${input.event.id}?tab=wrap`,
      canDismiss: true,
    })
  }

  if (statusValue === 'completed') {
    suggestions.push({
      id: 'expectation_vs_reality_snapshot',
      type: 'reality_snapshot',
      title: 'Review planned vs actual',
      message:
        'Compare planned attendance, capacity, projected revenue, and actual results before closing the event.',
      impactLabel: 'Simple post-event learning',
      estimatedImpact: null,
      actionLabel: 'Open wrap-up',
      actionHref: `/events/${input.event.id}?tab=wrap`,
      canDismiss: true,
    })

    if (
      input.event.resetComplete !== true ||
      input.event.financialClosed !== true ||
      input.event.archived !== true
    ) {
      suggestions.push({
        id: 'post_event_auto_cleanup',
        type: 'auto_cleanup',
        title: 'Clean up completed event',
        message:
          'Archive the active workflow once reset, private notes, media, participants, and finance are preserved.',
        impactLabel: 'Removes active clutter',
        estimatedImpact: null,
        actionLabel: 'Open wrap-up',
        actionHref: `/events/${input.event.id}?tab=wrap`,
        canDismiss: true,
      })
    }
  }

  if (postEventStatuses.includes(statusValue) && ticketsEnabled && totalCapacity > 0) {
    checks.push({
      id: 'expectation_reality_capacity',
      label: 'Attendance vs capacity',
      status: soldCount > 0 ? 'pass' : 'unknown',
      severity: soldCount > 0 ? 'info' : 'low',
      message:
        soldCount > 0
          ? `${soldCount} of ${totalCapacity} spots were sold.`
          : 'No ticket attendance signal is available.',
      recommendation:
        'Use this as the lightweight post-event capacity read before repeating the format.',
      canDismiss: true,
    })
  }

  const sortedChecks = [...checks].sort((left, right) => rankCheck(left) - rankCheck(right))
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(100 - sortedChecks.reduce((sum, check) => sum + statusPenalty(check), 0))
    )
  )
  const hasHighFail = sortedChecks.some(
    (check) => check.status === 'fail' && check.severity === 'high'
  )
  const hasReview = sortedChecks.some(
    (check) => check.status === 'review' || check.status === 'fail'
  )
  const status: EventReadinessStatus =
    sortedChecks.length === 0
      ? 'unknown'
      : hasHighFail || score < 60
        ? 'at_risk'
        : hasReview || score < 85
          ? 'review'
          : 'ready'
  const visibleSuggestions = mode === 'quiet' ? [] : suggestions

  return {
    enabled: true,
    mode,
    status,
    score,
    summary: summarizeEventReadinessAssistant(status, score, suggestions.length),
    checks: sortedChecks,
    suggestions: visibleSuggestions,
    hiddenSuggestionCount: mode === 'quiet' ? suggestions.length : 0,
    hiddenSuggestions: mode === 'quiet' ? suggestions : undefined,
  }
}
