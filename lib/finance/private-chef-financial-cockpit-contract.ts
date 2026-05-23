export const FINANCIAL_COCKPIT_SIGNAL_KINDS = [
  'cash_runway',
  'receivables',
  'overdue_risk',
  'tax_set_aside',
  'client_concentration',
  'margin_risk',
  'quote_implication',
  'seasonal_volatility',
  'known_obligation',
  'insurance_renewal',
  'debt_pressure',
] as const

export type FinancialCockpitSignalKind = (typeof FINANCIAL_COCKPIT_SIGNAL_KINDS)[number]

export const FINANCIAL_COCKPIT_RISK_STATES = [
  'healthy',
  'watch',
  'warning',
  'critical',
  'blocked',
  'unknown',
] as const

export type FinancialCockpitRiskState = (typeof FINANCIAL_COCKPIT_RISK_STATES)[number]

export const FINANCIAL_COCKPIT_RISK_RANK: Record<FinancialCockpitRiskState, number> = {
  healthy: 0,
  watch: 1,
  warning: 2,
  critical: 3,
  blocked: 4,
  unknown: 5,
}

export const FINANCIAL_COCKPIT_VISIBILITY_LEVELS = [
  'private_only',
  'chef_internal',
  'client_safe_summary',
  'never_publish',
] as const

export type FinancialCockpitVisibilityLevel = (typeof FINANCIAL_COCKPIT_VISIBILITY_LEVELS)[number]

export type FinancialCockpitConfidence = 'low' | 'medium' | 'high'

export type FinancialCockpitMissingInput =
  | 'cash_on_hand'
  | 'bank_balance'
  | 'receivable_due_dates'
  | 'expense_forecast'
  | 'tax_rate'
  | 'tax_year_income'
  | 'deductible_expenses'
  | 'client_revenue_history'
  | 'event_costs'
  | 'quote_costs'
  | 'deposit_terms'
  | 'insurance_renewal'
  | 'debt_obligation'
  | 'manual_stability_note'

export const FINANCIAL_COCKPIT_SOURCE_SYSTEMS = [
  'ledger_entries',
  'event_financial_summary',
  'invoices',
  'payment_plan_installments',
  'expenses',
  'tax_quarterly_estimates',
  'chef_tax_configs',
  'clients',
  'events',
  'quotes',
  'pricing_pie',
  'margin_snapshots',
  'revenue_forecast',
  'bank_feed_transactions',
  'chef_preferences',
  'manual_private_input',
  'derived',
] as const

export type FinancialCockpitSourceSystem = (typeof FINANCIAL_COCKPIT_SOURCE_SYSTEMS)[number]

export type FinancialCockpitSourceRef = {
  source:
    | 'manual_chef_input'
    | 'ledger'
    | 'event_financial_summary'
    | 'invoice'
    | 'payment_plan'
    | 'expense'
    | 'tax_estimate'
    | 'tax_config'
    | 'client'
    | 'event'
    | 'quote'
    | 'pricing_pie'
    | 'margin_snapshot'
    | 'revenue_forecast'
    | 'bank_feed'
    | 'chef_preference'
    | 'derived'
  table:
    | 'ledger_entries'
    | 'event_financial_summary'
    | 'events'
    | 'payment_plan_installments'
    | 'expenses'
    | 'expenses'
    | 'tax_quarterly_estimates'
    | 'chef_tax_configs'
    | 'clients'
    | 'quotes'
    | 'margin_snapshots'
    | 'bank_transactions'
    | 'chef_preferences'
    | 'derived'
  rowId: string | null
}

export type CashRunwayContract = {
  tenantId: string
  chefId: string
  asOfDate: string
  cashOnHandCents: number | null
  expectedReceivablesCents: number
  expectedExpensesCents: number
  taxSetAsideCents: number
  knownObligationsCents: number
  monthlyBurnCents: number | null
  runwayDays: number | null
  state: FinancialCockpitRiskState
  confidence: FinancialCockpitConfidence
  missingInputs: FinancialCockpitMissingInput[]
  sourceRefs: FinancialCockpitSourceRef[]
  visibility: 'private_only'
}

export type ReceivablesRiskContract = {
  tenantId: string
  asOfDate: string
  outstandingCents: number
  overdueCents: number
  unpaidInvoiceCount: number
  overdueInvoiceCount: number
  oldestDueDate: string | null
  paymentScheduleExposureCents: number
  state: FinancialCockpitRiskState
  confidence: FinancialCockpitConfidence
  missingInputs: FinancialCockpitMissingInput[]
  sourceRefs: FinancialCockpitSourceRef[]
  visibility: 'chef_internal'
}

export type TaxSetAsideEstimateContract = {
  tenantId: string
  chefId: string
  taxYear: number
  quarter: 1 | 2 | 3 | 4
  incomeCents: number
  deductibleExpenseCents: number
  estimatedSelfEmploymentTaxCents: number | null
  estimatedFederalTaxCents: number | null
  estimatedStateTaxCents: number | null
  recommendedSetAsideCents: number | null
  amountAlreadyPaidCents: number
  state: FinancialCockpitRiskState
  confidence: FinancialCockpitConfidence
  disclaimerRequired: true
  missingInputs: FinancialCockpitMissingInput[]
  sourceRefs: FinancialCockpitSourceRef[]
  visibility: 'private_only'
}

export type ClientConcentrationFinancialRiskContract = {
  tenantId: string
  asOfDate: string
  lookbackMonths: number
  topClientId: string | null
  topClientRevenuePercent: number | null
  herfindahlIndex: number | null
  concentratedRevenueCents: number
  state: FinancialCockpitRiskState
  confidence: FinancialCockpitConfidence
  missingInputs: FinancialCockpitMissingInput[]
  sourceRefs: FinancialCockpitSourceRef[]
  visibility: 'private_only'
}

export type MarginRiskSubjectType = 'portfolio' | 'client' | 'event' | 'quote'

export type MarginRiskContract = {
  tenantId: string
  subjectType: MarginRiskSubjectType
  subjectId: string | null
  revenueCents: number | null
  knownCostCents: number | null
  estimatedProfitCents: number | null
  marginPercent: number | null
  targetMarginPercent: number | null
  state: FinancialCockpitRiskState
  confidence: FinancialCockpitConfidence
  missingInputs: FinancialCockpitMissingInput[]
  sourceRefs: FinancialCockpitSourceRef[]
  visibility: 'chef_internal'
}

export type QuoteFinancialRecommendation =
  | 'accept'
  | 'raise_price'
  | 'require_deposit'
  | 'reduce_scope'
  | 'decline'
  | 'review'

export type QuoteFinancialImplicationContract = {
  tenantId: string
  quoteId: string
  clientId: string | null
  quotedRevenueCents: number
  requiredDepositCents: number | null
  expectedCostCents: number | null
  expectedMarginPercent: number | null
  estimatedRunwayDeltaDays: number | null
  recommendation: QuoteFinancialRecommendation
  state: FinancialCockpitRiskState
  privatePressureReasons: string[]
  clientSafeTerms: string[]
  confidence: FinancialCockpitConfidence
  missingInputs: FinancialCockpitMissingInput[]
  sourceRefs: FinancialCockpitSourceRef[]
  visibility: 'private_only'
}

export type ClientSafeQuoteFinancialSummary = {
  headline: string
  allowedTerms: string[]
  blockedPrivateReasonCount: number
  visibility: 'client_safe_summary'
}

export type PrivateChefFinancialCockpitContract = {
  tenantId: string
  chefId: string
  asOfDate: string
  runway: CashRunwayContract
  receivables: ReceivablesRiskContract
  taxSetAside: TaxSetAsideEstimateContract
  clientConcentration: ClientConcentrationFinancialRiskContract
  marginRisks: MarginRiskContract[]
  quoteImplications: QuoteFinancialImplicationContract[]
  overallState: FinancialCockpitRiskState
  missingInputs: FinancialCockpitMissingInput[]
  sourceRefs: FinancialCockpitSourceRef[]
  visibility: 'private_only'
}

const SOURCE_SYSTEMS_BY_SIGNAL: Record<FinancialCockpitSignalKind, FinancialCockpitSourceSystem[]> =
  {
    cash_runway: [
      'ledger_entries',
      'event_financial_summary',
      'expenses',
      'payment_plan_installments',
      'bank_feed_transactions',
      'manual_private_input',
    ],
    receivables: ['event_financial_summary', 'invoices', 'payment_plan_installments', 'events'],
    overdue_risk: ['invoices', 'payment_plan_installments', 'events'],
    tax_set_aside: ['tax_quarterly_estimates', 'chef_tax_configs', 'expenses', 'ledger_entries'],
    client_concentration: ['ledger_entries', 'clients', 'events'],
    margin_risk: ['event_financial_summary', 'expenses', 'pricing_pie', 'margin_snapshots'],
    quote_implication: [
      'quotes',
      'pricing_pie',
      'event_financial_summary',
      'payment_plan_installments',
    ],
    seasonal_volatility: ['revenue_forecast', 'ledger_entries', 'events'],
    known_obligation: ['expenses', 'payment_plan_installments', 'manual_private_input'],
    insurance_renewal: ['expenses', 'manual_private_input'],
    debt_pressure: ['manual_private_input', 'expenses', 'ledger_entries'],
  }

export function deriveMostRestrictiveFinancialState(
  states: readonly FinancialCockpitRiskState[]
): FinancialCockpitRiskState {
  if (states.length === 0) return 'unknown'
  return states.reduce((current, candidate) =>
    FINANCIAL_COCKPIT_RISK_RANK[candidate] > FINANCIAL_COCKPIT_RISK_RANK[current]
      ? candidate
      : current
  )
}

export function isPrivateFinancialVisibility(visibility: FinancialCockpitVisibilityLevel): boolean {
  return (
    visibility === 'private_only' ||
    visibility === 'chef_internal' ||
    visibility === 'never_publish'
  )
}

export function getRequiredFinancialSourceSystems(
  signal: FinancialCockpitSignalKind
): FinancialCockpitSourceSystem[] {
  return [...SOURCE_SYSTEMS_BY_SIGNAL[signal]]
}

export function buildClientSafeQuoteFinancialSummary(
  implication: QuoteFinancialImplicationContract
): ClientSafeQuoteFinancialSummary {
  const allowedTerms = implication.clientSafeTerms.slice(0, 3)
  const blockedPrivateReasonCount =
    implication.privatePressureReasons.length + implication.missingInputs.length
  const headline =
    implication.recommendation === 'accept'
      ? 'This quote can move forward.'
      : implication.recommendation === 'require_deposit'
        ? 'This quote should include clear payment timing.'
        : implication.recommendation === 'raise_price'
          ? 'This quote needs pricing review before sending.'
          : implication.recommendation === 'decline'
            ? 'This quote is not ready to send as scoped.'
            : 'This quote needs review before sending.'

  return {
    headline,
    allowedTerms,
    blockedPrivateReasonCount,
    visibility: 'client_safe_summary',
  }
}

export function summarizePrivateFinancialCockpitState(
  cockpit: Pick<
    PrivateChefFinancialCockpitContract,
    | 'runway'
    | 'receivables'
    | 'taxSetAside'
    | 'clientConcentration'
    | 'marginRisks'
    | 'quoteImplications'
  >
): FinancialCockpitRiskState {
  return deriveMostRestrictiveFinancialState([
    cockpit.runway.state,
    cockpit.receivables.state,
    cockpit.taxSetAside.state,
    cockpit.clientConcentration.state,
    ...cockpit.marginRisks.map((risk) => risk.state),
    ...cockpit.quoteImplications.map((implication) => implication.state),
  ])
}
