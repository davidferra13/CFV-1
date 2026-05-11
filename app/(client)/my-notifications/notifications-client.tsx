'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, isToday, isYesterday, isThisWeek } from 'date-fns'
import {
  Bell,
  Check,
  MessageCircle,
  CreditCard,
  FileCheck,
  Calendar,
  Star,
  AlertCircle,
  UserPlus,
  Gift,
} from '@/components/ui/icons'
import { Card, CardContent } from '@/components/ui/card'
import type { Notification } from '@/lib/notifications/types'

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  inquiry: MessageCircle,
  quote: FileCheck,
  event: Calendar,
  payment: CreditCard,
  chat: MessageCircle,
  client: UserPlus,
  system: AlertCircle,
  loyalty: Gift,
  ops: Star,
}

const CATEGORY_COLORS: Record<string, string> = {
  inquiry: 'text-brand-500',
  quote: 'text-amber-500',
  event: 'text-brand-600',
  payment: 'text-emerald-500',
  chat: 'text-violet-500',
  client: 'text-stone-400',
  system: 'text-stone-300',
  loyalty: 'text-yellow-500',
  ops: 'text-orange-500',
}

type DateGroup = {
  label: string
  notifications: Notification[]
}

function groupByDate(notifications: Notification[]): DateGroup[] {
  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Earlier: [],
  }

  for (const n of notifications) {
    const d = new Date(n.created_at)
    if (isToday(d)) groups['Today'].push(n)
    else if (isYesterday(d)) groups['Yesterday'].push(n)
    else if (isThisWeek(d)) groups['This Week'].push(n)
    else groups['Earlier'].push(n)
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, notifications]) => ({ label, notifications }))
}

export function NotificationsClient({
  notifications,
  markAllAction,
}: {
  notifications: Notification[]
  markAllAction: () => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const unreadCount = notifications.filter((n) => !n.read_at).length
  const groups = groupByDate(notifications)

  function handleMarkAll() {
    startTransition(async () => {
      try {
        await markAllAction()
        router.refresh()
      } catch (err) {
        console.error('[notifications] Mark all failed:', err)
      }
    })
  }

  function handleNavigate(notification: Notification) {
    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Bell className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <p className="text-stone-400">
            No notifications yet. You will see updates about your events here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-400 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {isPending ? 'Marking...' : `Mark all as read (${unreadCount})`}
          </button>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 px-1">
            {group.label}
          </h2>
          <div className="space-y-1">
            {group.notifications.map((n) => {
              const Icon = CATEGORY_ICONS[n.category] || Bell
              const colorClass = CATEGORY_COLORS[n.category] || 'text-stone-400'
              const isUnread = !n.read_at

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNavigate(n)}
                  className={`flex items-start gap-3 w-full text-left px-4 py-3 rounded-lg transition-colors hover:bg-stone-800 ${
                    isUnread ? 'bg-brand-950/20' : ''
                  } ${n.action_url ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className={`mt-0.5 flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${isUnread ? 'font-medium text-stone-100' : 'text-stone-300'}`}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-stone-600">
                      {format(new Date(n.created_at), 'h:mm a')}
                    </span>
                    {isUnread && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
