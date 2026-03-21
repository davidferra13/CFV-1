'use client'

import { useState, useEffect, useTransition } from 'react'
import { getDishFrequency, getNeverServedDishes } from '@/lib/menus/menu-history-actions'

// -- Types --

type DishFreq = {
  name: string
  count: number
  lastServed: string
}

type NeverServed = {
  id: string
  name: string
  category: string | null
}

type SortMode = 'frequency' | 'alphabetical'

type Props = {
  clientId: string
}

// -- Component --

export default function DishFrequencyChart({ clientId }: Props) {
  const [dishes, setDishes] = useState<DishFreq[]>([])
  const [neverServed, setNeverServed] = useState<NeverServed[]>([])
  const [sortMode, setSortMode] = useState<SortMode>('frequency')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  function loadData() {
    startTransition(async () => {
      try {
        const [freqResult, neverResult] = await Promise.all([
          getDishFrequency(clientId),
          getNeverServedDishes(clientId),
        ])

        if (freqResult.error) {
          setError(freqResult.error)
          return
        }
        if (neverResult.error) {
          setError(neverResult.error)
          return
        }

        setDishes(freqResult.data)
        setNeverServed(neverResult.data)
        setError(null)
      } catch (err) {
        console.error('[DishFrequencyChart] load error', err)
        setError('Failed to load dish data')
      }
    })
  }

  // Sort dishes
  const sortedDishes = [...dishes].sort((a, b) => {
    if (sortMode === 'frequency') return b.count - a.count
    return a.name.localeCompare(b.name)
  })

  // Max count for bar scaling
  const maxCount = Math.max(1, ...dishes.map((d) => d.count))

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Dish Frequency</h3>
        <div className="flex gap-1 text-sm">
          <button
            onClick={() => setSortMode('frequency')}
            className={`px-2 py-1 rounded ${
              sortMode === 'frequency'
                ? 'bg-brand-100 text-brand-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            By Frequency
          </button>
          <button
            onClick={() => setSortMode('alphabetical')}
            className={`px-2 py-1 rounded ${
              sortMode === 'alphabetical'
                ? 'bg-brand-100 text-brand-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            A-Z
          </button>
        </div>
      </div>

      {isPending && <p className="text-gray-500 text-sm">Loading...</p>}

      {/* Bar chart */}
      {sortedDishes.length === 0 && !isPending ? (
        <p className="text-gray-500 text-sm text-center py-4">
          No dishes served to this client yet.
        </p>
      ) : (
        <div className="space-y-2">
          {sortedDishes.map((dish) => {
            const pct = Math.round((dish.count / maxCount) * 100)
            const isRepetitionRisk = dish.count >= 3

            return (
              <div key={dish.name} className="space-y-0.5">
                <div className="flex items-center justify-between text-sm">
                  <span className={isRepetitionRisk ? 'text-amber-700 font-medium' : ''}>
                    {dish.name}
                    {isRepetitionRisk && (
                      <span className="ml-1.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        {dish.count}x served
                      </span>
                    )}
                  </span>
                  <span className="text-gray-400 text-xs">
                    Last:{' '}
                    {new Date(dish.lastServed).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isRepetitionRisk ? 'bg-amber-400' : 'bg-brand-400'
                    }`}
                    style={{ width: `${pct}%`, minWidth: '8px' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Never served section */}
      {neverServed.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Never Served to This Client ({neverServed.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {neverServed.map((recipe) => (
              <span
                key={recipe.id}
                className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md"
              >
                {recipe.name}
                {recipe.category && (
                  <span className="text-green-500 ml-1">({recipe.category})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
