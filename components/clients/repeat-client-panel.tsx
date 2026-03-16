'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getRepeatClientIntelligence,
  type RepeatClientIntelligence,
} from '@/lib/clients/intelligence'

type Props = {
  clientId: string
}

export function RepeatClientPanel({ clientId }: Props) {
  const [data, setData] = useState<RepeatClientIntelligence | null>(null)
  const [loading, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const result = await getRepeatClientIntelligence(clientId)
      setData(result)
    })
  }, [clientId])

  if (loading || !data) {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-stone-800 rounded w-1/2 mb-3" />
        <div className="h-3 bg-stone-800 rounded w-3/4 mb-2" />
        <div className="h-3 bg-stone-800 rounded w-2/3" />
      </div>
    )
  }

  if (!data.isRepeat) return null

  const formatCents = (cents: number) =>
    `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">
          {data.client.full_name}
          {data.client.client_status === 'vip' && (
            <span className="ml-2 text-xs bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded">
              VIP
            </span>
          )}
        </h3>
        <span className="text-xs text-stone-500">
          {data.eventCount} events ({data.completedEventCount} completed)
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-stone-800 rounded p-2 text-center">
          <p className="text-xs text-stone-500">Total Spent</p>
          <p className="text-sm font-medium text-stone-200">{formatCents(data.totalSpentCents)}</p>
        </div>
        <div className="bg-stone-800 rounded p-2 text-center">
          <p className="text-xs text-stone-500">Avg Event</p>
          <p className="text-sm font-medium text-stone-200">
            {formatCents(data.averageSpendCents)}
          </p>
        </div>
        <div className="bg-stone-800 rounded p-2 text-center">
          <p className="text-xs text-stone-500">Avg Rating</p>
          <p className="text-sm font-medium text-stone-200">
            {data.averageFeedback.overall?.toFixed(1) ?? 'N/A'}
            {data.averageFeedback.overall && <span className="text-amber-400">/5</span>}
          </p>
        </div>
      </div>

      {/* Preferences */}
      {data.lovedDishes.length > 0 && (
        <div>
          <p className="text-xs text-stone-500 mb-1">Loves</p>
          <div className="flex flex-wrap gap-1">
            {data.lovedDishes.map((dish) => (
              <span
                key={dish}
                className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded"
              >
                {dish}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.dislikedDishes.length > 0 && (
        <div>
          <p className="text-xs text-stone-500 mb-1">Dislikes</p>
          <div className="flex flex-wrap gap-1">
            {data.dislikedDishes.map((dish) => (
              <span key={dish} className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded">
                {dish}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Allergens */}
      {data.allergens.length > 0 && (
        <div>
          <p className="text-xs text-stone-500 mb-1">Allergens</p>
          <div className="flex flex-wrap gap-1">
            {data.allergens.map((a) => (
              <span
                key={a.allergen}
                className={`text-xs px-2 py-0.5 rounded ${
                  a.severity === 'life_threatening'
                    ? 'bg-red-900/50 text-red-300 font-medium'
                    : 'bg-orange-900/30 text-orange-400'
                }`}
              >
                {a.allergen} {a.severity === 'life_threatening' ? '(SEVERE)' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Milestones */}
      {data.upcomingMilestones.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-900/30 rounded p-2">
          <p className="text-xs text-amber-400 font-medium mb-1">Upcoming</p>
          {data.upcomingMilestones.map((m: any, i: number) => (
            <p key={i} className="text-xs text-stone-300">
              {m.type}: {m.date} {m.description ? `(${m.description})` : ''}
            </p>
          ))}
        </div>
      )}

      {/* Last Feedback */}
      {data.lastFeedback && (
        <div className="text-xs text-stone-400 border-t border-stone-800 pt-2">
          <p>Last feedback: {data.lastFeedback.overall}/5</p>
          {data.lastFeedback.whatTheyLoved && (
            <p className="text-stone-500 truncate">Loved: "{data.lastFeedback.whatTheyLoved}"</p>
          )}
          {data.lastFeedback.whatCouldImprove && (
            <p className="text-stone-500 truncate">
              Improve: "{data.lastFeedback.whatCouldImprove}"
            </p>
          )}
        </div>
      )}

      {/* Tipping Pattern */}
      {data.client.tipping_pattern && (
        <p className="text-xs text-stone-500">Tipping: {data.client.tipping_pattern}</p>
      )}
    </div>
  )
}
