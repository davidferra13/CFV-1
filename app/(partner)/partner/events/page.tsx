// Partner Portal — Events
// Full event history across all of the partner's locations.
// No client PII — occasion, date, guest count, location, status only.

import { getPartnerPortalData } from '@/lib/partners/portal-actions'
import { format } from 'date-fns'
import { CalendarDays } from '@/components/ui/icons'

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
}

const STATUS_CLASS: Record<string, string> = {
  confirmed: 'bg-blue-950 text-blue-200',
  in_progress: 'bg-amber-950 text-amber-200',
  completed: 'bg-green-950 text-green-200',
}

export default async function PartnerEventsPage() {
  const { recentEvents, locations } = await getPartnerPortalData()

  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Events</h1>
        <p className="mt-1 text-sm text-stone-500">
          All events hosted at your locations — {recentEvents.length} total.
        </p>
      </div>

      {recentEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-600 bg-stone-900 p-10 text-center">
          <CalendarDays size={32} className="mx-auto text-stone-300 mb-3" />
          <p className="text-sm text-stone-500">
            No events yet. Check back after your first booking.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-700 bg-stone-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-800 border-b border-stone-700">
              <tr>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">Occasion</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium hidden md:table-cell">
                  Location
                </th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium hidden sm:table-cell">
                  Guests
                </th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {recentEvents.map((evt) => {
                const loc = evt.partner_location_id ? locationMap[evt.partner_location_id] : null
                const statusClass = STATUS_CLASS[evt.status] ?? 'bg-stone-800 text-stone-400'
                return (
                  <tr key={evt.id} className="hover:bg-stone-800">
                    <td className="px-4 py-3 text-stone-300">
                      {format(new Date(evt.event_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-stone-300">{evt.occasion ?? '—'}</td>
                    <td className="px-4 py-3 text-stone-500 hidden md:table-cell">
                      {loc?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300 hidden sm:table-cell">
                      {evt.guest_count ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}
                      >
                        {STATUS_LABELS[evt.status] ?? evt.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
