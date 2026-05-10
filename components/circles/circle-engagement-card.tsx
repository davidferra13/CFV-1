'use client'

import { useEffect, useState } from 'react'
import { getCircleEngagement, type CircleEngagement } from '@/lib/hub/circle-engagement-actions'

interface CircleEngagementCardProps {
  circleId: string
}

export function CircleEngagementCard({ circleId }: CircleEngagementCardProps) {
  const [data, setData] = useState<CircleEngagement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getCircleEngagement(circleId)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [circleId])

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
        <div className="text-sm text-stone-500">Loading engagement...</div>
      </div>
    )
  }

  if (!data) return null

  const trendIcon = data.trend === 'up' ? '↑' : data.trend === 'down' ? '↓' : '→'
  const trendColor =
    data.trend === 'up'
      ? 'text-emerald-400'
      : data.trend === 'down'
        ? 'text-red-400'
        : 'text-stone-400'

  // Health color based on member activity rate
  const healthColor =
    data.memberActivityRate >= 60
      ? 'bg-emerald-500'
      : data.memberActivityRate >= 30
        ? 'bg-amber-500'
        : 'bg-red-500'

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">Engagement</h3>
        <span className={`text-lg font-bold ${trendColor}`}>{trendIcon}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-lg font-bold text-stone-100">{data.messageCount7d}</div>
          <div className="text-xs text-stone-400">Messages (7d)</div>
        </div>
        <div>
          <div className="text-lg font-bold text-stone-100">{data.messageCount30d}</div>
          <div className="text-xs text-stone-400">Messages (30d)</div>
        </div>
        <div>
          <div className="text-lg font-bold text-stone-100">{data.bookingFrequency}</div>
          <div className="text-xs text-stone-400">Events/month</div>
        </div>
        <div>
          <div className="text-lg font-bold text-stone-100">{data.memberActivityRate}%</div>
          <div className="text-xs text-stone-400">Active members</div>
        </div>
      </div>

      {/* Activity bar */}
      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-stone-700">
          <div
            className={`h-full rounded-full ${healthColor} transition-all`}
            style={{ width: `${Math.min(data.memberActivityRate, 100)}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-stone-500">Member activity rate</div>
      </div>
    </div>
  )
}
