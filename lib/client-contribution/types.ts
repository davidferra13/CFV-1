export type ClientContributionTier = 'strategic' | 'growth' | 'steady' | 'repair' | 'unknown'

export type ClientContributionReviewStatus = 'needs_review' | 'reviewed' | 'dismissed' | 'pinned'

export type ClientContributionRecommendedAction =
  | 'protect_relationship'
  | 'collect_balance'
  | 'review_pricing'
  | 'repair_data'
  | 'reengage'
  | 'nurture_referrals'
  | 'build_history'
  | 'maintain'

export type ClientContributionConfidenceLevel = 'high' | 'medium' | 'low'

export type ClientContributionFitLevel = 'excellent' | 'good' | 'mixed' | 'poor' | 'unknown'

export type ClientBusinessGoalKey =
  | 'maximize_profit'
  | 'build_recurring_revenue'
  | 'reduce_travel'
  | 'grow_corporate'
  | 'protect_weekends'
  | 'increase_referrals'
  | 'reduce_admin_burden'

export type ClientContributionPortfolioCategory =
  | 'high_value_healthy'
  | 'high_value_at_risk'
  | 'low_value_high_effort'
  | 'new_promising'
  | 'sparse_data'

export type ClientContributionPricingRecommendationKind =
  | 'hold_price'
  | 'raise_price'
  | 'require_deposit'
  | 'add_travel_fee'
  | 'require_minimum_spend'
  | 'offer_package'
  | 'stop_discounting'
  | 'insufficient_data'

export type ClientContributionMarginLeakType =
  | 'low_margin'
  | 'missing_expenses'
  | 'outstanding_add_on'
  | 'travel_heavy'
  | 'low_gratuity_high_service'

export type ClientContributionInput = {
  clientId: string
  clientName: string
  email?: string | null
  status?: string | null
  acquisitionSource?: string | null
  acquisitionSourceDetail?: string | null
  partnerName?: string | null
  preferredEventDays?: string[] | null
  preferredServiceStyle?: string | null
  automatedEmailsEnabled?: boolean | null
  communicationStyleNotes?: string | null
  communicationPreference?: unknown
  referredByClientId?: string | null
  dinnerCircleGroupId?: string | null
  recurringPricingModel?: string | null
  referralPotential?: string | null
  hasInternalAssessment?: boolean
  createdAt?: string | null
  relationshipSignals?: {
    redFlags?: string | null
    paymentBehavior?: string | null
    complaintHandlingNotes?: string | null
    tippingPattern?: string | null
    wowFactors?: string | null
    acquisitionCostCents?: number | null
  } | null
  financials?: {
    lifetimeValueCents?: number | null
    totalEventsCompleted?: number | null
    averageSpendPerEvent?: number | null
    outstandingBalanceCents?: number | null
    lastEventDate?: string | null
    daysSinceLastEvent?: number | null
    isDormant?: boolean | null
  } | null
  eventFinancials?: Array<{
    eventId: string
    eventDate?: string | null
    status?: string | null
    serviceStyle?: string | null
    occasion?: string | null
    guestCount?: number | null
    locationCity?: string | null
    locationState?: string | null
    quotedPriceCents?: number | null
    totalPaidCents?: number | null
    totalExpensesCents?: number | null
    netRevenueCents?: number | null
    profitCents?: number | null
    profitMargin?: number | null
    outstandingBalanceCents?: number | null
  }>
  reviewState?: ClientContributionReviewState | null
}

export type ClientContributionReviewState = {
  status: ClientContributionReviewStatus
  reviewedAt: string | null
  dismissedAt: string | null
  dismissReason: string | null
  pinned: boolean
  tierOverride: ClientContributionTier | null
  nextReviewDate: string | null
  note: string | null
}

export type ClientContributionEvidence = {
  label: string
  value: string
  tone: 'positive' | 'warning' | 'negative' | 'neutral'
}

export type ClientContributionMissingData = {
  key: string
  label: string
  repairHref: string
}

export type ClientContributionFitScore = {
  score: number | null
  level: ClientContributionFitLevel
  label: string
  positiveDrivers: ClientContributionEvidence[]
  negativeDrivers: ClientContributionEvidence[]
}

export type ClientContributionMarginLeak = {
  type: ClientContributionMarginLeakType
  label: string
  severity: 'warning' | 'critical'
  estimatedImpactCents: number
  affectedEventCount: number
  actionLabel: string
  actionHref: string
  evidence: string
}

export type ClientContributionPricingRecommendation = {
  kind: ClientContributionPricingRecommendationKind
  label: string
  riskLevel: 'low' | 'medium' | 'high'
  riskLabel: string
  href: string
  evidence: string[]
}

export type ClientContributionReferralNetworkValue = {
  score: number
  directReferralValueCents: number
  attributedReferralCount: number
  impactLabel: string
  recommendedAction: 'ask_for_referral' | 'thank_referrer' | 'nurture_network' | 'no_action'
  evidence: string[]
}

export type ClientContributionAcquisitionSource = {
  key: string
  label: string
  detail: string | null
  known: boolean
}

export type ClientContributionCapacitySignal = {
  score: number
  status:
    | 'premium_candidate'
    | 'price_before_premium'
    | 'standard_fit'
    | 'avoid_premium'
    | 'unknown'
  label: string
  evidence: string[]
  suggestedAction: string
  href: string
}

export type ClientContributionCommunicationRoiSignal = {
  touchType:
    | 'follow_up'
    | 'thank_you'
    | 'referral_ask'
    | 'rebooking'
    | 'birthday'
    | 'manual_relationship'
    | 'insufficient_data'
  label: string
  revenueAfterTouchCents: number
  profitAfterTouchCents: number
  conversionCount: number
  confidence: ClientContributionConfidenceLevel
  evidence: string[]
  href: string
}

export type ClientContributionSeasonalityMonth = {
  month: number
  label: string
  eventCount: number
  revenueCents: number
  profitCents: number
}

export type ClientContributionSeasonalityForecast = {
  confidence: ClientContributionConfidenceLevel
  label: string
  monthsObserved: number
  strongestMonths: ClientContributionSeasonalityMonth[]
  strongestQuarters: Array<{
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
    label: string
    eventCount: number
    revenueCents: number
  }>
  nextLikelyWindow: {
    month: number
    label: string
    dueInDays: number
    expectedValueCents: number
    confidence: ClientContributionConfidenceLevel
  } | null
  dormantSeasonalRisk: boolean
  evidence: string[]
}

export type ClientContributionGeographicMarket = {
  key: string
  label: string
  eventCount: number
  revenueCents: number
  profitCents: number
  averageMarginPercent: number | null
  confidence: ClientContributionConfidenceLevel
}

export type ClientContributionGeographicContribution = {
  primaryMarket: ClientContributionGeographicMarket | null
  markets: ClientContributionGeographicMarket[]
  unknownEventCount: number
}

export type ClientContributionServiceFormatPerformance = {
  key: string
  label: string
  eventCount: number
  guestCount: number
  revenueCents: number
  profitCents: number
  averageEventValueCents: number
  averageProfitCents: number
  marginPercent: number | null
  confidence: ClientContributionConfidenceLevel
  recommendation: 'scale' | 'price_review' | 'watch' | 'repair_data'
  evidence: string[]
}

export type ClientContributionExpectationRiskLevel = 'low' | 'medium' | 'high' | 'unknown'

export type ClientContributionExpectationRiskMitigation = {
  label: string
  href: string
  reason: string
}

export type ClientContributionExpectationRisk = {
  score: number
  level: ClientContributionExpectationRiskLevel
  label: string
  evidence: ClientContributionEvidence[]
  mitigations: ClientContributionExpectationRiskMitigation[]
  chefOnly: true
}

export type ClientContributionPlaybookKind =
  | 'protect_vip'
  | 'reengage_high_value'
  | 'raise_price_carefully'
  | 'ask_for_referral'
  | 'convert_to_recurring'
  | 'repair_relationship'
  | 'stop_over_serving'
  | 'require_deposit_or_minimum'
  | 'build_history'
  | 'repair_data'
  | 'maintain'

export type ClientContributionPlaybookAction = {
  label: string
  href: string
  reason: string
}

export type ClientContributionPlaybook = {
  kind: ClientContributionPlaybookKind
  label: string
  goal: string
  reason: string
  risk: string
  evidence: string[]
  actions: ClientContributionPlaybookAction[]
  successCriteria: string[]
}

export type ClientContributionPlaybookAssignment = {
  primary: ClientContributionPlaybook
  secondary: ClientContributionPlaybook[]
}

export type ClientContributionSnapshot = {
  clientId: string
  clientName: string
  email: string | null
  status: string | null
  lifetimeRevenueCents: number
  paidRevenueCents: number
  expenseCents: number
  netProfitCents: number
  marginPercent: number | null
  outstandingBalanceCents: number
  completedEventCount: number
  averageEventValueCents: number
  annualizedValueCents: number
  lastEventDate: string | null
  daysSinceLastEvent: number | null
  churnRisk: 'low' | 'medium' | 'high' | 'unknown'
  referralPotential: 'low' | 'medium' | 'high' | 'unknown'
  operationalDrag: 'low' | 'medium' | 'high' | 'unknown'
  contributionScore: number
  fitScore: ClientContributionFitScore
  portfolioCategory: {
    key: ClientContributionPortfolioCategory
    label: string
    evidence: string
  }
  marginLeaks: ClientContributionMarginLeak[]
  pricingRecommendation: ClientContributionPricingRecommendation
  referralNetworkValue: ClientContributionReferralNetworkValue
  acquisitionSource: ClientContributionAcquisitionSource
  capacitySignal: ClientContributionCapacitySignal
  communicationRoi: ClientContributionCommunicationRoiSignal
  seasonality: ClientContributionSeasonalityForecast
  geographicContribution: ClientContributionGeographicContribution
  serviceFormats: {
    primaryFormat: ClientContributionServiceFormatPerformance | null
    bestMarginFormat: ClientContributionServiceFormatPerformance | null
    worstMarginFormat: ClientContributionServiceFormatPerformance | null
    formats: ClientContributionServiceFormatPerformance[]
    unknownEventCount: number
  }
  expectationRisk: ClientContributionExpectationRisk
  playbooks: ClientContributionPlaybookAssignment
  tier: ClientContributionTier
  computedTier: ClientContributionTier
  recommendedAction: ClientContributionRecommendedAction
  evidence: ClientContributionEvidence[]
  missingData: ClientContributionMissingData[]
  dataConfidence: {
    level: ClientContributionConfidenceLevel
    score: number
    reasons: string[]
  }
  reviewState: ClientContributionReviewState
}

export type ClientContributionPortfolio = {
  snapshots: ClientContributionSnapshot[]
  summary: {
    clientCount: number
    totalLifetimeRevenueCents: number
    totalPaidRevenueCents: number
    totalNetProfitCents: number
    totalOutstandingBalanceCents: number
    averageMarginPercent: number | null
    topClientConcentrationPercent: number
    revenueAtRiskCents: number
    expectationRiskCount: number
    expectationRiskRevenueCents: number
    highValueNeedsActionCount: number
    missingDataCount: number
    seasonalOpportunityCount: number
    geographicMarketCount: number
    serviceFormatCount: number
  }
}

export type ClientContributionOpportunityWindow = '30' | '60' | '90'

export type ClientContributionOpportunity = {
  id: string
  clientId: string
  clientName: string
  window: ClientContributionOpportunityWindow
  action: ClientContributionRecommendedAction
  actionLabel: string
  reason: string
  expectedValueCents: number
  urgency: 'critical' | 'high' | 'normal'
  dueDate: string
  href: string
  evidence: string[]
  reviewed: boolean
}

export type ClientContributionTimelineMilestone = {
  id: string
  label: string
  dateLabel: string
  tone: 'positive' | 'warning' | 'negative' | 'neutral'
  value?: string
  description: string
}

export type ClientDependencySimulation = {
  clientId: string
  clientName: string
  annualRevenueLossCents: number
  annualProfitLossCents: number
  monthlyCashFlowGapCents: number
  portfolioRevenueSharePercent: number
  replacementClientCount: number
  averagePortfolioClientValueCents: number
  confidence: ClientContributionConfidenceLevel
  assumptions: string[]
  mitigationActions: Array<{
    label: string
    href: string
    reason: string
  }>
}

export type ClientRevenueConcentration = {
  clientCount: number
  topOneSharePercent: number
  topThreeSharePercent: number
  topFiveSharePercent: number
  topOneProfitSharePercent: number
  revenueAtRiskCents: number
  profitAtRiskCents: number
  monthlyRevenueGapCents: number
  replacementClientCount: number
  riskLevel: 'healthy' | 'watch' | 'high' | 'unknown'
  recommendedResponse: string
  topClients: Array<{
    clientId: string
    clientName: string
    revenueCents: number
    profitCents: number
    revenueSharePercent: number
    href: string
  }>
}

export type ClientContributionBusinessBriefing = {
  generatedAt: string
  uncertainty: string[]
  topRisks: Array<{ label: string; evidence: string; href: string }>
  opportunities: Array<{ label: string; evidence: string; href: string }>
  contactToday: Array<{ clientId: string; clientName: string; reason: string; href: string }>
  pricingConsiderations: Array<{
    clientId: string
    clientName: string
    recommendation: string
    href: string
  }>
  protectedClients: Array<{ clientId: string; clientName: string; reason: string; href: string }>
  businessDrags: Array<{ clientId: string; clientName: string; reason: string; href: string }>
}

export type ClientBusinessGoalAlignment = {
  goal: ClientBusinessGoalKey
  label: string
  description: string
  rankedClients: Array<{
    clientId: string
    clientName: string
    score: number
    contributionScore: number
    explanation: string
    href: string
  }>
  conflicts: Array<{
    clientId: string
    clientName: string
    score: number
    reason: string
    href: string
  }>
  suggestedActions: Array<{ label: string; evidence: string; href: string }>
}

export type ClientAcquisitionSourceRoi = {
  sourceKey: string
  sourceLabel: string
  known: boolean
  clientCount: number
  paidRevenueCents: number
  netProfitCents: number
  averageMarginPercent: number | null
  retentionRatePercent: number
  averageFitScore: number | null
  atRiskRatePercent: number
  confidence: ClientContributionConfidenceLevel
  evidence: string[]
  repairHref: string
  topClients: Array<{ clientId: string; clientName: string; href: string }>
}

export type ClientCapacityAllocationPlan = {
  premiumCandidates: ClientContributionSnapshot[]
  priceBeforePremium: ClientContributionSnapshot[]
  avoidPremium: ClientContributionSnapshot[]
  openCapacityRisks: Array<{ label: string; evidence: string; href: string }>
}

export type ClientCommunicationRoiSummary = {
  touchType: ClientContributionCommunicationRoiSignal['touchType']
  label: string
  clientCount: number
  conversionCount: number
  revenueAfterTouchCents: number
  profitAfterTouchCents: number
  confidence: ClientContributionConfidenceLevel
  evidence: string[]
  href: string
}

export type ClientSeasonalityPortfolioForecast = {
  generatedAt: string
  upcoming: Array<{
    clientId: string
    clientName: string
    monthLabel: string
    dueInDays: number
    expectedValueCents: number
    confidence: ClientContributionConfidenceLevel
    href: string
    evidence: string
  }>
  weakMonths: Array<{
    month: number
    label: string
    historicalEventCount: number
    dueClientCount: number
    expectedValueCents: number
    reason: string
  }>
}

export type ClientContributionSegment = {
  key: string
  label: string
  description: string
  clientCount: number
  paidRevenueCents: number
  netProfitCents: number
  averageScore: number | null
  href: string
  clients: Array<{
    clientId: string
    clientName: string
    reason: string
    href: string
  }>
}

export type ClientGeographicProfitabilityGroup = {
  key: string
  label: string
  eventCount: number
  clientCount: number
  paidRevenueCents: number
  netProfitCents: number
  averageMarginPercent: number | null
  confidence: ClientContributionConfidenceLevel
  href: string
  topClients: Array<{
    clientId: string
    clientName: string
    paidRevenueCents: number
    href: string
  }>
}

export type ClientServiceFormatProfitabilityGroup = {
  key: string
  label: string
  clientCount: number
  eventCount: number
  paidRevenueCents: number
  netProfitCents: number
  averageMarginPercent: number | null
  repeatClientRatePercent: number
  confidence: ClientContributionConfidenceLevel
  recommendation: 'scale' | 'price_review' | 'watch' | 'repair_data'
  href: string
  topClients: Array<{
    clientId: string
    clientName: string
    paidRevenueCents: number
    href: string
  }>
}
