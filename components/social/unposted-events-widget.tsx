'use client'

// Unposted Events Widget
// Shows completed events that don't have social posts yet.
// Compact card format for the dashboard.

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Camera, Calendar, Users, MapPin } from '@/components/ui/icons'
import type { UnpostedEvent } from '@/lib/social/event-social-actions'
import { format, parseISO } from 'date-fns'

export function UnpostedEventsWidget({ events }: { events: UnpostedEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-stone-500">All caught up! No unposted events.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-stone-700/40">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-800/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-200 truncate">
              {event.occasion ?? 'Private event'}
              {event.client_name && event.client_name !== 'Unknown' && (
                <span className="text-stone-500 font-normal"> for {event.client_name}</span>
              )}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(parseISO(event.event_date), 'MMM d')}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {event.guest_count}
              </span>
              {event.location_city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {event.location_city}
                </span>
              )}
              {event.photo_count > 0 && (
                <span className="flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  {event.photo_count}
                </span>
              )}
            </div>
          </div>
          <Link href={`/social/compose/${event.id}`}>
            <Button size="sm" variant="ghost" className="text-amber-400 hover:text-amber-300">
              Create Post
            </Button>
          </Link>
        </div>
      ))}
    </div>
  )
}
