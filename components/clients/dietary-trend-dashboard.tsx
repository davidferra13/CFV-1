'use client'

import { useState, useEffect, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { getDietaryTrends } from '@/lib/clients/dietary-alert-actions'
import type { DietaryTrend } from '@/lib/clients/dietary-alert-actions'
import { TrendingUp, AlertTriangle, ShieldAlert } from '@/components/ui/icons'

type TrendData = {
  commonAllergies: DietaryTrend[]
  commonRestrictions: DietaryTrend[]
  risingTrends: DietaryTrend[]
}

function BarChart({ items, color }: { items: DietaryTrend[]; color: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-stone-400 py-2">No data yet</p>
  }

  const maxCount = Math.max(...items.map((i) => i.count), 1)

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.value} className="flex items-center gap-2">
          <span className="text-sm w-28 truncate capitalize text-stone-700">{item.value}</span>
          <div className="flex-1 h-5 bg-stone-100 rounded overflow-hidden">
            <div
              className={`h-full rounded ${color}`}
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-stone-500 w-8 text-right">{item.count}</span>
        </div>
      ))}
    </div>
  )
}

export function DietaryTrendDashboard() {
  const [trends, setTrends] = useState<TrendData | null>(null)
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getDietaryTrends()
        setTrends(data)
      } catch {
        setError(true)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="text-center py-8 text-stone-400">
        <p className="text-sm">Could not load dietary trends</p>
      </div>
    )
  }

  if (!trends && isPending) {
    return (
      <div className="text-center py-8 text-stone-400">
        <p className="text-sm">Loading trends...</p>
      </div>
    )
  }

  if (!trends) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-stone-500" />
        <h3 className="text-lg font-semibold">Dietary Trends</h3>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Common Allergies */}
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <h4 className="font-medium text-sm">Most Common Allergies</h4>
          </div>
          <BarChart items={trends.commonAllergies} color="bg-red-400" />
        </div>

        {/* Common Restrictions */}
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h4 className="font-medium text-sm">Most Common Restrictions</h4>
          </div>
          <BarChart items={trends.commonRestrictions} color="bg-amber-400" />
        </div>
      </div>

      {/* Rising Trends */}
      {trends.risingTrends.length > 0 && (
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <h4 className="font-medium text-sm">Rising Trends (last 90 days)</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {trends.risingTrends.map((trend) => (
              <div
                key={trend.value}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full"
              >
                <span className="text-sm capitalize font-medium text-green-800">{trend.value}</span>
                <Badge variant={trend.change_type === 'allergy_added' ? 'error' : 'warning'}>
                  +{trend.recent_count} recent
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
