'use client'

import { useState } from 'react'
import { approveQuoteFromCircle } from '@/lib/hub/circle-approval-actions'
import { formatCurrency } from '@/lib/utils/currency'

interface CircleApprovalBannerProps {
  quoteId: string
  quoteName: string
  totalCents: number
  groupToken: string
  validUntil: string | null
  /** Link to full quote detail view */
  detailHref?: string
}

export function CircleApprovalBanner({
  quoteId,
  quoteName,
  totalCents,
  groupToken,
  validUntil,
  detailHref,
}: CircleApprovalBannerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approved, setApproved] = useState(false)

  // Check if expired
  const isExpired = validUntil ? new Date(validUntil) < new Date() : false

  if (approved) {
    return (
      <div className="mx-4 mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
        <p className="text-sm font-medium text-emerald-300">Approved! Your dinner is confirmed.</p>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="mx-4 mt-3 rounded-lg border border-stone-700 bg-stone-800/50 p-4 text-center">
        <p className="text-sm text-stone-400">This quote has expired.</p>
      </div>
    )
  }

  const handleApprove = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await approveQuoteFromCircle({ quoteId, groupToken })
      if (result.success) {
        setApproved(true)
      } else {
        setError(result.error || 'Failed to approve')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-4 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-200 truncate">{quoteName}</p>
          <p className="text-lg font-bold text-stone-100">{formatCurrency(totalCents)}</p>
          {validUntil && (
            <p className="text-xs text-stone-400">
              Valid until {new Date(validUntil).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {detailHref && (
            <a
              href={detailHref}
              className="rounded-lg border border-stone-600 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
            >
              Details
            </a>
          )}
          <button
            onClick={handleApprove}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}
