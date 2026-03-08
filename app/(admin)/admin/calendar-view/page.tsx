// Admin Calendar — Unified cross-tenant event calendar

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminCalendarEvents } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { CalendarDays } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-800 text-stone-400',
  proposed: 'bg-yellow-900 text-yellow-700',
  accepted: 'bg-blue-900 text-blue-700',
  paid: 'bg-indigo-900 text-indigo-700',
  confirmed: 'bg-purple-900 text-purple-700',
  in_progress: 'bg-orange-900 text-orange-700',
  completed: 'bg-green-900 text-green-700',
  cancelled: 'bg-red-900 text-red-700',
}

function groupByDate(events: Awaited<ReturnType<typeof getAdminCalendarEvents>>) {
  const groups = new Map<string, typeof events>()
  for (const e of events) {
    const key = e.event_date ?? 'No Date'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(e)
  }
  return groups
}

export default async function AdminCalendarPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const events = await getAdminCalendarEvents().catch(() => [])
  const grouped = groupByDate(events)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-violet-950 rounded-lg">
          <CalendarDays size={18} className="text-violet-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Platform Calendar</h1>
          <p className="text-sm text-stone-500">
            {events.length} event{events.length !== 1 ? 's' : ''} across all chefs (30 days back, 90
            days forward)
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={events}
          filename="admin-calendar"
          columns={[
            { header: 'Date', accessor: (e) => e.event_date },
            { header: 'Occasion', accessor: (e) => e.occasion },
            { header: 'Chef', accessor: (e) => e.chefBusinessName },
            { header: 'Status', accessor: (e) => e.status },
            { header: 'Guests', accessor: (e) => e.guest_count },
          ]}
        />
      </div>

      {events.length === 0 ? (
        <div className="bg-stone-900 rounded-xl border border-slate-200 py-12 text-center text-slate-400 text-sm">
          No events in range.
        </div>
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([date, dayEvents]) => {
            const isToday = date === today
            const isPast = date < today
            return (
              <div
                key={date}
                className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden"
              >
                <div
                  className={`px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 ${isToday ? 'bg-amber-950' : 'bg-slate-50'}`}
                >
                  <h3
                    className={`text-sm font-semibold ${isToday ? 'text-amber-500' : isPast ? 'text-stone-500' : 'text-stone-300'}`}
                  >
                    {isToday ? 'Today - ' : ''}
                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </h3>
                  <span className="text-xs text-slate-400">
                    ({dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {dayEvents.map((e) => (
                    <div
                      key={e.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[e.status] ?? 'bg-stone-800 text-stone-400'}`}
                        >
                          {e.status}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {e.occasion ?? 'Untitled Event'}
                          </p>
                          <p className="text-xs text-stone-500">
                            {e.chefBusinessName ?? 'Unknown Chef'} · {e.guest_count ?? '?'} guests
                          </p>
                        </div>
                      </div>
                      <ViewAsChefButton chefId={e.tenant_id} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
