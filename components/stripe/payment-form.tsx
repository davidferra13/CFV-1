// Stripe Payment Form - Client-side payment collection
'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils/currency'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CheckoutFormProps {
  amount: number
  eventId: string
  onSuccess: () => void
}

function CheckoutForm({ amount, eventId, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/my-events/${eventId}?payment=success`,
      },
    })

    if (submitError) {
      setError(submitError.message || 'Payment failed')
      setLoading(false)
    } else {
      // Payment succeeded, redirected to return_url
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="bg-brand-950 border border-brand-700 rounded-md p-4">
        <div className="text-sm text-brand-300">
          <p className="font-medium">Payment Amount</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(amount)}</p>
        </div>
      </div>

      <PaymentElement />

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        loading={loading}
        disabled={!stripe || !elements}
      >
        Pay {formatCurrency(amount)}
      </Button>

      <p className="text-xs text-stone-500 text-center">Secure payment powered by Stripe</p>
    </form>
  )
}

interface PaymentFormProps {
  clientSecret: string
  amount: number
  eventId: string
  onSuccess: () => void
}

export function PaymentForm({ clientSecret, amount, eventId, onSuccess }: PaymentFormProps) {
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
      },
    },
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm amount={amount} eventId={eventId} onSuccess={onSuccess} />
    </Elements>
  )
}
