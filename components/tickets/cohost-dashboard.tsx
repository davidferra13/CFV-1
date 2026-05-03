'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import {
  getCoHostDashboard,
  type CoHostDashboardData,
} from '@/lib/tickets/cohost-dashboard-actions'

type Props = {
  eventId: string
}

export function CoHostDashboard({ eventId }: Props) {
  const [data, setData] = useState<CoHostDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCoHostDashboard(eventId)
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [eventId])

  if (loading) return null
  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{data.eventName}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-stone-400">
              {data.eventDate && (
                <span>
                  {new Date(data.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
              {data.location && <span>{data.location}</span>}
            </div>
          </div>
          {data.isCoHost && (
            <span className="px-2.5 py-1 rounded-full bg-purple-900/40 text-purple-300 text-xs font-medium">
              Co-Host
            </span>
          )}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-stone-400">Guests</p>
            <p className="text-2xl font-bold text-white">
              {data.guestCount}
              {data.totalCapacity > 0 && (
                <span className="text-sm font-normal text-stone-500">/{data.totalCapacity}</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Revenue</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(data.revenue)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Checked In</p>
            <p className="text-2xl font-bold text-white">{data.checkedIn}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Tickets Sold</p>
            <p className="text-2xl font-bold text-white">{data.ticketsSold}</p>
          </div>
        </div>

        {/* Capacity bar */}
        {data.totalCapacity > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-stone-400 mb-1">
              <span>{data.ticketsSold} sold</span>
              <span>{data.totalCapacity - data.ticketsSold} remaining</span>
            </div>
            <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (data.ticketsSold / data.totalCapacity) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Dietary & Allergy Summary */}
      {(data.dietarySummary.length > 0 || data.allergySummary.length > 0) && (
        <Card className="p-5">
          <h3 className="font-semibold text-white mb-3">Guest Dietary Needs</h3>
          <div className="grid grid-cols-2 gap-6">
            {data.dietarySummary.length > 0 && (
              <div>
                <p className="text-xs text-stone-400 mb-2 uppercase tracking-wide">Restrictions</p>
                <div className="space-y-1.5">
                  {data.dietarySummary.map((d) => (
                    <div key={d.restriction} className="flex items-center justify-between">
                      <span className="text-sm text-stone-200">{d.restriction}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900/40 text-orange-300">
                        {d.count} guest{d.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.allergySummary.length > 0 && (
              <div>
                <p className="text-xs text-stone-400 mb-2 uppercase tracking-wide">Allergies</p>
                <div className="space-y-1.5">
                  {data.allergySummary.map((a) => (
                    <div key={a.allergy} className="flex items-center justify-between">
                      <span className="text-sm text-stone-200">{a.allergy}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-300">
                        {a.count} guest{a.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {data.dietarySummary.length === 0 && data.allergySummary.length === 0 && (
            <p className="text-sm text-stone-500">No dietary needs reported yet.</p>
          )}
        </Card>
      )}
    </div>
  )
}
