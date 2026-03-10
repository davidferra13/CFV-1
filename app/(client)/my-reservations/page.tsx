// Reservation History - Client Portal
// Shows upcoming and past reservations for this client.
// Matches client by email/phone to guest records.

import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getClientReservations } from '@/lib/client-portal/portal-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { format, parseISO } from 'date-fns'
import { ReservationCancelButton } from './reservation-cancel-button'

export const metadata: Metadata = { title: 'My Reservations - ChefFlow' }

const STATUS_DISPLAY: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  confirmed: { label: 'Confirmed', variant: 'success' },
  seated: { label: 'Seated', variant: 'info' },
  completed: { label: 'Completed', variant: 'default' },
  no_show: { label: 'No Show', variant: 'error' },
  cancelled: { label: 'Cancelled', variant: 'error' },
}

export default async function MyReservationsPage() {
  await requireClient()

  const { upcoming, past } = await getClientReservations()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">My Reservations</h1>
        <p className="text-stone-400 mt-1">View your upcoming and past reservations</p>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-100">Upcoming</h2>
          {upcoming.map((res) => {
            const display = STATUS_DISPLAY[res.status] || STATUS_DISPLAY.confirmed
            return (
              <Card key={res.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-100">
                        {format(parseISO(res.reservation_date), 'EEEE, MMMM d, yyyy')}
                      </span>
                      <Badge variant={display.variant}>{display.label}</Badge>
                    </div>
                    {res.reservation_time && (
                      <p className="text-sm text-stone-400 mt-1">Time: {res.reservation_time}</p>
                    )}
                    {res.party_size && (
                      <p className="text-sm text-stone-400">Party size: {res.party_size}</p>
                    )}
                    {res.table_number && (
                      <p className="text-sm text-stone-400">Table: {res.table_number}</p>
                    )}
                    {res.notes && <p className="text-sm text-stone-500 mt-1">{res.notes}</p>}
                  </div>
                  <ReservationCancelButton reservationId={res.id} />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {upcoming.length === 0 && past.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-stone-500">No reservations found.</p>
        </Card>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-500">Past Reservations</h2>
          {past.map((res) => {
            const display = STATUS_DISPLAY[res.status] || STATUS_DISPLAY.completed
            return (
              <Card key={res.id} className="p-4 opacity-75">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-300">
                        {format(parseISO(res.reservation_date), 'MMM d, yyyy')}
                      </span>
                      <Badge variant={display.variant}>{display.label}</Badge>
                    </div>
                    {res.party_size && (
                      <p className="text-sm text-stone-500">Party of {res.party_size}</p>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <ActivityTracker eventType="reservations_page_viewed" />
    </div>
  )
}
