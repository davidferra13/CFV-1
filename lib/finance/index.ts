// Finance module - public API

// 1099-actions ('use server')
export { generate1099NECReports, get1099NECFilingSummary, export1099NECToCSV } from './1099-actions'
export type { Form1099NEC, FilingSummary } from './1099-actions'

// bank-feed-actions ('use server')
export {
  connectBankAccount,
  disconnectBankAccount,
  getBankConnections,
  getBankTransactions,
  confirmTransaction,
  ignoreTransaction,
  addManualTransaction,
  getReconciliationSummary,
} from './bank-feed-actions'
export type { BankConnection, BankTransaction, ReconciliationSummary } from './bank-feed-actions'

// break-even-actions ('use server')
export {
  calculateBreakEven,
  getBreakEvenScenarios,
  getMonthlyFixedCostEstimate,
} from './break-even-actions'
export type {
  BreakEvenStatus,
  BreakEvenResult,
  BreakEvenScenario,
  FixedCostEstimate,
} from './break-even-actions'

// cash-flow-actions ('use server')
export { getCashFlowForecast, getWhatIfScenario } from './cash-flow-actions'
export type { CashFlowPeriod, CashFlowForecast, WhatIfScenario } from './cash-flow-actions'

// cash-flow-calendar ('use server')
export { getCashFlowCalendar } from './cash-flow-calendar'
export type { CashFlowDay, CashFlowCalendarData } from './cash-flow-calendar'

// catering-bid-actions ('use server')
export {
  generateCateringBid,
  getRecipeCostEstimate,
  saveBidAsQuote,
  getBidHistory,
  searchRecipesForBid,
} from './catering-bid-actions'
export type {
  BidCourseInput,
  GenerateBidParams,
  RecipeBreakdown,
  BidResult,
} from './catering-bid-actions'

// chargeback-actions ('use server')
export { getChargebackRate } from './chargeback-actions'

// chargeback-rate
export { computeChargebackRate } from './chargeback-rate'
export type { ChargebackRate } from './chargeback-rate'

// chef-tax-config-actions ('use server')
export {
  getChefTaxRates,
  getChefTaxRateForState,
  updateChefTaxRate,
  deleteChefTaxRate,
  resolveEffectiveTaxRate,
  resolveAllEffectiveTaxRates,
} from './chef-tax-config-actions'
export type { ChefTaxConfig, ResolvedTaxRate } from './chef-tax-config-actions'

// client-spending-insights ('use server')
export { getClientSpendingInsights } from './client-spending-insights'
export type { ClientSpendingInsights } from './client-spending-insights'

// concentration-actions ('use server')
export { getConcentrationRisk } from './concentration-actions'

// concentration-risk
export { computeConcentrationRisk } from './concentration-risk'
export type { ConcentrationRisk } from './concentration-risk'

// contractor-actions ('use server')
export {
  recordContractorPayment,
  getContractorPayments,
  get1099Summary,
  export1099Data,
  saveW9Data,
} from './contractor-actions'
export type { ContractorPayment, Contractor1099Summary } from './contractor-actions'

// cpa-export-actions ('use server')
export {
  buildCpaExportDataset,
  generateCpaExportPackage,
  getCpaExportReadiness,
} from './cpa-export-actions'
export type {
  CpaReadinessBlocker,
  CpaReadinessWarning,
  ScheduleCSummary,
  AccountingDetailRow,
  CpaExportManifest,
  CpaExportDataset,
} from './cpa-export-actions'

// deposit-actions ('use server')
export {
  calculateDeposit,
  recordDeposit,
  recordBalancePayment,
  getDepositSettings,
  updateDepositSettings,
  getOverdueDeposits,
} from './deposit-actions'
export type {
  DepositStatus,
  BalanceStatus,
  DepositPayment,
  DepositSummary,
  DepositSettings,
  OverdueDepositEvent,
} from './deposit-actions'

// dispute-actions ('use server')
export {
  getDisputes,
  createDispute,
  updateDisputeEvidence,
  resolveDispute,
} from './dispute-actions'
export type { PaymentDispute } from './dispute-actions'

// event-pricing-intelligence-actions ('use server')
export { getEventPricingIntelligence } from './event-pricing-intelligence-actions'
export type { EventPricingIntelligencePayload } from './event-pricing-intelligence-actions'

// event-pricing-intelligence
export {
  calculateSuggestedPriceFromFoodCost,
  calculateTargetFoodCostBudget,
  calculateProfitCents,
  calculateMarginPercent,
  calculateFoodCostPercent,
  calculateEstimatedActualVariance,
  calculateIngredientSpikePercent,
  isIngredientPriceSpike,
  resolveSuggestedEventPrice,
  generateEventPricingWarnings,
} from './event-pricing-intelligence'
export type {
  PricingConfidence,
  SuggestedPriceSource,
  EventPricingWarningSeverity,
  EventPricingWarningType,
  EventPricingWarning,
  SuggestedPriceResult,
  IngredientPriceSpikeSignal,
  WarningInput,
} from './event-pricing-intelligence'

// expense-actions ('use server')
export {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getMonthlyExpenseTrend,
  getEventExpenses,
  getDeductibleTotal,
} from './expense-actions'
export type {
  ExpenseCategory,
  Expense,
  ExpenseFilters,
  CreateExpenseInput,
  ExpenseSummary,
  MonthlyTrend,
} from './expense-actions'

// expense-import-actions ('use server')
export { importExpense, importExpenses } from './expense-import-actions'
export type { ExpenseImportInput, ExpenseImportResult } from './expense-import-actions'

// expense-line-item-actions ('use server')
export {
  createExpenseLineItems,
  getExpenseLineItems,
  getEventExpenseLineItems,
  matchLineItemToIngredient,
  suggestIngredientMatches,
  applyLineItemPrices,
  resolvePriceFlag,
  getEventCostVariance,
} from './expense-line-item-actions'
export type { ExpenseLineItem, IngredientMatch, EventActualCost } from './expense-line-item-actions'

// export-actions ('use server')
export {
  exportLedgerEntriesCSV,
  exportRevenueByMonthCSV,
  exportRevenueByClientCSV,
  exportExpensesCSV,
} from './export-actions'

// food-cost-actions ('use server')
export {
  getEventFoodCost,
  addGrocerySpend,
  updateGrocerySpend,
  deleteGrocerySpend,
  getIngredientCostEstimate,
  getFoodCostDashboardSummary,
} from './food-cost-actions'
export type {
  IngredientBreakdown,
  DishBreakdown,
  GroceryEntry,
  EventFoodCost,
} from './food-cost-actions'

// food-cost-calculator
export {
  calculateRecipeFoodCost,
  calculateRecipeFoodCostWithUnits,
  calculateFoodCostPercentage,
  getFoodCostRating,
  getFoodCostBadgeColor,
} from './food-cost-calculator'
export type { FoodCostRating, FoodCostRatingResult } from './food-cost-calculator'

// forecast-calculator
export {
  STAGE_WEIGHTS,
  STAGE_LABELS,
  weightByStage,
  calculateTrailingAverage,
  calculateSeasonalIndex,
  projectNextMonths,
  calculateRevenueVolatility,
  backtestSeasonalForecast,
  resolveForecastErrorRate,
  buildMonthlyForecastComposition,
  buildForecastConfidence,
  buildForecastExplainability,
} from './forecast-calculator'
export type {
  MonthlyDataPoint,
  ForecastCalibrationPoint,
  ForecastCalibration,
  ForecastConfidenceLevel,
  ForecastConfidence,
  ForecastDriver,
  ForecastExplainability,
  MonthlyForecastCompositionInput,
  MonthlyForecastComposition,
} from './forecast-calculator'

// grocery-price-actions ('use server')
export {
  addPriceEntry,
  bulkAddPrices,
  deletePriceEntry,
  getPriceHistory,
  getIngredientPriceStats,
  getFrequentIngredients,
  getPriceComparison,
  getStoreSummary,
} from './grocery-price-actions'
export type {
  PriceEntry,
  PriceEntryInput,
  PriceTrend,
  IngredientPriceStats,
  StoreSummary,
} from './grocery-price-actions'

// industry-benchmarks
export {
  FOOD_COST_BY_CUISINE,
  getFoodCostRatingByCuisine,
  YIELD_BY_CATEGORY,
  getYieldBenchmark,
  PORTIONS_BY_SERVICE_STYLE,
  WASTE_BY_OPERATION,
  getCuisineOptions,
  getServiceStyleOptions,
} from './industry-benchmarks'
export type {
  CuisineBenchmark,
  YieldBenchmark,
  ServiceStyleBenchmark,
  WasteBenchmark,
} from './industry-benchmarks'

// invoice-payment-link-actions ('use server')
export {
  generateHostedInvoicePaymentLink,
  listInvoicePaymentStatusSummaries,
} from './invoice-payment-link-actions'
export type { InvoicePaymentStatusSummary } from './invoice-payment-link-actions'

// margin-calculator ('use server')
export {
  getEventMargin,
  getClientLifetimeMargin,
  getMonthlyMargins,
  getProfitDashboard,
} from './margin-calculator'
export type {
  EventMargin,
  ClientLifetimeMargin,
  MonthlyMarginSummary,
  ProfitDashboardData,
} from './margin-calculator'

// mileage-actions ('use server')
export {
  addMileageLog,
  getMileageLogs,
  updateMileageLog,
  deleteMileageLog,
  getMileageSummary,
  getYtdMileageSummary,
  getMileageForEvent,
} from './mileage-actions'
export type {
  MileageEntry,
  MileagePurposeBreakdown,
  MileageMonthBreakdown,
  MileageSummary,
} from './mileage-actions'

// mileage-constants
export { MILEAGE_PURPOSE_LABELS } from './mileage-constants'
export type { MileagePurpose } from './mileage-constants'

// mileage-enhanced-actions ('use server')
export { logRoundTrip, getMileageByPurpose } from './mileage-enhanced-actions'
export type {
  MileageEntry as EnhancedMileageEntry,
  MileageByPurpose,
  MileageSummary as EnhancedMileageSummary,
  LogRoundTripInput,
} from './mileage-enhanced-actions'

// owner-draw-actions ('use server')
export { recordOwnerDraw, getOwnerDraws, deleteOwnerDraw } from './owner-draw-actions'
export type { OwnerDraw, RecordOwnerDrawInput } from './owner-draw-actions'

// payment-plan-actions ('use server')
export {
  getPaymentPlan,
  addInstallment,
  markInstallmentPaid,
  deleteInstallment,
} from './payment-plan-actions'
export type { PaymentPlanInstallment } from './payment-plan-actions'

// payment-reminder-actions ('use server')
export {
  getEventsWithOutstandingBalances,
  checkAndFirePaymentReminders,
} from './payment-reminder-actions'
export type { OutstandingBalanceEvent } from './payment-reminder-actions'

// payroll-actions ('use server')
export {
  listEmployees,
  createEmployee,
  updateEmployee,
  terminateEmployee,
  recordPayroll,
  getPayrollRecords,
  compute941Summary,
  save941Summary,
  mark941Filed,
  get941Summaries,
  generateW2Summaries,
  getW2Summaries,
  exportW2ToCSV,
} from './payroll-actions'
export type {
  Employee,
  PayrollRecord,
  Payroll941Summary,
  PayrollW2Summary,
} from './payroll-actions'

// payroll-constants
export {
  SS_TAX_RATE,
  MEDICARE_TAX_RATE,
  ADDITIONAL_MEDICARE_RATE,
  SS_WAGE_BASE_2025_CENTS,
  FUTA_RATE,
  FUTA_WAGE_BASE_CENTS,
  PAY_TYPE_LABELS,
  FILING_STATUS_LABELS,
  EMPLOYEE_STATUS_LABELS,
  QUARTER_LABELS,
  QUARTER_DUE_DATES,
  computePayrollTaxes,
} from './payroll-constants'

// plate-cost-actions ('use server')
export { getEventPlateCost, getPlateCostSummary } from './plate-cost-actions'
export type { EventPlateCostRow, PlateCostSummary } from './plate-cost-actions'

// plate-cost-calculator
export {
  groupExpensesByCategory,
  calculatePlateCostFromTotals,
  getMarginRating,
} from './plate-cost-calculator'
export type { PlateCostBreakdown, PlateCostResult, EventExpenseRow } from './plate-cost-calculator'

// pricing-insights-actions ('use server')
export { fetchPricingInsights } from './pricing-insights-actions'

// pricing-insights
export { getPricingInsights } from './pricing-insights'
export type { PricingInsightsParams, PricingInsights } from './pricing-insights'

// profit-loss-report-actions ('use server')
export { getProfitAndLossReport, getDefaultProfitLossWindow } from './profit-loss-report-actions'
export type { ProfitAndLossReportData } from './profit-loss-report-actions'

// recurring-invoice-actions ('use server')
export {
  createRecurringInvoice,
  updateRecurringInvoice,
  pauseRecurringInvoice,
  getRecurringInvoices,
  processRecurringInvoices,
} from './recurring-invoice-actions'
export type { RecurringInvoice } from './recurring-invoice-actions'

// revenue-forecast-actions ('use server')
export { getRevenueForecast, getRevenueComparison } from './revenue-forecast-actions'
export type { YoYComparison } from './revenue-forecast-actions'

// revenue-forecast-run
export { getRevenueForecastForTenant } from './revenue-forecast-run'
export type {
  MonthlyForecastEntry,
  QuarterlyForecast,
  PipelineStageBreakdown,
  PipelineValue,
  SeasonalEntry,
  ForecastWindowTotals,
  RevenueForecastPlanningRun,
  RevenueForecastActualsReconciliation,
  RevenueForecastActualsCalibration,
  RevenueForecast,
} from './revenue-forecast-run'

// sales-tax-actions ('use server')
export {
  getSalesTaxSettings,
  saveSalesTaxSettings,
  setEventSalesTax,
  getEventSalesTax,
  markEventSalesTaxRemitted,
  getSalesTaxSummary,
  recordSalesTaxRemittance,
  getSalesTaxRemittances,
  getUnremittedEventTax,
} from './sales-tax-actions'
export type {
  SalesTaxSettings,
  EventSalesTax,
  SalesTaxRemittance,
  SalesTaxSummary,
} from './sales-tax-actions'

// sales-tax-constants
export {
  COMMON_STATE_RATES_BPS,
  FILING_FREQUENCY_LABELS,
  bpsToPercent,
  computeTaxCents,
} from './sales-tax-constants'

// surface-availability ('use server')
export { getFinanceSurfaceAvailability } from './surface-availability'
export type { FinanceSurfaceState, FinanceSurfaceAvailability } from './surface-availability'

// tax-estimate-actions ('use server')
export {
  getQuarterlyEstimate,
  saveQuarterlyEstimate,
  recordQuarterlyPayment,
  getTaxSummaryForYear,
  exportTaxPackage,
} from './tax-estimate-actions'
export type {
  QuarterlyEstimate as TaxQuarterlyEstimate,
  TaxYearSummary,
} from './tax-estimate-actions'

// tax-package ('use server')
export { getYearEndTaxPackage } from './tax-package'
export type {
  ExpenseCategory as TaxExpenseCategory,
  QuarterlyEstimate as TaxPackageQuarterlyEstimate,
  MileageSummary as TaxMileageSummary,
  TaxPackage,
} from './tax-package'

// tax-prep-actions ('use server')
export {
  getScheduleCBreakdown,
  assignExpenseToTaxLine,
  getQuarterlyEstimates,
  updateQuarterlyPayment,
  getTaxPrepSummary,
} from './tax-prep-actions'
export type {
  ScheduleCLineItem,
  ScheduleCBreakdown,
  QuarterlyEstimateRow,
  TaxPrepSummary,
} from './tax-prep-actions'

// tax-prep-constants
export { SCHEDULE_C_LINES } from './tax-prep-constants'

// tip-actions ('use server')
export {
  getEventTips,
  getYtdTipSummary,
  addTip,
  deleteTip,
  createTipRequest,
  getTipRequests,
  getTipRequestByToken,
  recordTip,
  markTipRequestSent,
  getEventTipRequest,
  getTipSummary,
} from './tip-actions'
export type { TipEntry, TipRequestStatus, TipMethod, TipRequest } from './tip-actions'

// yoy-comparison-actions ('use server')
export {
  getYoyRevenue,
  getYoyEventCount,
  getYoyClientGrowth,
  getYoyAvgEventValue,
  getSeasonalTrends,
  getGrowthMetrics,
} from './yoy-comparison-actions'
export type {
  MonthlyComparison,
  YoyRevenueResult,
  YoyEventCountResult,
  ClientGrowthMonth,
  YoyClientGrowthResult,
  YoyAvgEventValueResult,
  SeasonalMonth,
  SeasonalTrendsResult,
  GrowthMetricsResult,
} from './yoy-comparison-actions'
