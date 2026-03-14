'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Inbox,
  MessageSquare,
  Clock,
  FileCheck,
  FileX,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  XCircle,
  DollarSign,
  AlertCircle,
  RotateCcw,
  ShieldAlert,
  MessageCircle,
  UserPlus,
  UserCheck,
  Star,
  Bell,
  Check,
  ClipboardList,
  CalendarClock,
  Package,
  Gift,
  EyeOff,
} from '@/components/ui/icons'
import { getNotifications } from '@/lib/notifications/actions'
import { useNotifications } from './notification-provider'
import type {
  Notification,
  NotificationAction,
  NotificationCategory,
} from '@/lib/notifications/types'

// Map icon names to components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Inbox,
  MessageSquare,
  Clock,
  FileCheck,
  FileX,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  XCircle,
  DollarSign,
  AlertCircle,
  RotateCcw,
  ShieldAlert,
  MessageCircle,
  UserPlus,
  UserCheck,
  Star,
  Bell,
  ClipboardList,
  CalendarClock,
  Package,
  Gift,
}

import { NOTIFICATION_CONFIG } from '@/lib/notifications/types'

const categoryColors: Record<string, string> = {
  inquiry: 'text-sky-500',
  quote: 'text-amber-500',
  event: 'text-brand-600',
  payment: 'text-emerald-500',
  chat: 'text-violet-500',
  client: 'text-stone-500',
  ops: 'text-orange-500',
  system: 'text-stone-300',
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: Notification
  onNavigate: (notification: Notification) => void
}) {
  const config = NOTIFICATION_CONFIG[notification.action as NotificationAction]
  const iconName = config?.icon || 'Bell'
  const IconComponent = ICON_MAP[iconName] || Bell
  const colorClass = categoryColors[notification.category] || 'text-stone-500'
  const isUnread = !notification.read_at

  return (
    <button
      type="button"
      onClick={() => onNavigate(notification)}
      className={`flex items-start gap-3 w-full text-left px-4 py-3 transition-colors hover:bg-stone-800 ${
        isUnread ? 'bg-brand-950/30' : ''
      }`}
    >
      <div className={`mt-0.5 flex-shrink-0 ${colorClass}`}>
        <IconComponent className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p
            className={`text-sm truncate ${isUnread ? 'font-medium text-stone-100' : 'text-stone-300'}`}
          >
            {notification.title}
          </p>
          {isUnread && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-1.5 flex-shrink-0" />
          )}
        </div>
        {notification.body && (
          <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{notification.body}</p>
        )}
        <p className="text-[10px] text-stone-400 mt-1">
          {getRelativeTime(notification.created_at)}
        </p>
      </div>
    </button>
  )
}

// ─── Filter bar config ──────────────────────────────────────────────────

const PANEL_FILTER_CATEGORIES: Array<{ key: NotificationCategory | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'event', label: 'Event' },
  { key: 'payment', label: 'Payment' },
  { key: 'chat', label: 'Chat' },
  { key: 'system', label: 'System' },
]

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { markAsRead, markAllAsRead, unreadCount } = useNotifications()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'all'>('all')
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all')

  // Fetch notifications on mount
  useEffect(() => {
    async function load() {
      try {
        const data = await getNotifications(30)
        setNotifications(data)
      } catch (err) {
        console.error('[NotificationPanel] Failed to load:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Client-side filtered list
  const filteredNotifications = useMemo(() => {
    let result = notifications
    if (categoryFilter !== 'all') {
      result = result.filter((n) => n.category === categoryFilter)
    }
    if (readFilter === 'unread') {
      result = result.filter((n) => !n.read_at)
    }
    return result
  }, [notifications, categoryFilter, readFilter])

  const handleNavigate = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
    }
    onClose()
    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    )
  }

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 bg-stone-900 rounded-xl shadow-lg border border-stone-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
        <h3 className="text-sm font-semibold text-stone-100">Notifications</h3>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-400 font-medium"
          >
            <Check className="w-3 h-3" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="px-3 py-2 border-b border-stone-800">
        <div className="flex items-center gap-1.5 flex-wrap">
          {PANEL_FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategoryFilter(cat.key)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                categoryFilter === cat.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setReadFilter((prev) => (prev === 'all' ? 'unread' : 'all'))}
            className={`ml-auto flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
              readFilter === 'unread'
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            <EyeOff className="w-3 h-3" />
            Unread
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[420px] overflow-y-auto custom-scrollbar divide-y divide-stone-800">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-stone-700 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="w-8 h-8 text-stone-300 mb-2" />
            <p className="text-sm text-stone-500">
              {categoryFilter !== 'all' || readFilter === 'unread'
                ? 'No matching notifications'
                : "You're all caught up"}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onNavigate={handleNavigate}
            />
          ))
        )}
      </div>

      {/* Footer — View all link */}
      <div className="border-t border-stone-800 px-4 py-2">
        <button
          type="button"
          onClick={() => {
            onClose()
            router.push('/notifications')
          }}
          className="w-full text-center text-xs text-brand-600 hover:text-brand-400 font-medium py-1"
        >
          View all notifications
        </button>
      </div>
    </div>
  )
}
