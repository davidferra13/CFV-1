// Admin Events — All events across every chef

import { requireAdmin } from '@/lib/auth/admin'
import { getAllPlatformEvents, type PlatformEventRow } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import { CalendarRange } from '@/components/ui/icons'

function formatCents(cents: number | null): string {
  if (!cents) return '—'
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-800 text-stone-400',
  proposed: 'bg-yellow-900 text-yellow-200',
  accepted: 'bg-blue-900 text-blue-200',
  paid: 'bg-indigo-900 text-indigo-200',
  confirmed: 'bg-purple-900 text-purple-200',
  in_progress: 'bg-orange-900 text-orange-200',
  completed: 'bg-green-900 text-green-200',
  cancelled: 'bg-red-900 text-red-200',
}

export default async function AdminEventsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  let events: PlatformEventRow[] = []
  try {
    events = await getAllPlatformEvents()
  } catch (err) {
    console.error('[Admin] Events error:', err)
  }

  // Status distribution
  const statusCounts: Record<string, number> = {}
  events.forEach((e) => {
    statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1
  })

  const totalValue = events.reduce((s, e) => s + (e.quoted_price_cents ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-950 rounded-lg">
          <CalendarRange size={18} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Events</h1>
          <p className="text-sm text-stone-500">
            {events.length} event{events.length !== 1 ? 's' : ''} · {formatCents(totalValue)} total
            value
          </p>
        </div>
      </div>

      {/* Status distribution */}
      {Object.keys(statusCounts).length > 0 && (
        <div className="bg-stone-900 rounded-xl border border-slate-200 px-4 py-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-medium mb-3">
            Status Distribution
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-stone-800 text-stone-400'}`}
                >
                  {status} <span className="font-bold">{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Events table */}
      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {events.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Event
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Guests
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate">
                      {event.occasion ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {event.chefBusinessName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[event.status] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {event.event_date ? new Date(event.event_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {event.guest_count ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatCents(event.quoted_price_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
