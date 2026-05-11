'use client'

import Link from 'next/link'
import { Calendar, DollarSign, Users, Camera, Star, MapPin, Clock } from '@/components/ui/icons'
import { Card, CardContent } from '@/components/ui/card'
import type { TimelineEntry, TimelineStats } from '@/lib/timeline/client-timeline-actions'

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  inquiry: { label: 'Inquiry', color: 'bg-stone-800 text-stone-400' },
  proposal_sent: { label: 'Proposed', color: 'bg-blue-950/50 text-blue-400' },
  confirmed: { label: 'Confirmed', color: 'bg-emerald-950/50 text-emerald-400' },
  in_progress: { label: 'In Progress', color: 'bg-amber-950/50 text-amber-400' },
  completed: { label: 'Completed', color: 'bg-emerald-950/50 text-emerald-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-950/50 text-red-400' },
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function groupByYear(entries: TimelineEntry[]): Map<string, TimelineEntry[]> {
  const groups = new Map<string, TimelineEntry[]>()
  for (const entry of entries) {
    const year = new Date(entry.eventDate + 'T12:00:00').getFullYear().toString()
    const existing = groups.get(year) || []
    existing.push(entry)
    groups.set(year, existing)
  }
  return groups
}

export function TimelineClient({
  entries,
  stats,
}: {
  entries: TimelineEntry[]
  stats: TimelineStats
}) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="w-10 h-10 text-stone-600 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">No events yet.</p>
          <p className="text-stone-500 text-xs mt-1">
            Your event history will build up here over time.
          </p>
        </CardContent>
      </Card>
    )
  }

  const grouped = groupByYear(entries)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Calendar className="w-5 h-5 text-brand-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-stone-100">{stats.totalEvents}</p>
            <p className="text-xs text-stone-500">Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-stone-100">{formatCents(stats.totalSpentCents)}</p>
            <p className="text-xs text-stone-500">Total Spent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-stone-100">{stats.totalGuests}</p>
            <p className="text-xs text-stone-500">Total Guests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Star className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-stone-100">
              {entries.filter((e) => e.hasReview).length}
            </p>
            <p className="text-xs text-stone-500">Reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline by Year */}
      {Array.from(grouped.entries()).map(([year, yearEntries]) => (
        <div key={year}>
          <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">
            {year}
          </h2>
          <div className="space-y-2 relative">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-stone-800" />

            {yearEntries.map((entry) => {
              const badge = STATUS_BADGE[entry.status] || STATUS_BADGE.inquiry
              return (
                <Link
                  key={entry.id}
                  href={`/my-bookings/${entry.id}`}
                  className="block relative pl-8"
                >
                  {/* Dot */}
                  <div className="absolute left-1.5 top-4 w-3 h-3 rounded-full bg-stone-700 border-2 border-stone-900" />

                  <Card className="hover:border-stone-600 transition-colors">
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-stone-100">{entry.title}</p>
                          <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                            <span>{formatDate(entry.eventDate)}</span>
                            {entry.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {entry.location}
                              </span>
                            )}
                            {entry.guestCount && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {entry.guestCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {entry.hasPhotos && <Camera className="w-4 h-4 text-stone-500" />}
                          {entry.hasReview && <Star className="w-4 h-4 text-amber-400" />}
                          {entry.totalCents != null && (
                            <span className="text-sm font-medium text-stone-300">
                              {formatCents(entry.totalCents)}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
