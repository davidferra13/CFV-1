'use client'

// RedemptionCodeInput — Shown on the event payment page
// Lets clients enter a gift card or voucher code to apply a credit before paying.
// Call sequence:
//   1. validateIncentiveCode() for preview (no writes)
//   2. redeemIncentiveCode() when "Pay" is clicked (atomic write via RPC)

import { useState } from 'react'
import { validateIncentiveCode, redeemIncentiveCode } from '@/lib/loyalty/redemption-actions'
import { formatCurrency } from '@/lib/utils/currency'

type ValidationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'valid'; appliedCents: number; remainingCents: number | null; title: string }
  | { status: 'error'; message: string }

type Props = {
  eventId: string
  outstandingBalanceCents: number
  onApplied: (appliedCents: number, eventFullyCovered: boolean) => void
  onCleared: () => void
}

export function RedemptionCodeInput({
  eventId,
  outstandingBalanceCents,
  onApplied,
  onCleared,
}: Props) {
  const [code, setCode] = useState('')
  const [validation, setValidation] = useState<ValidationState>({ status: 'idle' })
  const [applied, setApplied] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleValidate() {
    if (!code.trim()) return
    setValidation({ status: 'loading' })
    try {
      const result = await validateIncentiveCode(code.trim(), eventId)
      if (result.valid) {
        setValidation({
          status: 'valid',
          appliedCents: result.appliedAmountCents,
          remainingCents: result.remainingAfterCents,
          title: result.title,
        })
      } else {
        setValidation({ status: 'error', message: result.error })
      }
    } catch (err: any) {
      setValidation({ status: 'error', message: err.message || 'Could not validate code.' })
    }
  }

  async function handleApply() {
    if (validation.status !== 'valid') return
    setRedeeming(true)
    try {
      const result = await redeemIncentiveCode(code.trim(), eventId)
      setApplied(true)
      onApplied(result.appliedAmountCents, result.eventNowFullyCovered)
    } catch (err: any) {
      setValidation({ status: 'error', message: err.message || 'Failed to apply code.' })
    } finally {
      setRedeeming(false)
    }
  }

  function handleClear() {
    setCode('')
    setValidation({ status: 'idle' })
    setApplied(false)
    onCleared()
  }

  // Show compact "applied" state once redeemed
  if (applied && validation.status === 'valid') {
    return (
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <span className="text-sm font-medium text-green-800">
              {code.toUpperCase()} applied — {formatCurrency(validation.appliedCents)} credit
            </span>
            {validation.remainingCents !== null && validation.remainingCents > 0 && (
              <span className="text-xs text-emerald-600 ml-2">
                ({formatCurrency(validation.remainingCents)} remaining on card)
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleClear}
          className="text-xs text-emerald-600 hover:text-green-800 ml-3"
        >
          Remove
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Toggle */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Have a gift card or voucher code?
        </button>
      ) : (
        <div className="border border-stone-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-700">Apply gift card or voucher</p>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setCode('')
                setValidation({ status: 'idle' })
              }}
              className="text-stone-400 hover:text-stone-600 text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase())
                setValidation({ status: 'idle' })
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
              placeholder="GFT-XXXX or VCH-XXXX"
              className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
              disabled={validation.status === 'valid'}
            />
            {validation.status !== 'valid' ? (
              <button
                type="button"
                onClick={handleValidate}
                disabled={!code.trim() || validation.status === 'loading'}
                className="px-4 py-2 bg-stone-800 text-white text-sm font-medium rounded-lg hover:bg-stone-900 disabled:opacity-50 whitespace-nowrap"
              >
                {validation.status === 'loading' ? '…' : 'Check'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCode('')
                  setValidation({ status: 'idle' })
                }}
                className="px-4 py-2 border border-stone-300 text-stone-600 text-sm font-medium rounded-lg hover:bg-stone-50"
              >
                Clear
              </button>
            )}
          </div>

          {/* Validation feedback */}
          {validation.status === 'error' && (
            <p className="text-sm text-red-600">{validation.message}</p>
          )}

          {validation.status === 'valid' && (
            <div className="bg-stone-50 rounded-lg px-4 py-3 border border-stone-200">
              <p className="text-sm font-medium text-stone-900">
                {code.toUpperCase()} — {formatCurrency(validation.appliedCents)} will be applied
              </p>
              {validation.remainingCents !== null && (
                <p className="text-xs text-stone-500 mt-0.5">
                  {validation.remainingCents > 0
                    ? `${formatCurrency(validation.remainingCents)} will remain on this gift card`
                    : 'This will use the full remaining balance of the gift card'}
                </p>
              )}
              <p className="text-xs text-stone-400 mt-2">
                New amount due after applying:{' '}
                <strong className="text-stone-700">
                  {formatCurrency(Math.max(0, outstandingBalanceCents - validation.appliedCents))}
                </strong>
              </p>

              <button
                type="button"
                onClick={handleApply}
                disabled={redeeming}
                className="mt-3 w-full py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {redeeming ? 'Applying…' : 'Apply Credit'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
