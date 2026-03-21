'use client'

import { useState, useEffect, useTransition } from 'react'
import { searchMenuHistory } from '@/lib/menus/menu-history-actions'

// -- Types --

type DishEntry = {
  name: string
  category?: string
  liked?: boolean
  disliked?: boolean
  notes?: string
}

type HistoryEntry = {
  id: string
  chef_id: string
  client_id: string
  event_id: string | null
  menu_id: string | null
  served_date: string
  dishes_served: DishEntry[]
  overall_rating: number | null
  client_feedback: string | null
  chef_notes: string | null
  guest_count: number | null
  created_at: string
}

type Props = {
  initialEntries?: HistoryEntry[]
}

// -- Component --

export default function MenuHistoryWidget({ initialEntries }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>(initialEntries ?? [])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initialEntries) {
      loadRecent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function loadRecent() {
    startTransition(async () => {
      try {
        // Load all history (search with empty returns all, we take top 5)
        // Use a broad search to get recent entries across all clients
        const result = await searchMenuHistory('')
        if (result.error) {
          setError(result.error)
          return
        }
        // searchMenuHistory returns empty for empty query, so we handle gracefully
        setEntries(result.data.slice(0, 5))
        setError(null)
      } catch (err) {
        console.error('[MenuHistoryWidget] load error', err)
        setError('Could not load recent menus')
      }
    })
  }

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg border">
        <h3 className="text-sm font-semibold mb-2">Recent Menus</h3>
        <p className="text-red-600 text-xs">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-white rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Recent Menus</h3>
        {isPending && <span className="text-xs text-gray-400">Loading...</span>}
      </div>

      {entries.length === 0 && !isPending ? (
        <p className="text-gray-500 text-xs text-center py-3">
          No menu history yet. Menus will appear here after events are completed.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const dishes = (entry.dishes_served as DishEntry[]) ?? []
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between py-1.5 border-b last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {new Date(entry.served_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {dishes.length} dish{dishes.length !== 1 ? 'es' : ''}
                    {entry.guest_count ? ` / ${entry.guest_count} guests` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {entry.overall_rating !== null ? (
                    <span className="text-xs text-amber-600">{entry.overall_rating}/5</span>
                  ) : (
                    <span className="text-xs text-gray-400">No rating</span>
                  )}
                  {entry.event_id && !entry.client_feedback && (
                    <span className="text-xs text-brand-600">Add feedback</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
