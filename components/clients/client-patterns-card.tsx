'use client'

import { useState, useEffect } from 'react'
import { getClientPatterns, type ClientPattern } from '@/lib/clients/history-intelligence'

const TYPE_ICONS: Record<ClientPattern['type'], string> = {
  guest_count: '👥',
  cuisine: '🍽️',
  frequency: '📅',
  budget: '💰',
  seasonal: '🌿',
  standing_request: '📌',
}

const CONFIDENCE_COLORS: Record<ClientPattern['confidence'], string> = {
  high: 'bg-green-500',
  medium: 'bg-yellow-500',
  low: 'bg-stone-500',
}

export function ClientPatternsCard({ clientId }: { clientId: string }) {
  const [patterns, setPatterns] = useState<ClientPattern[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getClientPatterns(clientId)
      .then((data) => {
        if (!cancelled) setPatterns(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  if (loading) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
        <div className="h-4 w-28 animate-pulse rounded bg-stone-700" />
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-stone-800" />
          ))}
        </div>
      </div>
    )
  }

  if (patterns.length === 0) return null

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Client Patterns</h3>
      <div className="space-y-2">
        {patterns.map((p) => (
          <div key={p.type} className="flex items-start gap-2 rounded-md bg-stone-800/50 px-3 py-2">
            <span className="mt-0.5 text-sm">{TYPE_ICONS[p.type] || '📊'}</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-stone-300">{p.label}</span>
              <p className="text-xs text-stone-400">{p.detail}</p>
            </div>
            <span
              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${CONFIDENCE_COLORS[p.confidence]}`}
              title={`${p.confidence} confidence`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
