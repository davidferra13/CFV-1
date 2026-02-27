// Commerce Engine V1 — Inngest Background Jobs
//
// 1. Business day closeout — generates daily reconciliation report at end of day
// 2. Payment reconciliation — flags mismatches between payments and ledger entries
// 3. Settlement mapping — maps Stripe payouts to individual commerce payments
//
// All jobs are non-blocking. Failures are logged, never thrown to callers.

import { inngest } from './inngest-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/logger'

const log = createLogger('commerce-jobs')

// ─── Job 1: Business Day Closeout ─────────────────────────────────
// Triggered daily or when a register session closes.
// Generates the daily reconciliation report for a given tenant + date.

export const commerceDayCloseout = inngest.createFunction(
  {
    id: 'commerce-day-closeout',
    name: 'Commerce Day Closeout',
    retries: 2,
  },
  { event: 'chefflow/commerce.day-closeout' },
  async ({ event, step }) => {
    const { tenantId, reportDate } = event.data

    const result = await step.run('generate-reconciliation-report', async () => {
      const supabase = createAdminClient()

      // Date range for the report day
      const dayStart = `${reportDate}T00:00:00.000Z`
      const dayEnd = `${reportDate}T23:59:59.999Z`

      // Sales totals
      const { data: sales } = await supabase
        .from('sales')
        .select('id, subtotal_cents, tax_cents, total_cents, tip_cents, status')
        .eq('tenant_id', tenantId)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)

      const validSales = (sales ?? []).filter(
        (s: any) => s.status !== 'voided' && s.status !== 'draft'
      )

      const totalSalesCount = validSales.length
      const totalRevenueCents = validSales.reduce(
        (sum: number, s: any) => sum + (s.total_cents ?? 0),
        0
      )
      const totalTipsCents = validSales.reduce((sum: number, s: any) => sum + (s.tip_cents ?? 0), 0)
      const totalTaxCents = validSales.reduce((sum: number, s: any) => sum + (s.tax_cents ?? 0), 0)

      // Payment breakdown
      const { data: payments } = await supabase
        .from('commerce_payments')
        .select('amount_cents, payment_method, status')
        .eq('tenant_id', tenantId)
        .in('status', ['captured', 'settled'])
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)

      let cashTotalCents = 0
      let cardTotalCents = 0
      let otherTotalCents = 0

      for (const p of (payments ?? []) as any[]) {
        if (p.payment_method === 'cash') cashTotalCents += p.amount_cents
        else if (p.payment_method === 'card') cardTotalCents += p.amount_cents
        else otherTotalCents += p.amount_cents
      }

      // Refunds
      const { data: refunds } = await supabase
        .from('commerce_refunds')
        .select('amount_cents')
        .eq('tenant_id', tenantId)
        .eq('status', 'processed')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)

      const totalRefundsCents = (refunds ?? []).reduce(
        (sum: number, r: any) => sum + (r.amount_cents ?? 0),
        0
      )

      // Cash drawer
      const { data: sessions } = await supabase
        .from('register_sessions')
        .select('opening_cash_cents, closing_cash_cents, expected_cash_cents, cash_variance_cents')
        .eq('tenant_id', tenantId)
        .eq('status', 'closed')
        .gte('closed_at', dayStart)
        .lte('closed_at', dayEnd)

      const openingCash = sessions?.length
        ? (sessions as any[]).reduce((sum, s) => sum + (s.opening_cash_cents ?? 0), 0)
        : null
      const closingCash = sessions?.length
        ? (sessions as any[]).reduce((sum, s) => sum + (s.closing_cash_cents ?? 0), 0)
        : null
      const expectedCash = sessions?.length
        ? (sessions as any[]).reduce((sum, s) => sum + (s.expected_cash_cents ?? 0), 0)
        : null
      const cashVariance = sessions?.length
        ? (sessions as any[]).reduce((sum, s) => sum + (s.cash_variance_cents ?? 0), 0)
        : null

      // Flags
      const flags: any[] = []
      if (cashVariance !== null && Math.abs(cashVariance) > 100) {
        flags.push({
          type: 'cash_variance',
          severity: Math.abs(cashVariance) > 1000 ? 'error' : 'warning',
          message: `Cash drawer variance: $${(cashVariance / 100).toFixed(2)}`,
          status: 'open',
        })
      }

      // Upsert
      const { error } = await supabase.from('daily_reconciliation_reports').upsert(
        {
          tenant_id: tenantId,
          report_date: reportDate,
          total_sales_count: totalSalesCount,
          total_revenue_cents: totalRevenueCents,
          total_tips_cents: totalTipsCents,
          total_tax_cents: totalTaxCents,
          total_refunds_cents: totalRefundsCents,
          net_revenue_cents: totalRevenueCents - totalRefundsCents,
          cash_total_cents: cashTotalCents,
          card_total_cents: cardTotalCents,
          other_total_cents: otherTotalCents,
          opening_cash_cents: openingCash,
          closing_cash_cents: closingCash,
          expected_cash_cents: expectedCash,
          cash_variance_cents: cashVariance,
          flags: JSON.stringify(flags),
        } as any,
        { onConflict: 'tenant_id,report_date' }
      )

      if (error) {
        log.error('Failed to generate reconciliation report', {
          context: { tenantId, reportDate, error: error.message },
        })
        throw error
      }

      log.info('Daily reconciliation report generated', {
        context: { tenantId, reportDate, salesCount: totalSalesCount, flags: flags.length },
      })

      return { salesCount: totalSalesCount, flags: flags.length }
    })

    return result
  }
)

// ─── Job 2: Payment Reconciliation ────────────────────────────────
// Flags payments without matching ledger entries and vice versa.

export const commercePaymentReconciliation = inngest.createFunction(
  {
    id: 'commerce-payment-reconciliation',
    name: 'Commerce Payment Reconciliation',
    retries: 2,
  },
  { event: 'chefflow/commerce.reconcile-payments' },
  async ({ event, step }) => {
    const { tenantId, reportDate } = event.data

    const result = await step.run('reconcile-payments', async () => {
      const supabase = createAdminClient()

      const dayStart = `${reportDate}T00:00:00.000Z`
      const dayEnd = `${reportDate}T23:59:59.999Z`

      // Get all captured/settled payments for the day
      const { data: payments } = await supabase
        .from('commerce_payments')
        .select('id, amount_cents, ledger_entry_id, transaction_reference')
        .eq('tenant_id', tenantId)
        .in('status', ['captured', 'settled'])
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)

      const flags: any[] = []
      let orphanPayments = 0
      let orphanLedger = 0

      // Check for payments without ledger entries
      for (const p of (payments ?? []) as any[]) {
        if (!p.ledger_entry_id) {
          orphanPayments++
          flags.push({
            type: 'payment_without_ledger',
            severity: 'error',
            message: `Payment ${p.id} ($${(p.amount_cents / 100).toFixed(2)}) has no ledger entry`,
            status: 'open',
          })
        }
      }

      // Check for commerce ledger entries without matching payments
      const { data: ledgerEntries } = await supabase
        .from('ledger_entries')
        .select('id, transaction_reference, amount_cents')
        .eq('tenant_id', tenantId)
        .like('transaction_reference', 'commerce_%')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)

      const paymentTxnRefs = new Set(
        ((payments ?? []) as any[]).map((p) => p.transaction_reference).filter(Boolean)
      )

      for (const le of (ledgerEntries ?? []) as any[]) {
        if (!paymentTxnRefs.has(le.transaction_reference)) {
          orphanLedger++
          flags.push({
            type: 'ledger_without_payment',
            severity: 'warning',
            message: `Ledger entry ${le.id} (ref: ${le.transaction_reference}) has no matching payment`,
            status: 'open',
          })
        }
      }

      // Append flags to reconciliation report if it exists
      if (flags.length > 0) {
        const { data: report } = await supabase
          .from('daily_reconciliation_reports')
          .select('id, flags')
          .eq('tenant_id', tenantId)
          .eq('report_date', reportDate)
          .single()

        if (report) {
          const existingFlags: any[] = JSON.parse(
            typeof (report as any).flags === 'string'
              ? (report as any).flags
              : JSON.stringify((report as any).flags)
          )
          const mergedFlags = [...existingFlags, ...flags]

          await supabase
            .from('daily_reconciliation_reports')
            .update({ flags: JSON.stringify(mergedFlags) } as any)
            .eq('id', (report as any).id)
        }
      }

      log.info('Payment reconciliation complete', {
        context: { tenantId, reportDate, orphanPayments, orphanLedger },
      })

      return { orphanPayments, orphanLedger, totalFlags: flags.length }
    })

    return result
  }
)

// ─── Job 3: Settlement Mapping ────────────────────────────────────
// Maps a Stripe payout to the individual commerce payments it contains.

export const commerceSettlementMapping = inngest.createFunction(
  {
    id: 'commerce-settlement-mapping',
    name: 'Commerce Settlement Mapping',
    retries: 2,
  },
  { event: 'chefflow/commerce.map-settlement' },
  async ({ event, step }) => {
    const { tenantId, stripePayoutId, payoutAmountCents, payoutStatus, arrivalDate } = event.data

    const result = await step.run('map-settlement-payments', async () => {
      const supabase = createAdminClient()

      // Find unsettled payments that could be part of this payout.
      // In practice, Stripe provides balance_transaction details; here we match by
      // unsettled captured payments for the tenant ordered by creation date.
      const { data: unsettledPayments } = await supabase
        .from('commerce_payments')
        .select('id, amount_cents, tip_cents, stripe_payment_intent_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'captured')
        .order('created_at', { ascending: true })

      // Greedily match payments to the payout amount
      let remainingCents = payoutAmountCents
      const matchedPaymentIds: string[] = []
      let grossCents = 0

      for (const p of (unsettledPayments ?? []) as any[]) {
        if (remainingCents <= 0) break
        const paymentTotal = (p.amount_cents ?? 0) + (p.tip_cents ?? 0)
        matchedPaymentIds.push(p.id)
        grossCents += paymentTotal
        remainingCents -= paymentTotal
      }

      const feeCents = grossCents - payoutAmountCents
      const netCents = payoutAmountCents

      // Upsert settlement record
      const { error: settleErr } = await supabase.from('settlement_records').upsert(
        {
          tenant_id: tenantId,
          stripe_payout_id: stripePayoutId,
          payout_amount_cents: payoutAmountCents,
          payout_status: payoutStatus || 'paid',
          payout_arrival_date: arrivalDate || null,
          gross_amount_cents: grossCents,
          fee_amount_cents: Math.max(0, feeCents),
          net_amount_cents: netCents,
          payment_ids: JSON.stringify(matchedPaymentIds),
          payment_count: matchedPaymentIds.length,
        } as any,
        { onConflict: 'tenant_id,stripe_payout_id' }
      )

      if (settleErr) {
        log.error('Failed to upsert settlement record', {
          context: { tenantId, stripePayoutId, error: settleErr.message },
        })
        throw settleErr
      }

      // Mark matched payments as settled
      if (matchedPaymentIds.length > 0) {
        await supabase
          .from('commerce_payments')
          .update({
            status: 'settled',
            settled_at: new Date().toISOString(),
          } as any)
          .eq('tenant_id', tenantId)
          .in('id', matchedPaymentIds)
      }

      log.info('Settlement mapped', {
        context: {
          tenantId,
          stripePayoutId,
          matchedPayments: matchedPaymentIds.length,
          grossCents,
          netCents,
        },
      })

      return { matchedPayments: matchedPaymentIds.length, grossCents, netCents }
    })

    return result
  }
)
