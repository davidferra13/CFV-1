// Admin Activity Feed — Unified timeline of all actions across all chefs

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminActivityFeed } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { Activity } from '@/components/ui/icons'

export default async function AdminActivityFeedPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const feed = await getAdminActivityFeed().catch(() => [])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-950 rounded-lg">
          <Activity size={18} className="text-blue-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Activity Feed</h1>
          <p className="text-sm text-stone-500">
            Latest {feed.length} action{feed.length !== 1 ? 's' : ''} across all chefs
          </p>
        </div>
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {feed.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No activity found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {feed.map((event) => (
              <div
                key={event.id}
                className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-stone-800 text-stone-400 font-mono">
                      {event.event_type}
                    </span>
                    {event.chefBusinessName && (
                      <span className="text-xs text-stone-500">{event.chefBusinessName}</span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-sm text-stone-300 mt-0.5 truncate">{event.description}</p>
                  )}
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                  {new Date(event.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
