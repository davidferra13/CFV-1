'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MealHistoryEntry, DishFrequencyItem } from '@/lib/meal-prep/meal-history-actions'
import { format } from 'date-fns'

// ============================================
// Reaction badges
// ============================================

const REACTION_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'info' | 'default' | 'warning' | 'error' }
> = {
  loved: { label: 'Loved', variant: 'success' },
  liked: { label: 'Liked', variant: 'info' },
  neutral: { label: 'Neutral', variant: 'default' },
  disliked: { label: 'Disliked', variant: 'error' },
}

// ============================================
// Frequency Badges
// ============================================

function FrequencyBadge({ count }: { count: number }) {
  if (count >= 5) return <Badge variant="warning">Frequent ({count}x)</Badge>
  if (count >= 3) return <Badge variant="info">Regular ({count}x)</Badge>
  return <Badge variant="default">{count}x</Badge>
}

// ============================================
// Dish Frequency Section
// ============================================

function DishFrequencySection({ items }: { items: DishFrequencyItem[] }) {
  if (items.length === 0) return null

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-stone-200 mb-3">Dish Frequency</h3>
      <div className="space-y-2">
        {items.slice(0, 10).map((item) => (
          <div
            key={item.dish_name}
            className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-stone-900">{item.dish_name}</span>
              <FrequencyBadge count={item.times_served} />
            </div>
            <div className="flex items-center gap-2">
              {item.avg_reaction && (
                <Badge variant={REACTION_CONFIG[item.avg_reaction]?.variant || 'default'}>
                  {REACTION_CONFIG[item.avg_reaction]?.label || item.avg_reaction}
                </Badge>
              )}
              <span className="text-xs text-stone-500">
                Last: {format(new Date(item.last_served), 'MMM d')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ============================================
// Meal History List
// ============================================

interface ClientMealHistoryProps {
  history: MealHistoryEntry[]
  frequency: DishFrequencyItem[]
  clientName: string
}

export function ClientMealHistory({ history, frequency, clientName }: ClientMealHistoryProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return history
    const q = search.toLowerCase()
    return history.filter((h) => h.dish_name.toLowerCase().includes(q))
  }, [history, search])

  // Group by week
  const grouped = useMemo(() => {
    const groups: Record<string, MealHistoryEntry[]> = {}
    for (const entry of filtered) {
      const weekKey = entry.served_date
      if (!groups[weekKey]) groups[weekKey] = []
      groups[weekKey].push(entry)
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  return (
    <div className="space-y-6">
      {/* Frequency overview */}
      <DishFrequencySection items={frequency} />

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search dishes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded border border-stone-300 px-3 py-1.5 text-sm"
        />
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <Card className="p-6 text-center text-stone-500">
          No meal history found for {clientName}.
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, entries]) => (
            <Card key={date} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-stone-200">
                  {format(new Date(date), 'EEEE, MMM d, yyyy')}
                </h3>
                <Badge variant="default">
                  {entries.length} dish{entries.length !== 1 ? 'es' : ''}
                </Badge>
              </div>
              <div className="space-y-2">
                {entries.map((entry) => {
                  const freqItem = frequency.find(
                    (f) => f.dish_name.toLowerCase() === entry.dish_name.toLowerCase()
                  )
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between py-1.5 border-b border-stone-50 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-stone-900">{entry.dish_name}</span>
                        {freqItem && freqItem.times_served >= 5 && (
                          <Badge variant="warning">Frequent</Badge>
                        )}
                        {entry.source === 'meal_prep' && (
                          <span className="text-xs text-stone-400">meal prep</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.client_reaction && (
                          <Badge
                            variant={REACTION_CONFIG[entry.client_reaction]?.variant || 'default'}
                          >
                            {REACTION_CONFIG[entry.client_reaction]?.label || entry.client_reaction}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
