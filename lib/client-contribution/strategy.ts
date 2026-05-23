import type {
  ClientAcquisitionSourceRoi,
  ClientBusinessGoalAlignment,
  ClientBusinessGoalKey,
  ClientCapacityAllocationPlan,
  ClientCommunicationRoiSummary,
  ClientContributionBusinessBriefing,
  ClientContributionConfidenceLevel,
  ClientContributionOpportunity,
  ClientContributionOpportunityWindow,
  ClientContributionPortfolio,
  ClientContributionSegment,
  ClientContributionRecommendedAction,
  ClientContributionSnapshot,
  ClientContributionTimelineMilestone,
  ClientDependencySimulation,
  ClientGeographicProfitabilityGroup,
  ClientRevenueConcentration,
  ClientSeasonalityPortfolioForecast,
  ClientServiceFormatProfitabilityGroup,
} from './types'

const actionLabel: Record<ClientContributionRecommendedAction, string> = {
  protect_relationship: 'Protect relationship',
  collect_balance: 'Collect balance',
  review_pricing: 'Review pricing',
  repair_data: 'Repair missing data',
  reengage: 'Re-engage',
  nurture_referrals: 'Nurture referrals',
  build_history: 'Build history',
  maintain: 'Maintain',
}

function money(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function addDays(now: Date, days: number): string {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function dateLabel(value: string | null): string {
  if (!value) return 'Date unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unknown'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export const businessGoalLabels: Record<ClientBusinessGoalKey, string> = {
  maximize_profit: 'Maximize profit',
  build_recurring_revenue: 'Build recurring revenue',
  reduce_travel: 'Reduce travel',
  grow_corporate: 'Grow corporate',
  protect_weekends: 'Protect weekends',
  increase_referrals: 'Increase referrals',
  reduce_admin_burden: 'Reduce admin burden',
}

function marginScore(snapshot: ClientContributionSnapshot): number {
  return snapshot.marginPercent == null ? 0 : Math.max(0, Math.min(100, snapshot.marginPercent))
}

function scoreForGoal(snapshot: ClientContributionSnapshot, goal: ClientBusinessGoalKey): number {
  const fit = snapshot.fitScore.score ?? 35
  if (goal === 'maximize_profit') {
    return Math.round(
      snapshot.contributionScore * 0.35 +
        marginScore(snapshot) * 0.35 +
        fit * 0.2 -
        (snapshot.outstandingBalanceCents > 0 ? 12 : 0)
    )
  }
  if (goal === 'build_recurring_revenue') {
    return Math.round(
      snapshot.contributionScore * 0.3 +
        Math.min(100, snapshot.completedEventCount * 18) * 0.35 +
        (snapshot.churnRisk === 'low' ? 20 : snapshot.churnRisk === 'high' ? -12 : 6) +
        fit * 0.15
    )
  }
  if (goal === 'reduce_travel') {
    return Math.round(
      fit * 0.35 + marginScore(snapshot) * 0.25 + snapshot.capacitySignal.score * 0.25
    )
  }
  if (goal === 'grow_corporate') {
    const corporateSource = /corporate|partner|company|office/i.test(
      `${snapshot.acquisitionSource.label} ${snapshot.email ?? ''}`
    )
    return Math.round(snapshot.contributionScore * 0.3 + fit * 0.25 + (corporateSource ? 28 : 0))
  }
  if (goal === 'protect_weekends') {
    return Math.round(
      snapshot.capacitySignal.score * 0.45 +
        marginScore(snapshot) * 0.25 +
        fit * 0.2 -
        (snapshot.capacitySignal.status === 'avoid_premium' ? 22 : 0)
    )
  }
  if (goal === 'increase_referrals') {
    return Math.round(
      snapshot.referralNetworkValue.score * 0.45 + snapshot.contributionScore * 0.25 + fit * 0.2
    )
  }
  return Math.round(
    fit * 0.35 +
      marginScore(snapshot) * 0.25 +
      (snapshot.operationalDrag === 'low' ? 24 : snapshot.operationalDrag === 'medium' ? 4 : -16) -
      snapshot.missingData.length * 5
  )
}

function goalExplanation(
  snapshot: ClientContributionSnapshot,
  goal: ClientBusinessGoalKey
): string {
  if (goal === 'maximize_profit') {
    return `${money(snapshot.netProfitCents)} profit, ${
      snapshot.marginPercent == null ? 'unknown' : `${snapshot.marginPercent}%`
    } margin.`
  }
  if (goal === 'build_recurring_revenue') {
    return `${snapshot.completedEventCount} completed events and ${snapshot.churnRisk} churn risk.`
  }
  if (goal === 'increase_referrals') {
    return `${snapshot.referralNetworkValue.score}/100 referral value: ${snapshot.referralNetworkValue.impactLabel}.`
  }
  if (goal === 'protect_weekends') return snapshot.capacitySignal.evidence.slice(0, 2).join('; ')
  if (goal === 'reduce_travel')
    return `${snapshot.capacitySignal.label}; ${snapshot.fitScore.label}.`
  if (goal === 'grow_corporate')
    return `${snapshot.acquisitionSource.label} source and ${snapshot.fitScore.label}.`
  return `${snapshot.operationalDrag} operational drag with ${snapshot.missingData.length} data gaps.`
}

export function buildClientBusinessGoalAlignment(
  portfolio: ClientContributionPortfolio,
  goal: ClientBusinessGoalKey
): ClientBusinessGoalAlignment {
  const scored = portfolio.snapshots
    .map((snapshot) => ({
      snapshot,
      score: Math.max(0, Math.min(100, scoreForGoal(snapshot, goal))),
    }))
    .sort((a, b) => b.score - a.score)

  return {
    goal,
    label: businessGoalLabels[goal],
    description:
      'Re-ranks clients for the selected business goal while preserving base contribution score.',
    rankedClients: scored.slice(0, 5).map(({ snapshot, score }) => ({
      clientId: snapshot.clientId,
      clientName: snapshot.clientName,
      score,
      contributionScore: snapshot.contributionScore,
      explanation: goalExplanation(snapshot, goal),
      href: `/clients/${snapshot.clientId}#contribution`,
    })),
    conflicts: scored
      .filter(
        ({ score, snapshot }) => score < 45 || snapshot.capacitySignal.status === 'avoid_premium'
      )
      .slice(0, 5)
      .map(({ snapshot, score }) => ({
        clientId: snapshot.clientId,
        clientName: snapshot.clientName,
        score,
        reason: goalExplanation(snapshot, goal),
        href: `/clients/${snapshot.clientId}#contribution`,
      })),
    suggestedActions: scored.slice(0, 3).map(({ snapshot }) => ({
      label: snapshot.capacitySignal.suggestedAction,
      evidence: `${snapshot.clientName}: ${goalExplanation(snapshot, goal)}`,
      href: snapshot.capacitySignal.href,
    })),
  }
}

function average(values: number[]): number | null {
  return values.length > 0
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null
}

function confidenceForCount(count: number): ClientContributionConfidenceLevel {
  if (count >= 5) return 'high'
  if (count >= 2) return 'medium'
  return 'low'
}

function monthLabel(month: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2026, month - 1, 1))
}

function upcomingMonths(now: Date, count: number): number[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now)
    date.setMonth(now.getMonth() + index)
    return date.getMonth() + 1
  })
}

export function buildClientSeasonalityForecastPlan(
  portfolio: ClientContributionPortfolio,
  options: { now?: Date; windowMonths?: number } = {}
): ClientSeasonalityPortfolioForecast {
  const now = options.now ?? new Date()
  const months = upcomingMonths(now, options.windowMonths ?? 6)
  const upcoming = portfolio.snapshots
    .flatMap((snapshot) => {
      const window = snapshot.seasonality.nextLikelyWindow
      if (!window || !months.includes(window.month)) return []
      return [
        {
          clientId: snapshot.clientId,
          clientName: snapshot.clientName,
          monthLabel: window.label,
          dueInDays: window.dueInDays,
          expectedValueCents: window.expectedValueCents,
          confidence: window.confidence,
          href: `/clients/${snapshot.clientId}#contribution`,
          evidence: snapshot.seasonality.evidence[0] ?? 'Seasonality forecast from dated events.',
        },
      ]
    })
    .sort((a, b) => a.dueInDays - b.dueInDays || b.expectedValueCents - a.expectedValueCents)

  const weakMonths = months
    .map((month) => {
      const historicalEventCount = portfolio.snapshots.reduce((sum, snapshot) => {
        const match = snapshot.seasonality.strongestMonths.find((item) => item.month === month)
        return sum + (match?.eventCount ?? 0)
      }, 0)
      const due = upcoming.filter((item) => item.monthLabel === monthLabel(month))
      const expectedValueCents = due.reduce((sum, item) => sum + item.expectedValueCents, 0)
      return {
        month,
        label: monthLabel(month),
        historicalEventCount,
        dueClientCount: due.length,
        expectedValueCents,
        reason:
          historicalEventCount === 0
            ? 'No repeat seasonal pattern is visible for this upcoming month.'
            : due.length === 0
              ? 'Historical work exists but no client has a confident due-soon signal.'
              : 'Seasonal demand exists; scheduled outreach can smooth the month.',
      }
    })
    .filter((month) => month.historicalEventCount === 0 || month.dueClientCount === 0)
    .slice(0, 4)

  return {
    generatedAt: now.toISOString(),
    upcoming: upcoming.slice(0, 8),
    weakMonths,
  }
}

function segmentReason(snapshot: ClientContributionSnapshot, key: string): string {
  if (key === 'seasonal_due') {
    return snapshot.seasonality.nextLikelyWindow
      ? `${snapshot.seasonality.nextLikelyWindow.label} pattern, ${snapshot.seasonality.nextLikelyWindow.dueInDays} days out.`
      : 'No due seasonal window.'
  }
  if (key === 'geographic_profit') {
    return snapshot.geographicContribution.primaryMarket
      ? `${snapshot.geographicContribution.primaryMarket.label}: ${money(snapshot.geographicContribution.primaryMarket.profitCents)} profit.`
      : 'No market evidence.'
  }
  if (key === 'collections') return `${money(snapshot.outstandingBalanceCents)} outstanding.`
  if (key === 'pricing') return snapshot.pricingRecommendation.riskLabel
  if (key === 'referral') return snapshot.referralNetworkValue.impactLabel
  return snapshot.portfolioCategory.evidence
}

export function buildClientSegmentBuilder(
  portfolio: ClientContributionPortfolio
): ClientContributionSegment[] {
  const definitions: Array<{
    key: string
    label: string
    description: string
    filter: (snapshot: ClientContributionSnapshot) => boolean
  }> = [
    {
      key: 'seasonal_due',
      label: 'Seasonal due-soon',
      description: 'Clients with a confident repeat month inside the next seasonal window.',
      filter: (snapshot) => Boolean(snapshot.seasonality.nextLikelyWindow),
    },
    {
      key: 'geographic_profit',
      label: 'Profitable markets',
      description: 'Clients tied to markets with tracked profitable events.',
      filter: (snapshot) => (snapshot.geographicContribution.primaryMarket?.profitCents ?? 0) > 0,
    },
    {
      key: 'high_value_at_risk',
      label: 'High value at risk',
      description: 'High-revenue relationships exposed by churn, fit, payment, or pricing risk.',
      filter: (snapshot) => snapshot.portfolioCategory.key === 'high_value_at_risk',
    },
    {
      key: 'collections',
      label: 'Collections',
      description: 'Clients with outstanding balances that should stay visible in the plan.',
      filter: (snapshot) => snapshot.outstandingBalanceCents > 0,
    },
    {
      key: 'pricing',
      label: 'Pricing review',
      description: 'Clients whose contribution story points to a price, deposit, or scope reset.',
      filter: (snapshot) => snapshot.pricingRecommendation.kind !== 'hold_price',
    },
    {
      key: 'referral',
      label: 'Referral candidates',
      description: 'Clients with strong relationship upside or referral-network value.',
      filter: (snapshot) => snapshot.referralNetworkValue.score >= 55,
    },
    {
      key: 'premium_capacity',
      label: 'Premium capacity',
      description: 'Clients who should be considered first for scarce dates or premium slots.',
      filter: (snapshot) => snapshot.capacitySignal.status === 'premium_candidate',
    },
    {
      key: 'repair',
      label: 'Repair evidence',
      description: 'Clients whose decisions are blocked by missing data.',
      filter: (snapshot) => snapshot.missingData.length > 0,
    },
  ]

  return definitions
    .map((definition) => {
      const clients = portfolio.snapshots.filter(definition.filter)
      return {
        key: definition.key,
        label: definition.label,
        description: definition.description,
        clientCount: clients.length,
        paidRevenueCents: clients.reduce((sum, item) => sum + item.paidRevenueCents, 0),
        netProfitCents: clients.reduce((sum, item) => sum + item.netProfitCents, 0),
        averageScore:
          clients.length > 0
            ? Math.round(
                clients.reduce((sum, item) => sum + item.contributionScore, 0) / clients.length
              )
            : null,
        href: `/clients/contribution?view=segment:${definition.key}`,
        clients: clients.slice(0, 4).map((snapshot) => ({
          clientId: snapshot.clientId,
          clientName: snapshot.clientName,
          reason: segmentReason(snapshot, definition.key),
          href: `/clients/${snapshot.clientId}#contribution`,
        })),
      } satisfies ClientContributionSegment
    })
    .sort((a, b) => b.clientCount - a.clientCount || b.netProfitCents - a.netProfitCents)
}

export function buildGeographicProfitabilityMap(
  portfolio: ClientContributionPortfolio
): ClientGeographicProfitabilityGroup[] {
  const groups = new Map<
    string,
    {
      label: string
      eventCount: number
      paidRevenueCents: number
      netProfitCents: number
      clientIds: Set<string>
      clients: Map<string, { clientId: string; clientName: string; paidRevenueCents: number }>
    }
  >()

  for (const snapshot of portfolio.snapshots) {
    for (const market of snapshot.geographicContribution.markets) {
      if (market.key === 'unknown') continue
      const current = groups.get(market.key) ?? {
        label: market.label,
        eventCount: 0,
        paidRevenueCents: 0,
        netProfitCents: 0,
        clientIds: new Set<string>(),
        clients: new Map<
          string,
          { clientId: string; clientName: string; paidRevenueCents: number }
        >(),
      }
      current.eventCount += market.eventCount
      current.paidRevenueCents += market.revenueCents
      current.netProfitCents += market.profitCents
      current.clientIds.add(snapshot.clientId)
      const client = current.clients.get(snapshot.clientId) ?? {
        clientId: snapshot.clientId,
        clientName: snapshot.clientName,
        paidRevenueCents: 0,
      }
      client.paidRevenueCents += market.revenueCents
      current.clients.set(snapshot.clientId, client)
      groups.set(market.key, current)
    }
  }

  return [...groups.entries()]
    .map(([key, value]) => ({
      key,
      label: value.label,
      eventCount: value.eventCount,
      clientCount: value.clientIds.size,
      paidRevenueCents: value.paidRevenueCents,
      netProfitCents: value.netProfitCents,
      averageMarginPercent:
        value.paidRevenueCents > 0
          ? Math.round((value.netProfitCents / value.paidRevenueCents) * 100)
          : null,
      confidence: confidenceForCount(value.eventCount),
      href: `/clients/contribution?market=${encodeURIComponent(key)}`,
      topClients: [...value.clients.values()]
        .sort((a, b) => b.paidRevenueCents - a.paidRevenueCents)
        .slice(0, 4)
        .map((client) => ({
          ...client,
          href: `/clients/${client.clientId}#contribution`,
        })),
    }))
    .sort((a, b) => b.netProfitCents - a.netProfitCents || b.paidRevenueCents - a.paidRevenueCents)
}

export function buildAcquisitionSourceRoi(
  portfolio: ClientContributionPortfolio
): ClientAcquisitionSourceRoi[] {
  const groups = new Map<string, ClientContributionSnapshot[]>()
  for (const snapshot of portfolio.snapshots) {
    const list = groups.get(snapshot.acquisitionSource.key) ?? []
    list.push(snapshot)
    groups.set(snapshot.acquisitionSource.key, list)
  }

  return [...groups.entries()]
    .map(([sourceKey, snapshots]) => {
      const first = snapshots[0]
      const paidRevenueCents = snapshots.reduce((sum, item) => sum + item.paidRevenueCents, 0)
      const netProfitCents = snapshots.reduce((sum, item) => sum + item.netProfitCents, 0)
      const retained = snapshots.filter((item) => item.completedEventCount >= 2).length
      const atRisk = snapshots.filter(
        (item) => item.churnRisk === 'high' || item.fitScore.level === 'poor'
      ).length
      return {
        sourceKey,
        sourceLabel: first.acquisitionSource.label,
        known: first.acquisitionSource.known,
        clientCount: snapshots.length,
        paidRevenueCents,
        netProfitCents,
        averageMarginPercent: average(
          snapshots
            .map((item) => item.marginPercent)
            .filter((value): value is number => value != null)
        ),
        retentionRatePercent: Math.round((retained / Math.max(1, snapshots.length)) * 100),
        averageFitScore: average(
          snapshots
            .map((item) => item.fitScore.score)
            .filter((value): value is number => value != null)
        ),
        atRiskRatePercent: Math.round((atRisk / Math.max(1, snapshots.length)) * 100),
        confidence: confidenceForCount(snapshots.length),
        evidence: [
          `${snapshots.length} client${snapshots.length === 1 ? '' : 's'}`,
          `${money(paidRevenueCents)} paid revenue`,
          `${money(netProfitCents)} net profit`,
        ],
        repairHref: first.acquisitionSource.known
          ? '/clients'
          : '/clients/contribution?view=missing-source',
        topClients: [...snapshots]
          .sort((a, b) => b.netProfitCents - a.netProfitCents)
          .slice(0, 3)
          .map((snapshot) => ({
            clientId: snapshot.clientId,
            clientName: snapshot.clientName,
            href: `/clients/${snapshot.clientId}#contribution`,
          })),
      } satisfies ClientAcquisitionSourceRoi
    })
    .sort((a, b) => b.netProfitCents - a.netProfitCents)
}

export function buildServiceFormatProfitabilityMap(
  portfolio: ClientContributionPortfolio
): ClientServiceFormatProfitabilityGroup[] {
  const groups = new Map<
    string,
    {
      label: string
      snapshots: ClientContributionSnapshot[]
      eventCount: number
      paidRevenueCents: number
      netProfitCents: number
      marginPercents: number[]
    }
  >()

  for (const snapshot of portfolio.snapshots) {
    for (const format of snapshot.serviceFormats.formats) {
      const current =
        groups.get(format.key) ??
        ({
          label: format.label,
          snapshots: [],
          eventCount: 0,
          paidRevenueCents: 0,
          netProfitCents: 0,
          marginPercents: [],
        } satisfies {
          label: string
          snapshots: ClientContributionSnapshot[]
          eventCount: number
          paidRevenueCents: number
          netProfitCents: number
          marginPercents: number[]
        })

      if (!current.snapshots.some((item) => item.clientId === snapshot.clientId)) {
        current.snapshots.push(snapshot)
      }
      current.eventCount += format.eventCount
      current.paidRevenueCents += format.revenueCents
      current.netProfitCents += format.profitCents
      if (format.marginPercent != null) current.marginPercents.push(format.marginPercent)
      groups.set(format.key, current)
    }
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const averageMarginPercent =
        group.marginPercents.length > 0
          ? Math.round(
              group.marginPercents.reduce((sum, margin) => sum + margin, 0) /
                group.marginPercents.length
            )
          : null
      const recommendation: ClientServiceFormatProfitabilityGroup['recommendation'] =
        group.paidRevenueCents === 0 || averageMarginPercent == null
          ? 'repair_data'
          : averageMarginPercent < 25
            ? 'price_review'
            : group.eventCount >= 3 && averageMarginPercent >= 45
              ? 'scale'
              : 'watch'
      const repeatClients = group.snapshots.filter((snapshot) =>
        snapshot.serviceFormats.formats.some(
          (format) => format.key === key && format.eventCount >= 2
        )
      ).length

      return {
        key,
        label: group.label,
        clientCount: group.snapshots.length,
        eventCount: group.eventCount,
        paidRevenueCents: group.paidRevenueCents,
        netProfitCents: group.netProfitCents,
        averageMarginPercent,
        repeatClientRatePercent: Math.round(
          (repeatClients / Math.max(1, group.snapshots.length)) * 100
        ),
        confidence: group.eventCount >= 5 ? 'high' : group.eventCount >= 2 ? 'medium' : 'low',
        recommendation,
        href: `/clients/contribution?format=${encodeURIComponent(key)}`,
        topClients: [...group.snapshots]
          .sort((a, b) => {
            const aRevenue =
              a.serviceFormats.formats.find((format) => format.key === key)?.revenueCents ?? 0
            const bRevenue =
              b.serviceFormats.formats.find((format) => format.key === key)?.revenueCents ?? 0
            return bRevenue - aRevenue
          })
          .slice(0, 3)
          .map((snapshot) => ({
            clientId: snapshot.clientId,
            clientName: snapshot.clientName,
            paidRevenueCents:
              snapshot.serviceFormats.formats.find((format) => format.key === key)?.revenueCents ??
              0,
            href: `/clients/${snapshot.clientId}#contribution`,
          })),
      } satisfies ClientServiceFormatProfitabilityGroup
    })
    .sort((a, b) => b.netProfitCents - a.netProfitCents || b.paidRevenueCents - a.paidRevenueCents)
}

export function buildCapacityAllocationPlan(
  portfolio: ClientContributionPortfolio
): ClientCapacityAllocationPlan {
  const sorted = [...portfolio.snapshots].sort(
    (a, b) => b.capacitySignal.score - a.capacitySignal.score
  )
  return {
    premiumCandidates: sorted
      .filter((item) => item.capacitySignal.status === 'premium_candidate')
      .slice(0, 5),
    priceBeforePremium: sorted
      .filter((item) => item.capacitySignal.status === 'price_before_premium')
      .slice(0, 5),
    avoidPremium: sorted
      .filter((item) => item.capacitySignal.status === 'avoid_premium')
      .slice(0, 5),
    openCapacityRisks: [
      {
        label: 'Unknown capacity fit',
        evidence: `${portfolio.snapshots.filter((item) => item.capacitySignal.status === 'unknown').length} clients need booking or service evidence.`,
        href: '/clients/contribution?view=missing',
      },
      {
        label: 'Premium slot pricing',
        evidence: `${portfolio.snapshots.filter((item) => item.capacitySignal.status === 'price_before_premium').length} clients need price or scope review before scarce dates.`,
        href: '/pricing',
      },
    ],
  }
}

export function buildCommunicationRoiSummary(
  portfolio: ClientContributionPortfolio
): ClientCommunicationRoiSummary[] {
  const groups = new Map<ClientCommunicationRoiSummary['touchType'], ClientContributionSnapshot[]>()
  for (const snapshot of portfolio.snapshots) {
    const list = groups.get(snapshot.communicationRoi.touchType) ?? []
    list.push(snapshot)
    groups.set(snapshot.communicationRoi.touchType, list)
  }

  return [...groups.entries()]
    .map(([touchType, snapshots]) => ({
      touchType,
      label: snapshots[0].communicationRoi.label,
      clientCount: snapshots.length,
      conversionCount: snapshots.reduce(
        (sum, item) => sum + item.communicationRoi.conversionCount,
        0
      ),
      revenueAfterTouchCents: snapshots.reduce(
        (sum, item) => sum + item.communicationRoi.revenueAfterTouchCents,
        0
      ),
      profitAfterTouchCents: snapshots.reduce(
        (sum, item) => sum + item.communicationRoi.profitAfterTouchCents,
        0
      ),
      confidence: confidenceForCount(snapshots.length),
      evidence: snapshots
        .slice(0, 3)
        .map((item) => `${item.clientName}: ${item.communicationRoi.evidence[0]}`),
      href: touchType === 'insufficient_data' ? '/clients/contribution?view=missing' : '/inbox',
    }))
    .sort((a, b) => b.revenueAfterTouchCents - a.revenueAfterTouchCents)
}

function getWindow(snapshot: ClientContributionSnapshot): ClientContributionOpportunityWindow {
  if (
    snapshot.outstandingBalanceCents > 0 ||
    (snapshot.churnRisk === 'high' && snapshot.paidRevenueCents >= 500_000) ||
    snapshot.reviewState.pinned
  ) {
    return '30'
  }
  if (
    snapshot.marginPercent != null &&
    snapshot.marginPercent < 25 &&
    snapshot.paidRevenueCents >= 500_000
  ) {
    return '60'
  }
  return '90'
}

function getDueOffset(window: ClientContributionOpportunityWindow): number {
  if (window === '30') return 14
  if (window === '60') return 45
  return 75
}

function getReason(snapshot: ClientContributionSnapshot): string {
  if (snapshot.outstandingBalanceCents > 0) {
    return `${money(snapshot.outstandingBalanceCents)} outstanding balance needs collection context.`
  }
  if (snapshot.churnRisk === 'high' && snapshot.paidRevenueCents > 0) {
    return `${money(snapshot.paidRevenueCents)} paid history is exposed by dormancy.`
  }
  if (snapshot.marginPercent != null && snapshot.marginPercent < 25) {
    return `${snapshot.marginPercent}% margin is below the pricing review threshold.`
  }
  if (snapshot.referralPotential === 'high') {
    return 'Strong relationship signal can turn into referral growth.'
  }
  if (snapshot.missingData.length > 0) {
    return `${snapshot.missingData.length} data gap${snapshot.missingData.length === 1 ? '' : 's'} block confident contribution decisions.`
  }
  return 'High contribution client should stay protected in the chef workflow.'
}

function shouldPlan(snapshot: ClientContributionSnapshot): boolean {
  if (snapshot.reviewState.status === 'dismissed') return false
  if (snapshot.recommendedAction === 'maintain') {
    return snapshot.tier === 'strategic' && snapshot.referralPotential === 'high'
  }
  if (snapshot.outstandingBalanceCents > 0) return true
  if (snapshot.paidRevenueCents >= 500_000 && snapshot.churnRisk === 'high') return true
  if (snapshot.paidRevenueCents >= 500_000 && (snapshot.marginPercent ?? 100) < 25) return true
  if (snapshot.referralPotential === 'high' && snapshot.contributionScore >= 55) return true
  return snapshot.missingData.length >= 2
}

export function buildContributionOpportunityPlan(
  portfolio: ClientContributionPortfolio,
  options: { now?: Date; limit?: number } = {}
): ClientContributionOpportunity[] {
  const now = options.now ?? new Date()
  const limit = options.limit ?? 12

  return portfolio.snapshots
    .filter(shouldPlan)
    .map((snapshot) => {
      const window = getWindow(snapshot)
      const expectedValueCents = Math.max(
        snapshot.annualizedValueCents,
        snapshot.averageEventValueCents,
        snapshot.outstandingBalanceCents
      )
      const urgency =
        window === '30' || snapshot.reviewState.pinned
          ? 'high'
          : window === '60'
            ? 'normal'
            : ('normal' as const)
      const href =
        snapshot.recommendedAction === 'collect_balance'
          ? `/clients/${snapshot.clientId}#contribution`
          : `/clients/${snapshot.clientId}#contribution`

      return {
        id: `contribution-opportunity:${snapshot.clientId}:${snapshot.recommendedAction}`,
        clientId: snapshot.clientId,
        clientName: snapshot.clientName,
        window,
        action: snapshot.recommendedAction,
        actionLabel: actionLabel[snapshot.recommendedAction],
        reason: getReason(snapshot),
        expectedValueCents,
        urgency,
        dueDate: addDays(now, getDueOffset(window)),
        href,
        evidence: [
          `Paid ${money(snapshot.paidRevenueCents)}`,
          `Profit ${money(snapshot.netProfitCents)}`,
          snapshot.marginPercent == null ? 'Margin unknown' : `${snapshot.marginPercent}% margin`,
          `${snapshot.dataConfidence.level} confidence`,
        ],
        reviewed: snapshot.reviewState.status !== 'needs_review',
      } satisfies ClientContributionOpportunity
    })
    .sort((a, b) => {
      const windowRank = Number(a.window) - Number(b.window)
      if (windowRank !== 0) return windowRank
      return b.expectedValueCents - a.expectedValueCents
    })
    .slice(0, limit)
}

export function buildClientContributionTimeline(
  snapshot: ClientContributionSnapshot
): ClientContributionTimelineMilestone[] {
  const milestones: ClientContributionTimelineMilestone[] = []

  if (snapshot.completedEventCount > 0) {
    milestones.push({
      id: `${snapshot.clientId}:paid-history`,
      label: 'Paid event history',
      dateLabel: snapshot.lastEventDate
        ? `Through ${dateLabel(snapshot.lastEventDate)}`
        : 'All time',
      tone: 'positive',
      value: money(snapshot.paidRevenueCents),
      description: `${snapshot.completedEventCount} completed event${snapshot.completedEventCount === 1 ? '' : 's'} with ${money(snapshot.averageEventValueCents)} average paid value.`,
    })
  } else {
    milestones.push({
      id: `${snapshot.clientId}:no-paid-history`,
      label: 'No paid event history',
      dateLabel: 'Needs import or first booking',
      tone: 'warning',
      description:
        'Contribution score is limited until inquiry, event, and payment history are present.',
    })
  }

  if (snapshot.marginPercent != null) {
    milestones.push({
      id: `${snapshot.clientId}:margin`,
      label: 'Margin signal',
      dateLabel: 'Current portfolio view',
      tone: snapshot.marginPercent < 25 ? 'warning' : 'positive',
      value: `${snapshot.marginPercent}%`,
      description:
        snapshot.marginPercent < 25
          ? 'Revenue is not converting into enough profit; review price, menu cost, labor, or scope.'
          : `Net profit contribution is ${money(snapshot.netProfitCents)} after tracked costs.`,
    })
  }

  if (snapshot.outstandingBalanceCents > 0) {
    milestones.push({
      id: `${snapshot.clientId}:collections`,
      label: 'Collection issue',
      dateLabel: 'Open balance',
      tone: 'warning',
      value: money(snapshot.outstandingBalanceCents),
      description: 'Open balance is part of the client contribution story and should stay visible.',
    })
  }

  if (snapshot.churnRisk !== 'unknown') {
    milestones.push({
      id: `${snapshot.clientId}:churn-risk`,
      label: 'Dormancy signal',
      dateLabel: snapshot.lastEventDate ? dateLabel(snapshot.lastEventDate) : 'No recent event',
      tone:
        snapshot.churnRisk === 'high'
          ? 'negative'
          : snapshot.churnRisk === 'medium'
            ? 'warning'
            : 'positive',
      description: `${snapshot.churnRisk} churn risk based on recency and completed-event history.`,
    })
  }

  if (snapshot.referralPotential === 'high') {
    milestones.push({
      id: `${snapshot.clientId}:referral`,
      label: 'Referral opportunity',
      dateLabel: 'Relationship signal',
      tone: 'positive',
      description:
        'Referral potential is high enough to justify a concrete ask or warm handoff plan.',
    })
  }

  if (snapshot.reviewState.reviewedAt || snapshot.reviewState.nextReviewDate) {
    milestones.push({
      id: `${snapshot.clientId}:review-state`,
      label: 'Chef review state',
      dateLabel: snapshot.reviewState.nextReviewDate
        ? `Next ${dateLabel(snapshot.reviewState.nextReviewDate)}`
        : dateLabel(snapshot.reviewState.reviewedAt),
      tone: snapshot.reviewState.pinned ? 'warning' : 'neutral',
      description:
        snapshot.reviewState.note ??
        `Contribution status is ${snapshot.reviewState.status.replace('_', ' ')}.`,
    })
  }

  return milestones
}

export function buildClientDependencySimulation(
  portfolio: ClientContributionPortfolio,
  snapshot: ClientContributionSnapshot
): ClientDependencySimulation {
  const payingClients = portfolio.snapshots.filter((item) => item.paidRevenueCents > 0)
  const averagePortfolioClientValueCents =
    payingClients.length > 0
      ? Math.max(1, Math.round(portfolio.summary.totalPaidRevenueCents / payingClients.length))
      : Math.max(1, snapshot.averageEventValueCents || 100_000)
  const annualRevenueLossCents = Math.max(snapshot.annualizedValueCents, snapshot.paidRevenueCents)
  const annualProfitLossCents = Math.max(0, snapshot.netProfitCents)
  const monthlyCashFlowGapCents = Math.round(annualRevenueLossCents / 12)
  const replacementClientCount = Math.max(
    1,
    Math.ceil(annualRevenueLossCents / averagePortfolioClientValueCents)
  )
  const portfolioRevenueSharePercent =
    portfolio.summary.totalPaidRevenueCents > 0
      ? Math.round((snapshot.paidRevenueCents / portfolio.summary.totalPaidRevenueCents) * 100)
      : 0

  return {
    clientId: snapshot.clientId,
    clientName: snapshot.clientName,
    annualRevenueLossCents,
    annualProfitLossCents,
    monthlyCashFlowGapCents,
    portfolioRevenueSharePercent,
    replacementClientCount,
    averagePortfolioClientValueCents,
    confidence: snapshot.dataConfidence.level,
    assumptions: [
      'Uses paid and annualized contribution values from the portfolio engine.',
      'Replacement count uses current average paying-client value.',
      'Profit impact uses tracked net profit and ignores untracked fixed overhead.',
    ],
    mitigationActions: [
      {
        label: 'Protect relationship',
        href: `/clients/${snapshot.clientId}#contribution`,
        reason: 'Review service promises, next touchpoint, and relationship notes.',
      },
      {
        label: 'Ask for referral',
        href: `/inbox?clientId=${snapshot.clientId}`,
        reason: 'Use warm trust while relationship value is visible.',
      },
      {
        label: 'Diversify pipeline',
        href: '/clients/contribution?view=referrals',
        reason: 'Find clients who can create replacement demand.',
      },
    ],
  }
}

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

export function buildRevenueConcentrationWarning(
  portfolio: ClientContributionPortfolio
): ClientRevenueConcentration {
  const payingClients = [...portfolio.snapshots]
    .filter((snapshot) => snapshot.paidRevenueCents > 0)
    .sort((a, b) => b.paidRevenueCents - a.paidRevenueCents)
  const topOne = payingClients[0] ?? null
  const topThree = payingClients.slice(0, 3)
  const topFive = payingClients.slice(0, 5)
  const totalRevenue = portfolio.summary.totalPaidRevenueCents
  const totalProfit = portfolio.summary.totalNetProfitCents
  const topOneRevenue = topOne?.paidRevenueCents ?? 0
  const topOneProfit = Math.max(0, topOne?.netProfitCents ?? 0)
  const topThreeRevenue = topThree.reduce((sum, snapshot) => sum + snapshot.paidRevenueCents, 0)
  const topFiveRevenue = topFive.reduce((sum, snapshot) => sum + snapshot.paidRevenueCents, 0)
  const averageRemainingRevenue =
    payingClients.length > 1
      ? Math.max(
          1,
          Math.round((totalRevenue - topOneRevenue) / Math.max(1, payingClients.length - 1))
        )
      : Math.max(1, topOne?.averageEventValueCents ?? 100_000)
  const topOneSharePercent = percent(topOneRevenue, totalRevenue)
  const topThreeSharePercent = percent(topThreeRevenue, totalRevenue)
  const riskLevel =
    payingClients.length < 3
      ? 'unknown'
      : topOneSharePercent >= 40 || topThreeSharePercent >= 65
        ? 'high'
        : topOneSharePercent >= 28 || topThreeSharePercent >= 50
          ? 'watch'
          : 'healthy'

  return {
    clientCount: payingClients.length,
    topOneSharePercent,
    topThreeSharePercent,
    topFiveSharePercent: percent(topFiveRevenue, totalRevenue),
    topOneProfitSharePercent: percent(topOneProfit, Math.max(0, totalProfit)),
    revenueAtRiskCents: topOneRevenue,
    profitAtRiskCents: topOneProfit,
    monthlyRevenueGapCents: Math.round(topOneRevenue / 12),
    replacementClientCount: Math.max(1, Math.ceil(topOneRevenue / averageRemainingRevenue)),
    riskLevel,
    recommendedResponse:
      riskLevel === 'high'
        ? 'Protect the largest relationship while building referral and reactivation coverage.'
        : riskLevel === 'watch'
          ? 'Monitor concentration and add one replacement-quality opportunity this quarter.'
          : riskLevel === 'unknown'
            ? 'Build more paid client history before treating concentration as a stable signal.'
            : 'Portfolio concentration is currently within the healthy threshold.',
    topClients: topFive.map((snapshot) => ({
      clientId: snapshot.clientId,
      clientName: snapshot.clientName,
      revenueCents: snapshot.paidRevenueCents,
      profitCents: snapshot.netProfitCents,
      revenueSharePercent: percent(snapshot.paidRevenueCents, totalRevenue),
      href: `/clients/${snapshot.clientId}#contribution`,
    })),
  }
}

export function buildClientContributionBusinessBriefing(
  portfolio: ClientContributionPortfolio,
  options: { now?: Date } = {}
): ClientContributionBusinessBriefing {
  const now = options.now ?? new Date()
  const concentration = buildRevenueConcentrationWarning(portfolio)
  const opportunities = buildContributionOpportunityPlan(portfolio, { now, limit: 6 })
  const pricing = portfolio.snapshots
    .filter((snapshot) => snapshot.pricingRecommendation.kind !== 'hold_price')
    .slice(0, 5)
  const drags = portfolio.snapshots
    .filter(
      (snapshot) =>
        snapshot.fitScore.level === 'poor' ||
        snapshot.marginLeaks.length > 0 ||
        snapshot.outstandingBalanceCents > 0
    )
    .slice(0, 5)
  const protectedClients = portfolio.snapshots
    .filter(
      (snapshot) =>
        snapshot.tier === 'strategic' ||
        snapshot.portfolioCategory.key === 'high_value_healthy' ||
        concentration.topClients.some((client) => client.clientId === snapshot.clientId)
    )
    .slice(0, 5)

  return {
    generatedAt: now.toISOString(),
    uncertainty:
      portfolio.summary.missingDataCount > 0
        ? [
            `${portfolio.summary.missingDataCount} clients have missing contribution evidence.`,
            'Briefing uses deterministic contribution snapshots and does not update canonical state.',
          ]
        : [
            'Briefing uses deterministic contribution snapshots and does not update canonical state.',
          ],
    topRisks: [
      {
        label: 'Revenue concentration',
        evidence: `${concentration.topOneSharePercent}% top-client share; ${concentration.topThreeSharePercent}% top-three share.`,
        href: '/clients/contribution?view=top',
      },
      ...drags.slice(0, 3).map((snapshot) => ({
        label: snapshot.clientName,
        evidence:
          snapshot.marginLeaks[0]?.evidence ??
          snapshot.fitScore.negativeDrivers[0]?.value ??
          `${money(snapshot.outstandingBalanceCents)} outstanding balance`,
        href: `/clients/${snapshot.clientId}#contribution`,
      })),
    ],
    opportunities: opportunities.slice(0, 5).map((item) => ({
      label: item.actionLabel,
      evidence: `${item.clientName}: ${item.reason}`,
      href: item.href,
    })),
    contactToday: opportunities
      .filter((item) => item.window === '30')
      .slice(0, 5)
      .map((item) => ({
        clientId: item.clientId,
        clientName: item.clientName,
        reason: item.reason,
        href: item.href,
      })),
    pricingConsiderations: pricing.map((snapshot) => ({
      clientId: snapshot.clientId,
      clientName: snapshot.clientName,
      recommendation: snapshot.pricingRecommendation.label,
      href: snapshot.pricingRecommendation.href,
    })),
    protectedClients: protectedClients.map((snapshot) => ({
      clientId: snapshot.clientId,
      clientName: snapshot.clientName,
      reason: `${money(snapshot.paidRevenueCents)} paid value, ${snapshot.fitScore.label.toLowerCase()}.`,
      href: `/clients/${snapshot.clientId}#contribution`,
    })),
    businessDrags: drags.map((snapshot) => ({
      clientId: snapshot.clientId,
      clientName: snapshot.clientName,
      reason:
        snapshot.marginLeaks[0]?.label ??
        snapshot.fitScore.negativeDrivers[0]?.label ??
        'Contribution review needed',
      href: `/clients/${snapshot.clientId}#contribution`,
    })),
  }
}
