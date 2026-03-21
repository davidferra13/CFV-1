import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin'
import {
  getGlobalConversationList,
  getGlobalHubGroups,
  getGlobalNotificationFeed,
  getGlobalSocialFeed,
} from '@/lib/admin/owner-observability'
import { safeFetchAll } from '@/lib/utils/safe-fetch'
import { ErrorState } from '@/components/ui/error-state'

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export default async function AdminCommandCenterPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const result = await safeFetchAll({
    conversations: () => getGlobalConversationList({ limit: 10 }),
    social: () => getGlobalSocialFeed({ limit: 10 }),
    hubGroups: () => getGlobalHubGroups({ limit: 10 }),
    notifications: () => getGlobalNotificationFeed({ limit: 20 }),
  })

  if (result.error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Owner Command Center</h1>
        <ErrorState title="Could not load command center data" description={result.error} />
      </div>
    )
  }

  const { conversations, social, hubGroups, notifications } = result.data!

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Owner Command Center</h1>
        <p className="text-sm text-stone-500 mt-1">
          Cross-tenant visibility across chat, social, hub groups, and notification traffic.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/conversations"
          className="rounded-xl border border-slate-200 bg-stone-900 p-4 hover:border-slate-300"
        >
          <p className="text-xs uppercase tracking-wide text-stone-500">Conversations</p>
          <p className="text-2xl font-bold text-stone-200 mt-1">{conversations.items.length}</p>
          <p className="text-xs text-stone-500 mt-1">Open global transcript viewer</p>
        </Link>
        <Link
          href="/admin/social"
          className="rounded-xl border border-slate-200 bg-stone-900 p-4 hover:border-slate-300"
        >
          <p className="text-xs uppercase tracking-wide text-stone-500">Social Posts</p>
          <p className="text-2xl font-bold text-stone-200 mt-1">{social.items.length}</p>
          <p className="text-xs text-stone-500 mt-1">Review cross-tenant feed activity</p>
        </Link>
        <Link
          href="/admin/hub"
          className="rounded-xl border border-slate-200 bg-stone-900 p-4 hover:border-slate-300"
        >
          <p className="text-xs uppercase tracking-wide text-stone-500">Hub Groups</p>
          <p className="text-2xl font-bold text-stone-200 mt-1">{hubGroups.items.length}</p>
          <p className="text-xs text-stone-500 mt-1">Inspect event and dinner-circle groups</p>
        </Link>
        <Link
          href="/admin/notifications"
          className="rounded-xl border border-slate-200 bg-stone-900 p-4 hover:border-slate-300"
        >
          <p className="text-xs uppercase tracking-wide text-stone-500">Notifications</p>
          <p className="text-2xl font-bold text-stone-200 mt-1">{notifications.items.length}</p>
          <p className="text-xs text-stone-500 mt-1">Trace in-app owner/system delivery</p>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-stone-900 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-200">Recent Conversations</h2>
            <Link href="/admin/conversations" className="text-xs text-brand-600">
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {conversations.items.map((conversation: any) => (
              <Link
                key={conversation.id}
                href={`/admin/conversations/${conversation.id}`}
                className="block rounded-lg border border-stone-800 p-2 hover:border-stone-700"
              >
                <p className="text-xs text-stone-400">
                  {conversation.tenantName ?? conversation.tenantId} - {conversation.contextType}
                </p>
                <p className="text-sm text-stone-200 truncate">{conversation.lastMessagePreview}</p>
                <p className="text-xs-tight text-stone-500">
                  {formatDate(conversation.lastMessageAt)}
                </p>
              </Link>
            ))}
            {conversations.items.length === 0 ? (
              <p className="text-sm text-stone-500">No conversations found.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-stone-900 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-200">Recent Notifications</h2>
            <Link href="/admin/notifications" className="text-xs text-brand-600">
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {notifications.items.slice(0, 10).map((notification: any) => (
              <div key={notification.id} className="rounded-lg border border-stone-800 p-2">
                <p className="text-xs text-stone-400">
                  {notification.tenantName ?? notification.tenantId} - {notification.category}/
                  {notification.action}
                </p>
                <p className="text-sm text-stone-200 truncate">{notification.title}</p>
                <p className="text-xs-tight text-stone-500">{formatDate(notification.createdAt)}</p>
              </div>
            ))}
            {notifications.items.length === 0 ? (
              <p className="text-sm text-stone-500">No notifications found.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
