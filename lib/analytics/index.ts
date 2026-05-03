// Analytics module - public API

// benchmark-actions.ts ('use server')
export {
  computeBenchmarkSnapshot,
  getBenchmarkHistory,
  getConversionFunnel,
} from './benchmark-actions'
export type { BenchmarkSnapshot, ConversionFunnel } from './benchmark-actions'

// booking-score.ts ('use server')
export { getBookingScoreForInquiry, getBookingScoresForOpenInquiries } from './booking-score'
export type { BookingScoreBreakdown, BookingScore } from './booking-score'

// channel-actions.ts ('use server')
export { getChannelAnalytics, getSourceBreakdown } from './channel-actions'
export type {
  ChannelSourceStats,
  SourceOverTimeEntry,
  ChannelAnalyticsData,
  SourceBreakdownEntry,
} from './channel-actions'

// client-analytics.ts ('use server')
export {
  getClientRetentionStats,
  getClientChurnStats,
  getRevenueConcentration,
  getClientAcquisitionStats,
  getReferralConversionStats,
  getNpsStats,
} from './client-analytics'
export type {
  ClientRetentionStats,
  ClientChurnStats,
  RevenueConcentrationStats,
  ClientAcquisitionStats,
  ReferralConversionStats,
  WinbackStats,
  NpsStats,
} from './client-analytics'

// client-ltv-actions.ts ('use server')
export { computeCLV, getTopClientsByLTV, getRetentionCohort } from './client-ltv-actions'
export type { RetentionCohortRow } from './client-ltv-actions'

// client-ltv.ts ('use server')
export {
  calculateClientLTV,
  predictChurnRisk,
  getAllChurnPredictions,
  getAllClientLTV,
} from './client-ltv'
export type { ChurnRiskLevel, ChurnPrediction } from './client-ltv'
// Note: ClientLTV type exists in both client-ltv-actions.ts and client-ltv.ts

// collaboration-analytics.ts ('use server')
export { getCollaborationRevenueStats } from './collaboration-analytics'
export type { CollaborationRevenueStats } from './collaboration-analytics'

// conversion-tracking.ts ('use server')
export {
  getConversionFunnel as getConversionFunnelDetailed,
  getConversionBySource,
  getAverageTimeInStage,
  getConversionTrend,
  getLeadQualityBySource,
  getLostDealsAnalysis,
} from './conversion-tracking'
export type {
  DateRange as ConversionDateRange,
  FunnelStage,
  ConversionFunnelData,
  SourceConversionRow,
  StageTimingRow,
  MonthlyConversionRow,
  SourceQualityRow,
  LostDealRow,
  LostDealsAnalysis,
} from './conversion-tracking'

// cost-trends.ts ('use server')
export { getFoodCostTrend } from './cost-trends'
export type { FoodCostTrendMonth, FoodCostTrend } from './cost-trends'

// culinary-analytics.ts ('use server')
export {
  getRecipeUsageStats,
  getDishPerformanceStats,
  getIngredientCostStats,
  getMenuApprovalStats,
  getMostCommonDietaryRestrictions,
} from './culinary-analytics'
export type {
  RecipeUsageStats,
  DishPerformanceStats,
  IngredientCostStats,
  MenuApprovalStats,
} from './culinary-analytics'

// custom-report-enhanced-actions.ts ('use server')
export { getClientRetentionRate, getRevenueBySource } from './custom-report-enhanced-actions'
export type {
  ClientRetentionResult,
  RevenueBySourceEntry,
  RevenueBySourceResult,
} from './custom-report-enhanced-actions'

// custom-report.ts ('use server')
export { runCustomReport } from './custom-report'
export type {
  ReportEntity,
  ReportMetric,
  ChartType,
  ReportConfig,
  ReportDataPoint,
} from './custom-report'

// demand-forecast-actions.ts ('use server')
export { generateDemandForecast, getSeasonalHeatmap } from './demand-forecast-actions'
export type { DemandForecastMonth, SeasonalHeatmap } from './demand-forecast-actions'

// dietary-trends.ts ('use server')
export { getDietaryTrendsReport } from './dietary-trends'
export type {
  DietaryFrequency as DietaryTrendFrequency,
  AllergyFrequency,
  DietaryTrendPoint,
  DietaryTrendsReport,
} from './dietary-trends'

// insights-actions.ts
export {
  getDinnerTimeDistribution,
  getOccasionStats,
  getServiceStyleDistribution,
  getGuestCountDistribution,
  getDietaryRestrictionFrequency,
  getMonthlyEventVolume,
  getDayOfWeekDistribution,
  getMonthlyRevenueTrend,
  getClientAcquisitionStats as getInsightAcquisitionStats,
  getRetentionStats,
  getClientLTVDistribution,
  getPhaseTimeStats,
  getAARRatingTrends,
  getFinancialIntelligenceStats,
  getTakeAChefROI,
} from './insights-actions'
export type {
  DinnerTimeSlot,
  OccasionStat,
  ServiceStyleStat,
  GuestCountBucket,
  DietaryFrequency,
  MonthlyVolume,
  DayOfWeekStat,
  RevenueTrendPoint,
  ClientAcquisitionStats as InsightAcquisitionStats,
  RetentionStats,
  LTVBucket,
  PhaseTimeStats,
  AARTrends,
  FinancialIntelligence,
  TakeAChefROI,
} from './insights-actions'

// marketing-analytics.ts ('use server')
export {
  getCampaignEmailStats,
  getMarketingSpendByChannel,
  getCostPerLeadByChannel,
  getReviewStats,
  getWebsiteStats,
} from './marketing-analytics'
export type {
  CampaignEmailStats,
  MarketingSpendByChannel,
  CostPerLeadByChannel,
  ReviewStats,
  WebsiteStatsLatest,
} from './marketing-analytics'

// marketing-spend-actions.ts ('use server')
export {
  getMarketingSpend,
  logMarketingSpend,
  deleteMarketingSpend,
} from './marketing-spend-actions'

// marketing-spend-constants.ts
export { CHANNEL_LABELS } from './marketing-spend-constants'
export type { MarketingSpendEntry, MarketingSpendChannel } from './marketing-spend-constants'

// menu-engineering.ts ('use server')
export { computeMenuEngineering } from './menu-engineering'
export type {
  Quadrant,
  MenuEngineeringItem,
  MenuEngineeringResult as MenuEngineeringAnalysis,
} from './menu-engineering'

// menu-recommendations.ts ('use server')
export { getMenuRecommendations } from './menu-recommendations'
export type { RecipeHint, MenuRecommendationResult } from './menu-recommendations'

// operations-analytics.ts ('use server')
export {
  getComplianceStats,
  getTimePhaseStats,
  getWasteStats,
  getCulinaryOperationsStats,
  getEffectiveHourlyRateByMonth,
} from './operations-analytics'
export type {
  ComplianceStats,
  TimePhaseStats,
  WasteStats,
  CulinaryOperationsStats,
  EffectiveHourlyRateByMonth,
} from './operations-analytics'

// pipeline-analytics.ts ('use server')
export {
  getInquiryFunnelStats,
  getQuoteAcceptanceStats,
  getGhostRateStats,
  getLeadTimeStats,
  getDeclineReasonStats,
  getNegotiationStats,
  getAvgInquiryResponseTime,
} from './pipeline-analytics'
export type {
  InquiryFunnelStats,
  QuoteAcceptanceStats,
  GhostRateStats,
  LeadTimeStats,
  DeclineReasonStats,
  NegotiationStats,
  ResponseTimeStats as PipelineResponseTimeStats,
} from './pipeline-analytics'

// pipeline-forecast-actions.ts ('use server')
export { getPipelineRevenueForecast, getFunnelMetrics } from './pipeline-forecast-actions'
export type {
  PipelineStage,
  PipelineRevenueForecast,
  FunnelStageMetric,
  FunnelMetrics,
} from './pipeline-forecast-actions'

// platform-sla.ts ('use server')
export { getInquiryUrgenciesWithSLA, getPlatformSLAStats } from './platform-sla'
export type { InquiryUrgencyWithSLA, PlatformSLAStat } from './platform-sla'

// posthog.ts
export {
  ANALYTICS_EVENTS,
  trackEvent,
  identifyUser,
  resetAnalytics,
  trackPageView,
} from './posthog'
export type { AnalyticsEvent } from './posthog'

// price-anomaly.ts
export { detectPriceAnomalies } from './price-anomaly'
export type { PriceAnomaly, PriceAnomalyReport } from './price-anomaly'

// pricing-suggestions.ts ('use server')
export { getPricingSuggestion } from './pricing-suggestions'
export type { PricingSuggestion } from './pricing-suggestions'

// quote-insights.ts ('use server')
export { getQuoteAcceptanceInsights } from './quote-insights'
export type { ExpiringQuote, PricingModelStat, QuoteAcceptanceInsights } from './quote-insights'

// referral-analytics.ts ('use server')
export {
  getReferralFunnelData,
  getClientAcquisitionBySource,
  getTopReferrers,
  getReferralTimeSeries,
  getReferralAnalytics,
} from './referral-analytics'
export type {
  ReferralSourceSummary,
  ClientAcquisitionBySource,
  TopReferrer,
  ReferralTimeSeries,
  ReferralAnalyticsData,
} from './referral-analytics'

// response-time-actions.ts ('use server')
export { getInquiryUrgencies, getResponseTimeSummary } from './response-time-actions'
export type { InquiryUrgency, ResponseTimeSummary } from './response-time-actions'

// restaurant-metrics-actions.ts ('use server')
export {
  getDailyRestaurantSnapshot,
  getRestaurantSnapshotRange,
  getRegisterFoodCost,
} from './restaurant-metrics-actions'

// restaurant-metrics.ts
export { computeRestaurantSnapshot, computeRegisterFoodCost } from './restaurant-metrics'
export type { DailyRestaurantSnapshot, RegisterFoodCostResult } from './restaurant-metrics'

// revenue-analytics.ts ('use server')
export {
  getRevenuePerUnitStats,
  getRevenueByDayOfWeek,
  getRevenueByEventType,
  getRevenueBySeason,
  getTrueLaborCostStats,
  getCapacityStats,
  getCarryForwardStats,
  getBreakEvenStats,
} from './revenue-analytics'
export type {
  RevenuePerUnitStats,
  RevenueByDayOfWeek,
  RevenueByEventType,
  RevenueBySeason,
  TrueLaborCostStats,
  CapacityStats,
  CarryForwardStats,
  BreakEvenStats,
} from './revenue-analytics'

// revenue-engine.ts
export {
  solveRevenueClosure,
  computeDashboardKPIs,
  computeRevenueByMonth,
  computeTopClients,
  computeSeasonalPerformance,
  exportToCSV,
  defaultRange,
  yearRange,
} from './revenue-engine'
export type {
  DateRange,
  MetricResult,
  DashboardKPIs,
  RevenueByPeriod,
  TopClient,
  SeasonalMonth,
  RevenueStrategy,
} from './revenue-engine'

// revenue-forecast.ts ('use server')
export { getRevenueForecast } from './revenue-forecast'
export type { MonthlyRevenue, RevenueForecast } from './revenue-forecast'

// seasonality.ts ('use server')
export { getBookingSeasonality, getHolidayYearOverYear } from './seasonality'
export type {
  MonthSeasonality,
  UpcomingSeasonSignal,
  BookingSeasonality,
  HolidayYearStat,
  HolidayYoYRow,
} from './seasonality'

// social-analytics.ts ('use server')
export {
  getSocialConnectionStatuses,
  getLatestSocialSnapshot,
  getSocialGrowthTrend,
  getFollowerGrowthRate,
  getGoogleReviewStats,
  getExternalReviewSummary,
} from './social-analytics'
export type {
  SocialPlatformSnapshot,
  SocialGrowthTrend,
  SocialConnectionStatus,
  GoogleReviewStats,
  ExternalReviewSummary,
} from './social-analytics'

// source-provenance.ts
export {
  resolveAiDerivedOutputModelMetadata,
  createDerivedOutputProvenance,
  attachDerivedOutputProvenance,
  deriveProvenance,
} from './source-provenance'
export type {
  ProvenanceLaneKey,
  SourceProvenance,
  DerivedOutputDerivationMethod,
  DerivedOutputFreshnessStatus,
  DerivedOutputSourceKind,
  DerivedOutputSourceInput,
  DerivedOutputSource,
  DerivedOutputFreshness,
  DerivedOutputModelMetadata,
  DerivedOutputProvenance,
  CreateDerivedOutputProvenanceInput,
  InquiryProvenanceInput,
} from './source-provenance'

// stage-conversion.ts ('use server')
export { getStageConversionData } from './stage-conversion'
export type {
  PipelineStage as ConversionPipelineStage,
  StageConversionData,
} from './stage-conversion'

// year-over-year.ts ('use server')
export { getYoYData } from './year-over-year'
export type { YoYMetric, YoYData } from './year-over-year'
