import { requireChef } from '@/lib/auth/get-user'
import {
  getRepeatGuests,
  getGuestFrequencyStats,
  getDinnerGroups,
} from '@/lib/guest-analytics/actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function GuestAnalyticsPage() {
  await requireChef()

  const [stats, repeatGuests, dinnerGroups] = await Promise.all([
    getGuestFrequencyStats(),
    getRepeatGuests(),
    getDinnerGroups(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Guest Insights</h1>
        <p className="text-stone-500 mt-1">
          Track repeat guests, dinner groups, and guest conversion patterns.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-stone-100">{stats.totalUniqueGuests}</p>
          <p className="text-sm text-stone-500 mt-1">Unique Guests</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-brand-600">{stats.repeatGuests}</p>
          <p className="text-sm text-stone-500 mt-1">Repeat Guests</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{stats.avgEventsPerRepeat}</p>
          <p className="text-sm text-stone-500 mt-1">Avg Events / Repeat</p>
        </Card>
      </div>

      {/* Repeat guests */}
      <Card className="p-4">
        <h2 className="font-semibold text-stone-100 mb-3">Repeat Guests</h2>
        {repeatGuests.length === 0 ? (
          <p className="text-sm text-stone-500">
            No repeat guests yet. As guests attend multiple events, they'll appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {repeatGuests.map((guest, i) => (
              <div
                key={i}
                className="flex items-start justify-between py-2 border-b border-stone-800 last:border-0"
              >
                <div>
                  <p className="font-medium text-stone-100">{guest.name}</p>
                  {guest.email && <p className="text-xs text-stone-500">{guest.email}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {guest.events
                      .sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''))
                      .map((evt) => (
                        <Link key={evt.id} href={`/events/${evt.id}`}>
                          <Badge variant="default">
                            {evt.occasion || 'Event'}{' '}
                            {evt.event_date
                              ? new Date(evt.event_date + 'T00:00:00').toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : ''}
                          </Badge>
                        </Link>
                      ))}
                  </div>
                </div>
                <Badge variant="success">{guest.events.length} events</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dinner groups */}
      <Card className="p-4">
        <h2 className="font-semibold text-stone-100 mb-1">Dinner Groups</h2>
        <p className="text-xs text-stone-500 mb-3">
          Guests who frequently attend together - great for targeted invitations.
        </p>
        {dinnerGroups.length === 0 ? (
          <p className="text-sm text-stone-500">
            Not enough data yet. Dinner groups emerge after 2+ co-attendances.
          </p>
        ) : (
          <div className="space-y-2">
            {dinnerGroups.map((group, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {group.guests.map((name, j) => (
                      <div
                        key={j}
                        className="w-7 h-7 rounded-full bg-stone-700 border-2 border-white flex items-center justify-center"
                      >
                        <span className="text-xs font-semibold text-stone-400">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-stone-300">{group.guests.join(' & ')}</span>
                </div>
                <Badge variant="info">{group.coAttendances} together</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Nav links */}
      <div className="flex gap-3">
        <Link
          href="/guest-leads"
          className="text-sm text-brand-600 hover:text-brand-400 font-medium"
        >
          Guest Pipeline
        </Link>
      </div>
    </div>
  )
}
