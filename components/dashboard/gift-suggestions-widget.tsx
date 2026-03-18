'use client'

import { useState, useEffect, useTransition } from 'react'
import { getGiftSuggestions, addGiftEntry } from '@/lib/clients/gifting-actions'
import type { GiftSuggestion, GiftType, DeliveryMethod } from '@/lib/clients/gifting-actions'

const URGENCY_STYLES = {
  high: 'border-l-red-500 bg-red-50',
  medium: 'border-l-yellow-500 bg-yellow-50',
  low: 'border-l-green-500 bg-green-50',
}

const URGENCY_BADGE = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
}

export default function GiftSuggestionsWidget() {
  const [suggestions, setSuggestions] = useState<GiftSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    getGiftSuggestions()
      .then((data) => {
        if (!cancelled) {
          setSuggestions(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError('Could not load gift suggestions')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleQuickLog(suggestion: GiftSuggestion) {
    setError(null)
    const previousLogged = new Set(loggedIds)

    setLoggedIds((prev) => new Set(prev).add(suggestion.client_id + suggestion.type))

    startTransition(async () => {
      try {
        await addGiftEntry({
          client_id: suggestion.client_id,
          gift_type: suggestion.type,
          occasion: suggestion.reason,
          description: 'Quick-logged from dashboard',
          cost_cents: 0,
          sent_at: new Date().toISOString(),
          delivery_method: 'hand_delivered',
        })
      } catch (err: any) {
        setLoggedIds(previousLogged)
        setError(err.message || 'Failed to log gift')
      }
    })
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Gift Suggestions</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Gift Suggestions</h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Gift Suggestions</h3>
      <p className="text-xs text-gray-500 mb-3">
        Upcoming occasions and re-engagement opportunities
      </p>

      {suggestions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No suggestions right now. Check back later!
        </p>
      ) : (
        <div className="space-y-2">
          {suggestions.slice(0, 5).map((s, i) => {
            const isLogged = loggedIds.has(s.client_id + s.type)
            return (
              <div
                key={`${s.client_id}-${s.type}-${i}`}
                className={`rounded-md border-l-4 p-3 ${URGENCY_STYLES[s.urgency]}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {s.client_name}
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-xxs font-medium ${URGENCY_BADGE[s.urgency]}`}
                      >
                        {s.urgency}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{s.reason}</p>
                  </div>
                  <button
                    onClick={() => handleQuickLog(s)}
                    disabled={isPending || isLogged}
                    className={`ml-2 shrink-0 rounded-md px-2 py-1 text-xs font-medium ${
                      isLogged
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    } disabled:opacity-50`}
                  >
                    {isLogged ? 'Logged' : 'Log Gift'}
                  </button>
                </div>
              </div>
            )
          })}
          {suggestions.length > 5 && (
            <p className="text-xs text-gray-400 text-center pt-1">
              +{suggestions.length - 5} more suggestion{suggestions.length - 5 !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
