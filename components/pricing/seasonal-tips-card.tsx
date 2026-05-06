'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface SeasonalTip {
  ingredient: string
  tip: string
  cheapestMonth?: string
  inSeasonNow?: boolean
}

interface SeasonalTipsResponse {
  tips: SeasonalTip[]
}

export function SeasonalTipsCard({ className = '' }: { className?: string }) {
  const [data, setData] = useState<SeasonalTipsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/pricing/seasonal?mode=tips', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load seasonal tips (${res.status})`)
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
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-red-900/30 bg-red-950/20 p-5 ${className}`}>
        <p className="text-sm text-red-400">Failed to load seasonal tips</p>
        <p className="text-xs text-stone-500 mt-1">{error}</p>
      </div>
    )
  }

  if (!data || data.tips.length === 0) {
    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-5 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🌿</span>
          <h3 className="font-semibold text-stone-200">Seasonal Tips</h3>
        </div>
        <p className="text-sm text-stone-500">No seasonal tips available yet</p>
      </div>
    )
  }

  const tips = data.tips.slice(0, 5)

  return (
    <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">🌿</span>
        <h3 className="font-semibold text-stone-200">Seasonal Tips</h3>
      </div>

      <div className="space-y-2.5">
        {tips.map((tip) => (
          <div key={tip.ingredient} className="flex items-center justify-between gap-2">
            <span className="text-sm text-stone-300 truncate">{tip.ingredient}</span>
            <div className="shrink-0">
              {tip.inSeasonNow ? (
                <Badge variant="success" className="text-[10px] px-2 py-0.5">
                  In season
                </Badge>
              ) : tip.cheapestMonth ? (
                <Badge variant="info" className="text-[10px] px-2 py-0.5">
                  Cheapest in {tip.cheapestMonth}
                </Badge>
              ) : (
                <span className="text-xs text-stone-500">{tip.tip}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
