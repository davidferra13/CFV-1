import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildClientSafeQuoteFinancialSummary,
  deriveMostRestrictiveFinancialState,
  getRequiredFinancialSourceSystems,
  isPrivateFinancialVisibility,
  summarizePrivateFinancialCockpitState,
  type CashRunwayContract,
  type ClientConcentrationFinancialRiskContract,
  type FinancialCockpitSourceRef,
  type MarginRiskContract,
  type QuoteFinancialImplicationContract,
  type ReceivablesRiskContract,
  type TaxSetAsideEstimateContract,
} from '../../lib/finance/private-chef-financial-cockpit-contract'
import {
  buildPrivateChefFinancialCockpit,
  type PrivateChefFinancialCockpitInput,
} from '../../lib/finance/private-chef-financial-cockpit'

const sourceRef: FinancialCockpitSourceRef = {
  source: 'manual_chef_input',
  table: 'derived',
  rowId: null,
}

function runway(overrides: Partial<CashRunwayContract> = {}): CashRunwayContract {
  return {
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    asOfDate: '2026-05-21',
    cashOnHandCents: 250000,
    expectedReceivablesCents: 800000,
    expectedExpensesCents: 300000,
    taxSetAsideCents: 120000,
    knownObligationsCents: 50000,
    monthlyBurnCents: 350000,
    runwayDays: 75,
    state: 'watch',
    confidence: 'medium',
    missingInputs: [],
    sourceRefs: [sourceRef],
    visibility: 'private_only',
    ...overrides,
  }
}

function receivables(overrides: Partial<ReceivablesRiskContract> = {}): ReceivablesRiskContract {
  return {
    tenantId: 'tenant-1',
    asOfDate: '2026-05-21',
    outstandingCents: 450000,
    overdueCents: 100000,
    unpaidInvoiceCount: 3,
    overdueInvoiceCount: 1,
    oldestDueDate: '2026-05-01',
    paymentScheduleExposureCents: 50000,
    state: 'warning',
    confidence: 'high',
    missingInputs: [],
    sourceRefs: [sourceRef],
    visibility: 'chef_internal',
    ...overrides,
  }
}

function taxSetAside(
  overrides: Partial<TaxSetAsideEstimateContract> = {}
): TaxSetAsideEstimateContract {
  return {
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    taxYear: 2026,
    quarter: 2,
    incomeCents: 1800000,
    deductibleExpenseCents: 600000,
    estimatedSelfEmploymentTaxCents: 150000,
    estimatedFederalTaxCents: 160000,
    estimatedStateTaxCents: 60000,
    recommendedSetAsideCents: 370000,
    amountAlreadyPaidCents: 100000,
    state: 'watch',
    confidence: 'medium',
    disclaimerRequired: true,
    missingInputs: [],
    sourceRefs: [sourceRef],
    visibility: 'private_only',
    ...overrides,
  }
}

function concentration(
  overrides: Partial<ClientConcentrationFinancialRiskContract> = {}
): ClientConcentrationFinancialRiskContract {
  return {
    tenantId: 'tenant-1',
    asOfDate: '2026-05-21',
    lookbackMonths: 12,
    topClientId: 'client-1',
    topClientRevenuePercent: 44,
    herfindahlIndex: 0.28,
    concentratedRevenueCents: 1200000,
    state: 'watch',
    confidence: 'high',
    missingInputs: [],
    sourceRefs: [sourceRef],
    visibility: 'private_only',
    ...overrides,
  }
}

function marginRisk(overrides: Partial<MarginRiskContract> = {}): MarginRiskContract {
  return {
    tenantId: 'tenant-1',
    subjectType: 'quote',
    subjectId: 'quote-1',
    revenueCents: 250000,
    knownCostCents: 180000,
    estimatedProfitCents: 70000,
    marginPercent: 28,
    targetMarginPercent: 35,
    state: 'warning',
    confidence: 'medium',
    missingInputs: [],
    sourceRefs: [sourceRef],
    visibility: 'chef_internal',
    ...overrides,
  }
}

function quoteImplication(
  overrides: Partial<QuoteFinancialImplicationContract> = {}
): QuoteFinancialImplicationContract {
  return {
    tenantId: 'tenant-1',
    quoteId: 'quote-1',
    clientId: 'client-1',
    quotedRevenueCents: 250000,
    requiredDepositCents: 125000,
    expectedCostCents: 180000,
    expectedMarginPercent: 28,
    estimatedRunwayDeltaDays: 8,
    recommendation: 'require_deposit',
    state: 'warning',
    privatePressureReasons: ['Cash runway is under 90 days', 'Tax set-aside is behind target'],
    clientSafeTerms: ['Deposit due at booking', 'Final balance due before service'],
    confidence: 'medium',
    missingInputs: [],
    sourceRefs: [sourceRef],
    visibility: 'private_only',
    ...overrides,
  }
}

test('financial cockpit contract ranks unknown and blocked states as restrictive', () => {
  assert.equal(deriveMostRestrictiveFinancialState(['healthy', 'watch', 'critical']), 'critical')
  assert.equal(deriveMostRestrictiveFinancialState(['blocked', 'warning']), 'blocked')
  assert.equal(deriveMostRestrictiveFinancialState(['healthy', 'unknown']), 'unknown')
  assert.equal(deriveMostRestrictiveFinancialState([]), 'unknown')

  assert.equal(isPrivateFinancialVisibility('private_only'), true)
  assert.equal(isPrivateFinancialVisibility('chef_internal'), true)
  assert.equal(isPrivateFinancialVisibility('never_publish'), true)
  assert.equal(isPrivateFinancialVisibility('client_safe_summary'), false)
})

test('financial cockpit source mapping composes existing systems instead of duplicating them', () => {
  assert.deepEqual(getRequiredFinancialSourceSystems('client_concentration'), [
    'ledger_entries',
    'clients',
    'events',
  ])
  assert.deepEqual(getRequiredFinancialSourceSystems('tax_set_aside'), [
    'tax_quarterly_estimates',
    'chef_tax_configs',
    'expenses',
    'ledger_entries',
  ])
  assert.deepEqual(getRequiredFinancialSourceSystems('quote_implication'), [
    'quotes',
    'pricing_pie',
    'event_financial_summary',
    'payment_plan_installments',
  ])
})

test('client-safe quote summaries redact private pressure and missing financial inputs', () => {
  const summary = buildClientSafeQuoteFinancialSummary(
    quoteImplication({
      privatePressureReasons: ['Debt payment due this week', 'Top client concentration is high'],
      missingInputs: ['tax_rate', 'quote_costs'],
      clientSafeTerms: [
        'Deposit due at booking',
        'Scope needs review',
        'Payment milestone required',
      ],
    })
  )

  assert.equal(summary.headline, 'This quote should include clear payment timing.')
  assert.deepEqual(summary.allowedTerms, [
    'Deposit due at booking',
    'Scope needs review',
    'Payment milestone required',
  ])
  assert.equal(summary.blockedPrivateReasonCount, 4)
  assert.equal(summary.visibility, 'client_safe_summary')
})

test('aggregate cockpit state is derived from private component risks', () => {
  const state = summarizePrivateFinancialCockpitState({
    runway: runway({ state: 'watch' }),
    receivables: receivables({ state: 'critical' }),
    taxSetAside: taxSetAside({ state: 'warning' }),
    clientConcentration: concentration({ state: 'healthy' }),
    marginRisks: [marginRisk({ state: 'watch' })],
    quoteImplications: [quoteImplication({ state: 'blocked' })],
  })

  assert.equal(state, 'blocked')
})

test('unknown missing cash or cost data stays explicit instead of pretending the cockpit is healthy', () => {
  const state = summarizePrivateFinancialCockpitState({
    runway: runway({
      cashOnHandCents: null,
      runwayDays: null,
      state: 'unknown',
      confidence: 'low',
      missingInputs: ['cash_on_hand', 'bank_balance'],
    }),
    receivables: receivables({ state: 'healthy' }),
    taxSetAside: taxSetAside({ state: 'watch' }),
    clientConcentration: concentration({ state: 'healthy' }),
    marginRisks: [
      marginRisk({
        knownCostCents: null,
        marginPercent: null,
        state: 'unknown',
        confidence: 'low',
        missingInputs: ['event_costs'],
      }),
    ],
    quoteImplications: [],
  })

  assert.equal(state, 'unknown')
})

test('private chef financial cockpit composes runway receivables tax concentration margin and quote implications', () => {
  const input: PrivateChefFinancialCockpitInput = {
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    asOfDate: '2026-05-21',
    cashOnHandCents: 300000,
    eventFinancialSummaries: [
      {
        eventId: 'event-1',
        clientId: 'client-a',
        eventDate: '2026-05-10',
        quotedPriceCents: 500000,
        totalPaidCents: 250000,
        outstandingBalanceCents: 250000,
        totalExpensesCents: 380000,
        profitCents: 120000,
        profitMargin: 0.24,
      },
    ],
    expenses: [
      {
        id: 'expense-1',
        amountCents: 90000,
        expenseDate: '2026-05-28',
        category: 'insurance',
      },
    ],
    paymentPlanInstallments: [
      {
        id: 'installment-1',
        eventId: 'event-1',
        amountCents: 125000,
        dueDate: '2026-05-15',
        paid: false,
      },
    ],
    ledgerEntries: [
      {
        id: 'ledger-1',
        clientId: 'client-a',
        amountCents: 700000,
        entryType: 'payment',
        createdAt: '2026-04-15',
      },
      {
        id: 'ledger-2',
        clientId: 'client-b',
        amountCents: 300000,
        entryType: 'payment',
        createdAt: '2026-04-20',
      },
    ],
    taxEstimates: [
      {
        id: 'tax-1',
        taxYear: 2026,
        quarter: 2,
        incomeCents: 1000000,
        deductibleExpenseCents: 200000,
        estimatedSelfEmploymentTaxCents: 122400,
        estimatedFederalTaxCents: 96000,
        estimatedStateTaxCents: 40000,
        recommendedSetAsideCents: 258400,
        amountAlreadyPaidCents: 100000,
      },
    ],
    quotes: [
      {
        id: 'quote-1',
        clientId: 'client-a',
        totalQuotedCents: 400000,
        depositRequired: false,
        depositAmountCents: null,
        status: 'draft',
      },
    ],
  }

  const cockpit = buildPrivateChefFinancialCockpit(input)

  assert.equal(cockpit.tenantId, 'tenant-1')
  assert.equal(cockpit.visibility, 'private_only')
  assert.equal(cockpit.runway.expectedReceivablesCents, 375000)
  assert.equal(cockpit.runway.expectedExpensesCents, 90000)
  assert.equal(cockpit.receivables.overdueCents, 375000)
  assert.equal(cockpit.taxSetAside.disclaimerRequired, true)
  assert.equal(cockpit.clientConcentration.topClientRevenuePercent, 70)
  assert.equal(cockpit.marginRisks[0]?.state, 'warning')
  assert.equal(cockpit.quoteImplications[0]?.recommendation, 'require_deposit')
  assert.equal(cockpit.quoteImplications[0]?.visibility, 'private_only')
  assert.deepEqual(cockpit.quoteImplications[0]?.clientSafeTerms, [
    'Deposit due at booking',
    'Scope and pricing need review before sending',
  ])
})

test('private chef financial cockpit keeps missing data explicit and private', () => {
  const cockpit = buildPrivateChefFinancialCockpit({
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    asOfDate: '2026-05-21',
    cashOnHandCents: null,
    eventFinancialSummaries: [],
    expenses: [],
    paymentPlanInstallments: [],
    ledgerEntries: [],
    taxEstimates: [],
    quotes: [
      {
        id: 'quote-2',
        clientId: null,
        totalQuotedCents: 250000,
        depositRequired: true,
        depositAmountCents: 100000,
        status: 'draft',
      },
    ],
  })

  assert.equal(cockpit.runway.state, 'unknown')
  assert.ok(cockpit.missingInputs.includes('cash_on_hand'))
  assert.ok(cockpit.missingInputs.includes('client_revenue_history'))
  assert.ok(cockpit.taxSetAside.missingInputs.includes('tax_rate'))
  assert.equal(cockpit.quoteImplications[0]?.state, 'unknown')
  assert.equal(cockpit.quoteImplications[0]?.privatePressureReasons.length, 0)
  assert.equal(
    cockpit.quoteImplications[0]?.clientSafeTerms.includes('Cash runway is missing'),
    false
  )
})
