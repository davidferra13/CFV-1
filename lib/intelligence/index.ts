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
