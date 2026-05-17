'use client'

import { useEffect, useState, useTransition } from 'react'
import { getCircleStats, type CircleStats } from '@/lib/dinner-circles/circle-stats'
import { formatCurrency } from '@/lib/utils/currency'

type Props = {
  circleId: string
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">
        {label}
      </span>
      <span className="text-lg font-bold text-stone-100">{value}</span>
    </div>
  )
}

export function CircleStatsBar({ circleId }: Props) {
  const [stats, setStats] = useState<CircleStats | null>(null)
  const [loading, startTransition] = useTransition()
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(false)
    startTransition(async () => {
      try {
        const result = await getCircleStats(circleId)
        setStats(result)
      } catch {
        setError(true)
      }
    })
  }, [circleId])

  if (error || (!loading && !stats)) return null

  if (loading) {
    return (
      <div className="rounded-lg border border-stone-800 bg-stone-900 p-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 bg-stone-800 rounded w-16 mb-2" />
              <div className="h-5 bg-stone-800 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
        Circle Intelligence
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
        <Stat label="Events" value={stats.totalEvents} />
        <Stat label="Completed" value={stats.completedEvents} />
        <Stat label="Upcoming" value={stats.upcomingEvents} />
        <Stat label="Total Covers" value={stats.totalCovers} />
        <Stat label="Members" value={stats.uniqueMembers} />
        <Stat label="Returning" value={stats.returningMembers} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
        <Stat label="Avg Attendance" value={stats.averageAttendance} />
        <Stat label="Revenue" value={formatCurrency(stats.totalRevenueCents)} />
        <Stat label="Avg Event Value" value={formatCurrency(stats.averageEventValueCents)} />
        <Stat
          label="Last Event"
          value={
            stats.lastEventDate
              ? new Date(stats.lastEventDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : 'None'
          }
        />
        <Stat
          label="Next Event"
          value={
            stats.nextEventDate
              ? new Date(stats.nextEventDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : 'None'
          }
        />
        {stats.guestOnboardingCompletion !== null && (
          <Stat label="Onboarding %" value={`${stats.guestOnboardingCompletion}%`} />
        )}
      </div>
    </div>
  )
}
