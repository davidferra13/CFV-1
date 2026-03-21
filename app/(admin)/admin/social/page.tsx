import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin'
import { getGlobalSocialFeed } from '@/lib/admin/owner-observability'
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
  const chefId = firstParam(searchParams, 'chefId')
  const from = firstParam(searchParams, 'from')
  const to = firstParam(searchParams, 'to')
  if (q) params.set('q', q)
  if (chefId) params.set('chefId', chefId)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  params.set('page', String(nextPage))
  return `/admin/social?${params.toString()}`
}

export default async function AdminSocialPage({
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
  const chefId = firstParam(searchParams, 'chefId')
  const from = firstParam(searchParams, 'from')
  const to = firstParam(searchParams, 'to')

  const result = await getGlobalSocialFeed({
    page,
    limit: 50,
    q: q || undefined,
    chefId: chefId || undefined,
    from: from || undefined,
    to: to || undefined,
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Global Social Feed</h1>
        <p className="text-sm text-stone-500 mt-1">
          Cross-tenant social posts with read-heavy moderation controls.
        </p>
      </div>

      <form className="rounded-xl border border-slate-200 bg-stone-900 p-4 grid gap-3 md:grid-cols-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search content"
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
        />
        <input
          name="chefId"
          defaultValue={chefId}
          placeholder="Chef ID"
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
        {result.items.map((post) => (
          <div key={post.id} className="rounded-xl border border-stone-800 bg-stone-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-stone-200">
                  {post.chefName ?? post.chefId}
                </p>
                <p className="text-xs text-stone-500">
                  {post.postType} - visibility: {post.visibility} - {formatDate(post.createdAt)}
                </p>
              </div>
              <span className="text-xs-tight text-stone-500">{post.id}</span>
            </div>
            <p className="mt-2 text-sm text-stone-200 whitespace-pre-wrap">{post.content}</p>
            <p className="mt-2 text-xs text-stone-500">
              Reactions {post.reactionsCount} - Comments {post.commentsCount} - Shares{' '}
              {post.sharesCount}
            </p>
            <div className="mt-3">
              <OwnerModerationForm kind="social_post" targetId={post.id} />
            </div>
          </div>
        ))}
        {result.items.length === 0 ? (
          <div className="rounded-xl border border-stone-800 bg-stone-900 p-8 text-sm text-stone-500 text-center">
            No social posts found.
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
