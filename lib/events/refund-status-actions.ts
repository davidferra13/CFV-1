'use server'

import { addBusinessDays } from 'date-fns'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type ClientRefundTimelineStep = {
  key: 'initiated' | 'processing' | 'bank' | 'completed'
  label: string
  state: 'completed' | 'current' | 'upcoming'
  at: string | null
}

export type ClientRefundEntry = {
  id: string
  amountCents: number
  reason: string | null
  status: 'pending' | 'processed' | 'failed'
  initiatedAt: string
  processedAt: string | null
  estimatedCompletionAt: string | null
  methodLabel: string | null
  source: 'processor' | 'manual'
  timeline: ClientRefundTimelineStep[]
}

export type ClientRefundStatusResult = {
  eventStatus: string
  totalPaidCents: number
  totalRefundedCents: number
  entries: ClientRefundEntry[]
  awaitingRefund: boolean
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  venmo: 'Venmo',
  paypal: 'PayPal',
  zelle: 'Zelle',
  card: 'Card',
  check: 'Check',
  other: 'Other',
}

function formatMethodLabel(method: string | null | undefined) {
  if (!method) return null
  return PAYMENT_METHOD_LABELS[method] ?? method
}

function buildTimeline(input: {
  status: 'pending' | 'processed' | 'failed'
  initiatedAt: string
  processedAt: string | null
  estimatedCompletionAt: string | null
}): ClientRefundTimelineStep[] {
  const processingAt = input.processedAt ?? input.initiatedAt

  if (input.status === 'failed') {
    return [
      { key: 'initiated', label: 'Refund initiated', state: 'completed', at: input.initiatedAt },
      { key: 'processing', label: 'Processing', state: 'current', at: processingAt },
      { key: 'bank', label: 'Sent to bank', state: 'upcoming', at: null },
      {
        key: 'completed',
        label: 'Completed',
        state: 'upcoming',
        at: input.estimatedCompletionAt,
      },
    ]
  }

  if (input.status === 'processed') {
    return [
      { key: 'initiated', label: 'Refund initiated', state: 'completed', at: input.initiatedAt },
      { key: 'processing', label: 'Processing', state: 'completed', at: processingAt },
      { key: 'bank', label: 'Sent to bank', state: 'completed', at: input.processedAt },
      {
        key: 'completed',
        label: 'Completed',
        state: 'current',
        at: input.estimatedCompletionAt,
      },
    ]
  }

  return [
    { key: 'initiated', label: 'Refund initiated', state: 'completed', at: input.initiatedAt },
    { key: 'processing', label: 'Processing', state: 'current', at: processingAt },
    { key: 'bank', label: 'Sent to bank', state: 'upcoming', at: null },
    {
      key: 'completed',
      label: 'Completed',
      state: 'upcoming',
      at: input.estimatedCompletionAt,
    },
  ]
}

export async function getClientRefundStatus(
  eventId: string
): Promise<ClientRefundStatusResult | null> {
  const user = await requireClient()
  const adminSupabase: any = createServerClient({ admin: true })

  const [{ data: event, error: eventError }, { data: financial }] = await Promise.all([
    adminSupabase
      .from('events')
      .select('id, status')
      .eq('id', eventId)
      .eq('client_id', user.entityId)
      .single(),
    adminSupabase
      .from('event_financial_summary')
      .select('total_paid_cents, total_refunded_cents')
      .eq('event_id', eventId)
      .maybeSingle(),
  ])

  if (eventError || !event) {
    console.error('[getClientRefundStatus] Event lookup failed:', eventError)
    return null
  }

  const { data: payments, error: paymentsError } = await adminSupabase
    .from('commerce_payments')
    .select('id, payment_method')
    .eq('client_id', user.entityId)
    .eq('event_id', eventId)

  if (paymentsError) {
    console.error('[getClientRefundStatus] Payment lookup failed:', paymentsError)
  }

  const paymentRows = (payments ?? []) as Array<{ id: string; payment_method: string | null }>
  const paymentIds = paymentRows.map((row) => row.id)
  const paymentMethodById = new Map(paymentRows.map((row) => [row.id, row.payment_method]))

  let commerceRefunds: Array<{
    id: string
    payment_id: string
    amount_cents: number
    reason: string | null
    status: 'pending' | 'processed' | 'failed'
    created_at: string
    processed_at: string | null
    ledger_entry_id: string | null
  }> = []

  if (paymentIds.length > 0) {
    const { data, error } = await adminSupabase
      .from('commerce_refunds')
      .select(
        'id, payment_id, amount_cents, reason, status, created_at, processed_at, ledger_entry_id'
      )
      .in('payment_id', paymentIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getClientRefundStatus] Refund lookup failed:', error)
    } else {
      commerceRefunds = data ?? []
    }
  }

  const linkedLedgerIds = new Set(
    commerceRefunds.map((refund) => refund.ledger_entry_id).filter(Boolean) as string[]
  )

  const { data: manualRefundEntries, error: ledgerError } = await adminSupabase
    .from('ledger_entries')
    .select('id, amount_cents, refund_reason, created_at, payment_method, description')
    .eq('event_id', eventId)
    .eq('client_id', user.entityId)
    .eq('entry_type', 'refund')
    .order('created_at', { ascending: false })

  if (ledgerError) {
    console.error('[getClientRefundStatus] Ledger refund lookup failed:', ledgerError)
  }

  const processorEntries: ClientRefundEntry[] = commerceRefunds.map((refund) => {
    const processedAt = refund.processed_at ?? null
    const estimatedCompletionAt = addBusinessDays(
      processedAt ? new Date(processedAt) : new Date(refund.created_at),
      5
    ).toISOString()

    return {
      id: refund.id,
      amountCents: refund.amount_cents,
      reason: refund.reason,
      status: refund.status,
      initiatedAt: refund.created_at,
      processedAt,
      estimatedCompletionAt,
      methodLabel: formatMethodLabel(paymentMethodById.get(refund.payment_id)),
      source: 'processor',
      timeline: buildTimeline({
        status: refund.status,
        initiatedAt: refund.created_at,
        processedAt,
        estimatedCompletionAt,
      }),
    }
  })

  const manualEntries: ClientRefundEntry[] = (
    (manualRefundEntries ?? []) as Array<{
      id: string
      amount_cents: number
      refund_reason: string | null
      created_at: string
      payment_method: string | null
      description: string | null
    }>
  )
    .filter((entry) => !linkedLedgerIds.has(entry.id))
    .map((entry) => {
      const estimatedCompletionAt = addBusinessDays(new Date(entry.created_at), 3).toISOString()

      return {
        id: entry.id,
        amountCents: Math.abs(entry.amount_cents),
        reason: entry.refund_reason ?? entry.description ?? null,
        status: 'processed',
        initiatedAt: entry.created_at,
        processedAt: entry.created_at,
        estimatedCompletionAt,
        methodLabel: formatMethodLabel(entry.payment_method),
        source: 'manual',
        timeline: buildTimeline({
          status: 'processed',
          initiatedAt: entry.created_at,
          processedAt: entry.created_at,
          estimatedCompletionAt,
        }),
      }
    })

  const entries = [...processorEntries, ...manualEntries].sort(
    (a, b) => new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime()
  )

  const totalPaidCents = financial?.total_paid_cents ?? 0
  const totalRefundedCents = financial?.total_refunded_cents ?? 0

  return {
    eventStatus: event.status,
    totalPaidCents,
    totalRefundedCents,
    entries,
    awaitingRefund:
      event.status === 'cancelled' && totalPaidCents > totalRefundedCents && entries.length === 0,
  }
}
