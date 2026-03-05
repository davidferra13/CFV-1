import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin'
import { getHubGroupTranscript } from '@/lib/admin/owner-observability'
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
  const includeDeleted = firstParam(searchParams, 'includeDeleted')
  if (q) params.set('q', q)
  if (includeDeleted === '1') params.set('includeDeleted', '1')
  params.set('page', String(nextPage))
  return params.toString()
}

export default async function AdminHubGroupTranscriptPage({
  params,
  searchParams = {},
}: {
  params: { groupId: string }
  searchParams?: SearchParams
}) {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const page = parsePage(firstParam(searchParams, 'page'))
  const q = firstParam(searchParams, 'q')
  const includeDeleted = firstParam(searchParams, 'includeDeleted') === '1'

  const transcript = await getHubGroupTranscript(params.groupId, {
    page,
    limit: 50,
    q: q || undefined,
    includeDeleted,
  })

  if (!transcript.group) {
    notFound()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hub Group Transcript</h1>
          <p className="text-sm text-stone-500 mt-1">
            {transcript.group.name} -{' '}
            {transcript.group.tenantName ?? transcript.group.tenantId ?? 'No tenant'}
          </p>
        </div>
        <Link href="/admin/hub" className="text-sm text-blue-600">
          Back to groups
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-stone-900 p-4 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500">Group ID</p>
          <p className="text-xs text-stone-300 break-all">{transcript.group.id}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500">Visibility</p>
          <p className="text-xs text-stone-300">{transcript.group.visibility}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500">Last Message</p>
          <p className="text-xs text-stone-300">{formatDate(transcript.group.lastMessageAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500">Message Count</p>
          <p className="text-xs text-stone-300">{transcript.group.messageCount}</p>
        </div>
      </div>

      {transcript.group.isActive ? (
        <OwnerModerationForm kind="hub_group" targetId={transcript.group.id} />
      ) : (
        <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-3 text-xs text-red-300">
          This group is already inactive.
        </div>
      )}

      <form className="rounded-xl border border-slate-200 bg-stone-900 p-4 grid gap-3 md:grid-cols-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search transcript body"
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        />
        <label className="inline-flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200">
          <input type="checkbox" name="includeDeleted" value="1" defaultChecked={includeDeleted} />
          Include deleted
        </label>
        <button
          type="submit"
          className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
        >
          Apply
        </button>
      </form>

      <div className="space-y-3">
        {transcript.messages.map((message) => (
          <div key={message.id} className="rounded-xl border border-stone-800 bg-stone-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-stone-400">
                  {message.authorDisplayName ?? message.authorProfileId} - {message.messageType}
                </p>
                <p className="text-[11px] text-stone-500">{formatDate(message.createdAt)}</p>
              </div>
              <span className="text-[11px] text-stone-500">{message.id}</span>
            </div>
            <p className="mt-2 text-sm text-stone-200 whitespace-pre-wrap">{message.body ?? '-'}</p>
            {message.deletedAt ? (
              <p className="mt-2 text-xs text-red-300">
                Deleted at {formatDate(message.deletedAt)}
              </p>
            ) : null}
          </div>
        ))}
        {transcript.messages.length === 0 ? (
          <div className="rounded-xl border border-stone-800 bg-stone-900 p-8 text-sm text-stone-500 text-center">
            No messages found.
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-500">
          Page {transcript.page} - Showing up to {transcript.limit} messages
        </p>
        <div className="flex items-center gap-2">
          {transcript.page > 1 ? (
            <Link
              href={`/admin/hub/groups/${params.groupId}?${withSearchParams(searchParams, transcript.page - 1)}`}
              className="rounded-md border border-stone-700 px-3 py-1.5 text-xs text-stone-300"
            >
              Previous
            </Link>
          ) : null}
          {transcript.hasMore ? (
            <Link
              href={`/admin/hub/groups/${params.groupId}?${withSearchParams(searchParams, transcript.page + 1)}`}
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
