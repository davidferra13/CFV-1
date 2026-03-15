'use client'

import { useState, useTransition, useCallback } from 'react'
import { generateProposalFromEvent } from '@/lib/quotes/quick-proposal-actions'
import type { ProposalData } from '@/lib/quotes/quick-proposal-actions'
import { ProposalPreview } from '@/components/quotes/proposal-preview'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type QuickProposalButtonProps = {
  eventId: string
  hasExistingQuote?: boolean
  className?: string
}

export function QuickProposalButton({
  eventId,
  hasExistingQuote = false,
  className,
}: QuickProposalButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [proposal, setProposal] = useState<ProposalData | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleOpen = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await generateProposalFromEvent(eventId)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        setProposal(result.data)
        setIsOpen(true)
      } catch (err) {
        toast.error('Failed to load event data for proposal')
      }
    })
  }, [eventId])

  const handleQuoteCreated = useCallback(
    (quoteId: string) => {
      setIsOpen(false)
      setProposal(null)
      router.push(`/quotes/${quoteId}`)
    },
    [router]
  )

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setProposal(null)
  }, [])

  return (
    <>
      <Button
        variant="secondary"
        onClick={handleOpen}
        disabled={isPending || hasExistingQuote}
        className={className}
        title={
          hasExistingQuote
            ? 'This event already has a quote. View or edit the existing quote instead.'
            : 'Generate a proposal from this event'
        }
      >
        {isPending ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
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
            Loading...
          </>
        ) : hasExistingQuote ? (
          'Quote Exists'
        ) : (
          'Quick Proposal'
        )}
      </Button>

      {/* Slide-over panel */}
      {isOpen && proposal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 transition-opacity"
            onClick={handleClose}
          />

          {/* Panel */}
          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-lg">
              <div className="flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                {/* Panel header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Quick Proposal
                  </h2>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <span className="sr-only">Close panel</span>
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Panel body */}
                <div className="flex-1 px-6 py-4">
                  <ProposalPreview
                    proposal={proposal}
                    onQuoteCreated={handleQuoteCreated}
                    onClose={handleClose}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
