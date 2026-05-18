// Admin Events - All events across every chef

import { requireAdmin } from '@/lib/auth/admin'
import {
  getAllPlatformEvents,
  type PlatformEventRow,
  type PlatformEventListResult,
} from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import { CalendarRange, AlertCircle } from '@/components/ui/icons'
import Link from 'next/link'

function formatCents(cents: number | null): string {
  if (!cents) return '-'
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-800 text-stone-400',
  proposed: 'bg-yellow-900 text-yellow-700',
  accepted: 'bg-brand-900 text-brand-700',
  paid: 'bg-brand-900 text-brand-700',
  confirmed: 'bg-purple-900 text-purple-700',
  in_progress: 'bg-orange-900 text-orange-700',
  completed: 'bg-green-900 text-green-700',
  cancelled: 'bg-red-900 text-red-700',
}

const ALL_STATUSES = [
  'draft',
  'proposed',
  'accepted',
  'paid',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
]

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const params = await searchParams
  const search = typeof params.q === 'string' ? params.q.trim() : ''
  const statusFilter = typeof params.status === 'string' ? params.status.trim() : ''
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let events: PlatformEventRow[] = []
  let total = 0
  let error: string | null = null
  try {
    const result: PlatformEventListResult = await getAllPlatformEvents({
      limit: pageSize,
      offset,
      search: search || undefined,
      status: statusFilter || undefined,
    })
    events = result.items
    total = result.total
  } catch (err) {
    error = 'Failed to load events'
    console.error('[Admin] Events error:', err)
  }

  const totalValue = events.reduce((s, e) => s + (e.quoted_price_cents ?? 0), 0)

  function buildUrl(overrides: { page?: number; status?: string; q?: string }) {
    const p = new URLSearchParams()
    const nextQ = overrides.q !== undefined ? overrides.q : search
    const nextStatus = overrides.status !== undefined ? overrides.status : statusFilter
    const nextPage = overrides.page ?? 1
    if (nextQ) p.set('q', nextQ)
    if (nextStatus) p.set('status', nextStatus)
    if (nextPage > 1) p.set('page', String(nextPage))
    const qs = p.toString()
    return `/admin/events${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-950 rounded-lg">
          <CalendarRange size={18} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100">All Events</h1>
          <p className="text-sm text-stone-500">
            {total} event{total !== 1 ? 's' : ''} · {formatCents(totalValue)} page value
          </p>
        </div>
      </div>

      {/* Search */}
      <form action="/admin/events" method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search by occasion or location..."
          className="w-full max-w-sm rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
        />
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <button
          type="submit"
          className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 hover:bg-stone-700"
        >
          Search
        </button>
        {(search || statusFilter) && (
          <Link href="/admin/events" className="text-sm text-stone-500 hover:text-stone-300">
            Clear all
          </Link>
        )}
      </form>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildUrl({ status: '', page: 1 })}
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            !statusFilter
              ? 'bg-stone-100 text-stone-900'
              : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
          }`}
        >
          All
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={buildUrl({ status: statusFilter === s ? '' : s, page: 1 })}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-stone-100 text-stone-900'
                : `${STATUS_COLORS[s] ?? 'bg-stone-800 text-stone-400'} hover:opacity-80`
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {error && (
        <div className="bg-red-950 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Events table */}
      <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
        {events.length === 0 && !error ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No events found{search ? ` matching "${search}"` : ''}
            {statusFilter ? ` with status "${statusFilter}"` : ''}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-800">
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
              <tbody className="divide-y divide-stone-800">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-stone-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-100 max-w-[200px] truncate">
                      {event.occasion ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {event.chefBusinessName ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[event.status] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {event.event_date ? new Date(event.event_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {event.guest_count ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-100">
                      {formatCents(event.quoted_price_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > pageSize && (
          <div className="flex items-center justify-between border-t border-stone-800 px-4 py-3">
            <p className="text-xs text-stone-500">
              Showing {offset + 1}-{Math.min(offset + pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: page - 1 })}
                  className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
                >
                  Previous
                </Link>
              )}
              {offset + pageSize < total && (
                <Link
                  href={buildUrl({ page: page + 1 })}
                  className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
