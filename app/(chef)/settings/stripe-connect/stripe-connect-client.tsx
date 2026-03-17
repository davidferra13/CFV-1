'use client'

// Stripe Connect - Client Component
// Handles the CTA button to initiate Connect onboarding.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createConnectAccountLink, refreshConnectAccountStatus } from '@/lib/stripe/connect'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ConnectAccountStatus } from '@/lib/stripe/connect'

export function StripeConnectClient({ status }: { status: ConnectAccountStatus }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      const { url } = await createConnectAccountLink(false)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Stripe onboarding')
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      await refreshConnectAccountStatus()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh status')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div
        className="bg-stone-900 rounded-xl border border-stone-700 p-6"
        data-tour="chef-setup-payments"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-stone-100">Connection Status</h2>
          <Badge variant={status.connected ? 'success' : status.pending ? 'warning' : 'default'}>
            {status.connected ? 'Connected' : status.pending ? 'In Progress' : 'Not Connected'}
          </Badge>
        </div>

        {status.connected && (
          <div className="space-y-2 text-sm text-stone-400">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Charges enabled - you can accept payments</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Payouts enabled - funds transfer to your bank</span>
            </div>
            {status.accountId && (
              <p className="text-xs text-stone-400 mt-2">Account ID: {status.accountId}</p>
            )}
          </div>
        )}

        {status.pending && (
          <div className="text-sm text-stone-400 space-y-3">
            <p>
              Your Stripe account has been created but onboarding is not yet complete. Click below
              to continue where you left off.
            </p>
            <Button variant="primary" onClick={handleConnect} loading={loading}>
              Continue Stripe Setup
            </Button>
          </div>
        )}

        {!status.connected && !status.pending && (
          <div className="text-sm text-stone-400 space-y-3">
            <p>
              Connect your Stripe account to receive payments directly. Stripe uses bank-level
              security and takes just a few minutes to set up.
            </p>
            <ul className="space-y-1 text-stone-500">
              <li className="flex items-center gap-2">
                <span className="text-stone-400">•</span>
                Direct deposits to your bank account
              </li>
              <li className="flex items-center gap-2">
                <span className="text-stone-400">•</span>
                Automatic payouts on your schedule
              </li>
              <li className="flex items-center gap-2">
                <span className="text-stone-400">•</span>
                Professional invoices and payment tracking
              </li>
            </ul>
            <Button variant="primary" onClick={handleConnect} loading={loading}>
              Connect Stripe Account
            </Button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* Refresh status */}
      {status.accountId && !status.connected && (
        <div className="bg-stone-800 rounded-xl border border-stone-700 p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-stone-400">
            Just completed your Stripe setup? Refresh to update your status.
          </p>
          <Button variant="secondary" size="sm" onClick={handleRefresh} loading={refreshing}>
            Refresh Status
          </Button>
        </div>
      )}

      {/* Connected - manage in Stripe Dashboard */}
      {status.connected && (
        <div className="bg-stone-800 rounded-xl border border-stone-700 p-4">
          <p className="text-sm text-stone-400 mb-3">
            Manage payouts, view payout history, and update your bank account directly in your
            Stripe Dashboard.
          </p>
          <a
            href="https://dashboard.stripe.com/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-400"
          >
            Open Stripe Dashboard →
          </a>
        </div>
      )}
    </div>
  )
}
