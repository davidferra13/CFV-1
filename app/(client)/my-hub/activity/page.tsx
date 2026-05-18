import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Clock } from '@/components/ui/icons'
import { requireClient } from '@/lib/auth/get-user'
import { getClientActivityFeed } from '@/lib/client-portal/activity-actions'

export const metadata: Metadata = { title: 'Activity Timeline' }

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default async function ActivityPage() {
  await requireClient()
  const feed = await getClientActivityFeed()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/my-hub"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Hub
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-100">Activity Timeline</h1>
        <p className="mt-1 text-stone-400">Recent updates across your circles.</p>
      </div>

      {feed.items.length === 0 ? (
        <div className="rounded-lg border border-stone-800 bg-stone-900 px-6 py-12 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-stone-600" />
          <p className="text-stone-400">
            No activity yet. Updates will appear here as your circles progress.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {feed.items.map((item) => (
            <li key={item.id} className="rounded-lg border border-stone-800 bg-stone-900 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-stone-200">
                    <span className="font-medium text-stone-100">{item.actorName}</span>{' '}
                    {item.verb.replace(/_/g, ' ')}{' '}
                    <span className="text-stone-300">{item.objectLabel}</span>
                  </p>
                </div>
                <span className="shrink-0 text-xs text-stone-500">
                  {relativeTime(item.timestamp)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
