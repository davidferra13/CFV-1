'use client'

// ClientDietaryEventLinks - Shows upcoming events where a client's dietary restrictions apply.
// Displayed below the AllergyRecordsPanel on client detail pages.
// Links directly to each event so the chef can verify menu safety.

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, AlertTriangle, ChevronRight } from '@/components/ui/icons'
import { getClientUpcomingDietaryEvents } from '@/lib/events/dietary-context-actions'

type UpcomingEvent = {
  id: string
  eventDate: string
  occasion: string | null
  status: string
  guestCount: number | null
  hasMenu: boolean
}

interface Props {
  clientId: string
  /** Pass true if the client has any allergy records or dietary restrictions */
  hasDietaryData: boolean
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-700 text-stone-300',
  proposed: 'bg-blue-900 text-blue-300',
  accepted: 'bg-emerald-900 text-emerald-300',
  paid: 'bg-green-900 text-green-300',
  confirmed: 'bg-green-800 text-green-200',
  in_progress: 'bg-purple-900 text-purple-300',
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function ClientDietaryEventLinks({ clientId, hasDietaryData }: Props) {
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!hasDietaryData) return
    let cancelled = false
    startTransition(async () => {
      try {
        const data = await getClientUpcomingDietaryEvents(clientId)
        if (!cancelled) setEvents(data)
      } catch {
        // Non-critical; silently fail
      }
    })
    return () => {
      cancelled = true
    }
  }, [clientId, hasDietaryData])

  // Don't render if no dietary data or no upcoming events
  if (!hasDietaryData || events.length === 0) return null

  return (
    <Card className="border-amber-800/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Upcoming Events with Dietary Restrictions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-stone-500 mb-3">
          This client has dietary restrictions that apply to these upcoming events. Verify menu
          safety before each service.
        </p>
        <div className="space-y-2">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="flex items-center justify-between gap-3 rounded-md border border-stone-700 bg-stone-900/60 px-3 py-2.5 hover:bg-stone-800/60 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Calendar className="h-4 w-4 text-stone-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-100 truncate">
                    {event.occasion || 'Untitled Event'}
                  </p>
                  <p className="text-xs text-stone-500">
                    {formatDate(event.eventDate)}
                    {event.guestCount ? ` · ${event.guestCount} guests` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={STATUS_COLORS[event.status] || 'bg-stone-700 text-stone-300'}>
                  {event.status}
                </Badge>
                {!event.hasMenu && <Badge variant="warning">No menu</Badge>}
                <ChevronRight className="h-4 w-4 text-stone-600 group-hover:text-stone-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
