'use client'

// Initiate Refund Modal
// Shown on cancelled events that have prior payments.
// Pre-populates the recommended refund amount from the cancellation policy.
// Chef can review and override before confirming.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { initiateRefund } from '@/lib/cancellation/refund-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type PolicyTier = 'full_refund' | 'full_refund_24hr' | 'no_refund'

type RefundRecommendation = {
  refundAmountCents: number
  depositRefundCents: number
  balanceRefundCents: number
  policyTier: PolicyTier
  description: string
  depositNonRefundableWarning: boolean
}

type Props = {
  eventId: string
  totalPaidCents: number
  totalRefundedCents: number
  depositPaidCents: number
  recommendation: RefundRecommendation
  onClose: () => void
}

export function InitiateRefundModal({
  eventId,
  totalPaidCents,
  totalRefundedCents,
  depositPaidCents,
  recommendation,
  onClose,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const netPaidCents = totalPaidCents - totalRefundedCents
  const maxRefundCents = netPaidCents

  const defaultAmountDollars =
    recommendation.refundAmountCents > 0
      ? (recommendation.refundAmountCents / 100).toFixed(2)
      : '0.00'

  const [amountDollars, setAmountDollars] = useState(defaultAmountDollars)
  const [refundDepositAlso, setRefundDepositAlso] = useState(recommendation.depositRefundCents > 0)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const tierBadge: Record<PolicyTier, { label: string; color: string }> = {
    full_refund: { label: 'Full refund eligible', color: 'bg-green-900 text-green-800' },
    full_refund_24hr: { label: 'Full refund (24-hr window)', color: 'bg-green-900 text-green-800' },
    no_refund: { label: 'No refund per policy', color: 'bg-red-900 text-red-800' },
  }

  const badge = tierBadge[recommendation.policyTier]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!reason.trim()) {
      setError('Please provide a reason for the refund')
      return
    }

    const dollars = parseFloat(amountDollars)
    if (isNaN(dollars) || dollars <= 0) {
      setError('Please enter a valid amount')
      return
    }

    const amountCents = Math.round(dollars * 100)
    if (amountCents > maxRefundCents) {
      setError(`Cannot refund more than ${formatCurrency(maxRefundCents)} (net amount paid)`)
      return
    }

    startTransition(async () => {
      try {
        await initiateRefund({
          eventId,
          amountCents,
          refundDepositAlso,
          reason: reason.trim(),
        })
        setSuccess(true)
        setTimeout(() => {
          onClose()
          router.refresh()
        }, 1500)
      } catch (err) {
        setError((err as Error).message || 'Failed to initiate refund')
      }
    })
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">✓</div>
          <p className="text-lg font-semibold text-stone-100">Refund initiated</p>
          <p className="text-sm text-stone-500 mt-1">
            Client has been notified. Page refreshing...
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-stone-100">Process Refund</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-400 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Policy recommendation */}
        <div className="mb-6 p-4 bg-stone-800 rounded-lg border border-stone-700">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-stone-400">{recommendation.description}</p>

          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Total paid</span>
              <span className="font-medium">{formatCurrency(totalPaidCents)}</span>
            </div>
            {totalRefundedCents > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-500">Already refunded</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(totalRefundedCents)}
                </span>
              </div>
            )}
            {depositPaidCents > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-500">Deposit paid</span>
                <span className="font-medium">{formatCurrency(depositPaidCents)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-stone-700">
              <span className="text-stone-300 font-medium">Net refundable</span>
              <span className="font-bold">{formatCurrency(maxRefundCents)}</span>
            </div>
          </div>

          {recommendation.depositNonRefundableWarning && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-950 px-3 py-2 rounded">
              The deposit ({formatCurrency(depositPaidCents)}) is non-refundable per policy.
              Override below only with client agreement.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Refund amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={(maxRefundCents / 100).toFixed(2)}
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-stone-600 rounded-md text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="0.00"
                required
              />
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Policy recommends {formatCurrency(recommendation.refundAmountCents)}. You can adjust.
            </p>
          </div>

          {/* Deposit override - only show if deposit was paid and is non-refundable */}
          {depositPaidCents > 0 && recommendation.depositNonRefundableWarning && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="refundDeposit"
                checked={refundDepositAlso}
                onChange={(e) => setRefundDepositAlso(e.target.checked)}
                className="h-4 w-4 text-brand-600 rounded border-stone-600"
              />
              <label htmlFor="refundDeposit" className="text-sm text-stone-300">
                Also refund deposit ({formatCurrency(depositPaidCents)}) - chef discretion override
              </label>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-stone-600 rounded-md text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="e.g. Client cancelled 20 days before event - full balance refund per policy"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-950 px-3 py-2 rounded-md">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={isPending}
              disabled={isPending || maxRefundCents === 0}
            >
              {isPending ? 'Processing...' : 'Issue Refund'}
            </Button>
          </div>
        </form>

        <p className="text-xs text-stone-400 mt-4 text-center">
          The client will receive a refund confirmation email automatically. Stripe refunds
          typically take 3–5 business days.
        </p>
      </Card>
    </div>
  )
}
