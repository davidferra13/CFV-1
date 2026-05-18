// Admin Chef List - all chefs across the platform

import { requireAdmin } from '@/lib/auth/admin'
import { getPlatformChefList, type PlatformChefRow } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, TrendingUp, AlertCircle } from '@/components/ui/icons'
import { ChefHealthBadge } from '@/components/admin/chef-health-badge'

function formatCents(cents: number): string {
  if (cents === 0) return '$0'
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function ChefBadge({
  chef,
}: {
  chef: { eventCount: number; gmvCents: number; created_at: string }
}) {
  const daysSinceSignup = Math.floor(
    (Date.now() - new Date(chef.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceSignup < 30) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-700">
        New
      </span>
    )
  }
  if (chef.eventCount === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-800 text-stone-500">
        No Events
      </span>
    )
  }
  return null
}

const TIER_STYLES: Record<string, string> = {
  active: 'bg-green-950 text-green-400 border border-green-800',
  comped: 'bg-green-950 text-green-400 border border-green-800',
  grandfathered: 'bg-blue-950 text-blue-400 border border-blue-800',
  trialing: 'bg-amber-950 text-amber-400 border border-amber-800',
  past_due: 'bg-red-950 text-red-400 border border-red-800',
  canceled: 'bg-stone-800 text-stone-500 border border-stone-700',
  suspended: 'bg-red-950 text-red-400 border border-red-800',
}

function TierBadge({
  status,
  accountStatus,
}: {
  status: string | null
  accountStatus: string | null
}) {
  if (accountStatus === 'suspended') {
    return (
      <span
        className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${TIER_STYLES.suspended}`}
      >
        suspended
      </span>
    )
  }
  if (!status) return <span className="text-[10px] text-stone-600">free</span>
  const style = TIER_STYLES[status] ?? 'bg-stone-800 text-stone-500 border border-stone-700'
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${style}`}>
      {status}
    </span>
  )
}

export default async function AdminChefListPage({
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
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let chefs: PlatformChefRow[] = []
  let total = 0
  let error: string | null = null
  try {
    const result = await getPlatformChefList({ limit: pageSize, offset, search })
    chefs = result.items
    total = result.total
  } catch (err) {
    error = 'Failed to load chef list'
    console.error('[Admin] Chef list error:', err)
  }

  const totalGMV = chefs.reduce((s, c) => s + c.gmvCents, 0)

  function buildUrl(nextPage: number) {
    const p = new URLSearchParams()
    if (search) p.set('q', search)
    if (nextPage > 1) p.set('page', String(nextPage))
    const qs = p.toString()
    return `/admin/users${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-950 rounded-lg">
          <Users size={18} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100">Chefs</h1>
          <p className="text-sm text-stone-500">
            {total} chef account{total !== 1 ? 's' : ''} · {formatCents(totalGMV)} total GMV
          </p>
        </div>
      </div>

      <form action="/admin/users" method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search chefs by name or email..."
          className="w-full max-w-sm rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 hover:bg-stone-700"
        >
          Search
        </button>
        {search && (
          <Link href="/admin/users" className="text-sm text-stone-500 hover:text-stone-300">
            Clear
          </Link>
        )}
      </form>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
        {chefs.length === 0 && !error ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No chefs found{search ? ` matching "${search}"` : ''}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Events
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Clients
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    GMV
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Joined
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Tier
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Health
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {chefs.map((chef) => (
                  <tr key={chef.id} className="hover:bg-stone-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-100">
                      {chef.business_name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{chef.email ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-stone-300">{chef.eventCount}</td>
                    <td className="px-4 py-3 text-right text-stone-300">{chef.clientCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-stone-100">
                      {formatCents(chef.gmvCents)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(chef.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <TierBadge
                        status={chef.subscription_status}
                        accountStatus={chef.account_status}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ChefBadge chef={chef} />
                    </td>
                    <td className="px-4 py-3">
                      <ChefHealthBadge
                        eventCount={chef.eventCount}
                        clientCount={chef.clientCount}
                        gmvCents={chef.gmvCents}
                        daysSinceSignup={Math.floor(
                          (Date.now() - new Date(chef.created_at).getTime()) / 86400000
                        )}
                        hasBusinessName={!!chef.business_name}
                        showScore
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${chef.id}`}
                        className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                      >
                        View →
                      </Link>
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
                  href={buildUrl(page - 1)}
                  className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
                >
                  Previous
                </Link>
              )}
              {offset + pageSize < total && (
                <Link
                  href={buildUrl(page + 1)}
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
