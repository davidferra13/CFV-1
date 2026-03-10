'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { getFoodCostToday, getFoodCostTrend } from '@/lib/finance/food-cost-actions'

/**
 * Compact food cost widget for embedding on the main dashboard.
 * Shows: current %, color, and a sparkline of last 14 days.
 */
export function FoodCostWidget() {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<{
    foodCostPercent: number
    targetPercent: number
  } | null>(null)
  const [sparkline, setSparkline] = useState<number[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    startTransition(async () => {
      try {
        const [today, trend] = await Promise.all([getFoodCostToday(), getFoodCostTrend(14)])
        setData({
          foodCostPercent: today.foodCostPercent,
          targetPercent: today.targetPercent,
        })
        setSparkline(trend.map((t) => t.foodCostPercent))
      } catch {
        setError(true)
      }
    })
  }, [])

  if (error) {
    return (
      <Card className="p-4">
        <p className="text-xs text-red-400">Could not load food cost data</p>
      </Card>
    )
  }

  if (!data && !isPending) return null

  const percent = data?.foodCostPercent ?? 0
  const target = data?.targetPercent ?? 30

  const colorClass =
    percent === 0
      ? 'text-stone-400'
      : percent <= target - 3
        ? 'text-green-500'
        : percent <= target
          ? 'text-yellow-500'
          : 'text-red-500'

  const maxVal = Math.max(...sparkline, 1)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-500 mb-1">Food Cost</p>
          <p className={`text-2xl font-bold ${colorClass}`}>{percent}%</p>
          <p className="text-xs text-stone-500">Target: {target}%</p>
        </div>
        {sparkline.length > 1 && (
          <div className="flex items-end gap-px h-8">
            {sparkline.map((val, i) => {
              const h = (val / maxVal) * 100
              const barColor =
                val === 0
                  ? 'bg-stone-700'
                  : val <= target - 3
                    ? 'bg-green-600'
                    : val <= target
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
              return (
                <div
                  key={i}
                  className={`w-1.5 ${barColor} rounded-t`}
                  style={{ height: `${Math.max(h, 5)}%` }}
                />
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
