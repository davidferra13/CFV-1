'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import {
  getCoHostRevenueDashboard,
  type CoHostRevenueDashboard,
} from '@/lib/collaboration/revenue-dashboard-actions'
import Link from 'next/link'

export function CoHostRevenueDashboardPanel() {
  const [data, setData] = useState<CoHostRevenueDashboard | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getCoHostRevenueDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  if (!loaded || !data || data.totalEvents === 0) return null

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-white mb-4">Co-Hosting Revenue</h3>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <p className="text-xs text-stone-400">Lifetime Earnings</p>
          <p className="text-xl font-bold text-emerald-400">
            {formatCurrency(data.lifetimeEarningsCents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-400">Settled</p>
          <p className="text-xl font-bold text-white">{formatCurrency(data.settledCents)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400">Pending</p>
          <p className="text-xl font-bold text-amber-400">{formatCurrency(data.pendingCents)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400">Upcoming (projected)</p>
          <p className="text-xl font-bold text-blue-400">
            {formatCurrency(data.upcomingProjectedCents)}
          </p>
        </div>
      </div>

      {/* Event list */}
      <div className="space-y-2">
        <p className="text-xs text-stone-400 uppercase tracking-wide">
          {data.totalEvents} co-hosted event{data.totalEvents !== 1 ? 's' : ''}
        </p>
        {data.events.map((ev) => (
          <Link
            key={ev.eventId}
            href={`/events/${ev.eventId}`}
            className="flex items-center justify-between rounded-lg border border-stone-700/50 bg-stone-800/20 p-3 hover:bg-stone-800/40 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{ev.eventName}</p>
              <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                <span>
                  {new Date(ev.eventDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span>with {ev.partnerName}</span>
                <span>{ev.splitPercentage}% split</span>
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-sm font-semibold text-white">{formatCurrency(ev.shareCents)}</p>
              {ev.settled ? (
                <span className="text-xs text-emerald-400">Settled</span>
              ) : ev.status === 'completed' ? (
                <span className="text-xs text-amber-400">Pending</span>
              ) : (
                <span className="text-xs text-stone-500">{ev.status}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
