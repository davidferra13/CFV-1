// Admin Client List - all clients across every chef tenant

import { requireAdmin } from '@/lib/auth/admin'
import { getPlatformClientList, type PlatformClientRow } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import { UserCheck, AlertCircle } from '@/components/ui/icons'
import Link from 'next/link'

function formatCents(cents: number): string {
  if (cents === 0) return '$0'
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default async function AdminClientListPage({
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
  let clients: PlatformClientRow[] = []
  let total = 0
  let error = null
  try {
    const result = await getPlatformClientList({ limit: pageSize, offset, search })
    clients = result.items
    total = result.total
  } catch (err) {
    error = 'Failed to load client list'
    console.error('[Admin] Client list error:', err)
  }

  const totalLTV = clients.reduce((s, c) => s + c.ltvCents, 0)

  function buildUrl(nextPage: number) {
    const p = new URLSearchParams()
    if (search) p.set('q', search)
    if (nextPage > 1) p.set('page', String(nextPage))
    const qs = p.toString()
    return `/admin/clients${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-950 rounded-lg">
          <UserCheck size={18} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100">Clients</h1>
          <p className="text-sm text-stone-500">
            {total} client{total !== 1 ? 's' : ''} across all tenants · {formatCents(totalLTV)}{' '}
            total LTV
          </p>
        </div>
      </div>

      <form action="/admin/clients" method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search clients by name, email, phone..."
          className="w-full max-w-sm rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 hover:bg-stone-700"
        >
          Search
        </button>
        {search && (
          <Link href="/admin/clients" className="text-sm text-stone-500 hover:text-stone-300">
            Clear
          </Link>
        )}
      </form>

      {error && (
        <div className="bg-red-950 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
        {clients.length === 0 && !error ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No clients found{search ? ` matching "${search}"` : ''}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef / Tenant
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Events
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    LTV
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-stone-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-100">{client.name ?? '-'}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{client.email ?? '-'}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {client.chefBusinessName ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">{client.eventCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-stone-100">
                      {formatCents(client.ltvCents)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(client.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
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
