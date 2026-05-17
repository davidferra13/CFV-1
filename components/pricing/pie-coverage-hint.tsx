'use client'

import { useEffect, useState, useTransition } from 'react'
import { resolveEventMenuCostLive } from '@/lib/pricing/live-menu-cost-actions'

interface Props {
  eventId: string
}

function tierBadge(coveragePct: number) {
  if (coveragePct >= 80)
    return {
      label: 'Strong',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    }
  if (coveragePct >= 50)
    return { label: 'Partial', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }
  return { label: 'Weak', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' }
}

export function PieCoverageHint({ eventId }: Props) {
  const [data, setData] = useState<Awaited<ReturnType<typeof resolveEventMenuCostLive>> | null>(
    null
  )
  const [isPending, startTransition] = useTransition()
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (hasLoaded) return
    setHasLoaded(true)
    startTransition(async () => {
      try {
        const result = await resolveEventMenuCostLive(eventId)
        setData(result)
      } catch {
        // Graceful: show nothing
      }
    })
  }, [eventId, hasLoaded])

  if (isPending && !data) return null
  if (!data || !data.available) return null

  const { coveragePercent, avgConfidence, dishes } = data
  const totalIngredients = dishes.reduce((sum, d) => sum + d.ingredientCount, 0)
  const resolvedReal = dishes.reduce((sum, d) => sum + d.resolvedCount, 0)
  const badge = tierBadge(coveragePercent)

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-md border ${badge.bg}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-stone-400">PIE Coverage:</span>
        <span className={`text-xs font-semibold ${badge.color}`}>
          {badge.label} ({coveragePercent}%)
        </span>
      </div>
      <span className="text-xs text-stone-500">
        {resolvedReal}/{totalIngredients} ingredients with real prices
      </span>
      <span className="text-xs text-stone-600">
        Avg confidence: {Math.round(avgConfidence * 100)}%
      </span>
    </div>
  )
}
