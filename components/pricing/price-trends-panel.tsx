'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface TrendIngredient {
  name: string
  direction: 'rising' | 'falling' | 'volatile' | 'stable'
  changePct: number
}

interface TrendsResponse {
  ingredients: TrendIngredient[]
  summary: {
    rising: number
    falling: number
    volatile: number
    stable: number
  }
}

function directionArrow(dir: TrendIngredient['direction']): string {
  switch (dir) {
    case 'rising':
      return '\u2191'
    case 'falling':
      return '\u2193'
    case 'volatile':
      return '\u21C5'
    case 'stable':
      return '\u2192'
  }
}

function directionColor(dir: TrendIngredient['direction']): string {
  switch (dir) {
    case 'rising':
      return 'text-red-400'
    case 'falling':
      return 'text-emerald-400'
    case 'volatile':
      return 'text-amber-400'
    case 'stable':
      return 'text-stone-400'
  }
}

export function PriceTrendsPanel({ className = '' }: { className?: string }) {
  const [data, setData] = useState<TrendsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/pricing/trends?mode=ingredients', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load trends (${res.status})`)
        return res.json()
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div
        className={`rounded-lg border border-stone-700 bg-stone-800/50 p-5 space-y-3 ${className}`}
      >
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-red-900/30 bg-red-950/20 p-5 ${className}`}>
        <p className="text-sm text-red-400">Failed to load price trends</p>
        <p className="text-xs text-stone-500 mt-1">{error}</p>
      </div>
    )
  }

  if (!data || data.ingredients.length === 0) {
    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-5 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">📈</span>
          <h3 className="font-semibold text-stone-200">Price Trends</h3>
        </div>
        <p className="text-sm text-stone-500">Not enough data for trends yet</p>
      </div>
    )
  }

  const { summary, ingredients } = data

  // Top 5 movers by absolute % change (exclude stable)
  const topMovers = [...ingredients]
    .filter((i) => i.direction !== 'stable')
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 5)

  return (
    <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">📈</span>
        <h3 className="font-semibold text-stone-200">Price Trends</h3>
      </div>

      {/* Summary line */}
      <p className="text-xs text-stone-400 mb-4">
        <span className="text-red-400">{summary.rising} rising</span>
        {', '}
        <span className="text-emerald-400">{summary.falling} falling</span>
        {', '}
        <span className="text-amber-400">{summary.volatile} volatile</span>
      </p>

      {/* Top movers */}
      {topMovers.length > 0 && (
        <div className="space-y-1.5">
          {topMovers.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <span className="text-stone-300 truncate">{item.name}</span>
              <span className={`font-medium shrink-0 ml-2 ${directionColor(item.direction)}`}>
                {directionArrow(item.direction)} {item.changePct > 0 ? '+' : ''}
                {item.changePct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
