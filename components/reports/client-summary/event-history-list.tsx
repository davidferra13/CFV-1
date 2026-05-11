import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import type { ClientSummaryEvent } from '@/lib/reports/client-summary'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  completed: 'success',
  confirmed: 'info',
  paid: 'info',
  accepted: 'warning',
  proposed: 'warning',
  in_progress: 'info',
  cancelled: 'error',
  draft: 'default',
}

export function EventHistoryList({ events }: { events: ClientSummaryEvent[] }) {
  if (events.length === 0) {
    return (
      <Card className="print:shadow-none print:border-stone-300">
        <CardHeader>
          <CardTitle className="text-base print:text-stone-900">Event History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">No events recorded for this client.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="print:shadow-none print:border-stone-300">
      <CardHeader>
        <CardTitle className="text-base print:text-stone-900">
          Event History ({events.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-stone-800 print:divide-stone-300">
          {events.map((event) => (
            <div
              key={event.eventId}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-stone-200 print:text-stone-800">
                    {event.occasion || 'Event'}
                  </p>
                  <Badge
                    variant={STATUS_VARIANT[event.status] ?? 'default'}
                    className="print:border print:border-stone-400 text-xs"
                  >
                    {event.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-stone-500 print:text-stone-600">
                  {format(new Date(event.eventDate + 'T12:00:00'), 'MMM d, yyyy')}
                  {event.guestCount != null && ` \u00b7 ${event.guestCount} guests`}
                </p>
              </div>
              <p className="text-sm font-semibold text-stone-200 print:text-stone-800">
                {formatCurrency(event.revenueCents)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
