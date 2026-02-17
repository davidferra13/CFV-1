// Payment Section - Stripe integration for event payments

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPaymentIntent } from '@/lib/stripe/actions'
import { PaymentForm } from '@/components/stripe/payment-form'
import { Alert } from '@/components/ui/alert'

export default function PaymentSection({
  eventId,
  amount
}: {
  eventId: string
  amount: number
}) {
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Create payment intent on mount
    async function initPayment() {
      try {
        const result = await createPaymentIntent(eventId)
        setClientSecret(result.clientSecret!)
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'Failed to initialize payment')
        setLoading(false)
      }
    }

    initPayment()
  }, [eventId])

  const handleSuccess = () => {
    // Payment succeeded, redirect to event detail
    router.push(`/my-events/${eventId}?payment=success`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-brand-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-stone-600">Loading payment form...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="error">
        {error}
      </Alert>
    )
  }

  if (!clientSecret) {
    return (
      <Alert variant="error">
        Failed to initialize payment. Please try again.
      </Alert>
    )
  }

  return (
    <div>
      <PaymentForm
        clientSecret={clientSecret}
        amount={amount}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
