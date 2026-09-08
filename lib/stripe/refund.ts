// Stripe refund provider boundary.
// Every refund requires a current, single-use approval bound to the exact charge,
// amount, reason, account context, and Stripe state observed during preview.

import { randomUUID } from 'node:crypto'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { breakers } from '@/lib/resilience/circuit-breaker'
import {
  executeExactApprovedAction,
  loadExactApprovalAction,
  requestExactActionApproval,
  type ExactApprovalRequest,
} from '@/lib/security/exact-action-approval'
import type { ExactAction } from '@/lib/security/exact-action-approval-core'
import type Stripe from 'stripe'

function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

export type StripeRefundResult = {
  refundId: string
  status: string
  amountCents: number
}
type RefundState = {
  paymentIntent: Stripe.PaymentIntent
  charge: Stripe.Charge
  refundableAmount: number
  hasTransfer: boolean
  destinationLast4: string
  contextVersion: string
}

async function readRefundState(paymentIntentId: string): Promise<RefundState> {
  const stripe = getStripe()
  const paymentIntent = await breakers.stripe.execute(() =>
    stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] })
  )
  const charge = paymentIntent.latest_charge as Stripe.Charge | null
  if (!charge?.id) throw new Error(`No charge found on PaymentIntent ${paymentIntentId}`)
  if (charge.refunded) {
    throw new Error(`PaymentIntent ${paymentIntentId} has already been fully refunded`)
  }

  const refundableAmount = charge.amount - (charge.amount_refunded || 0)
  const cardLast4 = charge.payment_method_details?.card?.last4
  return {
    paymentIntent,
    charge,
    refundableAmount,
    hasTransfer: Boolean((charge as Stripe.Charge & { transfer?: string }).transfer),
    destinationLast4: cardLast4 && /^\d{4}$/.test(cardLast4) ? cardLast4 : '0000',
    contextVersion: [
      paymentIntent.id,
      paymentIntent.status,
      charge.id,
      charge.status,
      charge.amount,
      charge.amount_refunded,
      charge.refunded,
    ].join(':'),
  }
}

function buildRefundAction(input: {
  actionId: string
  tenantId: string
  actorId: string
  paymentIntentId: string
  amountCents: number
  reason: string
  state: RefundState
}): ExactAction {
  return {
    actionId: input.actionId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    toolName: 'stripe.refunds.create',
    category: 'finance',
    operation: 'create_refund',
    environment: 'external',
    target: {
      provider: 'stripe',
      paymentIntentId: input.paymentIntentId,
      chargeId: input.state.charge.id,
      destination: 'original_payment_method',
      destinationLast4: input.state.destinationLast4,
    },
    payload: {
      amountMinor: input.amountCents,
      currency: input.state.charge.currency.toUpperCase(),
      reason: input.reason,
      reverseTransfer: input.state.hasTransfer,
      refundApplicationFee: input.state.hasTransfer,
    },
    financialDisclosure: {
      currency: input.state.charge.currency.toUpperCase(),
      grossMinor: input.amountCents,
      fees: [{ label: 'refund adjustment', amountMinor: 0 }],
      netMinor: input.amountCents,
      source: { institution: 'Stripe', accountType: 'platform balance', last4: '0000' },
      destination: {
        institution: 'Original payment method',
        accountType: 'customer payment method',
        last4: input.state.destinationLast4,
      },
      timing: 'Stripe refund timing shown by the original payment rail',
      rail: 'original payment method',
      reversible: false,
      reversalPath: 'Contact Stripe; a submitted refund cannot normally be cancelled',
      noActionResult: 'No money moves and the existing charge remains unchanged',
    },
    contextVersion: input.state.contextVersion,
  }
}
export async function prepareStripeRefundApproval(
  paymentIntentId: string,
  amountCents: number,
  reason = 'requested_by_customer'
): Promise<ExactApprovalRequest> {
  const user = await requireChef()
  const state = await readRefundState(paymentIntentId)
  validateRefundAmount(amountCents, state.refundableAmount, paymentIntentId)
  return requestExactActionApproval(
    buildRefundAction({
      actionId: randomUUID(),
      tenantId: user.tenantId!,
      actorId: user.id,
      paymentIntentId,
      amountCents,
      reason,
      state,
    })
  )
}

export async function createStripeRefund(
  paymentIntentId: string,
  amountCents: number,
  reason: string,
  approvalId: string
): Promise<StripeRefundResult> {
  if (!approvalId) throw new Error('exact_approval_required')
  const [{ action: approvedAction }, state] = await Promise.all([
    loadExactApprovalAction(approvalId),
    readRefundState(paymentIntentId),
  ])
  validateRefundAmount(amountCents, state.refundableAmount, paymentIntentId)

  const action = buildRefundAction({
    actionId: approvedAction.actionId,
    tenantId: approvedAction.tenantId,
    actorId: approvedAction.actorId,
    paymentIntentId,
    amountCents,
    reason,
    state,
  })
  const stripe = getStripe()
  const execution = await executeExactApprovedAction({
    approvalId,
    action,
    invoke: () =>
      breakers.stripe.execute(() =>
        stripe.refunds.create(
          {
            charge: state.charge.id,
            amount: amountCents,
            reason: reason as Stripe.RefundCreateParams.Reason,
            ...(state.hasTransfer ? { reverse_transfer: true, refund_application_fee: true } : {}),
          },
          { idempotencyKey: `exact_approval_refund_${approvalId}` }
        )
      ),
    verify: async (created) => {
      const verified = await stripe.refunds.retrieve(created.id)
      return {
        verified: verified.id === created.id && verified.amount === amountCents,
        receiptId: verified.id,
        providerState: verified.status ?? 'unknown',
      }
    },
  })
  return {
    refundId: execution.result.id,
    status: execution.result.status ?? 'unknown',
    amountCents: execution.result.amount,
  }
}

function validateRefundAmount(
  amountCents: number,
  refundableAmount: number,
  paymentIntentId: string
): void {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error('Refund amount must be a positive integer (cents)')
  }
  if (amountCents > refundableAmount) {
    throw new Error(
      `Refund amount (${amountCents}) exceeds refundable amount (${refundableAmount}) for PaymentIntent ${paymentIntentId}`
    )
  }
}

export async function getStripePaymentIntentIdForEvent(eventId: string): Promise<string | null> {
  const db = createServerClient({ admin: true })
  const { data: entries } = await db
    .from('ledger_entries')
    .select('internal_notes, transaction_reference')
    .eq('event_id', eventId)
    .in('entry_type', ['payment', 'deposit'])
    .eq('is_refund', false)
    .not('transaction_reference', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!entries || entries.length === 0) return null
  const notes = entries[0].internal_notes ?? ''
  const match = notes.match(/PaymentIntent:\s*(pi_\w+)/)
  return match ? match[1] : null
}
