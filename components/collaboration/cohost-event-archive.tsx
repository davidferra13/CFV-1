'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import {
  getCoHostEventArchive,
  type CoHostArchive,
} from '@/lib/collaboration/event-archive-actions'
import Link from 'next/link'

export function CoHostEventArchivePanel() {
  const [data, setData] = useState<CoHostArchive | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getCoHostEventArchive()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  if (!loaded || !data || data.totalEvents === 0) return null

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-white mb-4">Co-Hosted Event Archive</h3>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <p className="text-xs text-stone-400">Total Events</p>
          <p className="text-xl font-bold text-white">{data.totalEvents}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400">Guests Hosted</p>
          <p className="text-xl font-bold text-white">{data.totalGuestsHosted}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400">Total Revenue</p>
          <p className="text-xl font-bold text-emerald-400">
            {formatCurrency(data.totalRevenueCents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-400">Repeat Guests</p>
          <p className="text-xl font-bold text-purple-400">{data.repeatGuestCount}</p>
        </div>
      </div>

      {/* Event cards with photos */}
      <div className="space-y-4">
        {data.events.map((ev) => (
          <div
            key={ev.eventId}
            className="rounded-lg border border-stone-700/50 bg-stone-800/20 overflow-hidden"
          >
            {/* Photo strip */}
            {ev.photos.length > 0 && (
              <div className="flex gap-0.5 h-20 overflow-hidden">
                {ev.photos.slice(0, 4).map((url, i) => (
                  <div key={i} className="flex-1 min-w-0">
                    <img
                      src={url}
                      alt={`Event photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {ev.photoCount > 4 && (
                  <div className="flex-1 min-w-0 bg-stone-800 flex items-center justify-center">
                    <span className="text-xs text-stone-400">+{ev.photoCount - 4}</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/events/${ev.eventId}`}
                    className="text-sm font-medium text-white hover:text-brand-300"
                  >
                    {ev.eventName}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                    <span>
                      {new Date(ev.eventDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span>with {ev.partnerName}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-stone-300">
                    {ev.guestCount} guest{ev.guestCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-emerald-400">{formatCurrency(ev.revenueCents)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
