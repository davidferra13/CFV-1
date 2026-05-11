'use client'

import { useState } from 'react'
import { Utensils, Heart, Star, Calendar, ChefHat } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ClientDishHistory } from '@/lib/recipes/client-recipe-actions'

const REACTION_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  loved: { label: 'Loved', color: 'text-emerald-400', icon: 'heart' },
  liked: { label: 'Liked', color: 'text-blue-400', icon: 'thumbup' },
  neutral: { label: 'Neutral', color: 'text-stone-400', icon: 'meh' },
  disliked: { label: 'Disliked', color: 'text-red-400', icon: 'thumbdown' },
}

type FilterType = 'all' | 'loved' | 'liked' | 'neutral' | 'disliked'

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function RecipesClient({ dishes }: { dishes: ClientDishHistory[] }) {
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = filter === 'all' ? dishes : dishes.filter((d) => d.reaction === filter)

  const reactionCounts = dishes.reduce(
    (acc, d) => {
      if (d.reaction) acc[d.reaction] = (acc[d.reaction] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  if (dishes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Utensils className="w-10 h-10 text-stone-600 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">No dish history yet.</p>
          <p className="text-stone-500 text-xs mt-1">
            As your chef serves you dishes, they will be logged here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-stone-400">{dishes.length} dishes served</span>
        {Object.entries(reactionCounts).map(([reaction, count]) => {
          const config = REACTION_CONFIG[reaction]
          return config ? (
            <span key={reaction} className={`${config.color} text-xs`}>
              {count} {config.label.toLowerCase()}
            </span>
          ) : null
        })}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'loved', 'liked', 'neutral', 'disliked'] as FilterType[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {f === 'all' ? 'All' : REACTION_CONFIG[f]?.label || f}
            {f !== 'all' && reactionCounts[f] ? ` (${reactionCounts[f]})` : ''}
          </button>
        ))}
      </div>

      {/* Dish List */}
      <Card>
        <CardContent className="divide-y divide-stone-800">
          {filtered.map((dish) => {
            const reaction = dish.reaction ? REACTION_CONFIG[dish.reaction] : null
            return (
              <div
                key={dish.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Utensils className="w-4 h-4 text-stone-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-100 truncate">{dish.dishName}</p>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(dish.servedDate)}
                      </span>
                      {dish.eventName && <span>{dish.eventName}</span>}
                      {dish.chefName && (
                        <span className="flex items-center gap-1">
                          <ChefHat className="w-3 h-3" />
                          {dish.chefName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {reaction && (
                  <span className={`text-xs font-medium ${reaction.color} flex-shrink-0`}>
                    {reaction.label}
                  </span>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-stone-500">No dishes match this filter.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
