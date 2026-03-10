'use client'

import { useState, useTransition } from 'react'
import { CreditCard, AlertCircle, Lock } from 'lucide-react'
import { acceptProposalAndSign } from '@/lib/proposal/actions'

type ProposalPaymentProps = {
  token: string
  effectiveTotal: number
  depositAmount: number | null
  selectedAddonIds: string[]
  signatureDataUrl: string | null
  agreedToTerms: boolean
  hasContract: boolean
  onSuccess: () => void
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ProposalPayment({
  token,
  effectiveTotal,
  depositAmount,
  selectedAddonIds,
  signatureDataUrl,
  agreedToTerms,
  hasContract,
  onSuccess,
}: ProposalPaymentProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const paymentAmount = depositAmount ?? effectiveTotal
  const isDeposit = depositAmount !== null && depositAmount < effectiveTotal

  // Validation
  const missingSignature = hasContract && !signatureDataUrl
  const missingAgreement = hasContract && !agreedToTerms
  const canPay = !missingSignature && !missingAgreement

  function handlePay() {
    if (!canPay) return

    setError(null)

    startTransition(async () => {
      try {
        const result = await acceptProposalAndSign({
          token,
          selectedAddonIds,
          signatureDataUrl: signatureDataUrl || '',
          // IP and user agent will be captured server-side
          signerIp: undefined,
          signerUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        })

        if (!result.success) {
          setError('Something went wrong. Please try again.')
          return
        }

        if (result.checkoutUrl) {
          // Redirect to Stripe Checkout
          window.location.href = result.checkoutUrl
        } else {
          // No checkout needed (e.g., payment setup pending)
          onSuccess()
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        setError(message)
      }
    })
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="h-5 w-5 text-amber-600" />
        <h2 className="text-xl font-semibold text-gray-900">Payment</h2>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-6">
        {/* Amount display */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-1">
            {isDeposit ? 'Deposit due today' : 'Total due'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{formatCents(paymentAmount)}</p>
          {isDeposit && (
            <p className="text-xs text-gray-400 mt-1">of {formatCents(effectiveTotal)} total</p>
          )}
        </div>

        {/* Validation messages */}
        {missingSignature && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 mb-4">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Please sign the contract above before proceeding to payment.</span>
          </div>
        )}

        {!missingSignature && missingAgreement && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 mb-4">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Please agree to the terms above before proceeding.</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={!canPay || isPending}
          className={`
            w-full flex items-center justify-center gap-2 rounded-lg px-5 py-3.5
            text-base font-semibold text-white shadow-sm transition-all
            ${
              canPay && !isPending
                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 active:scale-[0.98]'
                : 'bg-gray-300 cursor-not-allowed'
            }
          `}
        >
          {isPending ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              {isDeposit
                ? `Pay ${formatCents(paymentAmount)} Deposit`
                : `Pay ${formatCents(paymentAmount)}`}
            </>
          )}
        </button>

        {/* Security note */}
        <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secure payment powered by Stripe
        </p>
      </div>
    </section>
  )
}
