import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildClientContributionPortfolio,
  buildClientContributionSnapshot,
  getContributionTier,
} from '@/lib/client-contribution/scoring'
import {
  buildAcquisitionSourceRoi,
  buildCapacityAllocationPlan,
  buildClientBusinessGoalAlignment,
  buildClientContributionBusinessBriefing,
  buildClientSeasonalityForecastPlan,
  buildClientSegmentBuilder,
  buildClientContributionTimeline,
  buildClientDependencySimulation,
  buildCommunicationRoiSummary,
  buildContributionOpportunityPlan,
  buildGeographicProfitabilityMap,
  buildRevenueConcentrationWarning,
  buildServiceFormatProfitabilityMap,
} from '@/lib/client-contribution/strategy'

describe('client contribution scoring', () => {
  it('scores profitable repeat clients as strategic or growth with consistent portfolio totals', () => {
    const snapshot = buildClientContributionSnapshot(
      {
        clientId: 'client-1',
        clientName: 'Avery Client',
        email: 'avery@example.com',
        referralPotential: 'high',
        createdAt: '2025-05-19T00:00:00.000Z',
        financials: {
          lifetimeValueCents: 1_400_000,
          totalEventsCompleted: 6,
          averageSpendPerEvent: 233_333,
          outstandingBalanceCents: 0,
          lastEventDate: '2026-05-01T00:00:00.000Z',
          daysSinceLastEvent: 18,
          isDormant: false,
        },
        eventFinancials: [
          {
            eventId: 'event-1',
            totalPaidCents: 800_000,
            totalExpensesCents: 220_000,
            profitCents: 580_000,
            outstandingBalanceCents: 0,
          },
          {
            eventId: 'event-2',
            totalPaidCents: 600_000,
            totalExpensesCents: 180_000,
            profitCents: 420_000,
            outstandingBalanceCents: 0,
          },
        ],
        hasInternalAssessment: true,
      },
      { now: new Date('2026-05-19T00:00:00.000Z') }
    )

    assert.equal(snapshot.paidRevenueCents, 1_400_000)
    assert.equal(snapshot.netProfitCents, 1_000_000)
    assert.equal(snapshot.marginPercent, 71)
    assert.equal(['strategic', 'growth'].includes(snapshot.tier), true)
    assert.equal(snapshot.recommendedAction, 'nurture_referrals')
    assert.equal(snapshot.fitScore.level, 'excellent')
    assert.equal(snapshot.portfolioCategory.key, 'high_value_healthy')
    assert.equal(snapshot.pricingRecommendation.kind, 'offer_package')
    assert.equal(snapshot.referralNetworkValue.recommendedAction, 'ask_for_referral')
    assert.equal(snapshot.playbooks.primary.kind, 'ask_for_referral')
    assert.ok(snapshot.playbooks.secondary.some((playbook) => playbook.kind === 'protect_vip'))

    const portfolio = buildClientContributionPortfolio([snapshot])
    assert.equal(portfolio.summary.totalPaidRevenueCents, snapshot.paidRevenueCents)
    assert.equal(portfolio.summary.totalNetProfitCents, snapshot.netProfitCents)
  })

  it('returns low-confidence repair guidance for sparse or missing data', () => {
    const snapshot = buildClientContributionSnapshot({
      clientId: 'client-2',
      clientName: 'Sparse Client',
      financials: null,
      eventFinancials: [],
      referralPotential: null,
      hasInternalAssessment: false,
    })

    assert.equal(snapshot.tier, 'unknown')
    assert.equal(snapshot.recommendedAction, 'repair_data')
    assert.equal(snapshot.fitScore.level, 'unknown')
    assert.equal(snapshot.portfolioCategory.key, 'sparse_data')
    assert.equal(snapshot.pricingRecommendation.kind, 'insufficient_data')
    assert.equal(snapshot.dataConfidence.level, 'low')
    assert.ok(snapshot.missingData.some((item) => item.key === 'financial_summary'))
    assert.ok(snapshot.missingData.some((item) => item.key === 'internal_assessment'))
  })

  it('allows review state tier overrides without losing computed tier', () => {
    const snapshot = buildClientContributionSnapshot({
      clientId: 'client-3',
      clientName: 'Override Client',
      financials: {
        lifetimeValueCents: 50_000,
        totalEventsCompleted: 1,
        averageSpendPerEvent: 50_000,
        outstandingBalanceCents: 0,
        lastEventDate: '2026-05-10T00:00:00.000Z',
        daysSinceLastEvent: 9,
      },
      eventFinancials: [
        {
          eventId: 'event-3',
          totalPaidCents: 50_000,
          totalExpensesCents: 10_000,
          profitCents: 40_000,
        },
      ],
      hasInternalAssessment: true,
      referralPotential: 'low',
      reviewState: {
        status: 'reviewed',
        reviewedAt: '2026-05-19T00:00:00.000Z',
        dismissedAt: null,
        dismissReason: null,
        pinned: false,
        tierOverride: 'growth',
        nextReviewDate: null,
        note: null,
      },
    })

    assert.notEqual(snapshot.computedTier, 'growth')
    assert.equal(snapshot.tier, 'growth')
  })

  it('separates high-value bad-fit clients from high-value good-fit clients', () => {
    const badFit = buildClientContributionSnapshot({
      clientId: 'client-bad-fit',
      clientName: 'High Revenue Bad Fit',
      referralPotential: 'low',
      financials: {
        lifetimeValueCents: 1_200_000,
        totalEventsCompleted: 4,
        averageSpendPerEvent: 300_000,
        outstandingBalanceCents: 150_000,
        lastEventDate: '2026-05-01T00:00:00.000Z',
        daysSinceLastEvent: 18,
      },
      eventFinancials: [
        {
          eventId: 'bad-fit-event',
          totalPaidCents: 1_200_000,
          totalExpensesCents: 1_050_000,
          profitCents: 150_000,
          outstandingBalanceCents: 150_000,
        },
      ],
      relationshipSignals: {
        redFlags: 'Late scope changes and rude complaint escalation',
        paymentBehavior: 'Slow and overdue',
      },
      hasInternalAssessment: true,
    })

    assert.equal(badFit.fitScore.level, 'poor')
    assert.equal(badFit.portfolioCategory.key, 'high_value_at_risk')
    assert.ok(
      badFit.fitScore.negativeDrivers.some((driver) => driver.label === 'Internal red flag')
    )
  })

  it('detects margin leaks and produces chef-reviewed pricing guidance', () => {
    const snapshot = buildClientContributionSnapshot({
      clientId: 'client-leak',
      clientName: 'Margin Leak Client',
      referralPotential: 'medium',
      financials: {
        lifetimeValueCents: 800_000,
        totalEventsCompleted: 2,
        averageSpendPerEvent: 400_000,
        outstandingBalanceCents: 0,
        lastEventDate: '2026-05-01T00:00:00.000Z',
        daysSinceLastEvent: 18,
      },
      eventFinancials: [
        {
          eventId: 'leak-event',
          totalPaidCents: 800_000,
          totalExpensesCents: 700_000,
          profitCents: 100_000,
        },
      ],
      hasInternalAssessment: true,
    })

    assert.equal(snapshot.marginPercent, 13)
    assert.equal(snapshot.marginLeaks[0].type, 'low_margin')
    assert.equal(snapshot.pricingRecommendation.kind, 'stop_discounting')
    assert.equal(snapshot.pricingRecommendation.riskLevel, 'high')
    assert.equal(snapshot.playbooks.primary.kind, 'raise_price_carefully')
    assert.ok(
      snapshot.playbooks.secondary.some((playbook) => playbook.kind === 'stop_over_serving')
    )
  })

  it('uses stable score tier boundaries', () => {
    assert.equal(getContributionTier(90), 'strategic')
    assert.equal(getContributionTier(70), 'growth')
    assert.equal(getContributionTier(50), 'steady')
    assert.equal(getContributionTier(20), 'repair')
    assert.equal(getContributionTier(0), 'unknown')
  })

  it('builds 30/60/90 opportunities for urgent contribution decisions', () => {
    const collectionRisk = buildClientContributionSnapshot(
      {
        clientId: 'client-4',
        clientName: 'Collection Client',
        referralPotential: 'medium',
        financials: {
          lifetimeValueCents: 1_000_000,
          totalEventsCompleted: 3,
          averageSpendPerEvent: 333_333,
          outstandingBalanceCents: 250_000,
          lastEventDate: '2026-05-01T00:00:00.000Z',
          daysSinceLastEvent: 18,
        },
        eventFinancials: [
          {
            eventId: 'event-4',
            totalPaidCents: 1_000_000,
            totalExpensesCents: 500_000,
            profitCents: 500_000,
            outstandingBalanceCents: 250_000,
          },
        ],
        hasInternalAssessment: true,
      },
      { now: new Date('2026-05-19T00:00:00.000Z') }
    )
    const referralClient = buildClientContributionSnapshot(
      {
        clientId: 'client-5',
        clientName: 'Referral Client',
        referralPotential: 'high',
        financials: {
          lifetimeValueCents: 900_000,
          totalEventsCompleted: 5,
          averageSpendPerEvent: 180_000,
          outstandingBalanceCents: 0,
          lastEventDate: '2026-05-10T00:00:00.000Z',
          daysSinceLastEvent: 9,
        },
        eventFinancials: [
          {
            eventId: 'event-5',
            totalPaidCents: 900_000,
            totalExpensesCents: 200_000,
            profitCents: 700_000,
          },
        ],
        hasInternalAssessment: true,
      },
      { now: new Date('2026-05-19T00:00:00.000Z') }
    )

    const opportunities = buildContributionOpportunityPlan(
      buildClientContributionPortfolio([collectionRisk, referralClient]),
      { now: new Date('2026-05-19T00:00:00.000Z') }
    )

    assert.equal(opportunities[0].clientId, 'client-4')
    assert.equal(opportunities[0].window, '30')
    assert.ok(opportunities.some((item) => item.clientId === 'client-5'))
  })

  it('builds timeline milestones and dependency simulations from portfolio math', () => {
    const snapshot = buildClientContributionSnapshot(
      {
        clientId: 'client-6',
        clientName: 'Major Client',
        referralPotential: 'high',
        financials: {
          lifetimeValueCents: 2_400_000,
          totalEventsCompleted: 4,
          averageSpendPerEvent: 600_000,
          outstandingBalanceCents: 0,
          lastEventDate: '2026-04-01T00:00:00.000Z',
          daysSinceLastEvent: 48,
        },
        eventFinancials: [
          {
            eventId: 'event-6',
            totalPaidCents: 2_400_000,
            totalExpensesCents: 900_000,
            profitCents: 1_500_000,
          },
        ],
        hasInternalAssessment: true,
      },
      { now: new Date('2026-05-19T00:00:00.000Z') }
    )
    const smallClient = buildClientContributionSnapshot({
      clientId: 'client-7',
      clientName: 'Small Client',
      referralPotential: 'low',
      financials: {
        lifetimeValueCents: 300_000,
        totalEventsCompleted: 2,
        averageSpendPerEvent: 150_000,
        outstandingBalanceCents: 0,
      },
      eventFinancials: [
        {
          eventId: 'event-7',
          totalPaidCents: 300_000,
          totalExpensesCents: 100_000,
          profitCents: 200_000,
        },
      ],
      hasInternalAssessment: true,
    })
    const portfolio = buildClientContributionPortfolio([snapshot, smallClient])

    const timeline = buildClientContributionTimeline(snapshot)
    assert.ok(timeline.some((item) => item.id.endsWith(':paid-history')))
    assert.ok(timeline.some((item) => item.id.endsWith(':referral')))

    const simulation = buildClientDependencySimulation(portfolio, snapshot)
    assert.equal(simulation.monthlyCashFlowGapCents, 200_000)
    assert.equal(simulation.replacementClientCount, 2)
    assert.equal(simulation.portfolioRevenueSharePercent, 89)
  })

  it('warns on revenue concentration and builds a no-write Remy briefing', () => {
    const major = buildClientContributionSnapshot({
      clientId: 'major-client',
      clientName: 'Major Client',
      referralPotential: 'high',
      financials: {
        lifetimeValueCents: 1_800_000,
        totalEventsCompleted: 6,
        averageSpendPerEvent: 300_000,
        outstandingBalanceCents: 0,
        lastEventDate: '2026-05-01T00:00:00.000Z',
        daysSinceLastEvent: 18,
      },
      eventFinancials: [
        {
          eventId: 'major-event',
          totalPaidCents: 1_800_000,
          totalExpensesCents: 600_000,
          profitCents: 1_200_000,
        },
      ],
      hasInternalAssessment: true,
    })
    const midsize = buildClientContributionSnapshot({
      clientId: 'midsize-client',
      clientName: 'Midsize Client',
      referralPotential: 'medium',
      financials: {
        lifetimeValueCents: 600_000,
        totalEventsCompleted: 3,
        averageSpendPerEvent: 200_000,
        outstandingBalanceCents: 0,
      },
      eventFinancials: [
        {
          eventId: 'midsize-event',
          totalPaidCents: 600_000,
          totalExpensesCents: 250_000,
          profitCents: 350_000,
        },
      ],
      hasInternalAssessment: true,
    })
    const small = buildClientContributionSnapshot({
      clientId: 'small-client',
      clientName: 'Small Client',
      referralPotential: 'low',
      financials: {
        lifetimeValueCents: 300_000,
        totalEventsCompleted: 2,
        averageSpendPerEvent: 150_000,
        outstandingBalanceCents: 50_000,
      },
      eventFinancials: [
        {
          eventId: 'small-event',
          totalPaidCents: 300_000,
          totalExpensesCents: 200_000,
          profitCents: 100_000,
          outstandingBalanceCents: 50_000,
        },
      ],
      hasInternalAssessment: true,
    })

    const portfolio = buildClientContributionPortfolio([major, midsize, small])
    const concentration = buildRevenueConcentrationWarning(portfolio)
    assert.equal(concentration.topOneSharePercent, 67)
    assert.equal(concentration.riskLevel, 'high')
    assert.equal(concentration.replacementClientCount, 4)

    const briefing = buildClientContributionBusinessBriefing(portfolio, {
      now: new Date('2026-05-19T00:00:00.000Z'),
    })
    assert.ok(briefing.topRisks.some((item) => item.label === 'Revenue concentration'))
    assert.ok(briefing.contactToday.some((item) => item.clientId === 'small-client'))
    assert.ok(briefing.uncertainty.some((item) => item.includes('does not update canonical state')))
  })

  it('re-ranks contribution clients by business goal without changing base score', () => {
    const profitClient = buildClientContributionSnapshot({
      clientId: 'profit-client',
      clientName: 'Profit Client',
      acquisitionSource: 'referral',
      preferredEventDays: ['Saturday'],
      preferredServiceStyle: 'plated dinner',
      financials: {
        lifetimeValueCents: 1_200_000,
        totalEventsCompleted: 4,
        averageSpendPerEvent: 300_000,
        outstandingBalanceCents: 0,
        lastEventDate: '2026-05-01T00:00:00.000Z',
        daysSinceLastEvent: 18,
      },
      eventFinancials: [
        {
          eventId: 'profit-event',
          totalPaidCents: 1_200_000,
          totalExpensesCents: 300_000,
          profitCents: 900_000,
        },
      ],
      hasInternalAssessment: true,
    })
    const referralClient = buildClientContributionSnapshot({
      clientId: 'referral-client',
      clientName: 'Referral Client',
      referralPotential: 'high',
      acquisitionSource: 'instagram',
      financials: {
        lifetimeValueCents: 700_000,
        totalEventsCompleted: 2,
        averageSpendPerEvent: 350_000,
        outstandingBalanceCents: 0,
      },
      eventFinancials: [
        {
          eventId: 'referral-event',
          totalPaidCents: 700_000,
          totalExpensesCents: 300_000,
          profitCents: 400_000,
        },
      ],
      hasInternalAssessment: true,
    })

    const portfolio = buildClientContributionPortfolio([profitClient, referralClient])
    const profitAlignment = buildClientBusinessGoalAlignment(portfolio, 'maximize_profit')
    const referralAlignment = buildClientBusinessGoalAlignment(portfolio, 'increase_referrals')

    assert.equal(profitAlignment.rankedClients[0].clientId, 'profit-client')
    assert.equal(referralAlignment.rankedClients[0].clientId, 'referral-client')
    assert.equal(profitClient.contributionScore, portfolio.snapshots[0].contributionScore)
  })

  it('groups acquisition source ROI and tracks unknown source as a repair bucket', () => {
    const known = buildClientContributionSnapshot({
      clientId: 'known-source',
      clientName: 'Known Source',
      acquisitionSource: 'google_business',
      financials: {
        lifetimeValueCents: 500_000,
        totalEventsCompleted: 2,
        averageSpendPerEvent: 250_000,
        outstandingBalanceCents: 0,
      },
      eventFinancials: [
        {
          eventId: 'known-event',
          totalPaidCents: 500_000,
          totalExpensesCents: 150_000,
          profitCents: 350_000,
        },
      ],
      hasInternalAssessment: true,
    })
    const unknown = buildClientContributionSnapshot({
      clientId: 'unknown-source',
      clientName: 'Unknown Source',
      financials: null,
      eventFinancials: [],
      hasInternalAssessment: false,
    })

    const roi = buildAcquisitionSourceRoi(buildClientContributionPortfolio([known, unknown]))
    const google = roi.find((item) => item.sourceKey === 'google_business')
    const missing = roi.find((item) => item.sourceKey === 'unknown')

    assert.equal(google?.paidRevenueCents, 500_000)
    assert.equal(google?.known, true)
    assert.equal(missing?.known, false)
    assert.equal(missing?.repairHref, '/clients/contribution?view=missing-source')
  })

  it('builds capacity and communication ROI recommendations from contribution evidence', () => {
    const premium = buildClientContributionSnapshot({
      clientId: 'premium-client',
      clientName: 'Premium Client',
      referralPotential: 'high',
      preferredEventDays: ['Saturday'],
      recurringPricingModel: 'monthly',
      automatedEmailsEnabled: true,
      financials: {
        lifetimeValueCents: 1_600_000,
        totalEventsCompleted: 5,
        averageSpendPerEvent: 320_000,
        outstandingBalanceCents: 0,
      },
      eventFinancials: [
        {
          eventId: 'premium-event',
          totalPaidCents: 1_600_000,
          totalExpensesCents: 400_000,
          profitCents: 1_200_000,
        },
      ],
      hasInternalAssessment: true,
    })
    const priceFirst = buildClientContributionSnapshot({
      clientId: 'price-first-client',
      clientName: 'Price First Client',
      automatedEmailsEnabled: false,
      financials: {
        lifetimeValueCents: 900_000,
        totalEventsCompleted: 3,
        averageSpendPerEvent: 300_000,
        outstandingBalanceCents: 125_000,
      },
      eventFinancials: [
        {
          eventId: 'price-first-event',
          totalPaidCents: 900_000,
          totalExpensesCents: 650_000,
          profitCents: 250_000,
          outstandingBalanceCents: 125_000,
        },
      ],
      hasInternalAssessment: true,
    })

    const portfolio = buildClientContributionPortfolio([premium, priceFirst])
    const capacity = buildCapacityAllocationPlan(portfolio)
    const comms = buildCommunicationRoiSummary(portfolio)

    assert.equal(capacity.premiumCandidates[0].clientId, 'premium-client')
    assert.ok(capacity.priceBeforePremium.some((item) => item.clientId === 'price-first-client'))
    assert.ok(comms.some((item) => item.touchType === 'referral_ask'))
    assert.ok(comms.some((item) => item.touchType === 'follow_up'))
    assert.equal(premium.playbooks.primary.kind, 'ask_for_referral')
    assert.equal(priceFirst.playbooks.primary.kind, 'require_deposit_or_minimum')
    assert.ok(
      priceFirst.playbooks.primary.actions.some((action) => action.href === '/finance/ledger')
    )
  })

  it('flags chef-only expectation risk with drivers, mitigations, and portfolio filtering data', () => {
    const highTouch = buildClientContributionSnapshot({
      clientId: 'high-touch-client',
      clientName: 'High Touch Client',
      communicationStyleNotes: 'Requires many revisions and late changes before every event',
      financials: {
        lifetimeValueCents: 1_000_000,
        totalEventsCompleted: 3,
        averageSpendPerEvent: 333_333,
        outstandingBalanceCents: 150_000,
      },
      eventFinancials: [
        {
          eventId: 'high-touch-event',
          quotedPriceCents: 500_000,
          totalPaidCents: 350_000,
          totalExpensesCents: 300_000,
          profitCents: 50_000,
          outstandingBalanceCents: 150_000,
        },
      ],
      relationshipSignals: {
        redFlags: 'Unrealistic budget, access constraints, and high emotional load',
        paymentBehavior: 'Late and overdue',
      },
      hasInternalAssessment: true,
    })
    const calm = buildClientContributionSnapshot({
      clientId: 'calm-client',
      clientName: 'Calm Client',
      financials: {
        lifetimeValueCents: 500_000,
        totalEventsCompleted: 2,
        averageSpendPerEvent: 250_000,
        outstandingBalanceCents: 0,
      },
      eventFinancials: [
        {
          eventId: 'calm-event',
          quotedPriceCents: 250_000,
          totalPaidCents: 250_000,
          totalExpensesCents: 80_000,
          profitCents: 170_000,
        },
      ],
      hasInternalAssessment: true,
    })

    const portfolio = buildClientContributionPortfolio([highTouch, calm])

    assert.equal(highTouch.expectationRisk.chefOnly, true)
    assert.equal(highTouch.expectationRisk.level, 'high')
    assert.ok(highTouch.expectationRisk.evidence.some((item) => item.label === 'Revision pressure'))
    assert.ok(highTouch.expectationRisk.evidence.some((item) => item.label === 'Payment delay'))
    assert.ok(
      highTouch.expectationRisk.mitigations.some((item) => item.label === 'Set boundary terms')
    )
    assert.equal(portfolio.summary.expectationRiskCount, 1)
    assert.equal(portfolio.summary.expectationRiskRevenueCents, highTouch.paidRevenueCents)
    assert.ok(
      highTouch.playbooks.secondary.some(
        (playbook) =>
          playbook.kind === 'stop_over_serving' || playbook.kind === 'repair_relationship'
      )
    )
  })

  it('builds seasonality, segment, and geographic contribution intelligence without overclaiming sparse history', () => {
    const seasonal = buildClientContributionSnapshot(
      {
        clientId: 'seasonal-client',
        clientName: 'Summer Regular',
        referralPotential: 'high',
        financials: {
          lifetimeValueCents: 900_000,
          totalEventsCompleted: 3,
          averageSpendPerEvent: 300_000,
          outstandingBalanceCents: 0,
          lastEventDate: '2025-07-20T00:00:00.000Z',
          daysSinceLastEvent: 303,
        },
        eventFinancials: [
          {
            eventId: 'summer-1',
            eventDate: '2024-07-12T00:00:00.000Z',
            totalPaidCents: 300_000,
            totalExpensesCents: 90_000,
            profitCents: 210_000,
            locationCity: 'Boston',
            locationState: 'MA',
          },
          {
            eventId: 'summer-2',
            eventDate: '2025-07-20T00:00:00.000Z',
            totalPaidCents: 350_000,
            totalExpensesCents: 120_000,
            profitCents: 230_000,
            locationCity: 'Boston',
            locationState: 'MA',
          },
          {
            eventId: 'spring-1',
            eventDate: '2025-04-10T00:00:00.000Z',
            totalPaidCents: 250_000,
            totalExpensesCents: 100_000,
            profitCents: 150_000,
            locationCity: 'Cambridge',
            locationState: 'MA',
          },
        ],
        hasInternalAssessment: true,
      },
      { now: new Date('2026-05-19T00:00:00.000Z') }
    )
    const sparse = buildClientContributionSnapshot(
      {
        clientId: 'sparse-season-client',
        clientName: 'Sparse Season Client',
        financials: {
          lifetimeValueCents: 200_000,
          totalEventsCompleted: 1,
          averageSpendPerEvent: 200_000,
          outstandingBalanceCents: 0,
          lastEventDate: '2026-03-01T00:00:00.000Z',
          daysSinceLastEvent: 80,
        },
        eventFinancials: [
          {
            eventId: 'one-off',
            eventDate: '2026-03-01T00:00:00.000Z',
            totalPaidCents: 200_000,
            totalExpensesCents: 80_000,
            profitCents: 120_000,
          },
        ],
        hasInternalAssessment: false,
      },
      { now: new Date('2026-05-19T00:00:00.000Z') }
    )

    const portfolio = buildClientContributionPortfolio([seasonal, sparse])
    const forecast = buildClientSeasonalityForecastPlan(portfolio, {
      now: new Date('2026-05-19T00:00:00.000Z'),
    })
    const segments = buildClientSegmentBuilder(portfolio)
    const markets = buildGeographicProfitabilityMap(portfolio)

    assert.equal(seasonal.seasonality.nextLikelyWindow?.label, 'July')
    assert.equal(seasonal.seasonality.dormantSeasonalRisk, true)
    assert.equal(sparse.seasonality.nextLikelyWindow, null)
    assert.ok(forecast.upcoming.some((item) => item.clientId === 'seasonal-client'))
    assert.ok(forecast.weakMonths.length > 0)
    assert.ok(
      segments
        .find((segment) => segment.key === 'seasonal_due')
        ?.clients.some((client) => client.clientId === 'seasonal-client')
    )
    assert.equal(markets[0].label, 'Boston, MA')
    assert.equal(markets[0].netProfitCents, 440_000)
  })

  it('ranks service format profitability across client contribution snapshots', () => {
    const formatClient = buildClientContributionSnapshot({
      clientId: 'format-client',
      clientName: 'Format Client',
      financials: {
        lifetimeValueCents: 1_200_000,
        totalEventsCompleted: 3,
        averageSpendPerEvent: 400_000,
        outstandingBalanceCents: 0,
      },
      eventFinancials: [
        {
          eventId: 'dinner-1',
          serviceStyle: 'private_dinner',
          occasion: 'birthday',
          guestCount: 8,
          totalPaidCents: 500_000,
          totalExpensesCents: 150_000,
          profitCents: 350_000,
        },
        {
          eventId: 'dinner-2',
          serviceStyle: 'private_dinner',
          guestCount: 10,
          totalPaidCents: 450_000,
          totalExpensesCents: 170_000,
          profitCents: 280_000,
        },
        {
          eventId: 'dropoff-1',
          serviceStyle: 'drop_off_catering',
          guestCount: 40,
          totalPaidCents: 250_000,
          totalExpensesCents: 230_000,
          profitCents: 20_000,
        },
      ],
      hasInternalAssessment: true,
    })
    const portfolio = buildClientContributionPortfolio([formatClient])
    const rankings = buildServiceFormatProfitabilityMap(portfolio)

    assert.equal(formatClient.serviceFormats.primaryFormat?.key, 'private_dinner')
    assert.equal(formatClient.serviceFormats.bestMarginFormat?.key, 'private_dinner')
    assert.equal(formatClient.serviceFormats.worstMarginFormat?.key, 'drop_off_catering')
    assert.equal(
      formatClient.serviceFormats.formats.find((item) => item.key === 'drop_off_catering')
        ?.recommendation,
      'price_review'
    )
    assert.equal(portfolio.summary.serviceFormatCount, 2)
    assert.equal(rankings[0].key, 'private_dinner')
    assert.ok(rankings.some((item) => item.key === 'drop_off_catering'))
  })
})
