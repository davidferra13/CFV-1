// Client Payment Page - Pay for accepted events

import { requireClient } from '@/lib/auth/get-user'
import { getClientEventContract } from '@/lib/contracts/actions'
import { getClientEventById } from '@/lib/events/client-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { PaymentPageClient } from './payment-page-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { SessionHeartbeat } from '@/components/activity/session-heartbeat'
import { CancellationPolicyDisplay } from '@/components/events/cancellation-policy-display'

export default async function PaymentPage({ params }: { params: { id: string } }) {
  await requireClient()

  const [event, contract] = await Promise.all([
    getClientEventById(params.id),
    getClientEventContract(params.id).catch(() => null),
  ])

  if (!event) {
    notFound()
  }

  // Allow payment for any post-proposal status with an outstanding balance
  const payableStatuses = ['accepted', 'paid', 'confirmed', 'in_progress', 'completed']
  if (!payableStatuses.includes(event.status)) {
    redirect(`/my-events/${params.id}`)
  }

  const financial = event.financial
  const totalPaidCents = financial?.totalPaidCents ?? 0
  const quotedPriceCents = financial?.quotedPriceCents ?? event.quoted_price_cents ?? 0
  const outstandingBalanceCents = financial?.outstandingBalanceCents ?? quotedPriceCents
  const contractStatus = event.hasContract ? (contract?.status ?? event.contractStatus ?? null) : null

  if (event.status === 'accepted' && event.hasContract && !event.contractSignedAt) {
    if (contractStatus === 'sent' || contractStatus === 'viewed') {
      redirect(`/my-events/${params.id}/contract?next=payment`)
    }
    redirect(`/my-events/${params.id}/proposal`)
  }

  // Determine payment amount (deposit or full balance)
  const depositAmountCents = event.deposit_amount_cents ?? 0
  if (
    quotedPriceCents <= 0 ||
    depositAmountCents < 0 ||
    (quotedPriceCents > 0 && depositAmountCents > quotedPriceCents)
  ) {
    redirect(`/my-events/${params.id}`)
  }

  const hasDeposit = depositAmountCents > 0
  const paymentAmount =
    hasDeposit && totalPaidCents === 0 ? depositAmountCents : outstandingBalanceCents

  if (paymentAmount <= 0) {
    redirect(`/my-events/${params.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/my-events/${params.id}`}
          className="text-brand-500 hover:text-brand-400 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Event Details
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-100 mb-2">Complete Payment</h1>
        <p className="text-stone-400">Secure payment for {event.occasion || 'your event'}</p>
      </div>

      {/* Payment Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Event Info */}
            <div className="pb-4 border-b">
              <h3 className="font-semibold text-stone-100 mb-2">
                {event.occasion || 'Upcoming Event'}
              </h3>
              <div className="text-sm text-stone-400 space-y-1">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{format(new Date(event.event_date), 'PPP')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>{event.guest_count} guests</span>
                </div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Total</span>
                <span className="text-base font-semibold text-stone-100">
                  {formatCurrency(quotedPriceCents)}
                </span>
              </div>

              {totalPaidCents > 0 && (
                <div className="flex justify-between text-stone-400">
                  <span>Already Paid</span>
                  <span className="font-medium text-emerald-600">
                    -{formatCurrency(totalPaidCents)}
                  </span>
                </div>
              )}

              {hasDeposit && totalPaidCents === 0 && (
                <div className="flex justify-between text-sm text-stone-500">
                  <span>Deposit Required</span>
                  <span>{formatCurrency(depositAmountCents)}</span>
                </div>
              )}

              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-stone-100">
                    {hasDeposit && totalPaidCents === 0 ? 'Deposit Amount' : 'Amount Due Today'}
                  </span>
                  <span className="text-2xl font-bold text-stone-100">
                    {formatCurrency(paymentAmount)}
                  </span>
                </div>
              </div>

              {hasDeposit && totalPaidCents === 0 && (
                <Alert variant="info" className="mt-4">
                  <p className="text-sm">
                    You are paying a deposit of {formatCurrency(depositAmountCents)}. The remaining
                    balance of {formatCurrency(outstandingBalanceCents - depositAmountCents)} will
                    be due later.
                  </p>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Policy - shown before payment so client knows the terms */}
      <div className="mb-6">
        <CancellationPolicyDisplay variant="compact" />
      </div>

      {/* Payment form + gift card/voucher redemption */}
      <PaymentPageClient
        eventId={params.id}
        outstandingBalanceCents={outstandingBalanceCents}
        paymentAmount={paymentAmount}
      />

      {/* Security Notice */}
      <div className="mt-6 text-center text-sm text-stone-500">
        <div className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>Secure payment powered by Stripe</span>
        </div>
      </div>

      {/* Activity tracking - payment_page_visited is the highest-intent signal */}
      <ActivityTracker
        eventType="payment_page_visited"
        entityType="event"
        entityId={params.id}
        metadata={{
          payment_amount_cents: paymentAmount,
          has_deposit: hasDeposit,
          occasion: event.occasion,
          event_date: event.event_date,
        }}
      />
      <SessionHeartbeat entityType="event" entityId={params.id} intervalMs={30_000} />
    </div>
  )
}
