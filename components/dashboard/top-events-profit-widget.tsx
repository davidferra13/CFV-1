// Top Events by Profit Widget - shows most profitable events

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'

interface TopProfitEvent {
  eventId: string
  occasion: string | null
  eventDate: string
  clientName: string
  profitCents: number
  profitMarginPercent: number
  revenueCents: number
}

interface Props {
  events: TopProfitEvent[]
}

export function TopEventsProfitWidget({ events }: Props) {
  if (events.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Top Events by Profit</CardTitle>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
          >
            Analytics <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {events.slice(0, 5).map((event) => (
            <li key={event.eventId}>
              <Link
                href={`/events/${event.eventId}/financial`}
                className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-stone-800 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-200 truncate">
                    {event.occasion || 'Event'} - {event.clientName}
                  </p>
                  <p className="text-xs text-stone-500">
                    {new Date(event.eventDate + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · Revenue: {formatCurrency(event.revenueCents)}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-semibold text-green-400">
                    {formatCurrency(event.profitCents)}
                  </p>
                  <p className="text-xs text-stone-500">{event.profitMarginPercent.toFixed(1)}%</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
