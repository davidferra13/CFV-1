import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildClientStrategyBrief,
  CLIENT_STRATEGY_SECTION_ORDER,
} from '@/lib/clients/client-strategy-brief'

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    client: {
      id: 'client_1',
      full_name: 'Jordan Client',
      email: 'jordan@example.com',
      phone: null,
      preferred_contact_method: null,
      birthday: null,
      anniversary: null,
      dietary_restrictions: [],
      allergies: [],
      favorite_cuisines: ['Mediterranean'],
      updated_at: new Date().toISOString(),
    },
    nextAction: {
      clientId: 'client_1',
      clientName: 'Jordan Client',
      actionType: 'follow_up_quote',
      label: 'Quote follow-up',
      description: 'A quote is waiting for client response.',
      href: '/quotes/quote_1',
      urgency: 'high',
      tier: 'warm',
      healthScore: 72,
      primarySignal: 'quote_expiring_soon',
      reasons: [
        {
          code: 'quote_expiring_soon',
          message: 'Quote follow-up is due.',
          sourceType: 'action_graph',
          sourceId: 'quote_1',
          entityType: 'quote',
          entityId: 'quote_1',
          actionKind: 'quote_follow_up',
          actionSource: 'quote',
          evidence: ['Quote is active.'],
        },
      ],
      interventionLabel: null,
    },
    outreachHistory: [{ id: 'outreach_1' }],
    history: [{ id: 'event_1' }],
    completedEvents: 2,
    signals: {
      canonical: [],
      profile: [],
      learned: [],
      secondaryLearned: [],
    },
    relationshipHealth: {
      churnRisk: {
        level: 'high',
        score: 44,
        daysSinceLastEvent: 120,
        avgBookingIntervalDays: 90,
        isOverdue: true,
        factors: ['No recent rebooking after completed service.'],
      },
      rebookingPrediction: {
        likelyToRebook: true,
        predictedNextBookingDays: 30,
        seasonalPattern: 'Late spring bookings are common.',
        preferredOccasion: 'birthday',
      },
      revenueTrajectory: {
        trend: 'stable',
        avgEventValueCents: 120000,
        lastEventValueCents: 120000,
        lifetimeValueCents: 240000,
        eventsPerYear: 2,
      },
      insights: ['Repeat spring bookings.'],
    },
    repeat: {
      client: { id: 'client_1' },
      isRepeat: true,
      eventCount: 3,
      completedEventCount: 2,
      totalSpentCents: 240000,
      averageSpendCents: 120000,
      lovedDishes: ['saved tasting-menu favorite'],
      dislikedDishes: ['overly sweet desserts'],
      allergens: [],
      averageFeedback: {
        overall: 4.8,
        foodQuality: 5,
        communication: 4.6,
        count: 2,
      },
      upcomingMilestones: [],
      lastFeedback: {
        overall: 5,
        whatTheyLoved: 'Loved the pacing and service.',
        whatCouldImprove: null,
        wouldBookAgain: true,
        eventDate: '2026-01-01',
      },
      daysSinceLastEvent: 120,
      lastEventDate: '2026-01-01',
      lastVenueNotes: {
        kitchen_notes: null,
        site_notes: 'Freight elevator requires advance access.',
        location: 'Brooklyn',
        event_date: '2026-01-01',
      },
    },
    ...overrides,
  } as any
}

describe('buildClientStrategyBrief', () => {
  it('returns every required recommendation section', () => {
    const brief = buildClientStrategyBrief(makeSnapshot())
    assert.deepEqual(
      brief.sections.map((section) => section.id),
      CLIENT_STRATEGY_SECTION_ORDER
    )
  })

  it('uses known client data to populate immediate, revenue, retention, automation, collection, and risk guidance', () => {
    const brief = buildClientStrategyBrief(makeSnapshot())
    const sections = Object.fromEntries(
      brief.sections.map((section) => [section.id, section.recommendations])
    )

    assert.ok(sections.immediate_actions.length > 0)
    assert.ok(sections.revenue_opportunities.length > 0)
    assert.ok(sections.retention_opportunities.length > 0)
    assert.ok(sections.automation_opportunities.length > 0)
    assert.ok(sections.data_to_collect.length > 0)
    assert.ok(sections.risk_flags.length > 0)
  })

  it('flags missing safety-critical profile facts before menu personalization', () => {
    const brief = buildClientStrategyBrief(makeSnapshot())
    const riskText = brief.sections
      .find((section) => section.id === 'risk_flags')
      ?.recommendations.map((recommendation) => recommendation.title)
      .join(' ')

    assert.match(riskText ?? '', /Dietary and allergy status is not confirmed/)
  })

  it('does not ask AI to generate recipes or new culinary output', () => {
    const brief = buildClientStrategyBrief(makeSnapshot())
    const allText = JSON.stringify(brief).toLowerCase()

    assert.doesNotMatch(allText, /generate recipe/)
    assert.doesNotMatch(allText, /new recipe/)
    assert.doesNotMatch(allText, /create a recipe/)
    assert.doesNotMatch(allText, /suggest a dish/)
  })
})
