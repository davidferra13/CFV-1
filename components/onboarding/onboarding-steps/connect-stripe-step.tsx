'use client'

import { useState } from 'react'
import { createConnectAccountLink } from '@/lib/stripe/connect'

type ConnectStripeStepProps = {
  onComplete: (data?: Record<string, unknown>) => void
  onSkip: () => void
}

export function ConnectStripeStep({ onComplete, onSkip }: ConnectStripeStepProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setLoading(true)
    setError(null)
    try {
      const { url } = await createConnectAccountLink(true)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Stripe setup')
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Get paid directly</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Connect your Stripe account so clients can pay you directly through ChefFlow.
        You keep your earnings, minus standard Stripe processing fees and a 1% platform fee.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleConnect}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
        >
          {loading ? 'Setting up...' : 'Connect Stripe'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          Skip for now
        </button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        You can always set this up later in Settings. Stripe Connect uses Express accounts
        for independent businesses.
      </p>
    </div>
  )
}
