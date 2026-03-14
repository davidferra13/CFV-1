'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { markMyHubNotificationsRead, type HubUnreadCount } from '@/lib/hub/notification-actions'

interface NotificationsPanelProps {
  initialUnread: HubUnreadCount[]
}

export function NotificationsPanel({ initialUnread }: NotificationsPanelProps) {
  const [items, setItems] = useState(initialUnread)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalUnread = useMemo(
    () => items.reduce((sum, item) => sum + item.unread_count, 0),
    [items]
  )

  function handleMarkGroupRead(groupId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await markMyHubNotificationsRead({ groupIds: [groupId] })
        setItems((prev) => prev.filter((item) => item.group_id !== groupId))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark group as read.')
      }
    })
  }

  function handleMarkAllRead() {
    setError(null)
    startTransition(async () => {
      try {
        await markMyHubNotificationsRead()
        setItems([])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark all as read.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15">
            <Bell className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-100">Unread Hub Messages</p>
            <p className="text-xs text-stone-400">
              {totalUnread} unread across {items.length} group{items.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleMarkAllRead}
          disabled={isPending || items.length === 0}
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="mr-1.5 h-4 w-4" />
          )}
          Mark all read
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-700 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-700 bg-stone-900/30 px-6 py-12 text-center">
          <p className="text-stone-300">You are all caught up.</p>
          <p className="mt-1 text-sm text-stone-500">New group messages will appear here.</p>
          <Link
            href="/my-hub"
            className="mt-4 inline-flex rounded-lg border border-stone-700 px-3 py-1.5 text-sm text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
          >
            Back to My Hub
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <article
              key={item.group_id}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-3"
            >
              <Link href={`/my-hub/g/${item.group_token}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-100">
                  <span className="mr-1.5">{item.group_emoji || '[Group]'}</span>
                  {item.group_name}
                </p>
                <p className="mt-0.5 text-xs text-stone-400">
                  {item.unread_count} unread message{item.unread_count === 1 ? '' : 's'}
                </p>
              </Link>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => handleMarkGroupRead(item.group_id)}
              >
                Mark read
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
