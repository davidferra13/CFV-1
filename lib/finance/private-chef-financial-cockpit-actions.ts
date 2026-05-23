'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildPrivateChefFinancialCockpit,
  type FinancialCockpitEventSummaryInput,
  type FinancialCockpitExpenseInput,
  type FinancialCockpitLedgerEntryInput,
  type FinancialCockpitPaymentInstallmentInput,
  type FinancialCockpitQuoteInput,
  type FinancialCockpitTaxEstimateInput,
} from '@/lib/finance/private-chef-financial-cockpit'
import type { PrivateChefFinancialCockpitContract } from '@/lib/finance/private-chef-financial-cockpit-contract'

type SupabaseResult<T> = {
  data: T[] | null
  error?: { message?: string } | null
}

function toDateString(value: string | null | undefined): string | null {
  if (!value) return null
  return value.slice(0, 10)
}

function latestQuarterFirst(
  a: FinancialCockpitTaxEstimateInput,
  b: FinancialCockpitTaxEstimateInput
): number {
  if (a.taxYear !== b.taxYear) return b.taxYear - a.taxYear
  return b.quarter - a.quarter
}

async function readRows<T>(result: PromiseLike<SupabaseResult<T>>, label: string): Promise<T[]> {
  const { data, error } = await result
  if (error) {
    throw new Error(`Failed to load ${label}: ${error.message ?? 'unknown error'}`)
  }
  return data ?? []
}

export async function getPrivateChefFinancialCockpit(): Promise<PrivateChefFinancialCockpitContract> {
  const user = await requireChef()
  const tenantId = user.entityId ?? user.tenantId!
  const db: any = createServerClient()
  const asOfDate = new Date().toISOString().slice(0, 10)
  const lookbackDate = new Date()
  lookbackDate.setMonth(lookbackDate.getMonth() - 12)
  const lookbackIso = lookbackDate.toISOString()

  const [
    eventRows,
    eventFinancialRows,
    expenseRows,
    installmentRows,
    ledgerRows,
    taxRows,
    quoteRows,
  ] = await Promise.all([
    readRows<any>(
      db
        .from('events')
        .select('id, client_id, event_date, tenant_id')
        .eq('tenant_id', tenantId)
        .gte('event_date', lookbackIso.slice(0, 10))
        .limit(200),
      'tenant events'
    ),
    readRows<any>(
      db
        .from('event_financial_summary')
        .select(
          'event_id, tenant_id, quoted_price_cents, total_paid_cents, outstanding_balance_cents, total_expenses_cents, profit_cents, profit_margin'
        )
        .eq('tenant_id', tenantId)
        .limit(200),
      'event financial summary'
    ),
    readRows<any>(
      db
        .from('expenses')
        .select('id, tenant_id, amount_cents, expense_date, category, is_business')
        .eq('tenant_id', tenantId)
        .eq('is_business', true)
        .gte('expense_date', lookbackIso.slice(0, 10))
        .limit(500),
      'expenses'
    ),
    readRows<any>(
      db
        .from('payment_plan_installments')
        .select('id, tenant_id, event_id, amount_cents, due_date, paid_at')
        .eq('tenant_id', tenantId)
        .limit(250),
      'payment plan installments'
    ),
    readRows<any>(
      db
        .from('ledger_entries')
        .select('id, tenant_id, client_id, amount_cents, entry_type, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', lookbackIso)
        .limit(1000),
      'ledger entries'
    ),
    readRows<any>(
      db
        .from('tax_quarterly_estimates')
        .select(
          'id, chef_id, tax_year, quarter, estimated_income_cents, estimated_se_tax_cents, estimated_federal_cents, estimated_state_cents, amount_paid_cents'
        )
        .eq('chef_id', tenantId)
        .limit(12),
      'tax estimates'
    ),
    readRows<any>(
      db
        .from('quotes')
        .select(
          'id, tenant_id, client_id, total_quoted_cents, deposit_required, deposit_amount_cents, status, deleted_at'
        )
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .in('status', ['draft', 'sent'])
        .limit(20),
      'quotes'
    ),
  ])

  const eventsById = new Map(
    eventRows.map((event) => [
      event.id as string,
      {
        clientId: (event.client_id as string | null) ?? null,
        eventDate: toDateString(event.event_date),
      },
    ])
  )

  const eventFinancialSummaries: FinancialCockpitEventSummaryInput[] = eventFinancialRows.map(
    (row) => {
      const event = eventsById.get(row.event_id as string)
      return {
        eventId: row.event_id as string,
        clientId: event?.clientId ?? null,
        eventDate: event?.eventDate ?? null,
        quotedPriceCents: row.quoted_price_cents ?? null,
        totalPaidCents: row.total_paid_cents ?? 0,
        outstandingBalanceCents: row.outstanding_balance_cents ?? 0,
        totalExpensesCents: row.total_expenses_cents ?? 0,
        profitCents: row.profit_cents ?? null,
        profitMargin: row.profit_margin === null ? null : Number(row.profit_margin),
      }
    }
  )

  const expenses: FinancialCockpitExpenseInput[] = expenseRows.map((row) => ({
    id: row.id as string,
    amountCents: row.amount_cents ?? 0,
    expenseDate: toDateString(row.expense_date) ?? asOfDate,
    category: row.category ?? null,
  }))

  const paymentPlanInstallments: FinancialCockpitPaymentInstallmentInput[] = installmentRows.map(
    (row) => ({
      id: row.id as string,
      eventId: (row.event_id as string | null) ?? null,
      amountCents: row.amount_cents ?? 0,
      dueDate: toDateString(row.due_date),
      paid: Boolean(row.paid_at),
    })
  )

  const ledgerEntries: FinancialCockpitLedgerEntryInput[] = ledgerRows.map((row) => ({
    id: row.id as string,
    clientId: (row.client_id as string | null) ?? null,
    amountCents: row.amount_cents ?? 0,
    entryType: row.entry_type ?? null,
    createdAt: row.created_at ?? asOfDate,
  }))

  const taxEstimates: FinancialCockpitTaxEstimateInput[] = taxRows
    .map((row) => {
      const selfEmployment = row.estimated_se_tax_cents ?? null
      const federal = row.estimated_federal_cents ?? null
      const state = row.estimated_state_cents ?? null
      const recommendedSetAsideCents =
        selfEmployment === null && federal === null && state === null
          ? null
          : (selfEmployment ?? 0) + (federal ?? 0) + (state ?? 0)

      return {
        id: row.id as string,
        taxYear: row.tax_year ?? Number(asOfDate.slice(0, 4)),
        quarter: (row.quarter ?? 1) as 1 | 2 | 3 | 4,
        incomeCents: row.estimated_income_cents ?? 0,
        deductibleExpenseCents: 0,
        estimatedSelfEmploymentTaxCents: selfEmployment,
        estimatedFederalTaxCents: federal,
        estimatedStateTaxCents: state,
        recommendedSetAsideCents,
        amountAlreadyPaidCents: row.amount_paid_cents ?? 0,
      }
    })
    .sort(latestQuarterFirst)

  const quotes: FinancialCockpitQuoteInput[] = quoteRows.map((row) => ({
    id: row.id as string,
    clientId: (row.client_id as string | null) ?? null,
    totalQuotedCents: row.total_quoted_cents ?? 0,
    depositRequired: Boolean(row.deposit_required),
    depositAmountCents: row.deposit_amount_cents ?? null,
    status: row.status ?? null,
  }))

  return buildPrivateChefFinancialCockpit({
    tenantId,
    chefId: user.entityId,
    asOfDate,
    cashOnHandCents: null,
    ledgerEntries,
    eventFinancialSummaries,
    expenses,
    paymentPlanInstallments,
    taxEstimates,
    quotes,
  })
}
