'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRightLeft, Check, X } from 'lucide-react'
import {
  convertProposalToQuote,
  getProposalForConversion,
  type ProposalConversionPreview,
} from '@/lib/proposals/convert-to-quote'

type ConvertToQuoteButtonProps = {
  proposalTokenId: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function ConvertToQuoteButton({
  proposalTokenId,
  variant = 'secondary',
  size = 'md',
  className,
}: ConvertToQuoteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDialog, setShowDialog] = useState(false)
  const [preview, setPreview] = useState<ProposalConversionPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setError(null)
    setLoadingPreview(true)

    try {
      const data = await getProposalForConversion(proposalTokenId)
      setPreview(data)
      setShowDialog(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal details')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await convertProposalToQuote(proposalTokenId)
        setShowDialog(false)
        router.push(`/quotes/${result.quoteId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to convert proposal to quote')
      }
    })
  }

  const handleCancel = () => {
    setShowDialog(false)
    setPreview(null)
    setError(null)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        loading={loadingPreview}
        disabled={loadingPreview}
      >
        <ArrowRightLeft className="h-4 w-4" />
        Convert to Quote
      </Button>

      {/* Confirmation Dialog Overlay */}
      {showDialog && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancel} />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Convert to Quote</h3>
              <button
                onClick={handleCancel}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                This will create a new draft quote with all pricing and details from this proposal.
                The original proposal will not be modified.
              </p>

              {/* Preview details */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Client</span>
                  <span className="font-medium text-gray-900">{preview.clientName}</span>
                </div>
                {preview.eventOccasion && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Event</span>
                    <span className="font-medium text-gray-900">{preview.eventOccasion}</span>
                  </div>
                )}
                {preview.eventDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-900">
                      {new Date(`${preview.eventDate}T00:00:00`).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                {preview.guestCount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Guests</span>
                    <span className="font-medium text-gray-900">{preview.guestCount}</span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Base price</span>
                    <span className="font-medium text-gray-900">
                      {formatCents(preview.totalQuotedCents)}
                    </span>
                  </div>
                  {preview.addonCount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Add-ons ({preview.addonCount})</span>
                      <span className="font-medium text-gray-900">
                        +{formatCents(preview.addonTotalCents)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Quote total</span>
                    <span className="text-base font-bold text-gray-900">
                      {formatCents(preview.totalQuotedCents + preview.addonTotalCents)}
                    </span>
                  </div>
                  {preview.depositRequired && preview.depositAmountCents && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Deposit</span>
                      <span className="text-gray-600">
                        {formatCents(preview.depositAmountCents)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                loading={isPending}
                disabled={isPending}
              >
                <Check className="h-4 w-4" />
                Create Quote
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
