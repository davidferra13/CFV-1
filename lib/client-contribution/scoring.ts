import type {
  ClientContributionEvidence,
  ClientContributionAcquisitionSource,
  ClientContributionCapacitySignal,
  ClientContributionConfidenceLevel,
  ClientContributionCommunicationRoiSignal,
  ClientContributionExpectationRisk,
  ClientContributionFitScore,
  ClientContributionGeographicContribution,
  ClientContributionGeographicMarket,
  ClientContributionInput,
  ClientContributionMarginLeak,
  ClientContributionMissingData,
  ClientContributionPortfolioCategory,
  ClientContributionPlaybook,
  ClientContributionPlaybookKind,
  ClientContributionPricingRecommendation,
  ClientContributionRecommendedAction,
  ClientContributionReferralNetworkValue,
  ClientContributionReviewState,
  ClientContributionSeasonalityForecast,
  ClientContributionSeasonalityMonth,
  ClientContributionServiceFormatPerformance,
  ClientContributionSnapshot,
  ClientContributionTier,
} from './types'

const DEFAULT_REVIEW_STATE: ClientContributionReviewState = {
  status: 'needs_review',
  reviewedAt: null,
  dismissedAt: null,
  dismissReason: null,
  pinned: false,
  tierOverride: null,
  nextReviewDate: null,
  note: null,
}

function cents(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(Number(value))) : 0
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function daysBetween(startIso: string | null | undefined, end = new Date()): number | null {
  if (!startIso) return null
  const start = new Date(startIso)
  if (Number.isNaN(start.getTime())) return null
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000))
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value / 100)
}

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function monthLabel(month: number): string {
  return MONTH_LABELS[month - 1] ?? 'Unknown'
}

function quarterForMonth(month: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  if (month <= 3) return 'Q1'
  if (month <= 6) return 'Q2'
  if (month <= 9) return 'Q3'
  return 'Q4'
}

function daysUntilMonth(month: number, now: Date): number {
  const target = new Date(now)
  target.setHours(12, 0, 0, 0)
  target.setMonth(month - 1, 1)
  if (target < now) target.setFullYear(target.getFullYear() + 1)
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86_400_000))
}

function confidenceForEvidence(count: number): ClientContributionConfidenceLevel {
  if (count >= 5) return 'high'
  if (count >= 2) return 'medium'
  return 'low'
}

export function getContributionTier(score: number): ClientContributionTier {
  if (score >= 82) return 'strategic'
  if (score >= 66) return 'growth'
  if (score >= 45) return 'steady'
  if (score > 0) return 'repair'
  return 'unknown'
}

function getChurnRisk(daysSinceLastEvent: number | null, completedEventCount: number) {
  if (completedEventCount === 0 || daysSinceLastEvent == null) return 'unknown' as const
  if (daysSinceLastEvent > 180) return 'high' as const
  if (daysSinceLastEvent > 90) return 'medium' as const
  return 'low' as const
}

function normalizeReferralPotential(value: string | null | undefined) {
  if (value === 'high' || value === 'medium' || value === 'low') return value
  return 'unknown' as const
}

function normalizeSourceLabel(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function buildAcquisitionSource(
  input: ClientContributionInput
): ClientContributionAcquisitionSource {
  const raw =
    input.acquisitionSource ??
    (input.referredByClientId ? 'referral' : null) ??
    (input.dinnerCircleGroupId ? 'dinner_circle' : null)
  const key =
    String(raw ?? 'unknown')
      .trim()
      .toLowerCase() || 'unknown'
  const label =
    key === 'unknown'
      ? 'Unknown source'
      : input.partnerName
        ? `${input.partnerName} partner`
        : normalizeSourceLabel(key)

  return {
    key,
    label,
    detail: input.acquisitionSourceDetail ?? input.partnerName ?? null,
    known: key !== 'unknown',
  }
}

function hasSignal(value: string | null | undefined, terms: string[]): boolean {
  const normalized = String(value ?? '').toLowerCase()
  return terms.some((term) => normalized.includes(term))
}

function buildFitScore(input: {
  marginPercent: number | null
  paidRevenueCents: number
  completedEventCount: number
  averageEventValueCents: number
  outstandingBalanceCents: number
  churnRisk: ClientContributionSnapshot['churnRisk']
  referralPotential: ClientContributionSnapshot['referralPotential']
  operationalDrag: ClientContributionSnapshot['operationalDrag']
  missingData: ClientContributionMissingData[]
  relationshipSignals?: ClientContributionInput['relationshipSignals']
}): ClientContributionFitScore {
  if (input.paidRevenueCents === 0 && input.completedEventCount === 0) {
    return {
      score: null,
      level: 'unknown',
      label: 'Insufficient fit data',
      positiveDrivers: [],
      negativeDrivers: [
        {
          label: 'No paid history',
          value: 'Import events or complete a first booking',
          tone: 'warning',
        },
      ],
    }
  }

  const positives: ClientContributionEvidence[] = []
  const negatives: ClientContributionEvidence[] = []
  let score = 55

  if (input.marginPercent != null && input.marginPercent >= 45) {
    score += 16
    positives.push({ label: 'Healthy margin', value: `${input.marginPercent}%`, tone: 'positive' })
  } else if (input.marginPercent != null && input.marginPercent < 25) {
    score -= 18
    negatives.push({ label: 'Thin margin', value: `${input.marginPercent}%`, tone: 'warning' })
  }

  if (input.completedEventCount >= 3) {
    score += 9
    positives.push({
      label: 'Repeat history',
      value: `${input.completedEventCount} completed events`,
      tone: 'positive',
    })
  }

  if (input.outstandingBalanceCents > 0) {
    const severe =
      input.averageEventValueCents > 0 &&
      input.outstandingBalanceCents > input.averageEventValueCents
    score -= severe ? 18 : 10
    negatives.push({
      label: severe ? 'Large unpaid balance' : 'Open balance',
      value: formatMoney(input.outstandingBalanceCents),
      tone: 'warning',
    })
  }

  if (input.churnRisk === 'high') {
    score -= 10
    negatives.push({ label: 'Dormant relationship', value: 'High churn risk', tone: 'warning' })
  } else if (input.churnRisk === 'low') {
    score += 6
    positives.push({ label: 'Recent service', value: 'Low churn risk', tone: 'positive' })
  }

  if (input.referralPotential === 'high') {
    score += 8
    positives.push({ label: 'Referral potential', value: 'High', tone: 'positive' })
  }

  if (input.operationalDrag === 'high') score -= 14
  if (input.operationalDrag === 'medium') score -= 6

  const signals = input.relationshipSignals
  if (hasSignal(signals?.redFlags, ['red', 'difficult', 'rude', 'scope', 'late', 'complaint'])) {
    score -= 16
    negatives.push({ label: 'Internal red flag', value: 'Chef-only note', tone: 'negative' })
  }
  if (hasSignal(signals?.paymentBehavior, ['late', 'slow', 'overdue', 'missed'])) {
    score -= 12
    negatives.push({ label: 'Payment friction', value: 'Payment behavior note', tone: 'warning' })
  }
  if (hasSignal(signals?.paymentBehavior, ['early', 'prompt', 'on time', 'auto'])) {
    score += 8
    positives.push({ label: 'Reliable payment', value: 'Payment behavior note', tone: 'positive' })
  }
  if (hasSignal(signals?.tippingPattern, ['generous', 'high', 'strong'])) {
    score += 5
    positives.push({ label: 'Strong gratuity pattern', value: 'Tipping note', tone: 'positive' })
  }
  if (hasSignal(signals?.complaintHandlingNotes, ['complaint', 'refund', 'dispute'])) {
    score -= 8
    negatives.push({ label: 'Complaint handling load', value: 'Chef-only note', tone: 'warning' })
  }
  if (signals?.wowFactors) {
    score += 4
    positives.push({
      label: 'Relationship upside',
      value: 'Wow factors recorded',
      tone: 'positive',
    })
  }

  if (input.missingData.length >= 3) {
    score -= 8
    negatives.push({
      label: 'Sparse evidence',
      value: `${input.missingData.length} gaps`,
      tone: 'warning',
    })
  }

  const finalScore = clampScore(score)
  const level =
    finalScore >= 80 ? 'excellent' : finalScore >= 65 ? 'good' : finalScore >= 42 ? 'mixed' : 'poor'

  return {
    score: finalScore,
    level,
    label:
      level === 'excellent'
        ? 'Excellent fit'
        : level === 'good'
          ? 'Good fit'
          : level === 'mixed'
            ? 'Mixed fit'
            : 'Poor fit',
    positiveDrivers: positives.slice(0, 4),
    negativeDrivers: negatives.slice(0, 4),
  }
}

function buildMarginLeaks(input: {
  marginPercent: number | null
  paidRevenueCents: number
  outstandingBalanceCents: number
  events: NonNullable<ClientContributionInput['eventFinancials']>
  missingData: ClientContributionMissingData[]
}): ClientContributionMarginLeak[] {
  const leaks: ClientContributionMarginLeak[] = []
  const paidEvents = input.events.filter((event) => cents(event.totalPaidCents) > 0)

  if (input.marginPercent != null && input.paidRevenueCents > 0 && input.marginPercent < 25) {
    const targetProfit = Math.round(input.paidRevenueCents * 0.35)
    const actualProfit = Math.round(input.paidRevenueCents * (input.marginPercent / 100))
    leaks.push({
      type: 'low_margin',
      label: 'High revenue, low margin',
      severity: input.marginPercent < 15 ? 'critical' : 'warning',
      estimatedImpactCents: Math.max(0, targetProfit - actualProfit),
      affectedEventCount: Math.max(1, paidEvents.length),
      actionLabel: 'Review pricing',
      actionHref: '/pricing',
      evidence: `${input.marginPercent}% tracked margin is below the 25% review threshold.`,
    })
  }

  if (input.outstandingBalanceCents > 0) {
    leaks.push({
      type: 'outstanding_add_on',
      label: 'Uncollected balance',
      severity: input.outstandingBalanceCents >= 100_000 ? 'critical' : 'warning',
      estimatedImpactCents: input.outstandingBalanceCents,
      affectedEventCount: Math.max(1, paidEvents.length),
      actionLabel: 'Collect balance',
      actionHref: '/finance/ledger',
      evidence: `${formatMoney(input.outstandingBalanceCents)} remains unpaid or uncollected.`,
    })
  }

  if (input.missingData.some((item) => item.key === 'expenses')) {
    leaks.push({
      type: 'missing_expenses',
      label: 'Missing expense attribution',
      severity: 'warning',
      estimatedImpactCents: 0,
      affectedEventCount: input.events.length,
      actionLabel: 'Add expenses',
      actionHref: '/expenses/new',
      evidence:
        'Events have paid revenue but no tracked expenses, so true margin may be overstated.',
    })
  }

  return leaks
}

function buildReferralNetworkValue(input: {
  referralPotential: ClientContributionSnapshot['referralPotential']
  paidRevenueCents: number
  netProfitCents: number
  completedEventCount: number
  relationshipSignals?: ClientContributionInput['relationshipSignals']
}): ClientContributionReferralNetworkValue {
  const socialProof =
    hasSignal(input.relationshipSignals?.wowFactors, [
      'review',
      'testimonial',
      'share',
      'instagram',
    ]) || hasSignal(input.relationshipSignals?.complaintHandlingNotes, ['review', 'testimonial'])
  const score = clampScore(
    (input.referralPotential === 'high' ? 58 : input.referralPotential === 'medium' ? 34 : 10) +
      Math.min(18, input.completedEventCount * 3) +
      Math.min(14, input.netProfitCents / 100000) +
      (socialProof ? 10 : 0)
  )
  const recommendedAction =
    score >= 70
      ? 'ask_for_referral'
      : score >= 45
        ? 'nurture_network'
        : input.referralPotential === 'high'
          ? 'nurture_network'
          : 'no_action'

  return {
    score,
    directReferralValueCents: 0,
    attributedReferralCount: 0,
    impactLabel:
      input.referralPotential === 'high'
        ? 'High referral potential'
        : input.referralPotential === 'medium'
          ? 'Developing referral potential'
          : 'No proven referral value yet',
    recommendedAction,
    evidence: [
      `${input.referralPotential} referral potential`,
      `${input.completedEventCount} completed event${input.completedEventCount === 1 ? '' : 's'}`,
      input.paidRevenueCents > 0
        ? `${formatMoney(input.paidRevenueCents)} direct paid value`
        : 'No direct paid value yet',
      socialProof ? 'Social proof signal recorded' : 'No attributed referral revenue recorded',
    ],
  }
}

function buildCapacitySignal(input: {
  snapshotBase: {
    clientId: string
    paidRevenueCents: number
    netProfitCents: number
    averageEventValueCents: number
    completedEventCount: number
    marginPercent: number | null
    outstandingBalanceCents: number
    churnRisk: ClientContributionSnapshot['churnRisk']
    operationalDrag: ClientContributionSnapshot['operationalDrag']
  }
  fitScore: ClientContributionFitScore
  recurringPricingModel?: string | null
  preferredEventDays?: string[] | null
  preferredServiceStyle?: string | null
}): ClientContributionCapacitySignal {
  const base = input.snapshotBase
  const prefersWeekend = (input.preferredEventDays ?? []).some((day) =>
    ['fri', 'sat', 'sun', 'weekend'].some((needle) => String(day).toLowerCase().includes(needle))
  )
  const recurringBonus = input.recurringPricingModel ? 10 : 0
  const marginScore =
    base.marginPercent == null ? 0 : Math.min(24, Math.max(0, base.marginPercent / 2))
  const valueScore = Math.min(26, base.averageEventValueCents / 20000)
  const fitScore = Math.min(22, (input.fitScore.score ?? 35) / 4)
  const repeatScore = Math.min(12, base.completedEventCount * 3)
  const dragPenalty =
    base.outstandingBalanceCents > 0 || base.operationalDrag === 'high'
      ? 24
      : base.operationalDrag === 'medium'
        ? 12
        : 0
  const score = clampScore(
    valueScore + marginScore + fitScore + repeatScore + recurringBonus - dragPenalty
  )
  const status =
    score >= 74
      ? 'premium_candidate'
      : dragPenalty > 0 && base.paidRevenueCents >= 500_000
        ? 'price_before_premium'
        : score >= 48
          ? 'standard_fit'
          : base.paidRevenueCents === 0
            ? 'unknown'
            : 'avoid_premium'

  const labels: Record<ClientContributionCapacitySignal['status'], string> = {
    premium_candidate: 'Premium slot candidate',
    price_before_premium: 'Price before premium slot',
    standard_fit: 'Standard capacity fit',
    avoid_premium: 'Avoid premium capacity',
    unknown: 'Needs capacity evidence',
  }

  return {
    score,
    status,
    label: labels[status],
    evidence: [
      `${formatMoney(base.averageEventValueCents)} average event value`,
      base.marginPercent == null ? 'Margin unknown' : `${base.marginPercent}% margin`,
      `${input.fitScore.label}`,
      prefersWeekend ? 'Prefers weekend capacity' : 'No weekend preference recorded',
      input.preferredServiceStyle
        ? `${input.preferredServiceStyle} service style`
        : 'Service style unknown',
    ],
    suggestedAction:
      status === 'premium_candidate'
        ? 'Offer scarce or weekend dates first'
        : status === 'price_before_premium'
          ? 'Adjust price, deposit, or scope before scarce dates'
          : status === 'avoid_premium'
            ? 'Keep scarce dates for stronger fit clients'
            : 'Confirm availability evidence before promising capacity',
    href:
      status === 'price_before_premium'
        ? '/pricing'
        : status === 'premium_candidate'
          ? `/clients/${base.clientId}#contribution`
          : '/calendar',
  }
}

function buildCommunicationRoi(input: {
  snapshotBase: {
    clientId: string
    paidRevenueCents: number
    netProfitCents: number
    annualizedValueCents: number
    completedEventCount: number
    outstandingBalanceCents: number
    churnRisk: ClientContributionSnapshot['churnRisk']
    referralPotential: ClientContributionSnapshot['referralPotential']
  }
  automatedEmailsEnabled?: boolean | null
  communicationStyleNotes?: string | null
  relationshipSignals?: ClientContributionInput['relationshipSignals']
}): ClientContributionCommunicationRoiSignal {
  const base = input.snapshotBase
  const notes =
    `${input.communicationStyleNotes ?? ''} ${input.relationshipSignals?.wowFactors ?? ''}`.toLowerCase()
  const touchType: ClientContributionCommunicationRoiSignal['touchType'] =
    base.outstandingBalanceCents > 0
      ? 'follow_up'
      : base.churnRisk === 'high'
        ? 'rebooking'
        : base.referralPotential === 'high'
          ? 'referral_ask'
          : notes.includes('birthday')
            ? 'birthday'
            : input.automatedEmailsEnabled
              ? 'thank_you'
              : base.completedEventCount > 0
                ? 'manual_relationship'
                : 'insufficient_data'
  const labels: Record<ClientContributionCommunicationRoiSignal['touchType'], string> = {
    follow_up: 'Follow-up / collection touch',
    thank_you: 'Thank-you touch',
    referral_ask: 'Referral ask',
    rebooking: 'Rebooking campaign',
    birthday: 'Birthday touch',
    manual_relationship: 'Manual relationship touch',
    insufficient_data: 'Insufficient communication data',
  }
  const revenueAfterTouchCents =
    touchType === 'follow_up'
      ? base.outstandingBalanceCents
      : Math.max(base.annualizedValueCents, base.paidRevenueCents)
  const confidence: ClientContributionConfidenceLevel =
    base.completedEventCount >= 3 ? 'high' : base.completedEventCount > 0 ? 'medium' : 'low'

  return {
    touchType,
    label: labels[touchType],
    revenueAfterTouchCents,
    profitAfterTouchCents:
      touchType === 'follow_up' ? base.outstandingBalanceCents : Math.max(0, base.netProfitCents),
    conversionCount: touchType === 'insufficient_data' ? 0 : base.completedEventCount,
    confidence,
    evidence: [
      `${base.completedEventCount} completed event${base.completedEventCount === 1 ? '' : 's'}`,
      `${formatMoney(revenueAfterTouchCents)} value after relevant touch`,
      input.automatedEmailsEnabled === false
        ? 'Automation disabled; keep chef-reviewed manual touch'
        : 'No automatic message is sent from this recommendation',
    ],
    href: `/inbox?clientId=${base.clientId}`,
  }
}

function buildSeasonalityForecast(input: {
  events: NonNullable<ClientContributionInput['eventFinancials']>
  averageEventValueCents: number
  annualizedValueCents: number
  daysSinceLastEvent: number | null
  now: Date
}): ClientContributionSeasonalityForecast {
  const months = new Map<number, ClientContributionSeasonalityMonth>()
  for (let month = 1; month <= 12; month += 1) {
    months.set(month, {
      month,
      label: monthLabel(month),
      eventCount: 0,
      revenueCents: 0,
      profitCents: 0,
    })
  }

  const datedEvents = input.events.filter((event) => {
    if (!event.eventDate) return false
    const date = new Date(event.eventDate)
    return !Number.isNaN(date.getTime())
  })

  for (const event of datedEvents) {
    const date = new Date(event.eventDate!)
    const month = date.getMonth() + 1
    const current = months.get(month)!
    current.eventCount += 1
    current.revenueCents += cents(event.totalPaidCents)
    current.profitCents += Number(event.profitCents) || 0
  }

  const monthList = [...months.values()]
  const strongestMonths = monthList
    .filter((month) => month.eventCount > 0)
    .sort((a, b) => b.eventCount - a.eventCount || b.revenueCents - a.revenueCents)
    .slice(0, 3)
  const confidentMonths = strongestMonths.filter((month) => month.eventCount >= 2)
  const quarterGroups = new Map<
    'Q1' | 'Q2' | 'Q3' | 'Q4',
    { eventCount: number; revenueCents: number }
  >()
  for (const quarter of ['Q1', 'Q2', 'Q3', 'Q4'] as const) {
    quarterGroups.set(quarter, { eventCount: 0, revenueCents: 0 })
  }
  for (const month of monthList) {
    const quarter = quarterForMonth(month.month)
    const current = quarterGroups.get(quarter)!
    current.eventCount += month.eventCount
    current.revenueCents += month.revenueCents
  }

  const confidence = confidenceForEvidence(datedEvents.length)
  const nextCandidate = confidentMonths
    .map((month) => ({ month, dueInDays: daysUntilMonth(month.month, input.now) }))
    .sort((a, b) => a.dueInDays - b.dueInDays)[0]
  const expectedValueCents = Math.max(input.averageEventValueCents, input.annualizedValueCents / 4)
  const nextLikelyWindow =
    confidence === 'low' || !nextCandidate
      ? null
      : {
          month: nextCandidate.month.month,
          label: nextCandidate.month.label,
          dueInDays: nextCandidate.dueInDays,
          expectedValueCents: Math.round(expectedValueCents),
          confidence,
        }
  const dormantSeasonalRisk =
    Boolean(nextLikelyWindow) &&
    nextLikelyWindow!.dueInDays <= 120 &&
    (input.daysSinceLastEvent ?? 0) > 120

  return {
    confidence,
    label:
      confidence === 'low'
        ? 'Needs seasonal history'
        : nextLikelyWindow
          ? `${nextLikelyWindow.label} booking pattern`
          : 'Seasonal pattern emerging',
    monthsObserved: datedEvents.length,
    strongestMonths,
    strongestQuarters: [...quarterGroups.entries()]
      .map(([quarter, value]) => ({
        quarter,
        label: quarter,
        eventCount: value.eventCount,
        revenueCents: value.revenueCents,
      }))
      .sort((a, b) => b.eventCount - a.eventCount || b.revenueCents - a.revenueCents)
      .slice(0, 2),
    nextLikelyWindow,
    dormantSeasonalRisk,
    evidence:
      confidence === 'low'
        ? [
            `${datedEvents.length} dated event${datedEvents.length === 1 ? '' : 's'} found`,
            'At least two dated events in a month are required before a likely window is shown.',
          ]
        : strongestMonths.map(
            (month) =>
              `${month.eventCount} ${month.label} event${month.eventCount === 1 ? '' : 's'}; ${formatMoney(month.revenueCents)} paid`
          ),
  }
}

function marketKey(city: string | null | undefined, state: string | null | undefined): string {
  const cityPart = String(city ?? '')
    .trim()
    .toLowerCase()
  const statePart = String(state ?? '')
    .trim()
    .toLowerCase()
  if (!cityPart && !statePart) return 'unknown'
  return `${cityPart || 'unknown-city'}:${statePart || 'unknown-state'}`
}

function marketLabel(city: string | null | undefined, state: string | null | undefined): string {
  const cityPart = String(city ?? '').trim()
  const statePart = String(state ?? '').trim()
  if (!cityPart && !statePart) return 'Unknown market'
  if (cityPart && statePart) return `${cityPart}, ${statePart}`
  return cityPart || statePart || 'Unknown market'
}

function buildGeographicContribution(
  events: NonNullable<ClientContributionInput['eventFinancials']>
): ClientContributionGeographicContribution {
  const groups = new Map<string, ClientContributionGeographicMarket>()
  let unknownEventCount = 0

  for (const event of events) {
    const key = marketKey(event.locationCity, event.locationState)
    if (key === 'unknown') unknownEventCount += 1
    const current =
      groups.get(key) ??
      ({
        key,
        label: marketLabel(event.locationCity, event.locationState),
        eventCount: 0,
        revenueCents: 0,
        profitCents: 0,
        averageMarginPercent: null,
        confidence: 'low',
      } satisfies ClientContributionGeographicMarket)
    current.eventCount += 1
    current.revenueCents += cents(event.totalPaidCents)
    current.profitCents += Number(event.profitCents) || 0
    groups.set(key, current)
  }

  const markets = [...groups.values()].map((market) => ({
    ...market,
    averageMarginPercent:
      market.revenueCents > 0 ? Math.round((market.profitCents / market.revenueCents) * 100) : null,
    confidence: confidenceForEvidence(market.eventCount),
  }))

  markets.sort((a, b) => b.profitCents - a.profitCents || b.revenueCents - a.revenueCents)

  return {
    primaryMarket: markets.find((market) => market.key !== 'unknown') ?? markets[0] ?? null,
    markets,
    unknownEventCount,
  }
}

function serviceFormatKey(
  event: NonNullable<ClientContributionInput['eventFinancials']>[number]
): string {
  const raw = event.serviceStyle ?? event.occasion ?? 'unknown'
  const normalized = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || 'unknown'
}

function serviceFormatLabel(value: string): string {
  if (value === 'unknown') return 'Unknown format'
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function buildServiceFormatPerformance(
  events: NonNullable<ClientContributionInput['eventFinancials']>
): ClientContributionSnapshot['serviceFormats'] {
  const groups = new Map<string, ClientContributionServiceFormatPerformance>()
  let unknownEventCount = 0

  for (const event of events) {
    const key = serviceFormatKey(event)
    if (key === 'unknown') unknownEventCount += 1
    const current =
      groups.get(key) ??
      ({
        key,
        label: serviceFormatLabel(key),
        eventCount: 0,
        guestCount: 0,
        revenueCents: 0,
        profitCents: 0,
        averageEventValueCents: 0,
        averageProfitCents: 0,
        marginPercent: null,
        confidence: 'low',
        recommendation: 'repair_data',
        evidence: [],
      } satisfies ClientContributionServiceFormatPerformance)

    current.eventCount += 1
    current.guestCount += Math.max(0, Math.round(Number(event.guestCount ?? 0)))
    current.revenueCents += cents(event.totalPaidCents)
    current.profitCents += Number(event.profitCents) || 0
    groups.set(key, current)
  }

  const formats = [...groups.values()]
    .map((format) => {
      const marginPercent =
        format.revenueCents > 0
          ? Math.round((format.profitCents / format.revenueCents) * 100)
          : null
      const recommendation: ClientContributionServiceFormatPerformance['recommendation'] =
        format.revenueCents === 0 || marginPercent == null
          ? 'repair_data'
          : marginPercent < 25
            ? 'price_review'
            : format.eventCount >= 2 && marginPercent >= 45
              ? 'scale'
              : 'watch'

      return {
        ...format,
        averageEventValueCents:
          format.eventCount > 0 ? Math.round(format.revenueCents / format.eventCount) : 0,
        averageProfitCents:
          format.eventCount > 0 ? Math.round(format.profitCents / format.eventCount) : 0,
        marginPercent,
        confidence: confidenceForEvidence(format.eventCount),
        recommendation,
        evidence: [
          `${format.eventCount} event${format.eventCount === 1 ? '' : 's'}`,
          `${formatMoney(format.revenueCents)} paid revenue`,
          marginPercent == null ? 'Margin unknown' : `${marginPercent}% margin`,
        ],
      } satisfies ClientContributionServiceFormatPerformance
    })
    .sort((a, b) => b.profitCents - a.profitCents || b.revenueCents - a.revenueCents)

  const knownFormats = formats.filter((format) => format.key !== 'unknown')
  const marginFormats = knownFormats.filter((format) => format.marginPercent != null)

  return {
    primaryFormat: knownFormats[0] ?? formats[0] ?? null,
    bestMarginFormat:
      [...marginFormats].sort((a, b) => (b.marginPercent ?? -1) - (a.marginPercent ?? -1))[0] ??
      null,
    worstMarginFormat:
      [...marginFormats].sort((a, b) => (a.marginPercent ?? 101) - (b.marginPercent ?? 101))[0] ??
      null,
    formats,
    unknownEventCount,
  }
}

function buildExpectationRisk(input: {
  clientId: string
  paidRevenueCents: number
  outstandingBalanceCents: number
  marginPercent: number | null
  operationalDrag: ClientContributionSnapshot['operationalDrag']
  relationshipSignals?: ClientContributionInput['relationshipSignals']
  communicationStyleNotes?: string | null
  events: NonNullable<ClientContributionInput['eventFinancials']>
}): ClientContributionExpectationRisk {
  const evidence: ClientContributionEvidence[] = []
  let score = 0
  const add = (
    points: number,
    label: string,
    value: string,
    tone: ClientContributionEvidence['tone'] = 'warning'
  ) => {
    score += points
    evidence.push({ label, value, tone })
  }
  const notes = [
    input.relationshipSignals?.redFlags,
    input.relationshipSignals?.complaintHandlingNotes,
    input.relationshipSignals?.paymentBehavior,
    input.communicationStyleNotes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (hasSignal(notes, ['revision', 'revisions', 'change', 'scope creep', 'late change'])) {
    add(24, 'Revision pressure', 'Late changes or scope movement noted', 'negative')
  }
  if (hasSignal(notes, ['budget', 'too expensive', 'discount', 'unrealistic'])) {
    add(18, 'Budget mismatch', 'Budget or discount pressure noted')
  }
  if (hasSignal(notes, ['access', 'gate', 'security', 'parking', 'elevator', 'loading'])) {
    add(14, 'Access constraints', 'Access or site constraints noted')
  }
  if (hasSignal(notes, ['emotional', 'anxious', 'difficult', 'rude', 'demanding', 'high touch'])) {
    add(20, 'High emotional load', 'Private relationship note needs boundaries', 'negative')
  }
  if (
    hasSignal(input.relationshipSignals?.paymentBehavior, ['late', 'slow', 'overdue', 'missed'])
  ) {
    add(18, 'Payment delay', 'Payment behavior note indicates collection risk')
  }
  if (input.outstandingBalanceCents > 0) {
    add(16, 'Open balance', `${formatMoney(input.outstandingBalanceCents)} outstanding`)
  }
  if (input.marginPercent != null && input.marginPercent < 25 && input.paidRevenueCents > 0) {
    add(14, 'Thin margin', `${input.marginPercent}% margin leaves little room for extra scope`)
  }
  if (input.operationalDrag === 'high') {
    add(12, 'Operational drag', 'Service effort exceeds current value')
  }

  const underpaidQuotes = input.events.filter((event) => {
    const quoted = cents(event.quotedPriceCents)
    const paid = cents(event.totalPaidCents)
    return quoted > 0 && paid > 0 && paid < quoted * 0.85
  })
  if (underpaidQuotes.length > 0) {
    add(
      12,
      'Quote realization',
      `${underpaidQuotes.length} event${underpaidQuotes.length === 1 ? '' : 's'} paid materially below quote`
    )
  }

  const level =
    input.paidRevenueCents === 0 && evidence.length === 0
      ? 'unknown'
      : score >= 55
        ? 'high'
        : score >= 28
          ? 'medium'
          : 'low'
  const mitigations =
    level === 'high'
      ? [
          {
            label: 'Set boundary terms',
            href: `/inbox?clientId=${input.clientId}`,
            reason: 'Use chef-reviewed language before accepting more revisions or late changes.',
          },
          {
            label: 'Require deposit/minimum',
            href: '/pricing',
            reason: 'Protect cash flow and scope before another booking.',
          },
          {
            label: 'Add prep buffer',
            href: '/calendar',
            reason: 'Avoid promising tight timelines to a high-touch relationship.',
          },
        ]
      : level === 'medium'
        ? [
            {
              label: 'Review scope',
              href: `/clients/${input.clientId}#contribution`,
              reason: 'Confirm whether expectations are documented before quoting again.',
            },
            {
              label: 'Price buffer',
              href: '/pricing',
              reason: 'Use margin evidence to account for likely extra coordination.',
            },
          ]
        : [
            {
              label: 'Monitor terms',
              href: `/clients/${input.clientId}#contribution`,
              reason: 'Keep expectation notes current as new events arrive.',
            },
          ]

  return {
    score: clampScore(score),
    level,
    label:
      level === 'high'
        ? 'High expectation risk'
        : level === 'medium'
          ? 'Expectation risk watch'
          : level === 'low'
            ? 'Low expectation risk'
            : 'Expectation risk unknown',
    evidence: evidence.slice(0, 5),
    mitigations,
    chefOnly: true,
  }
}

function buildPricingRecommendation(input: {
  missingData: ClientContributionMissingData[]
  marginLeaks: ClientContributionMarginLeak[]
  fitScore: ClientContributionFitScore
  marginPercent: number | null
  outstandingBalanceCents: number
  averageEventValueCents: number
  referralNetworkValue: ClientContributionReferralNetworkValue
}): ClientContributionPricingRecommendation {
  const lowMargin = input.marginLeaks.find((leak) => leak.type === 'low_margin')
  if (input.missingData.length >= 3) {
    return {
      kind: 'insufficient_data',
      label: 'Repair pricing evidence first',
      riskLevel: 'medium',
      riskLabel: 'Sparse data',
      href: '/clients/contribution?view=missing',
      evidence: input.missingData.slice(0, 3).map((item) => `Missing ${item.label.toLowerCase()}`),
    }
  }
  if (input.outstandingBalanceCents > 0) {
    return {
      kind: 'require_deposit',
      label: 'Require deposit before next booking',
      riskLevel: input.outstandingBalanceCents >= 100_000 ? 'high' : 'medium',
      riskLabel: 'Collection exposure',
      href: '/finance/ledger',
      evidence: [`${formatMoney(input.outstandingBalanceCents)} outstanding balance`],
    }
  }
  if (input.fitScore.level === 'poor' && lowMargin) {
    return {
      kind: 'stop_discounting',
      label: 'Stop discounting this client',
      riskLevel: 'high',
      riskLabel: 'Poor fit and weak margin',
      href: '/pricing',
      evidence: [lowMargin.evidence, 'Fit score is poor or heavily dragged by risk signals'],
    }
  }
  if (lowMargin) {
    return {
      kind: input.averageEventValueCents < 150_000 ? 'require_minimum_spend' : 'raise_price',
      label: input.averageEventValueCents < 150_000 ? 'Require minimum spend' : 'Raise price',
      riskLevel: lowMargin.severity === 'critical' ? 'high' : 'medium',
      riskLabel: 'Margin leak',
      href: '/pricing',
      evidence: [
        lowMargin.evidence,
        `Estimated leak ${formatMoney(lowMargin.estimatedImpactCents)}`,
      ],
    }
  }
  if (input.referralNetworkValue.score >= 70 && input.fitScore.level !== 'poor') {
    return {
      kind: 'offer_package',
      label: 'Offer referral-friendly package',
      riskLevel: 'low',
      riskLabel: 'Growth upside',
      href: '/quotes/templates',
      evidence: input.referralNetworkValue.evidence.slice(0, 3),
    }
  }
  return {
    kind: 'hold_price',
    label: 'Hold price and monitor fit',
    riskLevel: 'low',
    riskLabel: 'Stable contribution',
    href: '/clients/contribution',
    evidence: [
      input.marginPercent == null ? 'Margin unknown' : `${input.marginPercent}% margin`,
      `${input.fitScore.label}`,
    ],
  }
}

function buildPortfolioCategory(input: {
  paidRevenueCents: number
  contributionScore: number
  churnRisk: ClientContributionSnapshot['churnRisk']
  fitScore: ClientContributionFitScore
  referralNetworkValue: ClientContributionReferralNetworkValue
  missingData: ClientContributionMissingData[]
}): ClientContributionSnapshot['portfolioCategory'] {
  let key: ClientContributionPortfolioCategory = 'new_promising'
  if (input.missingData.length >= 4) key = 'sparse_data'
  else if (
    input.paidRevenueCents >= 500_000 &&
    input.churnRisk === 'low' &&
    (input.fitScore.score ?? 0) >= 65
  ) {
    key = 'high_value_healthy'
  } else if (input.paidRevenueCents >= 500_000) {
    key = 'high_value_at_risk'
  } else if ((input.fitScore.score ?? 100) < 45 && input.paidRevenueCents > 0) {
    key = 'low_value_high_effort'
  } else if (input.referralNetworkValue.score >= 55 || input.contributionScore >= 45) {
    key = 'new_promising'
  }

  const labels: Record<ClientContributionPortfolioCategory, string> = {
    high_value_healthy: 'High value / healthy',
    high_value_at_risk: 'High value / at risk',
    low_value_high_effort: 'Low value / high effort',
    new_promising: 'New or promising',
    sparse_data: 'Sparse data',
  }

  return {
    key,
    label: labels[key],
    evidence:
      key === 'sparse_data'
        ? `${input.missingData.length} missing evidence gaps`
        : `${formatMoney(input.paidRevenueCents)} paid, ${input.fitScore.label.toLowerCase()}`,
  }
}

function buildMissingData(input: ClientContributionInput): ClientContributionMissingData[] {
  const missing: ClientContributionMissingData[] = []
  const base = `/clients/${input.clientId}`
  const events = input.eventFinancials ?? []
  const completed = input.financials?.totalEventsCompleted ?? 0

  if (!input.financials) {
    missing.push({ key: 'financial_summary', label: 'Financial summary', repairHref: '/import' })
  }
  if (completed === 0) {
    missing.push({
      key: 'completed_events',
      label: 'Completed event history',
      repairHref: '/import',
    })
  }
  if (events.length > 0 && events.every((event) => cents(event.totalExpensesCents) === 0)) {
    missing.push({ key: 'expenses', label: 'Expense attribution', repairHref: '/expenses/new' })
  }
  if (input.referralPotential == null) {
    missing.push({
      key: 'referral_potential',
      label: 'Referral potential',
      repairHref: `${base}#contribution`,
    })
  }
  if (!input.hasInternalAssessment) {
    missing.push({
      key: 'internal_assessment',
      label: 'Internal assessment',
      repairHref: `${base}#contribution`,
    })
  }
  if (events.length > 0 && events.every((event) => cents(event.totalPaidCents) === 0)) {
    missing.push({ key: 'paid_revenue', label: 'Paid revenue', repairHref: '/finance/ledger' })
  }

  return missing
}

function recommendAction(input: {
  score: number
  completedEventCount: number
  outstandingBalanceCents: number
  marginPercent: number | null
  churnRisk: ClientContributionSnapshot['churnRisk']
  referralPotential: ClientContributionSnapshot['referralPotential']
  missingData: ClientContributionMissingData[]
}): ClientContributionRecommendedAction {
  if (input.missingData.length >= 3) return 'repair_data'
  if (input.completedEventCount === 0) return 'build_history'
  if (input.outstandingBalanceCents > 0) return 'collect_balance'
  if (input.marginPercent != null && input.marginPercent < 25) return 'review_pricing'
  if (input.churnRisk === 'high') return 'reengage'
  if (input.referralPotential === 'high' && input.score >= 60) return 'nurture_referrals'
  if (input.score >= 82) return 'protect_relationship'
  return 'maintain'
}

function buildPlaybook(
  kind: ClientContributionPlaybookKind,
  input: {
    clientId: string
    clientName: string
    evidence: string[]
  }
): ClientContributionPlaybook {
  const profileHref = `/clients/${input.clientId}#contribution`
  const definitions: Record<
    ClientContributionPlaybookKind,
    Omit<ClientContributionPlaybook, 'kind' | 'evidence'>
  > = {
    protect_vip: {
      label: 'Protect VIP',
      goal: 'Keep the relationship healthy while protecting scarce capacity.',
      reason: 'High contribution and fit justify deliberate relationship protection.',
      risk: 'Complacency can let a top relationship cool without visible warning.',
      actions: [
        {
          label: 'Review relationship',
          href: profileHref,
          reason: 'Check notes, dates, and next review state.',
        },
        {
          label: 'Plan next touch',
          href: `/inbox?clientId=${input.clientId}`,
          reason: 'Keep the next high-value touch chef-reviewed.',
        },
      ],
      successCriteria: [
        'Next touchpoint is planned',
        'Review state is current',
        'No outstanding service risk remains',
      ],
    },
    reengage_high_value: {
      label: 'Re-engage dormant high-value',
      goal: 'Recover valuable clients before dormancy turns into churn.',
      reason: 'Paid value exists, but recency signals show the relationship is cooling.',
      risk: 'A generic outreach can feel transactional if it ignores prior service context.',
      actions: [
        {
          label: 'Draft rebooking touch',
          href: `/inbox?clientId=${input.clientId}`,
          reason: 'Use prior event evidence in a chef-reviewed message.',
        },
        {
          label: 'Review profile',
          href: profileHref,
          reason: 'Confirm preferences and past service details first.',
        },
      ],
      successCriteria: [
        'Rebooking touch is reviewed',
        'Follow-up date exists',
        'Dormancy risk is lower after the next event or reply',
      ],
    },
    raise_price_carefully: {
      label: 'Raise price carefully',
      goal: 'Improve margin without damaging a useful relationship.',
      reason: 'Contribution evidence shows value, but margin or scope needs pricing attention.',
      risk: 'A blunt price change can create trust damage without evidence and framing.',
      actions: [
        {
          label: 'Review pricing',
          href: '/pricing',
          reason: 'Use margin evidence before proposing a change.',
        },
        {
          label: 'Open client context',
          href: profileHref,
          reason: 'Check relationship notes before changing terms.',
        },
      ],
      successCriteria: [
        'New quote uses target margin',
        'Client-specific rationale is documented',
        'No unpriced scope remains',
      ],
    },
    ask_for_referral: {
      label: 'Ask for referral',
      goal: 'Turn strong trust into replacement-quality demand.',
      reason: 'Referral value or relationship signal is strong enough for a specific ask.',
      risk: 'Asking too early or too broadly can waste relationship capital.',
      actions: [
        {
          label: 'Draft referral ask',
          href: `/inbox?clientId=${input.clientId}`,
          reason: 'Keep the ask personal and chef-reviewed.',
        },
        {
          label: 'Use referral view',
          href: '/clients/contribution?view=referral-value',
          reason: 'Compare with other referral candidates.',
        },
      ],
      successCriteria: [
        'Referral ask is sent or scheduled',
        'Referral source is tracked',
        'Resulting lead is attributed',
      ],
    },
    convert_to_recurring: {
      label: 'Convert one-time to recurring',
      goal: 'Stabilize revenue with an appropriate repeat-service offer.',
      reason: 'Fit and event history suggest the client could support recurring revenue.',
      risk: 'Recurring terms can overpromise capacity if service style and dates are unclear.',
      actions: [
        {
          label: 'Review recurring fit',
          href: `/clients/${input.clientId}/recurring`,
          reason: 'Check whether recurring service exists or should be proposed.',
        },
        {
          label: 'Check capacity',
          href: '/clients/contribution?view=premium-capacity',
          reason: 'Protect scarce calendar time before offering cadence.',
        },
      ],
      successCriteria: [
        'Cadence or reason not to pursue is documented',
        'Capacity fit is confirmed',
        'Next proposal path is clear',
      ],
    },
    repair_relationship: {
      label: 'Repair relationship',
      goal: 'Reduce relationship risk before it damages margin or delivery.',
      reason:
        'Fit, complaint, payment, or red-flag evidence suggests the relationship needs repair.',
      risk: 'Sensitive chef-only notes must stay private and operational.',
      actions: [
        {
          label: 'Review private notes',
          href: profileHref,
          reason: 'Separate facts from subjective risk before action.',
        },
        {
          label: 'Plan boundary touch',
          href: `/inbox?clientId=${input.clientId}`,
          reason: 'Use careful language and avoid automatic sends.',
        },
      ],
      successCriteria: [
        'Boundary or recovery plan is written',
        'Next review date exists',
        'Risk drivers are no longer ambiguous',
      ],
    },
    stop_over_serving: {
      label: 'Stop over-serving',
      goal: 'Protect chef time, margin, and scope.',
      reason:
        'Low margin, operational drag, or weak fit suggests service effort is exceeding value.',
      risk: 'Continuing the same service pattern can normalize unprofitable expectations.',
      actions: [
        {
          label: 'Review scope and price',
          href: '/pricing',
          reason: 'Reset price, minimum, or service boundaries.',
        },
        {
          label: 'Open contribution profile',
          href: profileHref,
          reason: 'Use evidence before changing the relationship.',
        },
      ],
      successCriteria: [
        'Minimum or boundary is defined',
        'Next quote reflects true scope',
        'No premium capacity is promised without price review',
      ],
    },
    require_deposit_or_minimum: {
      label: 'Require deposit/minimum',
      goal: 'Reduce collection and underpriced booking risk.',
      reason: 'Open balance or weak average value requires stronger terms before the next booking.',
      risk: 'More service before terms are fixed can increase receivables exposure.',
      actions: [
        {
          label: 'Collect balance',
          href: '/finance/ledger',
          reason: 'Resolve receivables before new work.',
        },
        {
          label: 'Set pricing terms',
          href: '/pricing',
          reason: 'Use deposit or minimum spend on the next quote.',
        },
      ],
      successCriteria: [
        'Balance is collected or plan exists',
        'Deposit/minimum is used next time',
        'No new booking bypasses terms',
      ],
    },
    build_history: {
      label: 'Build history',
      goal: 'Create enough evidence for real contribution decisions.',
      reason:
        'The client needs paid history before the contribution engine can rank them confidently.',
      risk: 'Premature optimization can misclassify a new or sparse relationship.',
      actions: [
        {
          label: 'Import history',
          href: '/import',
          reason: 'Backfill event, payment, and source evidence.',
        },
        { label: 'Open profile', href: profileHref, reason: 'Record relationship context.' },
      ],
      successCriteria: [
        'At least one paid event is linked',
        'Source and financial summary exist',
        'Contribution confidence improves',
      ],
    },
    repair_data: {
      label: 'Repair data',
      goal: 'Fix missing evidence before acting on contribution recommendations.',
      reason: 'Missing data blocks reliable scoring, playbooks, or portfolio decisions.',
      risk: 'Acting on sparse evidence can create false positives.',
      actions: [
        {
          label: 'Open missing data',
          href: '/clients/contribution?view=missing',
          reason: 'Work through the evidence gaps.',
        },
        {
          label: 'Import history',
          href: '/import',
          reason: 'Repair source financial and event data.',
        },
      ],
      successCriteria: [
        'Missing data count drops',
        'Confidence is medium or high',
        'Recommended action is evidence-backed',
      ],
    },
    maintain: {
      label: 'Maintain',
      goal: 'Keep the client healthy without unnecessary intervention.',
      reason: 'Current contribution signals do not require a stronger playbook.',
      risk: 'Status can change if recency, margin, or payment evidence shifts.',
      actions: [
        {
          label: 'Review later',
          href: profileHref,
          reason: 'Keep the contribution state current.',
        },
      ],
      successCriteria: [
        'Review state is current',
        'No material risk signal appears',
        'Next normal touchpoint remains appropriate',
      ],
    },
  }
  const definition = definitions[kind]
  return {
    kind,
    ...definition,
    evidence: input.evidence.slice(0, 4),
  }
}

function buildPlaybookAssignment(input: {
  clientId: string
  clientName: string
  completedEventCount: number
  paidRevenueCents: number
  averageEventValueCents: number
  outstandingBalanceCents: number
  marginPercent: number | null
  churnRisk: ClientContributionSnapshot['churnRisk']
  fitScore: ClientContributionFitScore
  referralNetworkValue: ClientContributionReferralNetworkValue
  capacitySignal: ClientContributionCapacitySignal
  pricingRecommendation: ClientContributionPricingRecommendation
  expectationRisk: ClientContributionExpectationRisk
  missingData: ClientContributionMissingData[]
  operationalDrag: ClientContributionSnapshot['operationalDrag']
  evidence: ClientContributionEvidence[]
}): ClientContributionSnapshot['playbooks'] {
  const evidence = [
    ...input.evidence.map((item) => `${item.label}: ${item.value}`),
    input.marginPercent == null ? 'Margin unknown' : `${input.marginPercent}% margin`,
    `${input.fitScore.label}`,
    `${input.capacitySignal.label}`,
  ]
  const kinds: ClientContributionPlaybookKind[] = []
  const add = (kind: ClientContributionPlaybookKind) => {
    if (!kinds.includes(kind)) kinds.push(kind)
  }

  if (input.missingData.length >= 3) add('repair_data')
  if (input.completedEventCount === 0) add('build_history')
  if (input.outstandingBalanceCents > 0) add('require_deposit_or_minimum')
  if (input.expectationRisk.level === 'high') add('require_deposit_or_minimum')
  if (input.marginPercent != null && input.marginPercent < 25) add('raise_price_carefully')
  if (
    input.operationalDrag === 'high' ||
    input.fitScore.level === 'poor' ||
    input.capacitySignal.status === 'avoid_premium' ||
    input.expectationRisk.level === 'high'
  ) {
    add('stop_over_serving')
  }
  if (
    input.fitScore.level === 'poor' ||
    input.fitScore.negativeDrivers.length >= 2 ||
    input.expectationRisk.level === 'high'
  ) {
    add('repair_relationship')
  }
  if (input.churnRisk === 'high' && input.paidRevenueCents >= 250_000) add('reengage_high_value')
  if (input.referralNetworkValue.score >= 55) add('ask_for_referral')
  if (
    input.completedEventCount >= 2 &&
    input.churnRisk !== 'high' &&
    input.capacitySignal.status !== 'avoid_premium' &&
    input.pricingRecommendation.kind !== 'require_deposit'
  ) {
    add('convert_to_recurring')
  }
  if (
    input.paidRevenueCents >= 500_000 &&
    (input.fitScore.score ?? 0) >= 65 &&
    input.outstandingBalanceCents === 0
  ) {
    add('protect_vip')
  }
  if (kinds.length === 0) add('maintain')

  return {
    primary: buildPlaybook(kinds[0], {
      clientId: input.clientId,
      clientName: input.clientName,
      evidence,
    }),
    secondary: kinds.slice(1, 4).map((kind) =>
      buildPlaybook(kind, {
        clientId: input.clientId,
        clientName: input.clientName,
        evidence,
      })
    ),
  }
}

export function buildClientContributionSnapshot(
  input: ClientContributionInput,
  options: { now?: Date } = {}
): ClientContributionSnapshot {
  const events = input.eventFinancials ?? []
  const paidRevenueCents =
    events.length > 0
      ? events.reduce((sum, event) => sum + cents(event.totalPaidCents), 0)
      : cents(input.financials?.lifetimeValueCents)
  const expenseCents = events.reduce((sum, event) => sum + cents(event.totalExpensesCents), 0)
  const netProfitCents =
    events.length > 0
      ? events.reduce((sum, event) => sum + (Number(event.profitCents) || 0), 0)
      : paidRevenueCents
  const lifetimeRevenueCents = Math.max(
    cents(input.financials?.lifetimeValueCents),
    paidRevenueCents
  )
  const outstandingBalanceCents =
    events.length > 0
      ? events.reduce((sum, event) => sum + cents(event.outstandingBalanceCents), 0)
      : cents(input.financials?.outstandingBalanceCents)
  const completedEventCount = Math.max(
    0,
    Math.round(Number(input.financials?.totalEventsCompleted ?? 0))
  )
  const averageEventValueCents =
    completedEventCount > 0
      ? Math.round(paidRevenueCents / completedEventCount)
      : cents(input.financials?.averageSpendPerEvent)
  const lastEventDate =
    input.financials?.lastEventDate ??
    events
      .map((event) => event.eventDate)
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1) ??
    null
  const daysSinceLastEvent =
    input.financials?.daysSinceLastEvent ?? daysBetween(lastEventDate, options.now)
  const marginPercent =
    paidRevenueCents > 0 ? Math.round((netProfitCents / paidRevenueCents) * 100) : null
  const monthsObserved =
    input.createdAt != null
      ? Math.max(1, (daysBetween(input.createdAt, options.now) ?? 365) / 30.4)
      : 12
  const annualizedValueCents = Math.round((paidRevenueCents / monthsObserved) * 12)
  const churnRisk = getChurnRisk(daysSinceLastEvent, completedEventCount)
  const referralPotential = normalizeReferralPotential(input.referralPotential)
  const operationalDrag =
    outstandingBalanceCents > averageEventValueCents && outstandingBalanceCents > 0
      ? 'high'
      : marginPercent != null && marginPercent < 25
        ? 'medium'
        : completedEventCount > 0
          ? 'low'
          : 'unknown'
  const missingData = buildMissingData(input)

  const revenueScore = Math.min(35, paidRevenueCents / 50000)
  const profitScore =
    marginPercent == null ? 0 : Math.max(0, Math.min(25, (marginPercent / 60) * 25))
  const recencyScore =
    churnRisk === 'low' ? 15 : churnRisk === 'medium' ? 8 : churnRisk === 'high' ? 1 : 0
  const repeatScore = Math.min(15, completedEventCount * 3)
  const referralScore = referralPotential === 'high' ? 8 : referralPotential === 'medium' ? 4 : 0
  const dragPenalty =
    operationalDrag === 'high'
      ? 12
      : operationalDrag === 'medium'
        ? 6
        : outstandingBalanceCents > 0
          ? 4
          : 0
  const missingPenalty = Math.min(18, missingData.length * 4)
  const contributionScore = clampScore(
    revenueScore +
      profitScore +
      recencyScore +
      repeatScore +
      referralScore -
      dragPenalty -
      missingPenalty
  )
  const fitScore = buildFitScore({
    marginPercent,
    paidRevenueCents,
    completedEventCount,
    averageEventValueCents,
    outstandingBalanceCents,
    churnRisk,
    referralPotential,
    operationalDrag,
    missingData,
    relationshipSignals: input.relationshipSignals ?? null,
  })
  const marginLeaks = buildMarginLeaks({
    marginPercent,
    paidRevenueCents,
    outstandingBalanceCents,
    events,
    missingData,
  })
  const referralNetworkValue = buildReferralNetworkValue({
    referralPotential,
    paidRevenueCents,
    netProfitCents,
    completedEventCount,
    relationshipSignals: input.relationshipSignals ?? null,
  })
  const pricingRecommendation = buildPricingRecommendation({
    missingData,
    marginLeaks,
    fitScore,
    marginPercent,
    outstandingBalanceCents,
    averageEventValueCents,
    referralNetworkValue,
  })
  const portfolioCategory = buildPortfolioCategory({
    paidRevenueCents,
    contributionScore,
    churnRisk,
    fitScore,
    referralNetworkValue,
    missingData,
  })
  const computedTier = getContributionTier(contributionScore)
  const reviewState = input.reviewState ?? DEFAULT_REVIEW_STATE
  const tier = reviewState.tierOverride ?? computedTier
  const recommendedAction = recommendAction({
    score: contributionScore,
    completedEventCount,
    outstandingBalanceCents,
    marginPercent,
    churnRisk,
    referralPotential,
    missingData,
  })
  const confidenceScore = clampScore(100 - missingData.length * 14 - (events.length === 0 ? 12 : 0))
  const acquisitionSource = buildAcquisitionSource(input)
  const capacitySignal = buildCapacitySignal({
    snapshotBase: {
      clientId: input.clientId,
      paidRevenueCents,
      netProfitCents,
      averageEventValueCents,
      completedEventCount,
      marginPercent,
      outstandingBalanceCents,
      churnRisk,
      operationalDrag,
    },
    fitScore,
    recurringPricingModel: input.recurringPricingModel,
    preferredEventDays: input.preferredEventDays,
    preferredServiceStyle: input.preferredServiceStyle,
  })
  const communicationRoi = buildCommunicationRoi({
    snapshotBase: {
      clientId: input.clientId,
      paidRevenueCents,
      netProfitCents,
      annualizedValueCents,
      completedEventCount,
      outstandingBalanceCents,
      churnRisk,
      referralPotential,
    },
    automatedEmailsEnabled: input.automatedEmailsEnabled,
    communicationStyleNotes: input.communicationStyleNotes,
    relationshipSignals: input.relationshipSignals ?? null,
  })
  const seasonality = buildSeasonalityForecast({
    events,
    averageEventValueCents,
    annualizedValueCents,
    daysSinceLastEvent,
    now: options.now ?? new Date(),
  })
  const geographicContribution = buildGeographicContribution(events)
  const serviceFormats = buildServiceFormatPerformance(events)
  const expectationRisk = buildExpectationRisk({
    clientId: input.clientId,
    paidRevenueCents,
    outstandingBalanceCents,
    marginPercent,
    operationalDrag,
    relationshipSignals: input.relationshipSignals ?? null,
    communicationStyleNotes: input.communicationStyleNotes,
    events,
  })
  const evidence: ClientContributionEvidence[] = [
    {
      label: 'Paid revenue',
      value: formatMoney(paidRevenueCents),
      tone: paidRevenueCents > 0 ? 'positive' : 'neutral',
    },
    {
      label: 'Net profit',
      value: formatMoney(netProfitCents),
      tone: netProfitCents >= 0 ? 'positive' : 'negative',
    },
    {
      label: 'Margin',
      value: marginPercent == null ? 'Unknown' : `${marginPercent}%`,
      tone: marginPercent == null ? 'neutral' : marginPercent < 25 ? 'warning' : 'positive',
    },
    {
      label: 'Outstanding',
      value: formatMoney(outstandingBalanceCents),
      tone: outstandingBalanceCents > 0 ? 'warning' : 'positive',
    },
  ]
  const playbooks = buildPlaybookAssignment({
    clientId: input.clientId,
    clientName: input.clientName,
    completedEventCount,
    paidRevenueCents,
    averageEventValueCents,
    outstandingBalanceCents,
    marginPercent,
    churnRisk,
    fitScore,
    referralNetworkValue,
    capacitySignal,
    pricingRecommendation,
    expectationRisk,
    missingData,
    operationalDrag,
    evidence,
  })

  return {
    clientId: input.clientId,
    clientName: input.clientName,
    email: input.email ?? null,
    status: input.status ?? null,
    lifetimeRevenueCents,
    paidRevenueCents,
    expenseCents,
    netProfitCents,
    marginPercent,
    outstandingBalanceCents,
    completedEventCount,
    averageEventValueCents,
    annualizedValueCents,
    lastEventDate,
    daysSinceLastEvent,
    churnRisk,
    referralPotential,
    operationalDrag,
    contributionScore,
    fitScore,
    portfolioCategory,
    marginLeaks,
    pricingRecommendation,
    referralNetworkValue,
    acquisitionSource,
    capacitySignal,
    communicationRoi,
    seasonality,
    geographicContribution,
    serviceFormats,
    expectationRisk,
    playbooks,
    tier,
    computedTier,
    recommendedAction,
    evidence,
    missingData,
    dataConfidence: {
      score: confidenceScore,
      level: confidenceScore >= 78 ? 'high' : confidenceScore >= 50 ? 'medium' : 'low',
      reasons:
        missingData.length > 0
          ? missingData.map((item) => `Missing ${item.label.toLowerCase()}`)
          : ['Financial and event evidence available'],
    },
    reviewState,
  }
}

export function buildClientContributionPortfolio(snapshots: ClientContributionSnapshot[]) {
  const totalPaidRevenueCents = snapshots.reduce((sum, item) => sum + item.paidRevenueCents, 0)
  const totalNetProfitCents = snapshots.reduce((sum, item) => sum + item.netProfitCents, 0)
  const margins = snapshots
    .map((item) => item.marginPercent)
    .filter((margin): margin is number => margin != null)
  const sortedRevenue = [...snapshots].sort((a, b) => b.paidRevenueCents - a.paidRevenueCents)
  const topFiveRevenue = sortedRevenue
    .slice(0, 5)
    .reduce((sum, item) => sum + item.paidRevenueCents, 0)

  return {
    snapshots,
    summary: {
      clientCount: snapshots.length,
      totalLifetimeRevenueCents: snapshots.reduce(
        (sum, item) => sum + item.lifetimeRevenueCents,
        0
      ),
      totalPaidRevenueCents,
      totalNetProfitCents,
      totalOutstandingBalanceCents: snapshots.reduce(
        (sum, item) => sum + item.outstandingBalanceCents,
        0
      ),
      averageMarginPercent:
        margins.length > 0
          ? Math.round(margins.reduce((sum, margin) => sum + margin, 0) / margins.length)
          : null,
      topClientConcentrationPercent:
        totalPaidRevenueCents > 0 ? Math.round((topFiveRevenue / totalPaidRevenueCents) * 100) : 0,
      revenueAtRiskCents: snapshots
        .filter((item) => item.churnRisk === 'high')
        .reduce((sum, item) => sum + item.paidRevenueCents, 0),
      expectationRiskCount: snapshots.filter((item) => item.expectationRisk.level === 'high')
        .length,
      expectationRiskRevenueCents: snapshots
        .filter((item) => item.expectationRisk.level === 'high')
        .reduce((sum, item) => sum + item.paidRevenueCents, 0),
      highValueNeedsActionCount: snapshots.filter(
        (item) =>
          item.paidRevenueCents >= 500_000 &&
          !['maintain', 'protect_relationship'].includes(item.recommendedAction)
      ).length,
      missingDataCount: snapshots.filter((item) => item.missingData.length > 0).length,
      seasonalOpportunityCount: snapshots.filter((item) => item.seasonality.nextLikelyWindow)
        .length,
      geographicMarketCount: new Set(
        snapshots.flatMap((item) =>
          item.geographicContribution.markets
            .filter((market) => market.key !== 'unknown')
            .map((market) => market.key)
        )
      ).size,
      serviceFormatCount: new Set(
        snapshots.flatMap((item) =>
          item.serviceFormats.formats
            .filter((format) => format.key !== 'unknown')
            .map((format) => format.key)
        )
      ).size,
    },
  }
}
