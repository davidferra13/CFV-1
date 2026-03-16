// Multi-Event Days Widget - shows days with scheduling conflicts

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'
import { format } from 'date-fns'

interface MultiEventDay {
  date: string
  events: Array<{
    id: string
    occasion: string | null
    event_date: string
    guest_count: number | null
    status: string
  }>
}

interface Props {
  days: MultiEventDay[]
}

export function MultiEventDaysWidget({ days }: Props) {
  if (days.length === 0) return null

  return (
    <Card className="border-amber-800/40">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Multi-Event Days</CardTitle>
          <Link
            href="/calendar/week"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            Calendar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="text-xs text-amber-400/70 mt-0.5">
          {days.length} day{days.length !== 1 ? 's' : ''} with multiple events in the next 90 days
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {days.slice(0, 4).map((day) => (
          <div key={day.date} className="rounded-lg border border-stone-700 bg-stone-800 p-3">
            <p className="text-sm font-medium text-amber-300 mb-1.5">
              {format(new Date(day.date + 'T12:00:00'), 'EEEE, MMM d')} - {day.events.length} events
            </p>
            <div className="space-y-1">
              {day.events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-center justify-between text-xs hover:text-brand-400 transition-colors"
                >
                  <span className="text-stone-300 truncate">
                    {event.occasion || 'Untitled Event'}
                  </span>
                  <span className="text-stone-500 shrink-0 ml-2">
                    {event.guest_count ?? '?'} guests · {event.status.replace('_', ' ')}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
