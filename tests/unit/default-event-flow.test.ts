import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildPricingGuidance,
  estimateSafeCapacity,
  evaluatePrePublishReadiness,
  type EventDefaultFlowInput,
} from '../../lib/events/default-event-flow.js'

function baseInput(overrides: Partial<EventDefaultFlowInput> = {}): EventDefaultFlowInput {
  const input: EventDefaultFlowInput = {
    event: {
      id: 'event-1',
      status: 'draft',
      eventDate: '2026-05-15',
      serveTime: '19:00',
      arrivalTime: '16:30',
      guestCount: 20,
      serviceStyle: 'plated',
      quotedPriceCents: 300000,
      locationAddress: '123 Test St',
      locationCity: 'Philadelphia',
      locationNotes: 'Use the service entrance.',
      accessInstructions: 'Ring the side door bell.',
      kitchenNotes: 'Prep table along the back wall.',
      siteNotes: null,
      courseCount: 4,
      travelTimeMinutes: 30,
      clientReminder7dSentAt: null,
      clientReminder2dSentAt: null,
      clientReminder1dSentAt: null,
      reviewRequestSentAt: null,
    },
    hasMenu: true,
    menuHasAllRecipeCosts: true,
    publicPhotoCount: 3,
    staffCount: 2,
    collaboratorCount: 1,
    messageCount: 1,
    activeShare: true,
    hubThreadActive: true,
    guestSummary: {
      totalGuests: 20,
      attending: 20,
      waitlisted: 0,
      arrived: 0,
      repeatGuests: 0,
    },
    tickets: {
      ticketTypes: [],
      tickets: [],
      summary: null,
    },
    pricing: {
      eventId: 'event-1',
      eventName: 'Test Dinner',
      guestCount: 20,
      menu: {
        menuIds: ['menu-1'],
        menuNames: ['Test Menu'],
        totalComponentCount: 4,
        hasAllRecipeCosts: true,
      },
      projected: {
        foodCostCents: 90000,
        laborCostCents: 60000,
        travelCostCents: 0,
        overheadCostCents: 15000,
        rentalsCostCents: 0,
        miscellaneousCostCents: 0,
        totalCostCents: 165000,
        quoteTotalCents: 300000,
        suggestedPriceCents: 285000,
        suggestedPriceSource: 'projected_food_cost',
        suggestedPriceReason: 'Complete menu costs available.',
        targetFoodCostPercent: 32,
        targetMarginPercent: 45,
        projectedFoodCostPercent: 30,
        expectedProfitCents: 135000,
        expectedMarginPercent: 45,
      },
      actual: {
        foodCostCents: 0,
        laborCostCents: 0,
        travelCostCents: 0,
        overheadCostCents: 0,
        rentalsCostCents: 0,
        miscellaneousCostCents: 0,
        totalCostCents: 0,
        revenueCents: 0,
        actualProfitCents: 0,
        actualMarginPercent: null,
        actualFoodCostPercent: null,
      },
      variance: {
        estimatedVsActualCostCents: 0,
        estimatedVsActualPercent: null,
        foodCostVarianceCents: 0,
        marginDeltaPercent: null,
      },
      warnings: [],
      confidence: {
        pricingConfidence: 'high',
        fallbackUsed: false,
        stalePriceCount: 0,
        lowConfidenceIngredientCount: 0,
        missingPriceCount: 0,
        totalIngredientCount: 12,
      },
      priceSignals: {
        ingredientSpikes: [],
        ingredientSpikeCount: 0,
        insufficientHistoryCount: 0,
      },
      similarEvents: {
        sampleSize: 3,
        averagePricePerGuestCents: 14500,
        averageMarginPercent: 42,
      },
      guidance: {
        suggestedRangeLowCents: 262200,
        suggestedRangeHighCents: 324800,
        priceRisk: 'balanced',
      },
    },
    similarPricing: {
      sampleSize: 3,
      averagePricePerGuestCents: 14500,
      averageMarginPercent: 42,
    },
    feedback: {
      surveySent: false,
      surveyCompleted: false,
      averageRating: null,
    },
    trust: {
      pastEventsCount: 4,
      completedTicketedEventsCount: 3,
      attendanceConsistencyPercent: 95,
    },
  }

  return {
    ...input,
    ...overrides,
    event: { ...input.event, ...overrides.event },
    guestSummary: { ...input.guestSummary, ...overrides.guestSummary },
    tickets: { ...input.tickets, ...overrides.tickets },
    feedback: { ...input.feedback, ...overrides.feedback },
    trust: { ...input.trust, ...overrides.trust },
  }
}

describe('event default flow', () => {
  it('blocks publishing when arrival, location, and price are missing', () => {
    const readiness = evaluatePrePublishReadiness(
      baseInput({
        event: {
          locationAddress: null,
          locationCity: null,
          arrivalTime: null,
          accessInstructions: null,
          quotedPriceCents: null,
        },
        pricing: null,
      })
    )

    assert.equal(readiness.status, 'not_ready')
    assert(readiness.issues.some((issue) => issue.id === 'location_missing'))
    assert(readiness.issues.some((issue) => issue.id === 'arrival_plan'))
    assert(readiness.issues.some((issue) => issue.id === 'price_missing'))
  })

  it('uses ingredient inputs and similar events to flag underpriced events', () => {
    const guidance = buildPricingGuidance(
      baseInput({
        event: {
          quotedPriceCents: 200000,
        },
      })
    )

    assert.equal(guidance.risk, 'high')
    assert.equal(guidance.label, 'Likely too cheap')
    assert.equal(guidance.lowCents, 262200)
    assert.equal(guidance.highCents, 324800)
  })

  it('estimates safe capacity from service style, staffing, and layout constraints', () => {
    assert.equal(
      estimateSafeCapacity({
        serviceStyle: 'plated',
        staffCount: 3,
        layoutCapacity: 28,
      }),
      28
    )
    assert.equal(
      estimateSafeCapacity({
        serviceStyle: 'cocktail',
        staffCount: 2,
      }),
      56
    )
  })
})
