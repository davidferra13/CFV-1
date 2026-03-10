'use client'

import { ArrowRight } from 'lucide-react'

type ProposalPriceSummaryProps = {
  baseTotal: number
  addonTotal: number
  effectiveTotal: number
  depositAmount: number | null
  hasContract: boolean
  step: string
  onContinueToContract: () => void
  onContinueToPayment: () => void
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ProposalPriceSummary({
  baseTotal,
  addonTotal,
  effectiveTotal,
  depositAmount,
  hasContract,
  step,
  onContinueToContract,
  onContinueToPayment,
}: ProposalPriceSummaryProps) {
  const showDeposit = depositAmount !== null && depositAmount < effectiveTotal

  // Determine CTA based on step
  let ctaLabel: string
  let ctaAction: () => void

  if (step === 'review' && hasContract) {
    ctaLabel = 'Continue to Contract'
    ctaAction = onContinueToContract
  } else {
    ctaLabel = showDeposit ? `Pay Deposit (${formatCents(depositAmount!)})` : 'Continue to Payment'
    ctaAction = onContinueToPayment
  }

  return (
    <>
      {/* Mobile: fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              {addonTotal > 0 && (
                <p className="text-xs text-gray-500">
                  Base {formatCents(baseTotal)} + {formatCents(addonTotal)} add-ons
                </p>
              )}
              <p className="text-lg font-bold text-gray-900">{formatCents(effectiveTotal)}</p>
            </div>
            <button
              onClick={ctaAction}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 active:bg-amber-800"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: inline summary card */}
      <div className="hidden md:block mx-auto max-w-2xl px-4 sm:px-6">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Investment Summary
          </h3>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Base price</span>
              <span>{formatCents(baseTotal)}</span>
            </div>
            {addonTotal > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Enhancements</span>
                <span>+{formatCents(addonTotal)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4 mb-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="text-2xl font-bold text-gray-900">
                {formatCents(effectiveTotal)}
              </span>
            </div>
            {showDeposit && (
              <p className="text-right text-xs text-gray-500 mt-1">
                Deposit due today: {formatCents(depositAmount!)}
              </p>
            )}
          </div>

          <button
            onClick={ctaAction}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 active:bg-amber-800"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )
}
