// Admin Inquiries - cross-tenant inquiry browser with claim action
// Shows every inquiry across all chefs. Founder can claim local ones.

import { requireAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import { getPlatformInquiryList, type PlatformInquiry } from '@/lib/admin/inquiry-admin-actions'
import Link from 'next/link'
import { MapPin, Check, Inbox } from '@/components/ui/icons'
import { ClaimButton } from './claim-button'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return new Date(isoDate).toLocaleDateString()
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-900/50 text-blue-300',
  awaiting_client: 'bg-yellow-900/50 text-yellow-300',
  awaiting_chef: 'bg-orange-900/50 text-orange-300',
  quoted: 'bg-purple-900/50 text-purple-300',
  confirmed: 'bg-green-900/50 text-green-300',
  declined: 'bg-red-900/50 text-red-300',
  expired: 'bg-stone-800 text-stone-400',
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const params = await searchParams
  const status = typeof params.status === 'string' ? params.status : undefined
  const localOnly = params.local === 'true'
  const search = typeof params.q === 'string' ? params.q : undefined
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let result = null
  let loadError = false

  try {
    result = await getPlatformInquiryList({
      limit: pageSize,
      offset,
      status,
      localOnly,
      search,
    })
  } catch (err) {
    console.error('[Admin Inquiries] Failed to load:', err)
    loadError = true
  }

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'new', label: 'New' },
    { value: 'awaiting_client', label: 'Awaiting Client' },
    { value: 'awaiting_chef', label: 'Awaiting Chef' },
    { value: 'quoted', label: 'Quoted' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'declined', label: 'Declined' },
    { value: 'expired', label: 'Expired' },
  ]

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    const newStatus = overrides.status !== undefined ? overrides.status : status
    const newLocal = overrides.local !== undefined ? overrides.local : localOnly ? 'true' : ''
    const newSearch = overrides.q !== undefined ? overrides.q : search
    const newPage = overrides.page !== undefined ? overrides.page : String(page)

    if (newStatus) p.set('status', newStatus)
    if (newLocal === 'true') p.set('local', 'true')
    if (newSearch) p.set('q', newSearch)
    if (newPage && newPage !== '1') p.set('page', newPage)

    const qs = p.toString()
    return `/admin/inquiries${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">All Inquiries</h1>
          <p className="text-sm text-stone-500 mt-1">
            Every inquiry across all chefs. Claim local ones for your inbox.
          </p>
        </div>
        <Link
          href="/admin/pulse"
          className="rounded-lg bg-stone-800 px-3 py-2 text-xs text-stone-300 hover:bg-stone-700 transition-colors"
        >
          Back to Pulse
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-700 bg-stone-900/60 px-4 py-3">
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Status:</span>
          {statusOptions.map((opt) => (
            <Link
              key={opt.value}
              href={buildUrl({ status: opt.value || undefined, page: '1' })}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                (status || '') === opt.value
                  ? 'bg-stone-700 text-stone-200'
                  : 'bg-stone-800/50 text-stone-500 hover:text-stone-300'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        <span className="mx-1 text-stone-700">|</span>

        {/* Local toggle */}
        <Link
          href={buildUrl({ local: localOnly ? '' : 'true', page: '1' })}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            localOnly
              ? 'bg-orange-900/50 text-orange-300'
              : 'bg-stone-800/50 text-stone-500 hover:text-stone-300'
          }`}
        >
          <MapPin size={10} className="inline mr-1" />
          Local Only
        </Link>

        {/* Search */}
        <form action="/admin/inquiries" method="get" className="ml-auto flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          {localOnly && <input type="hidden" name="local" value="true" />}
          <input
            type="text"
            name="q"
            placeholder="Search client, email, location..."
            defaultValue={search || ''}
            className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none w-56"
          />
          <button
            type="submit"
            className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-600"
          >
            Search
          </button>
        </form>
      </div>

      {/* Error state */}
      {loadError && (
        <div className="rounded-xl border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          Could not load inquiries. Check server logs.
        </div>
      )}

      {/* Empty state */}
      {result && result.items.length === 0 && (
        <div className="rounded-xl border border-stone-700 bg-stone-900/60 px-6 py-10 text-center">
          <Inbox size={32} className="mx-auto text-stone-600 mb-3" />
          <p className="text-sm text-stone-400">
            No inquiries found{search ? ` matching "${search}"` : ''}.
          </p>
        </div>
      )}

      {/* Table */}
      {result && result.items.length > 0 && (
        <div className="rounded-xl border border-stone-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 bg-stone-900/80">
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400">
                    Occasion
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400">Guests</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400">Chef</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400">
                    Distance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {result.items.map((inquiry) => (
                  <tr
                    key={inquiry.id}
                    className={`${
                      inquiry.is_local ? 'bg-orange-950/20' : 'bg-stone-900/40'
                    } hover:bg-stone-800/50 transition-colors`}
                  >
                    <td className="px-4 py-3 text-xs text-stone-400 whitespace-nowrap">
                      {relativeTime(inquiry.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-stone-200">{inquiry.client_name}</p>
                      <p className="text-xs text-stone-500">{inquiry.client_email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-300">{inquiry.location || '-'}</td>
                    <td className="px-4 py-3 text-sm text-stone-300">{inquiry.occasion || '-'}</td>
                    <td className="px-4 py-3 text-sm text-stone-300 text-center">
                      {inquiry.guest_count ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          STATUS_STYLES[inquiry.status] || 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {inquiry.status.replace(/_/g, ' ')}
                      </span>
                      {inquiry.converted_to_event_id && (
                        <span className="ml-1.5 inline-flex items-center text-green-400">
                          <Check size={12} />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-300">{inquiry.chef_name}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {inquiry.distance_from_founder !== null ? (
                        <span
                          className={
                            inquiry.is_local ? 'text-orange-400 font-medium' : 'text-stone-400'
                          }
                        >
                          {inquiry.distance_from_founder} mi
                          {inquiry.is_local && <MapPin size={10} className="inline ml-1" />}
                        </span>
                      ) : (
                        <span className="text-stone-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ClaimButton inquiryId={inquiry.id} isLocal={inquiry.is_local} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {result.total > pageSize && (
            <div className="flex items-center justify-between border-t border-stone-700 px-4 py-3 bg-stone-900/80">
              <p className="text-xs text-stone-500">
                Showing {offset + 1}-{Math.min(offset + pageSize, result.total)} of {result.total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildUrl({ page: String(page - 1) })}
                    className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
                  >
                    Previous
                  </Link>
                )}
                {offset + pageSize < result.total && (
                  <Link
                    href={buildUrl({ page: String(page + 1) })}
                    className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
