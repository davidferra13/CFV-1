// Complimentary Intelligence Engine - Detection Layer
// Deterministic opportunity detection (Formula > AI)
// Identifies comp item opportunities from event context without LLM calls

import type {
  CompDetectionContext,
  CompDetectionResult,
  CompSuggestionType,
  CompEffortLevel,
} from '@/lib/private-context/types'

// ============================================================
// DETECTORS (pure functions, no side effects)
// ============================================================

/**
 * Detect unselected preferences: client loved X but menu has Y.
 * Compares client's foodsLove/cuisinePreferences against actual menu dishes.
 */
function detectUnselectedPreferences(ctx: CompDetectionContext): CompDetectionResult['suggestions'] {
  const suggestions: CompDetectionResult['suggestions'] = []
  if (!ctx.clientPreferences && !ctx.menuPreferences) return suggestions

  const lovedFoods = new Set<string>()
  if (ctx.clientPreferences?.foodsLove) {
    ctx.clientPreferences.foodsLove.forEach(f => lovedFoods.add(f.toLowerCase().trim()))
  }
  if (ctx.menuPreferences?.foodsLove) {
    ctx.menuPreferences.foodsLove
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
      .forEach(f => lovedFoods.add(f))
  }

  if (lovedFoods.size === 0) return suggestions

  const menuItems = new Set(ctx.menuDishes.map(d => d.name.toLowerCase()))

  for (const loved of lovedFoods) {
    const onMenu = [...menuItems].some(
      item => item.includes(loved) || loved.includes(item)
    )
    if (!onMenu && loved.length > 2) {
      suggestions.push({
        type: 'unselected_preference',
        title: `Complimentary ${loved}`,
        description: `Client expressed love for "${loved}" but it's not on the current menu. A small complimentary portion could create a memorable moment.`,
        reasoning: `Client preference data shows strong interest in "${loved}". Adding a small comp version shows attention to detail.`,
        estimatedCostCents: 500, // conservative $5 estimate
        effortLevel: 'minimal',
        confidenceScore: 70,
        sourceData: { lovedItem: loved, source: 'client_preferences' },
      })
    }
  }

  return suggestions
}

/**
 * Detect celebration opportunities: birthdays, anniversaries, milestones.
 */
function detectCelebrations(ctx: CompDetectionContext): CompDetectionResult['suggestions'] {
  const suggestions: CompDetectionResult['suggestions'] = []
  const occasion = (ctx.occasion ?? '').toLowerCase()

  const celebrationKeywords = [
    'birthday', 'anniversary', 'engagement', 'promotion', 'graduation',
    'retirement', 'wedding', 'celebration', 'milestone', 'baby shower',
    'bridal shower', 'housewarming',
  ]

  const isCelebration = celebrationKeywords.some(k => occasion.includes(k))
  if (!isCelebration) return suggestions

  suggestions.push({
    type: 'celebration',
    title: `Celebration surprise for ${occasion}`,
    description: `This is a ${occasion} event. A surprise comp item (amuse-bouche, personalized dessert, or special toast) would elevate the experience.`,
    reasoning: `Celebration events have the highest ROI for complimentary items. Guests remember surprises at milestone events.`,
    estimatedCostCents: 800,
    effortLevel: 'minimal',
    confidenceScore: 85,
    sourceData: { occasion, eventDate: ctx.eventDate },
  })

  return suggestions
}

/**
 * Detect reusable components from carry-forward inventory.
 */
function detectReusableComponents(ctx: CompDetectionContext): CompDetectionResult['suggestions'] {
  const suggestions: CompDetectionResult['suggestions'] = []
  if (ctx.reusableItems.length === 0) return suggestions

  // Match reusable items to current menu dishes (fuzzy)
  for (const item of ctx.reusableItems) {
    const nameLC = item.name.toLowerCase()
    const relatedDish = ctx.menuDishes.find(d =>
      d.name.toLowerCase().includes(nameLC) || nameLC.includes(d.name.toLowerCase())
    )

    if (relatedDish) {
      // Piggyback: reusable component fits into existing menu
      suggestions.push({
        type: 'reusable_component',
        title: `Upgrade ${relatedDish.name} with leftover ${item.name}`,
        description: `You have reusable "${item.name}" from a recent event. It can enhance "${relatedDish.name}" at near-zero additional cost.`,
        reasoning: `Carry-forward ingredient available. Piggybacking on existing dish prep maximizes value from prior production.`,
        estimatedCostCents: 0,
        effortLevel: 'minimal',
        confidenceScore: 90,
        sourceData: { reusableItem: item.name, targetDish: relatedDish.name, sourceEvent: item.sourceEvent },
      })
    } else {
      // True comp: standalone addition
      suggestions.push({
        type: 'reusable_component',
        title: `Complimentary ${item.name} from recent prep`,
        description: `Leftover "${item.name}" from a recent event can be served as a complimentary amuse-bouche or garnish.`,
        reasoning: `Available inventory reduces waste and creates a moment. Near-zero marginal cost.`,
        estimatedCostCents: Math.round(item.estimatedCostCents * 0.1), // marginal cost only
        effortLevel: 'minimal',
        confidenceScore: 75,
        sourceData: { reusableItem: item.name, sourceEvent: item.sourceEvent },
      })
    }
  }

  return suggestions
}

/**
 * Detect high-margin events where comp items have low relative cost.
 */
function detectHighMarginOpportunities(ctx: CompDetectionContext): CompDetectionResult['suggestions'] {
  const suggestions: CompDetectionResult['suggestions'] = []

  // Only suggest if profit margin is > 40%
  if (ctx.profitMarginPercent < 40) return suggestions
  if (ctx.quotedPriceCents === 0) return suggestions

  const compBudgetCents = Math.round(ctx.quotedPriceCents * 0.02) // 2% of quote

  suggestions.push({
    type: 'high_margin',
    title: `High-margin comp opportunity ($${(compBudgetCents / 100).toFixed(2)} budget)`,
    description: `This event has a ${ctx.profitMarginPercent.toFixed(0)}% margin. A $${(compBudgetCents / 100).toFixed(2)} complimentary item (2% of quote) creates outsized client impact at minimal margin impact.`,
    reasoning: `Strong margins allow strategic generosity. Comp items on high-margin events have the best ROI for client retention.`,
    estimatedCostCents: compBudgetCents,
    effortLevel: 'moderate',
    confidenceScore: 65,
    sourceData: {
      profitMarginPercent: ctx.profitMarginPercent,
      quotedPriceCents: ctx.quotedPriceCents,
      suggestedBudgetCents: compBudgetCents,
    },
  })

  return suggestions
}

/**
 * Detect repeat client patterns: reward loyalty with surprises.
 */
function detectClientPatterns(ctx: CompDetectionContext): CompDetectionResult['suggestions'] {
  const suggestions: CompDetectionResult['suggestions'] = []

  const pastCount = ctx.pastEvents.length
  if (pastCount < 2) return suggestions

  // Milestone events (3rd, 5th, 10th booking)
  const currentBookingNumber = pastCount + 1
  const milestones = [3, 5, 10, 15, 20, 25, 50]

  if (milestones.includes(currentBookingNumber)) {
    suggestions.push({
      type: 'client_pattern',
      title: `Milestone: client's ${currentBookingNumber}${ordinalSuffix(currentBookingNumber)} booking`,
      description: `This is the client's ${currentBookingNumber}${ordinalSuffix(currentBookingNumber)} event with you. A surprise comp acknowledging their loyalty creates a powerful retention moment.`,
      reasoning: `Repeat clients are the most valuable segment. Recognizing milestones deepens the relationship and signals appreciation.`,
      estimatedCostCents: 1000,
      effortLevel: 'minimal',
      confidenceScore: 80,
      sourceData: { bookingNumber: currentBookingNumber, totalPastEvents: pastCount },
    })
  }

  // Haven't comped this client before
  if (ctx.pastCompItems.length === 0 && pastCount >= 3) {
    suggestions.push({
      type: 'client_pattern',
      title: `First comp for loyal repeat client`,
      description: `This client has booked ${pastCount} times and never received a complimentary item. A surprise now would be especially impactful.`,
      reasoning: `No prior comp items on record. First-time surprises have the highest emotional impact.`,
      estimatedCostCents: 800,
      effortLevel: 'minimal',
      confidenceScore: 75,
      sourceData: { bookingNumber: currentBookingNumber, pastCompCount: 0 },
    })
  }

  return suggestions
}

/**
 * Detect excess production scenarios.
 * When guest count is small but prep quantities require larger batches.
 */
function detectExcessProduction(ctx: CompDetectionContext): CompDetectionResult['suggestions'] {
  const suggestions: CompDetectionResult['suggestions'] = []

  // Small events (1-4 guests) often produce more than needed
  if (ctx.guestCount > 4 || ctx.guestCount === 0) return suggestions

  suggestions.push({
    type: 'excess_production',
    title: `Small event batch surplus opportunity`,
    description: `With ${ctx.guestCount} guest${ctx.guestCount > 1 ? 's' : ''}, production batches may yield surplus. Plan a comp item that uses expected excess (sauces, sides, dessert portions).`,
    reasoning: `Minimum batch sizes often exceed small event needs. Converting surplus into a comp item is better than waste.`,
    estimatedCostCents: 0,
    effortLevel: 'minimal',
    confidenceScore: 60,
    sourceData: { guestCount: ctx.guestCount },
  })

  return suggestions
}

// ============================================================
// MAIN ENGINE
// ============================================================

/**
 * Run all detectors against event context.
 * Pure deterministic logic. No LLM calls.
 * Returns deduplicated, scored, and sorted suggestions.
 */
export function detectCompOpportunities(ctx: CompDetectionContext): CompDetectionResult {
  const allSuggestions = [
    ...detectUnselectedPreferences(ctx),
    ...detectCelebrations(ctx),
    ...detectReusableComponents(ctx),
    ...detectHighMarginOpportunities(ctx),
    ...detectClientPatterns(ctx),
    ...detectExcessProduction(ctx),
  ]

  // Deduplicate by type + title
  const seen = new Set<string>()
  const unique = allSuggestions.filter(s => {
    const key = `${s.type}:${s.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by confidence score descending
  unique.sort((a, b) => b.confidenceScore - a.confidenceScore)

  // Cap at 5 suggestions per event (avoid overwhelm)
  return { suggestions: unique.slice(0, 5) }
}

// ============================================================
// HELPERS
// ============================================================

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
