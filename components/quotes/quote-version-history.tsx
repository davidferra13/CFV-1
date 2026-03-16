'use client'

// Quote Version History
// Shows a timeline of all quote versions for the same inquiry/event.
// Includes a "Create Revision" button that bumps the version.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { reviseQuote } from '@/lib/quotes/actions'
import { formatCurrency } from '@/lib/utils/currency'
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge'
import { History, Plus } from '@/components/ui/icons'
import type { QuoteVersionSummary } from '@/lib/quotes/actions'
import { mapErrorToUI } from '@/lib/errors/map-error-to-ui'

interface Props {
  currentQuoteId: string
  versions: QuoteVersionSummary[]
  isSuperseded: boolean
}

export function QuoteVersionHistory({ currentQuoteId, versions, isSuperseded }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleRevise() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await reviseQuote(currentQuoteId)
        router.push(`/quotes/${result.newQuoteId}/edit`)
      } catch (err) {
        const uiError = mapErrorToUI(err)
        setError(uiError.message)
      }
    })
  }

  if (versions.length <= 1 && !isSuperseded) {
    // Show a subtle "Create Revision" button for first-version quotes
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-400">v1</span>
        {!isSuperseded && (
          <button
            onClick={handleRevise}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            {isPending ? 'Creating revision...' : 'Create revision'}
          </button>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-stone-400" />
        <span className="text-xs font-medium text-stone-400">Version History</span>
      </div>
      <div className="space-y-1">
        {versions.map((v, i) => {
          const isCurrent = v.id === currentQuoteId
          return (
            <div
              key={v.id}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-xs ${
                isCurrent
                  ? 'bg-brand-950 border border-brand-700'
                  : 'bg-stone-800 border border-stone-800 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`font-medium ${isCurrent ? 'text-brand-300' : 'text-stone-500'}`}>
                  v{i + 1}
                </span>
                <span className="text-stone-400">{formatCurrency(v.total_quoted_cents)}</span>
                <QuoteStatusBadge status={v.status as any} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-stone-400">{format(new Date(v.created_at), 'MMM d')}</span>
                {!isCurrent && (
                  <a href={`/quotes/${v.id}`} className="text-brand-600 hover:underline">
                    View
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {!isSuperseded && (
        <button
          onClick={handleRevise}
          disabled={isPending}
          className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 disabled:opacity-50 mt-1"
        >
          <Plus className="h-3 w-3" />
          {isPending ? 'Creating revision...' : 'Create new revision'}
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
