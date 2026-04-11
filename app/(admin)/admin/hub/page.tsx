import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin'
import { backfillGuestVisibleDinnerCircles } from '@/lib/admin/hub-admin-actions'
import { getGlobalHubGroups } from '@/lib/admin/owner-observability'
import { getGuestVisibleEventsMissingDinnerCircles } from '@/lib/hub/integration-actions'
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
  const backfilled = Number(firstParam(searchParams, 'backfilled') || '0')

  const [result, dinnerCircleCompliance] = await Promise.all([
    getGlobalHubGroups({
      page,
      limit: 50,
      q: q || undefined,
      tenantId: tenantId || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    getGuestVisibleEventsMissingDinnerCircles(),
  ])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Global Hub Groups</h1>
        <p className="text-sm text-stone-500 mt-1">
          Cross-tenant group visibility and transcript drill-down.
        </p>
      </div>

      {backfilled > 0 ? (
        <div className="rounded-xl border border-green-800/40 bg-green-950/20 px-4 py-3 text-sm text-green-300">
          Backfilled Dinner Circles for {backfilled} guest-visible event
          {backfilled === 1 ? '' : 's'}.
        </div>
      ) : null}

      <div className="rounded-xl border border-stone-700 bg-stone-900 p-4 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-200">Dinner Circle Compliance</h2>
            <p className="mt-1 text-sm text-stone-500">
              Guest-visible events should always have a canonical Dinner Circle.
            </p>
          </div>
          <form action={backfillGuestVisibleDinnerCircles}>
            <button
              type="submit"
              className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={dinnerCircleCompliance.totalMissingDinnerCircles === 0}
            >
              Backfill Missing Dinner Circles
            </button>
          </form>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-stone-800 px-4 py-3">
            <p className="text-xs text-stone-500">Guest-visible events</p>
            <p className="mt-1 text-2xl font-bold text-stone-100">
              {dinnerCircleCompliance.totalGuestVisibleEvents}
            </p>
          </div>
          <div className="rounded-lg bg-stone-800 px-4 py-3">
            <p className="text-xs text-stone-500">Missing Dinner Circles</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                dinnerCircleCompliance.totalMissingDinnerCircles > 0
                  ? 'text-red-400'
                  : 'text-green-400'
              }`}
            >
              {dinnerCircleCompliance.totalMissingDinnerCircles}
            </p>
          </div>
          <div className="rounded-lg bg-stone-800 px-4 py-3">
            <p className="text-xs text-stone-500">Coverage</p>
            <p className="mt-1 text-2xl font-bold text-stone-100">
              {dinnerCircleCompliance.totalGuestVisibleEvents > 0
                ? `${Math.round(
                    ((dinnerCircleCompliance.totalGuestVisibleEvents -
                      dinnerCircleCompliance.totalMissingDinnerCircles) /
                      dinnerCircleCompliance.totalGuestVisibleEvents) *
                      100
                  )}%`
                : '100%'}
            </p>
          </div>
        </div>

        {dinnerCircleCompliance.events.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-stone-500">Current violation set</p>
            <div className="space-y-2">
              {dinnerCircleCompliance.events.slice(0, 10).map((event) => (
                <div
                  key={event.eventId}
                  className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2"
                >
                  <p className="text-sm font-medium text-red-200">
                    {event.occasion || 'Untitled event'}
                  </p>
                  <p className="mt-1 text-xs text-red-300">
                    Event {event.eventId} - tenant {event.tenantId} - status {event.status || '-'} -
                    active shares {event.activeShareCount}
                  </p>
                </div>
              ))}
              {dinnerCircleCompliance.events.length > 10 ? (
                <p className="text-xs text-stone-500">
                  Showing 10 of {dinnerCircleCompliance.events.length} violating events.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-green-900/40 bg-green-950/20 px-3 py-3 text-sm text-green-300">
            All guest-visible events currently have Dinner Circles.
          </div>
        )}
      </div>

      <form className="rounded-xl border border-stone-700 bg-stone-900 p-4 grid gap-3 md:grid-cols-5">
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
          className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
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
              <Link href={`/admin/hub/groups/${group.id}`} className="text-sm text-brand-600">
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
