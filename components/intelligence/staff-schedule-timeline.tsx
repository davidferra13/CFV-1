import Link from 'next/link'
import type { StaffScheduleEntry } from '@/lib/intelligence/staff-optimization'

interface StaffScheduleTimelineProps {
  schedule: StaffScheduleEntry[]
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function StaffScheduleTimeline({ schedule }: StaffScheduleTimelineProps) {
  if (schedule.length === 0) {
    return (
      <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-6 text-center">
        <p className="text-sm text-stone-500">
          No staff assignments in this date range.
        </p>
        <p className="text-xs text-stone-600 mt-1">
          Assign staff to events in the Staff Schedule page.
        </p>
      </div>
    )
  }

  // Group by date
  const byDate = new Map<string, StaffScheduleEntry[]>()
  for (const entry of schedule) {
    const existing = byDate.get(entry.date) ?? []
    existing.push(entry)
    byDate.set(entry.date, existing)
  }

  const sortedDates = Array.from(byDate.keys()).sort()

  return (
    <div className="space-y-4">
      {sortedDates.map((date) => {
        const entries = byDate.get(date)!
        const dayTotal = entries.reduce((sum, e) => sum + e.estimatedCostCents, 0)

        return (
          <div key={date} className="rounded-lg border border-stone-800 bg-stone-900/30">
            {/* Date header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-stone-800">
              <h4 className="text-sm font-semibold text-stone-200">
                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </h4>
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span>{entries.length} staff</span>
                <span className="text-stone-400 font-medium">{formatCents(dayTotal)}</span>
              </div>
            </div>

            {/* Staff rows */}
            <div className="divide-y divide-stone-800/50">
              {entries.map((entry) => (
                <div
                  key={`${entry.staffMemberId}_${entry.date}`}
                  className="px-4 py-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-stone-700 flex items-center justify-center text-xs font-medium text-stone-300">
                        {entry.staffName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-300">{entry.staffName}</p>
                        <p className="text-xs text-stone-500">{entry.role.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-stone-400">{entry.totalHours}h</p>
                      <p className="text-xs text-stone-500">{formatCents(entry.estimatedCostCents)}</p>
                    </div>
                  </div>

                  {/* Events this person is working */}
                  <div className="flex flex-wrap gap-1.5 ml-9">
                    {entry.events.map((evt) => (
                      <Link
                        key={evt.eventId}
                        href={`/events/${evt.eventId}`}
                        className="inline-flex items-center gap-1 rounded bg-stone-800/80 px-2 py-0.5 text-xs text-stone-400 hover:text-stone-200 hover:bg-stone-700/80 transition-colors"
                      >
                        <span className="truncate max-w-[120px]">{evt.eventName}</span>
                        {evt.serveTime && (
                          <span className="text-stone-600">{evt.serveTime.slice(0, 5)}</span>
                        )}
                        <span className="text-stone-600">{evt.estimatedHours}h</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
