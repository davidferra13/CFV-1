import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin'
import { getGlobalHubGroups } from '@/lib/admin/owner-observability'
import { OwnerModerationForm } from '@/components/admin/owner-moderation-form'

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
  const q = firstParam(searchParams, 'q')
  const tenantId = firstParam(searchParams, 'tenantId')
  const from = firstParam(searchParams, 'from')
  const to = firstParam(searchParams, 'to')
  if (q) params.set('q', q)
  if (tenantId) params.set('tenantId', tenantId)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  params.set('page', String(nextPage))
  return `/admin/hub?${params.toString()}`
}

export default async function AdminHubPage({ searchParams = {} }: { searchParams?: SearchParams }) {
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

  const result = await getGlobalHubGroups({
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
        <h1 className="text-2xl font-bold text-slate-900">Global Hub Groups</h1>
        <p className="text-sm text-stone-500 mt-1">
          Cross-tenant group visibility and transcript drill-down.
        </p>
      </div>

      <form className="rounded-xl border border-slate-200 bg-stone-900 p-4 grid gap-3 md:grid-cols-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search group name / description"
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
          className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
        >
          Apply Filters
        </button>
      </form>

      <div className="space-y-3">
        {result.items.map((group) => (
          <div key={group.id} className="rounded-xl border border-stone-800 bg-stone-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-stone-200">{group.name}</p>
                <p className="text-xs text-stone-500">
                  {group.tenantName ?? group.tenantId ?? 'No tenant'} - visibility:{' '}
                  {group.visibility}
                </p>
              </div>
              <Link href={`/admin/hub/groups/${group.id}`} className="text-sm text-blue-600">
                Open Transcript
              </Link>
            </div>
            <p className="mt-2 text-sm text-stone-200 whitespace-pre-wrap">
              {group.description ?? '-'}
            </p>
            <p className="mt-2 text-xs text-stone-500">
              Messages {group.messageCount} - Last {formatDate(group.lastMessageAt)} - Active:{' '}
              {group.isActive ? 'yes' : 'no'}
            </p>
            {group.isActive ? (
              <div className="mt-3">
                <OwnerModerationForm kind="hub_group" targetId={group.id} />
              </div>
            ) : null}
          </div>
        ))}
        {result.items.length === 0 ? (
          <div className="rounded-xl border border-stone-800 bg-stone-900 p-8 text-sm text-stone-500 text-center">
            No hub groups found.
          </div>
        ) : null}
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
