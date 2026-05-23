import {
  buildClientSafeQuoteFinancialSummary,
  deriveMostRestrictiveFinancialState,
  type CashRunwayContract,
  type ClientConcentrationFinancialRiskContract,
  type FinancialCockpitMissingInput,
  type FinancialCockpitRiskState,
  type FinancialCockpitSourceRef,
  type MarginRiskContract,
  type PrivateChefFinancialCockpitContract,
  type QuoteFinancialImplicationContract,
  type QuoteFinancialRecommendation,
  type ReceivablesRiskContract,
  type TaxSetAsideEstimateContract,
} from './private-chef-financial-cockpit-contract'

export type FinancialCockpitLedgerEntryInput = {
  id: string
  clientId: string | null
  amountCents: number
  entryType: string | null
  createdAt: string
}

export type FinancialCockpitEventSummaryInput = {
  eventId: string
  clientId: string | null
  eventDate: string | null
  quotedPriceCents: number | null
  totalPaidCents: number
  outstandingBalanceCents: number
  totalExpensesCents: number
  profitCents: number | null
  profitMargin: number | null
}

export type FinancialCockpitExpenseInput = {
  id: string
  amountCents: number
  expenseDate: string
  category: string | null
}

export type FinancialCockpitPaymentInstallmentInput = {
  id: string
  eventId: string | null
  amountCents: number
  dueDate: string | null
  paid: boolean
}

export type FinancialCockpitTaxEstimateInput = {
  id: string
  taxYear: number
  quarter: 1 | 2 | 3 | 4
  incomeCents: number
  deductibleExpenseCents: number
  estimatedSelfEmploymentTaxCents: number | null
  estimatedFederalTaxCents: number | null
  estimatedStateTaxCents: number | null
  recommendedSetAsideCents: number | null
  amountAlreadyPaidCents: number
}

export type FinancialCockpitQuoteInput = {
  id: string
  clientId: string | null
  totalQuotedCents: number
  depositRequired: boolean
  depositAmountCents: number | null
  status: string | null
}

export type PrivateChefFinancialCockpitInput = {
  tenantId: string
  chefId: string
  asOfDate: string
  cashOnHandCents: number | null
  ledgerEntries: FinancialCockpitLedgerEntryInput[]
  eventFinancialSummaries: FinancialCockpitEventSummaryInput[]
  expenses: FinancialCockpitExpenseInput[]
  paymentPlanInstallments: FinancialCockpitPaymentInstallmentInput[]
  taxEstimates: FinancialCockpitTaxEstimateInput[]
  quotes: FinancialCockpitQuoteInput[]
}

const TARGET_MARGIN_PERCENT = 35
const LOOKBACK_MONTHS = 12

function cents(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0
}

function sourceRef(sourceRef: FinancialCockpitSourceRef): FinancialCockpitSourceRef {
  return sourceRef
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime()
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime()
  return Math.round((end - start) / 86400000)
}

function dueBy(date: string | null, asOfDate: string): boolean {
  if (!date) return false
  return date <= asOfDate
}

function withinDays(date: string, asOfDate: string, days: number): boolean {
  const diff = daysBetween(asOfDate, date)
  return diff >= 0 && diff <= days
}

function uniqueInputs(inputs: FinancialCockpitMissingInput[]): FinancialCockpitMissingInput[] {
  return Array.from(new Set(inputs))
}

function stateForRunway(
  runwayDays: number | null,
  missingCash: boolean
): FinancialCockpitRiskState {
  if (missingCash) return 'unknown'
  if (runwayDays === null) return 'watch'
  if (runwayDays < 14) return 'critical'
  if (runwayDays < 30) return 'warning'
  if (runwayDays < 60) return 'watch'
  return 'healthy'
}

function stateForReceivables(
  overdueCents: number,
  outstandingCents: number
): FinancialCockpitRiskState {
  if (overdueCents > 250000) return 'critical'
  if (overdueCents > 0) return 'warning'
  if (outstandingCents > 0) return 'watch'
  return 'healthy'
}

function stateForTax(estimate: FinancialCockpitTaxEstimateInput | null): FinancialCockpitRiskState {
  if (!estimate) return 'unknown'
  const unpaid = cents(estimate.recommendedSetAsideCents) - cents(estimate.amountAlreadyPaidCents)
  if (unpaid > 250000) return 'warning'
  if (unpaid > 0) return 'watch'
  return 'healthy'
}

function stateForMargin(marginPercent: number | null): FinancialCockpitRiskState {
  if (marginPercent === null) return 'unknown'
  if (marginPercent < 15) return 'critical'
  if (marginPercent < 25) return 'warning'
  if (marginPercent < TARGET_MARGIN_PERCENT) return 'watch'
  return 'healthy'
}

function buildRunway(input: PrivateChefFinancialCockpitInput): CashRunwayContract {
  const upcomingReceivables = input.paymentPlanInstallments
    .filter((installment) => !installment.paid && installment.dueDate)
    .reduce((sum, installment) => sum + cents(installment.amountCents), 0)
  const outstandingReceivables = input.eventFinancialSummaries.reduce(
    (sum, row) => sum + Math.max(0, cents(row.outstandingBalanceCents)),
    0
  )
  const expectedReceivablesCents = outstandingReceivables + upcomingReceivables
  const expectedExpensesCents = input.expenses
    .filter((expense) => withinDays(expense.expenseDate, input.asOfDate, 30))
    .reduce((sum, expense) => sum + cents(expense.amountCents), 0)
  const currentTaxEstimate = input.taxEstimates[0] ?? null
  const taxSetAsideCents = currentTaxEstimate
    ? Math.max(
        0,
        cents(currentTaxEstimate.recommendedSetAsideCents) -
          cents(currentTaxEstimate.amountAlreadyPaidCents)
      )
    : 0
  const knownObligationsCents = input.expenses
    .filter((expense) => ['insurance', 'debt', 'loan', 'rent'].includes(expense.category ?? ''))
    .reduce((sum, expense) => sum + cents(expense.amountCents), 0)
  const monthlyBurnCents = expectedExpensesCents + taxSetAsideCents + knownObligationsCents
  const dailyBurnCents = monthlyBurnCents > 0 ? monthlyBurnCents / 30 : null
  const runwayDays =
    input.cashOnHandCents !== null && dailyBurnCents && dailyBurnCents > 0
      ? Math.floor((input.cashOnHandCents + expectedReceivablesCents) / dailyBurnCents)
      : input.cashOnHandCents !== null
        ? null
        : null
  const missingInputs: FinancialCockpitMissingInput[] = []
  if (input.cashOnHandCents === null) missingInputs.push('cash_on_hand', 'bank_balance')
  if (input.expenses.length === 0) missingInputs.push('expense_forecast')

  return {
    tenantId: input.tenantId,
    chefId: input.chefId,
    asOfDate: input.asOfDate,
    cashOnHandCents: input.cashOnHandCents,
    expectedReceivablesCents,
    expectedExpensesCents,
    taxSetAsideCents,
    knownObligationsCents,
    monthlyBurnCents: monthlyBurnCents > 0 ? monthlyBurnCents : null,
    runwayDays,
    state: stateForRunway(runwayDays, input.cashOnHandCents === null),
    confidence: input.cashOnHandCents === null || input.expenses.length === 0 ? 'low' : 'medium',
    missingInputs,
    sourceRefs: [
      sourceRef({
        source: 'event_financial_summary',
        table: 'event_financial_summary',
        rowId: null,
      }),
      sourceRef({ source: 'payment_plan', table: 'payment_plan_installments', rowId: null }),
      sourceRef({ source: 'expense', table: 'expenses', rowId: null }),
    ],
    visibility: 'private_only',
  }
}

function buildReceivables(input: PrivateChefFinancialCockpitInput): ReceivablesRiskContract {
  const eventOutstandingCents = input.eventFinancialSummaries.reduce(
    (sum, row) => sum + Math.max(0, cents(row.outstandingBalanceCents)),
    0
  )
  const unpaidInstallments = input.paymentPlanInstallments.filter(
    (installment) => !installment.paid
  )
  const installmentOutstandingCents = unpaidInstallments.reduce(
    (sum, installment) => sum + cents(installment.amountCents),
    0
  )
  const overdueInstallmentCents = unpaidInstallments
    .filter((installment) => dueBy(installment.dueDate, input.asOfDate))
    .reduce((sum, installment) => sum + cents(installment.amountCents), 0)
  const overdueEventCents = input.eventFinancialSummaries
    .filter((row) => row.eventDate && row.eventDate <= input.asOfDate)
    .reduce((sum, row) => sum + Math.max(0, cents(row.outstandingBalanceCents)), 0)
  const dueDates = unpaidInstallments
    .map((installment) => installment.dueDate)
    .filter((date): date is string => Boolean(date))
    .sort()
  const outstandingCents = eventOutstandingCents + installmentOutstandingCents
  const overdueCents = overdueEventCents + overdueInstallmentCents
  const missingInputs: FinancialCockpitMissingInput[] = []
  if (outstandingCents > 0 && dueDates.length === 0) missingInputs.push('receivable_due_dates')

  return {
    tenantId: input.tenantId,
    asOfDate: input.asOfDate,
    outstandingCents,
    overdueCents,
    unpaidInvoiceCount: input.eventFinancialSummaries.filter(
      (row) => cents(row.outstandingBalanceCents) > 0
    ).length,
    overdueInvoiceCount: input.eventFinancialSummaries.filter(
      (row) =>
        row.eventDate && row.eventDate <= input.asOfDate && cents(row.outstandingBalanceCents) > 0
    ).length,
    oldestDueDate: dueDates[0] ?? null,
    paymentScheduleExposureCents: installmentOutstandingCents,
    state:
      missingInputs.length > 0 ? 'unknown' : stateForReceivables(overdueCents, outstandingCents),
    confidence: missingInputs.length > 0 ? 'low' : 'medium',
    missingInputs,
    sourceRefs: [
      sourceRef({
        source: 'event_financial_summary',
        table: 'event_financial_summary',
        rowId: null,
      }),
      sourceRef({ source: 'payment_plan', table: 'payment_plan_installments', rowId: null }),
    ],
    visibility: 'chef_internal',
  }
}

function buildTaxSetAside(input: PrivateChefFinancialCockpitInput): TaxSetAsideEstimateContract {
  const estimate = input.taxEstimates[0] ?? null
  const taxYear = estimate?.taxYear ?? Number(input.asOfDate.slice(0, 4))
  const month = Number(input.asOfDate.slice(5, 7))
  const quarter = estimate?.quarter ?? ((Math.ceil(month / 3) || 1) as 1 | 2 | 3 | 4)
  const incomeCents =
    estimate?.incomeCents ??
    input.ledgerEntries
      .filter((entry) => ['payment', 'sale', 'revenue'].includes(entry.entryType ?? ''))
      .reduce((sum, entry) => sum + Math.max(0, cents(entry.amountCents)), 0)
  const deductibleExpenseCents =
    estimate?.deductibleExpenseCents ??
    input.expenses.reduce((sum, expense) => sum + cents(expense.amountCents), 0)
  const estimatedSelfEmploymentTaxCents =
    estimate?.estimatedSelfEmploymentTaxCents ??
    Math.round(Math.max(0, incomeCents - deductibleExpenseCents) * 0.153)
  const estimatedFederalTaxCents =
    estimate?.estimatedFederalTaxCents ??
    Math.round(Math.max(0, incomeCents - deductibleExpenseCents) * 0.12)
  const estimatedStateTaxCents =
    estimate?.estimatedStateTaxCents ??
    Math.round(Math.max(0, incomeCents - deductibleExpenseCents) * 0.05)
  const recommendedSetAsideCents =
    estimate?.recommendedSetAsideCents ??
    estimatedSelfEmploymentTaxCents + estimatedFederalTaxCents + estimatedStateTaxCents
  const amountAlreadyPaidCents = estimate?.amountAlreadyPaidCents ?? 0
  const missingInputs: FinancialCockpitMissingInput[] = []
  if (!estimate) missingInputs.push('tax_rate')
  if (incomeCents === 0) missingInputs.push('tax_year_income')
  if (deductibleExpenseCents === 0) missingInputs.push('deductible_expenses')

  return {
    tenantId: input.tenantId,
    chefId: input.chefId,
    taxYear,
    quarter,
    incomeCents,
    deductibleExpenseCents,
    estimatedSelfEmploymentTaxCents,
    estimatedFederalTaxCents,
    estimatedStateTaxCents,
    recommendedSetAsideCents,
    amountAlreadyPaidCents,
    state: missingInputs.includes('tax_rate') ? 'unknown' : stateForTax(estimate),
    confidence: estimate ? 'medium' : 'low',
    disclaimerRequired: true,
    missingInputs,
    sourceRefs: [
      sourceRef({
        source: estimate ? 'tax_estimate' : 'derived',
        table: estimate ? 'tax_quarterly_estimates' : 'derived',
        rowId: estimate?.id ?? null,
      }),
    ],
    visibility: 'private_only',
  }
}

function buildClientConcentration(
  input: PrivateChefFinancialCockpitInput
): ClientConcentrationFinancialRiskContract {
  const revenueByClient = new Map<string, number>()
  for (const entry of input.ledgerEntries) {
    if (!entry.clientId) continue
    if (!['payment', 'sale', 'revenue'].includes(entry.entryType ?? 'payment')) continue
    revenueByClient.set(
      entry.clientId,
      (revenueByClient.get(entry.clientId) ?? 0) + cents(entry.amountCents)
    )
  }
  const totalRevenue = Array.from(revenueByClient.values()).reduce((sum, value) => sum + value, 0)
  const sorted = Array.from(revenueByClient.entries()).sort((a, b) => b[1] - a[1])
  const [topClientId, topRevenue] = sorted[0] ?? [null, 0]
  const topClientRevenuePercent =
    totalRevenue > 0 ? Math.round((topRevenue / totalRevenue) * 1000) / 10 : null
  const herfindahlIndex =
    totalRevenue > 0
      ? Math.round(
          Array.from(revenueByClient.values()).reduce(
            (sum, value) => sum + Math.pow(value / totalRevenue, 2),
            0
          ) * 1000
        ) / 1000
      : null
  const missingInputs: FinancialCockpitMissingInput[] = []
  if (totalRevenue === 0) missingInputs.push('client_revenue_history')
  const state: FinancialCockpitRiskState =
    topClientRevenuePercent === null
      ? 'unknown'
      : topClientRevenuePercent > 50
        ? 'warning'
        : topClientRevenuePercent >= 30
          ? 'watch'
          : 'healthy'

  return {
    tenantId: input.tenantId,
    asOfDate: input.asOfDate,
    lookbackMonths: LOOKBACK_MONTHS,
    topClientId,
    topClientRevenuePercent,
    herfindahlIndex,
    concentratedRevenueCents: topRevenue,
    state,
    confidence: totalRevenue > 0 ? 'medium' : 'low',
    missingInputs,
    sourceRefs: [sourceRef({ source: 'ledger', table: 'ledger_entries', rowId: null })],
    visibility: 'private_only',
  }
}

function buildMarginRisks(input: PrivateChefFinancialCockpitInput): MarginRiskContract[] {
  const eventRisks = input.eventFinancialSummaries
    .filter((row) => cents(row.quotedPriceCents) > 0 || cents(row.totalPaidCents) > 0)
    .slice(0, 6)
    .map((row): MarginRiskContract => {
      const revenueCents =
        cents(row.totalPaidCents) > 0 ? cents(row.totalPaidCents) : cents(row.quotedPriceCents)
      const knownCostCents =
        cents(row.totalExpensesCents) > 0 ? cents(row.totalExpensesCents) : null
      const estimatedProfitCents =
        knownCostCents !== null && revenueCents > 0
          ? revenueCents - knownCostCents
          : row.profitCents
      const marginPercent =
        row.profitMargin !== null
          ? Math.round(row.profitMargin * 1000) / 10
          : revenueCents > 0 && estimatedProfitCents !== null
            ? Math.round((estimatedProfitCents / revenueCents) * 1000) / 10
            : null
      const missingInputs: FinancialCockpitMissingInput[] = []
      if (knownCostCents === null) missingInputs.push('event_costs')

      return {
        tenantId: input.tenantId,
        subjectType: 'event',
        subjectId: row.eventId,
        revenueCents: revenueCents || null,
        knownCostCents,
        estimatedProfitCents,
        marginPercent,
        targetMarginPercent: TARGET_MARGIN_PERCENT,
        state: missingInputs.length > 0 ? 'unknown' : stateForMargin(marginPercent),
        confidence: missingInputs.length > 0 ? 'low' : 'medium',
        missingInputs,
        sourceRefs: [
          sourceRef({
            source: 'event_financial_summary',
            table: 'event_financial_summary',
            rowId: row.eventId,
          }),
        ],
        visibility: 'chef_internal',
      }
    })

  if (eventRisks.length > 0) return eventRisks

  return [
    {
      tenantId: input.tenantId,
      subjectType: 'portfolio',
      subjectId: null,
      revenueCents: null,
      knownCostCents: null,
      estimatedProfitCents: null,
      marginPercent: null,
      targetMarginPercent: TARGET_MARGIN_PERCENT,
      state: 'unknown',
      confidence: 'low',
      missingInputs: ['event_costs'],
      sourceRefs: [sourceRef({ source: 'derived', table: 'derived', rowId: null })],
      visibility: 'chef_internal',
    },
  ]
}

function quoteRecommendation(
  quote: FinancialCockpitQuoteInput,
  runwayState: FinancialCockpitRiskState,
  marginState: FinancialCockpitRiskState
): QuoteFinancialRecommendation {
  if (quote.totalQuotedCents <= 0) return 'review'
  if (marginState === 'critical') return 'raise_price'
  if (!quote.depositRequired && ['watch', 'warning', 'critical'].includes(runwayState)) {
    return 'require_deposit'
  }
  if (marginState === 'warning') return 'raise_price'
  if (runwayState === 'blocked') return 'decline'
  return 'accept'
}

function buildQuoteImplications(
  input: PrivateChefFinancialCockpitInput,
  runway: CashRunwayContract,
  marginRisks: MarginRiskContract[]
): QuoteFinancialImplicationContract[] {
  return input.quotes.slice(0, 5).map((quote) => {
    const portfolioMargin = marginRisks[0] ?? null
    const recommendation = quoteRecommendation(
      quote,
      runway.state,
      portfolioMargin?.state ?? 'unknown'
    )
    const missingInputs: FinancialCockpitMissingInput[] = []
    if (runway.missingInputs.includes('cash_on_hand')) missingInputs.push('cash_on_hand')
    if (!quote.depositRequired && quote.depositAmountCents === null)
      missingInputs.push('deposit_terms')
    if (portfolioMargin?.state === 'unknown') missingInputs.push(...portfolioMargin.missingInputs)
    const privatePressureReasons: string[] = []
    if (runway.runwayDays !== null && runway.runwayDays < 60) {
      privatePressureReasons.push(`Cash runway is ${runway.runwayDays} days`)
    }
    if (
      portfolioMargin?.marginPercent !== null &&
      portfolioMargin?.marginPercent < TARGET_MARGIN_PERCENT
    ) {
      privatePressureReasons.push(`Recent margin is below ${TARGET_MARGIN_PERCENT}% target`)
    }
    const clientSafeTerms =
      recommendation === 'require_deposit'
        ? ['Deposit due at booking', 'Scope and pricing need review before sending']
        : recommendation === 'raise_price'
          ? ['Scope and pricing need review before sending', 'Alternative scope may be offered']
          : recommendation === 'decline'
            ? ['Alternative scope may be offered']
            : ['Standard payment terms apply']
    const implication: QuoteFinancialImplicationContract = {
      tenantId: input.tenantId,
      quoteId: quote.id,
      clientId: quote.clientId,
      quotedRevenueCents: quote.totalQuotedCents,
      requiredDepositCents:
        quote.depositAmountCents ??
        (recommendation === 'require_deposit' ? Math.round(quote.totalQuotedCents * 0.5) : null),
      expectedCostCents: portfolioMargin?.knownCostCents ?? null,
      expectedMarginPercent: portfolioMargin?.marginPercent ?? null,
      estimatedRunwayDeltaDays:
        runway.monthlyBurnCents && runway.monthlyBurnCents > 0
          ? Math.round((quote.totalQuotedCents / (runway.monthlyBurnCents / 30)) * 10) / 10
          : null,
      recommendation,
      state: deriveMostRestrictiveFinancialState([
        runway.state,
        portfolioMargin?.state ?? 'unknown',
      ]),
      privatePressureReasons,
      clientSafeTerms,
      confidence: missingInputs.length > 0 ? 'low' : 'medium',
      missingInputs: uniqueInputs(missingInputs),
      sourceRefs: [sourceRef({ source: 'quote', table: 'quotes', rowId: quote.id })],
      visibility: 'private_only',
    }
    buildClientSafeQuoteFinancialSummary(implication)
    return implication
  })
}

export function buildPrivateChefFinancialCockpit(
  input: PrivateChefFinancialCockpitInput
): PrivateChefFinancialCockpitContract {
  const runway = buildRunway(input)
  const receivables = buildReceivables(input)
  const taxSetAside = buildTaxSetAside(input)
  const clientConcentration = buildClientConcentration(input)
  const marginRisks = buildMarginRisks(input)
  const quoteImplications = buildQuoteImplications(input, runway, marginRisks)
  const overallState = deriveMostRestrictiveFinancialState([
    runway.state,
    receivables.state,
    taxSetAside.state,
    clientConcentration.state,
    ...marginRisks.map((risk) => risk.state),
    ...quoteImplications.map((implication) => implication.state),
  ])
  const missingInputs = uniqueInputs([
    ...runway.missingInputs,
    ...receivables.missingInputs,
    ...taxSetAside.missingInputs,
    ...clientConcentration.missingInputs,
    ...marginRisks.flatMap((risk) => risk.missingInputs),
    ...quoteImplications.flatMap((implication) => implication.missingInputs),
  ])

  return {
    tenantId: input.tenantId,
    chefId: input.chefId,
    asOfDate: input.asOfDate,
    runway,
    receivables,
    taxSetAside,
    clientConcentration,
    marginRisks,
    quoteImplications,
    overallState,
    missingInputs,
    sourceRefs: [
      sourceRef({ source: 'ledger', table: 'ledger_entries', rowId: null }),
      sourceRef({
        source: 'event_financial_summary',
        table: 'event_financial_summary',
        rowId: null,
      }),
      sourceRef({ source: 'quote', table: 'quotes', rowId: null }),
      sourceRef({ source: 'derived', table: 'derived', rowId: null }),
    ],
    visibility: 'private_only',
  }
}
