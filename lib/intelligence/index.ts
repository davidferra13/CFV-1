// Intelligence Hub — Central index for all smart features
// All modules are deterministic (Formula > AI). Zero Ollama dependency.

export { getSeasonalDemandForecast } from './seasonal-demand'
export type { SeasonalDemandForecast, MonthlyDemandPattern, SeasonalPeak } from './seasonal-demand'

export { getRebookingPredictions } from './rebooking-predictions'
export type { RebookingInsights, RebookingPrediction } from './rebooking-predictions'

export { getCashFlowProjection } from './cashflow-projections'
export type { CashFlowProjection, MonthlyCashFlow } from './cashflow-projections'

export { getSchedulingIntelligence } from './smart-scheduling'
export type {
  SchedulingIntelligence,
  SchedulingSuggestion,
  DayOfWeekStats,
} from './smart-scheduling'

export { getInquiryTriage } from './inquiry-triage'
export type { InquiryTriageResult, TriagedInquiry } from './inquiry-triage'

export { getPostEventTriggers } from './post-event-triggers'
export type { PostEventTriggersResult, PostEventTask } from './post-event-triggers'

export { getPriceAnomalies } from './price-anomaly'
export type { PriceAnomalyResult, PriceAnomaly, PricingBenchmark } from './price-anomaly'

export { getDietaryIntelligence } from './dietary-trends'
export type {
  DietaryIntelligenceResult,
  DietaryTrend,
  CrossClientDietaryInsight,
} from './dietary-trends'

export { getIngredientConsolidation } from './ingredient-consolidation'
export type {
  IngredientConsolidationResult,
  ConsolidatedIngredient,
} from './ingredient-consolidation'

export { getNetworkIntelligence } from './network-referrals'
export type {
  NetworkIntelligenceResult,
  ReferralSourcePerformance,
  ClientReferralCandidate,
} from './network-referrals'

// ─── Tier 2 ──────────────────────────────────────────────────────────────────

export { estimatePrepTime, getPrepTimeIntelligence } from './prep-time-estimator'
export type { PrepTimeEstimate, PrepTimeIntelligence, PhaseAverage } from './prep-time-estimator'

export { getCommunicationCadence } from './client-communication-cadence'
export type {
  CommunicationCadenceResult,
  ClientCommunicationProfile,
} from './client-communication-cadence'

export { getVendorPriceIntelligence } from './vendor-price-tracking'
export type {
  VendorPriceIntelligence,
  VendorPriceTrend,
  VendorPriceAlert,
} from './vendor-price-tracking'

export { getEventProfitability } from './event-profitability'
export type {
  EventProfitabilityResult,
  EventProfitability,
  ProfitabilityByDimension,
} from './event-profitability'

export { getQuoteConfidence, getQuoteIntelligence } from './quote-confidence'
export type { QuoteConfidenceScore, QuoteConfidenceIntelligence } from './quote-confidence'

// ─── Tier 3 ──────────────────────────────────────────────────────────────────

export { getUntappedMarkets } from './untapped-markets'
export type { UntappedMarketsResult, UntappedOccasion, ServiceStyleGap } from './untapped-markets'

export { getGeographicIntelligence } from './geographic-hotspots'
export type {
  GeographicIntelligence,
  GeographicHotspot,
  TravelEfficiency,
} from './geographic-hotspots'

export { getRevenuePerGuest } from './revenue-per-guest'
export type {
  RevenuePerGuestResult,
  GuestRevenueByOccasion,
  OptimalGuestRange,
} from './revenue-per-guest'

export { getSeasonalMenuCorrelation } from './seasonal-menu-correlation'
export type {
  SeasonalMenuResult,
  SeasonalMenuPattern,
  DishSeasonalityScore,
} from './seasonal-menu-correlation'

export { getClientLifetimeJourneys } from './client-lifetime-journey'
export type { ClientLifetimeResult, ClientJourney, CohortAnalysis } from './client-lifetime-journey'

// ─── Tier 4 ──────────────────────────────────────────────────────────────────

export { getChurnPreventionTriggers } from './churn-prevention-triggers'
export type {
  ChurnPreventionResult,
  ChurnRiskClient,
  ChurnTrigger,
} from './churn-prevention-triggers'

export { getCapacityCeiling } from './capacity-ceiling'
export type { CapacityCeilingResult, CapacityBottleneck, WeeklyLoad } from './capacity-ceiling'

export { getPriceElasticity } from './price-elasticity'
export type { PriceElasticityResult, PriceBand, ElasticityByOccasion } from './price-elasticity'

export { getReferralChainMapping } from './referral-chain-mapping'
export type {
  ReferralChainResult,
  ReferralChain,
  ReferralSourceROI,
} from './referral-chain-mapping'

// ─── Cross-Engine Systems ─────────────────────────────────────────────────────

export { getBusinessHealthSummary } from './business-health-summary'
export type {
  BusinessHealthSummary,
  BusinessAlert,
  BusinessHealthScore,
} from './business-health-summary'

export { getProactiveAlerts } from './proactive-alerts'
export type { ProactiveAlertsResult, ProactiveAlert } from './proactive-alerts'

export { getSmartQuoteSuggestion } from './smart-quote-suggestions'
export type { QuotePricingSuggestion } from './smart-quote-suggestions'
