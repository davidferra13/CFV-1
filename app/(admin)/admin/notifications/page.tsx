import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin'
import { getGlobalNotificationFeed } from '@/lib/admin/owner-observability'

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

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function withSearchParams(searchParams: SearchParams, nextPage: number): string {
  const params = new URLSearchParams()
  const fields = ['q', 'tenantId', 'category', 'action', 'recipientId', 'from', 'to'] as const
  for (const field of fields) {
    const value = firstParam(searchParams, field)
    if (value) params.set(field, value)
  }
  params.set('page', String(nextPage))
  return `/admin/notifications?${params.toString()}`
}

export default async function AdminNotificationsPage({
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
  const category = firstParam(searchParams, 'category')
  const action = firstParam(searchParams, 'action')
  const recipientId = firstParam(searchParams, 'recipientId')
  const from = firstParam(searchParams, 'from')
  const to = firstParam(searchParams, 'to')

  const result = await getGlobalNotificationFeed({
    page,
    limit: 50,
    q: q || undefined,
    tenantId: tenantId || undefined,
    category: category || undefined,
    action: action || undefined,
    recipientId: recipientId || undefined,
    from: from || undefined,
    to: to || undefined,
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Global Notifications</h1>
        <p className="text-sm text-stone-500 mt-1">
          In-app notification stream across all tenants and recipients.
        </p>
      </div>

      <form className="rounded-xl border border-slate-200 bg-stone-900 p-4 grid gap-3 md:grid-cols-4 lg:grid-cols-8">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title/body"
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        />
        <input
          name="tenantId"
          defaultValue={tenantId}
          placeholder="Tenant ID"
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        />
        <input
          name="recipientId"
          defaultValue={recipientId}
          placeholder="Recipient user ID"
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        />
        <input
          name="category"
          defaultValue={category}
          placeholder="Category"
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        />
        <input
          name="action"
          defaultValue={action}
          placeholder="Action"
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
          className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
        >
          Apply
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-stone-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-800">
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-stone-500">
                Created
              </th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-stone-500">
                Tenant
              </th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-stone-500">
                Recipient
              </th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-stone-500">
                Category / Action
              </th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-stone-500">
                Title
              </th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-stone-500">
                Metadata kind
              </th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => {
              const metadataKind =
                item.metadata && typeof item.metadata.kind === 'string' ? item.metadata.kind : '-'
              return (
                <tr key={item.id} className="border-b border-stone-800/70 hover:bg-stone-800/20">
                  <td className="px-3 py-2 text-stone-400">{formatDate(item.createdAt)}</td>
                  <td className="px-3 py-2 text-stone-300">{item.tenantName ?? item.tenantId}</td>
                  <td className="px-3 py-2 text-stone-300 break-all">{item.recipientId}</td>
                  <td className="px-3 py-2 text-stone-300">
                    {item.category}/{item.action}
                  </td>
                  <td className="px-3 py-2 text-stone-200 max-w-[360px] truncate">{item.title}</td>
                  <td className="px-3 py-2 text-stone-400">{metadataKind}</td>
                </tr>
              )
            })}
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-stone-500">
                  No notifications found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-stone-500">
          Page {result.page} - Showing up to {result.limit} rows
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
