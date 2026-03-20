'use client'

// Client Spending Badge
// Small inline component showing client's historical spending average.
// Embedded in the quote builder near the client name to give context
// when setting pricing for a new quote.

import { useEffect, useState, useTransition } from 'react'
import { getClientSpendingInsights, type ClientSpendingInsights } from '@/lib/finance/client-spending-insights'

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

interface Props {
  clientId: string | null
  tenantId: string
}

export function ClientSpendingBadge({ clientId, tenantId }: Props) {
  const [insights, setInsights] = useState<ClientSpendingInsights | null>(null)
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!clientId) {
      setInsights(null)
      setError(false)
      return
    }

    startTransition(async () => {
      try {
        const result = await getClientSpendingInsights(clientId, tenantId)
        setInsights(result)
        setError(false)
      } catch {
        setInsights(null)
        setError(true)
      }
    })
  }, [clientId, tenantId])

  // No client selected or loading
  if (!clientId || isPending) return null

  // Fetch failed
  if (error) return null

  // No history for this client
  if (!insights) return null

  const { avgEventCents, eventCount, highestEventCents, lowestEventCents, lastEventDate } = insights

  const formattedDate = lastEventDate
    ? new Date(lastEventDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="inline-flex items-center gap-2 rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">
      <span className="font-medium text-zinc-100">
        Avg: {formatCents(avgEventCents)}
      </span>
      <span className="text-zinc-500">across {eventCount} event{eventCount !== 1 ? 's' : ''}</span>
      {eventCount > 1 && (
        <span className="text-zinc-500">
          ({formatCents(lowestEventCents)} - {formatCents(highestEventCents)})
        </span>
      )}
      {formattedDate && (
        <span className="text-zinc-600">Last: {formattedDate}</span>
      )}
    </div>
  )
}
