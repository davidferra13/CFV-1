import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateEventReadinessAssistant,
  filterDismissedEventReadinessSuggestions,
  type EventReadinessAssistantInput,
} from '@/lib/events/event-readiness-assistant'

function baseInput(
  overrides: Partial<EventReadinessAssistantInput> = {}
): EventReadinessAssistantInput {
  return {
    enabled: true,
    mode: 'normal',
    categories: {
      financial: true,
      pricingConfidence: true,
      ops: true,
    },
    event: {
      id: 'evt_1',
      status: 'accepted',
      guestCount: 12,
      hasMenu: true,
      menuIds: ['menu_1'],
      hasAllRecipeCosts: true,
      costNeedsRefresh: false,
      travelTimeMinutes: 30,
      mileageMiles: 12,
      timeLoggedMinutes: 120,
    },
    pricing: {
      quoteOrRevenueCents: 150000,
      projectedFoodCostCents: 42000,
      projectedFoodCostPercent: 28,
      suggestedPriceCents: 140000,
      targetFoodCostPercent: 30,
      targetMarginPercent: 60,
      expectedMarginPercent: 72,
      actualFoodCostCents: 0,
      actualTotalCostCents: 0,
      actualFoodCostPercent: null,
      actualMarginPercent: null,
      estimatedVsActualPercent: null,
      estimatedVsActualCostCents: null,
      fallbackUsed: false,
      stalePriceCount: 0,
      lowConfidenceIngredientCount: 0,
      missingPriceCount: 0,
      totalIngredientCount: 8,
    },
    ...overrides,
  }
}

test('off mode suppresses the assistant', () => {
  const result = evaluateEventReadinessAssistant(baseInput({ mode: 'off' }))

  assert.equal(result.enabled, false)
  assert.equal(result.mode, 'off')
  assert.equal(result.checks.length, 0)
  assert.equal(result.suggestions.length, 0)
})

test('quiet mode hides detailed suggestions but keeps suggestion count', () => {
  const result = evaluateEventReadinessAssistant(
    baseInput({
      mode: 'quiet',
      pricing: {
        ...baseInput().pricing,
        quoteOrRevenueCents: 100000,
        suggestedPriceCents: 150000,
      },
    })
  )

  assert.equal(result.mode, 'quiet')
  assert.equal(result.suggestions.length, 0)
  assert.ok(result.hiddenSuggestionCount > 0)
  assert.ok((result.hiddenSuggestions ?? []).length > 0)
})

test('normal mode returns checks and suggestions', () => {
  const result = evaluateEventReadinessAssistant(
    baseInput({
      pricing: {
        ...baseInput().pricing,
        quoteOrRevenueCents: 100000,
        projectedFoodCostPercent: 42,
        suggestedPriceCents: 150000,
        expectedMarginPercent: 58,
      },
    })
  )

  assert.equal(result.enabled, true)
  assert.ok(result.checks.length > 0)
  assert.ok(result.suggestions.some((suggestion) => suggestion.type === 'price_adjustment'))
})

test('dismissed suggestion IDs are filtered from normal-mode suggestions', () => {
  const result = evaluateEventReadinessAssistant(
    baseInput({
      pricing: {
        ...baseInput().pricing,
        quoteOrRevenueCents: 100000,
        suggestedPriceCents: 150000,
      },
    })
  )
  const filtered = filterDismissedEventReadinessSuggestions(result, ['quote_below_suggested_price'])

  assert.equal(
    filtered.suggestions.some((suggestion) => suggestion.id === 'quote_below_suggested_price'),
    false
  )
  assert.ok(filtered.suggestions.some((suggestion) => suggestion.id === 'menu_may_need_repricing'))
})

test('dismissed suggestion IDs are filtered from quiet-mode hidden suggestions and count', () => {
  const result = evaluateEventReadinessAssistant(
    baseInput({
      mode: 'quiet',
      pricing: {
        ...baseInput().pricing,
        quoteOrRevenueCents: 100000,
        suggestedPriceCents: 150000,
      },
    })
  )
  const originalHiddenCount = result.hiddenSuggestionCount
  const filtered = filterDismissedEventReadinessSuggestions(result, ['quote_below_suggested_price'])

  assert.equal(filtered.suggestions.length, 0)
  assert.equal(
    (filtered.hiddenSuggestions ?? []).some(
      (suggestion) => suggestion.id === 'quote_below_suggested_price'
    ),
    false
  )
  assert.equal(filtered.hiddenSuggestionCount, originalHiddenCount - 1)
  assert.ok(
    (filtered.hiddenSuggestions ?? []).some(
      (suggestion) => suggestion.id === 'menu_may_need_repricing'
    )
  )
})

test('projected margin below target creates review or at-risk status', () => {
  const result = evaluateEventReadinessAssistant(
    baseInput({
      pricing: {
        ...baseInput().pricing,
        expectedMarginPercent: 45,
        targetMarginPercent: 60,
      },
    })
  )

  assert.ok(result.status === 'review' || result.status === 'at_risk')
  assert.ok(result.score < 100)
  assert.ok(result.checks.some((check) => check.id === 'target_margin'))
})

test('low-confidence pricing creates an ingredient confidence suggestion', () => {
  const result = evaluateEventReadinessAssistant(
    baseInput({
      pricing: {
        ...baseInput().pricing,
        lowConfidenceIngredientCount: 3,
        totalIngredientCount: 8,
      },
    })
  )

  assert.ok(result.suggestions.some((suggestion) => suggestion.type === 'ingredient_confidence'))
})

test('missing quote creates review status', () => {
  const result = evaluateEventReadinessAssistant(
    baseInput({
      pricing: {
        ...baseInput().pricing,
        quoteOrRevenueCents: 0,
      },
    })
  )

  assert.equal(result.checks.find((check) => check.id === 'quote_revenue')?.status, 'review')
  assert.ok(result.status === 'review' || result.status === 'at_risk')
})

test('actual spend over estimate creates variance suggestion', () => {
  const result = evaluateEventReadinessAssistant(
    baseInput({
      pricing: {
        ...baseInput().pricing,
        actualFoodCostCents: 56000,
        projectedFoodCostCents: 42000,
        estimatedVsActualPercent: 33.3,
        estimatedVsActualCostCents: 14000,
      },
    })
  )

  assert.ok(result.suggestions.some((suggestion) => suggestion.type === 'shopping_optimization'))
})

test('readiness score stays high when event is financially ready', () => {
  const result = evaluateEventReadinessAssistant(baseInput())

  assert.equal(result.status, 'ready')
  assert.ok(result.score >= 85)
})

test('ticketed events surface early momentum and sharing defaults', () => {
  const result = evaluateEventReadinessAssistant(
    baseInput({
      event: {
        ...baseInput().event,
        hasPublicShare: true,
        createdAt: '2026-04-20T12:00:00.000Z',
        eventDate: '2026-05-20',
      },
      tickets: {
        enabled: true,
        totalCapacity: 24,
        soldCount: 0,
        pendingCount: 0,
        paidOrderCount: 0,
        shareCreatedAt: '2026-04-20T12:00:00.000Z',
        publicShareUrl: 'https://example.test/e/share',
      },
    })
  )

  assert.ok(result.checks.some((check) => check.id === 'ticket_momentum'))
  assert.ok(result.suggestions.some((suggestion) => suggestion.type === 'event_momentum'))
  assert.ok(result.suggestions.some((suggestion) => suggestion.type === 'contextual_sharing'))
})

test('supplier and role defaults appear from sparse collaborator context', () => {
  const result = evaluateEventReadinessAssistant(
    baseInput({
      collaborators: {
        acceptedCount: 1,
        pendingCount: 0,
        roles: ['co_host'],
      },
      publicPage: {
        supplierLineCount: 1,
        sourceLinkCount: 0,
        timelineItemCount: 0,
      },
    })
  )

  assert.ok(result.suggestions.some((suggestion) => suggestion.type === 'role_prompt'))
  assert.ok(result.suggestions.some((suggestion) => suggestion.type === 'supply_risk'))
})

test('near-term events ask for small confirmations and accessibility basics', () => {
  const result = evaluateEventReadinessAssistant(
    baseInput({
      event: {
        ...baseInput().event,
        eventDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        guestCountConfirmed: false,
        preEventChecklistConfirmedAt: null,
        accessInstructions: null,
      },
    })
  )

  assert.ok(result.suggestions.some((suggestion) => suggestion.type === 'micro_confirmation'))
  assert.ok(result.suggestions.some((suggestion) => suggestion.type === 'time_nudge'))
  assert.ok(result.suggestions.some((suggestion) => suggestion.type === 'accessibility'))
})

test('completed events surface reality snapshot and cleanup defaults', () => {
  const result = evaluateEventReadinessAssistant(
    baseInput({
      event: {
        ...baseInput().event,
        status: 'completed',
        resetComplete: false,
        financialClosed: false,
        archived: false,
        aarFiled: false,
        debriefCompletedAt: null,
      },
      tickets: {
        enabled: true,
        totalCapacity: 12,
        soldCount: 10,
        paidOrderCount: 6,
      },
    })
  )

  assert.ok(result.suggestions.some((suggestion) => suggestion.type === 'reality_snapshot'))
  assert.ok(result.suggestions.some((suggestion) => suggestion.type === 'auto_cleanup'))
  assert.ok(result.suggestions.some((suggestion) => suggestion.type === 'incident_logging'))
})
