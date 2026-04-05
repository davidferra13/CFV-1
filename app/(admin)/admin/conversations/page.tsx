import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin'
import { getGlobalConversationList } from '@/lib/admin/owner-observability'

type SearchParams = Record<string, string | string[] | undefined>

function firstParam(searchParams: SearchParams, key: string): string {
  const value = searchParams[key]
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function parsePage(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

function withSearchParams(searchParams: SearchParams, nextPage: number): string {
  const params = new URLSearchParams()
  const q = firstParam(searchParams, 'q')
  const tenantId = firstParam(searchParams, 'tenantId')
  const from = firstParam(searchParams, 'from')
  const to = firstParam(searchParams, 'to')

  if (q) params.set('q', q)
  if (tenantId) params.set('tenantId', tenantId)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  params.set('page', String(nextPage))
  return `/admin/conversations?${params.toString()}`
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export default async function AdminConversationsPage({
  searchParams = {},
}: {
  searchParams?: SearchParams
}) {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const page = parsePage(firstParam(searchParams, 'page'))
  const q = firstParam(searchParams, 'q')
  const tenantId = firstParam(searchParams, 'tenantId')
  const from = firstParam(searchParams, 'from')
  const to = firstParam(searchParams, 'to')

  const result = await getGlobalConversationList({
    page,
    limit: 50,
    q: q || undefined,
    tenantId: tenantId || undefined,
    from: from || undefined,
    to: to || undefined,
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Global Conversations</h1>
        <p className="text-sm text-stone-500 mt-1">
          Cross-tenant conversation list with transcript drill-down.
        </p>
      </div>

      <form className="rounded-xl border border-stone-700 bg-stone-900 p-4 grid gap-3 md:grid-cols-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search message preview / IDs"
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        />
        <input
          name="tenantId"
          defaultValue={tenantId}
          placeholder="Tenant chef ID"
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        />
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        />
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Apply Filters
        </button>
      </form>

      <div className="rounded-xl border border-stone-700 bg-stone-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-800">
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-stone-500">
                Conversation
              </th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-stone-500">
                Tenant
              </th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-stone-500">
                Context
              </th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-stone-500">
                Last Message
              </th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-stone-500">
                Last At
              </th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr key={item.id} className="border-b border-stone-800/70 hover:bg-stone-800/20">
                <td className="px-3 py-2 text-stone-200">
                  <Link href={`/admin/conversations/${item.id}`} className="text-brand-600">
                    {item.id}
                  </Link>
                </td>
                <td className="px-3 py-2 text-stone-300">{item.tenantName ?? item.tenantId}</td>
                <td className="px-3 py-2 text-stone-300">{item.contextType}</td>
                <td className="px-3 py-2 text-stone-300 max-w-[420px] truncate">
                  {item.lastMessagePreview ?? '-'}
                </td>
                <td className="px-3 py-2 text-stone-400">{formatDate(item.lastMessageAt)}</td>
              </tr>
            ))}
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-stone-500">
                  No conversations found for current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-stone-500">
          Page {result.page} · Showing up to {result.limit} rows
        </div>
        <div className="flex items-center gap-2">
          {result.page > 1 ? (
            <Link
              href={withSearchParams(searchParams, result.page - 1)}
              className="rounded-md border border-stone-700 px-3 py-1.5 text-xs text-stone-300"
            >
              Previous
            </Link>
          ) : null}
          {result.hasMore ? (
            <Link
              href={withSearchParams(searchParams, result.page + 1)}
              className="rounded-md border border-stone-700 px-3 py-1.5 text-xs text-stone-300"
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
