'use client'

import { useEffect, useState, useTransition } from 'react'
import { getClientSpendSummary, type ClientSpendSummary } from '@/lib/quotes/client-spend-actions'

interface ClientSpendHintProps {
  clientId: string
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

export function ClientSpendHint({ clientId }: ClientSpendHintProps) {
  const [data, setData] = useState<ClientSpendSummary | null>(null)
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!clientId) return

    setLoaded(false)
    setError(false)
    setData(null)

    startTransition(async () => {
      try {
        const result = await getClientSpendSummary(clientId)
        setData(result)
        setLoaded(true)
      } catch {
        setError(true)
        setLoaded(true)
      }
    })
  }, [clientId])

  if (!clientId) return null
  if (isPending || !loaded) {
    return (
      <div className="rounded-lg bg-stone-800/50 px-3 py-2 text-xs text-stone-500">
        Loading client history...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-stone-800/50 px-3 py-2 text-xs text-red-400/80">
        Could not load client history
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg bg-stone-800/50 px-3 py-2 text-xs text-stone-500">
        New client - no booking history
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-stone-800/50 px-3 py-2.5 space-y-1">
      <p className="text-[11px] font-medium text-stone-300 uppercase tracking-wide">
        Client History
      </p>
      <div className="space-y-0.5 text-xs text-stone-400">
        <p>
          Total spent: {formatCents(data.totalSpentCents)} across {data.eventCount} event
          {data.eventCount === 1 ? '' : 's'}
        </p>
        <p>Average: {formatCents(data.avgSpendCents)} per event</p>
        {data.lastEventDate && (
          <p className="text-stone-500">Last event: {formatDate(data.lastEventDate)}</p>
        )}
      </div>
    </div>
  )
}
