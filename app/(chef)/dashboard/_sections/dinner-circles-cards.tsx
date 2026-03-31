import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getChefCircles } from '@/lib/hub/chef-circle-actions'
import { MessagesSquare, Plus } from '@/components/ui/icons'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard] ${label} failed:`, err)
    return fallback
  }
}

export async function DinnerCirclesSection() {
  await requireChef()
  const circles = await safe('dinnerCircles', () => getChefCircles({ limit: 4 }), [])

  if (circles.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="section-label">Dinner Circles</div>
          <Link
            href="/circles"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Circle
          </Link>
        </div>
        <div className="rounded-2xl border border-stone-800 bg-stone-900/50 p-8 text-center">
          <MessagesSquare className="mx-auto h-8 w-8 text-stone-600 mb-3" />
          <p className="text-sm font-medium text-stone-400">No active Dinner Circles yet</p>
          <p className="mt-1 text-xs text-stone-500">
            Create one for your next event to keep guests in the loop.
          </p>
          <Link
            href="/circles"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Circle
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="section-label">Dinner Circles</div>
        <div className="flex items-center gap-3">
          <Link
            href="/circles"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Circle
          </Link>
          <Link
            href="/circles"
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
          >
            View All
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {circles.map((circle) => (
          <Link
            key={circle.id}
            href={`/hub/g/${circle.group_token}`}
            className="group rounded-xl border border-stone-800 bg-stone-900/50 p-4 hover:bg-stone-800/40 hover:border-stone-600 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                {circle.emoji && <span className="text-lg shrink-0">{circle.emoji}</span>}
                <h3 className="text-sm font-semibold text-stone-200 group-hover:text-stone-100 truncate transition-colors">
                  {circle.name}
                </h3>
              </div>
              {circle.unread_count > 0 && (
                <span className="ml-2 shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
                  {circle.unread_count > 99 ? '99+' : circle.unread_count}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>
                {circle.member_count} member{circle.member_count !== 1 ? 's' : ''}
              </span>
              {circle.last_message_at && <span>{formatTimeAgo(circle.last_message_at)}</span>}
            </div>
            {circle.last_message_preview && (
              <p className="mt-1.5 text-xs text-stone-500 truncate">
                {circle.last_message_preview}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString()
}
