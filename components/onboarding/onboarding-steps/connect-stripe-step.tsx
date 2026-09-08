'use client'

import { useState } from 'react'
import { createConnectAccountLink, prepareConnectAccountLinkApproval } from '@/lib/stripe/connect'
import { approveExactActionRequest } from '@/lib/security/exact-action-approval-actions'
import type { ExactApprovalRequest } from '@/lib/security/exact-action-approval'

type ConnectStripeStepProps = {
  onComplete: (data?: Record<string, unknown>) => void
  onSkip: () => void
}

export function ConnectStripeStep({ onComplete, onSkip }: ConnectStripeStepProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approval, setApproval] = useState<ExactApprovalRequest | null>(null)

  async function handleConnect() {
    setLoading(true)
    setError(null)
    try {
      if (!approval) {
        setApproval(await prepareConnectAccountLinkApproval(true))
        setLoading(false)
        return
      }
      await approveExactActionRequest({
        approvalId: approval.approvalId,
        displayedActionHash: approval.preview.actionHash,
      })
      const { url } = await createConnectAccountLink(true, approval.approvalId)
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
        Connect your Stripe account so clients can pay you directly through ChefFlow. You keep your
        earnings, minus standard Stripe processing fees and a 1% platform fee.
      </p>

      {approval && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="font-semibold">Exact approval required</p>
          <p className="mt-1">
            Create the Stripe account and one-time onboarding link shown here. This approval expires
            and can be used once.
          </p>
          <dl className="mt-3 space-y-1 text-xs">
            <div>
              <dt className="inline font-medium">Account: </dt>
              <dd className="inline">{String(approval.preview.action.target.accountId)}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Email: </dt>
              <dd className="inline">{String(approval.preview.action.payload.email ?? 'none')}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Business: </dt>
              <dd className="inline">
                {String(approval.preview.action.payload.businessName ?? 'none')}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Return URL: </dt>
              <dd className="inline break-all">
                {String(approval.preview.action.payload.returnUrl)}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Expires: </dt>
              <dd className="inline">
                {new Date(approval.preview.expiresAt).toLocaleTimeString()}
              </dd>
            </div>
          </dl>
          <p className="mt-2 break-all text-xs opacity-70">Action {approval.preview.actionHash}</p>
        </div>
      )}

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
          {loading ? 'Setting up...' : approval ? 'Approve exact Stripe setup' : 'Connect Stripe'}
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
        You can always set this up later in Settings. Stripe Connect uses Express accounts for
        independent businesses.
      </p>
    </div>
  )
}
