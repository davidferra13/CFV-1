'use client'

// PaymentPageClient — orchestrates gift card/voucher redemption + Stripe payment
// Renders RedemptionCodeInput above the payment form.
// When a credit is applied:
//   - If event is fully covered: shows success (no Stripe needed)
//   - Otherwise: remounts PaymentSection via key change so it creates a fresh
//     PaymentIntent that reads the now-reduced outstanding balance from the DB.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RedemptionCodeInput } from '@/components/incentives/redemption-code-input'
import PaymentSection from './payment-section'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

type Props = {
  eventId: string
  outstandingBalanceCents: number
  paymentAmount: number
}

export function PaymentPageClient({ eventId, outstandingBalanceCents, paymentAmount }: Props) {
  const router = useRouter()
  const [creditAppliedCents, setCreditAppliedCents] = useState(0)
  const [paymentKey, setPaymentKey] = useState(0) // increments to force PaymentSection remount
  const [eventFullyCovered, setEventFullyCovered] = useState(false)

  function handleCreditApplied(appliedCents: number, fullyCovered: boolean) {
    setCreditAppliedCents(appliedCents)
    setPaymentKey((k) => k + 1) // remount PaymentSection so it reads updated DB balance
    if (fullyCovered) {
      setEventFullyCovered(true)
    }
  }

  function handleCreditCleared() {
    setCreditAppliedCents(0)
    setPaymentKey((k) => k + 1)
    setEventFullyCovered(false)
  }

  // After gift card fully covers the event, the FSM already transitioned to 'paid'.
  // Show a success message instead of the Stripe form.
  if (eventFullyCovered) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <div className="w-12 h-12 bg-green-900 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-6 h-6 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Payment complete!</h2>
            <p className="text-stone-400 text-sm mt-1">
              Your gift card covered the full balance. Your event is now confirmed.
            </p>
          </div>
          <button
            onClick={() => router.push(`/my-events/${eventId}`)}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition text-sm"
          >
            View event
          </button>
        </CardContent>
      </Card>
    )
  }

  const displayAmount =
    creditAppliedCents > 0 ? Math.max(0, paymentAmount - creditAppliedCents) : paymentAmount

  return (
    <div className="space-y-4">
      {/* Gift card / voucher input */}
      <RedemptionCodeInput
        eventId={eventId}
        outstandingBalanceCents={outstandingBalanceCents}
        onApplied={handleCreditApplied}
        onCleared={handleCreditCleared}
      />

      {/* Stripe payment form */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          {creditAppliedCents > 0 && (
            <p className="text-sm text-emerald-600 font-medium">
              {formatCurrency(creditAppliedCents)} gift card credit applied
            </p>
          )}
        </CardHeader>
        <CardContent>
          <PaymentSection key={paymentKey} eventId={eventId} amount={displayAmount} />
        </CardContent>
      </Card>
    </div>
  )
}
