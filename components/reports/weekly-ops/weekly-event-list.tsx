import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import type { WeeklyOpsEvent } from '@/lib/reports/weekly-ops'

export function WeeklyEventList({ events }: { events: WeeklyOpsEvent[] }) {
  if (events.length === 0) {
    return (
      <Card className="print:shadow-none print:border-stone-300">
        <CardHeader>
          <CardTitle className="text-base print:text-stone-900">
            Completed Events This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">No events completed this week.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="print:shadow-none print:border-stone-300">
      <CardHeader>
        <CardTitle className="text-base print:text-stone-900">
          Completed Events ({events.length})
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
                <p className="text-sm font-medium text-stone-200 print:text-stone-800">
                  {event.occasion || 'Event'}
                </p>
                <p className="text-xs text-stone-500 print:text-stone-600">
                  {format(new Date(event.eventDate + 'T12:00:00'), 'EEE, MMM d')}
                  {' \u00b7 '}
                  {event.clientName}
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
