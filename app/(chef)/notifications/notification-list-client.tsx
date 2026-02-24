'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Check,
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
  ClipboardList,
  CalendarClock,
  Package,
  Gift,
  ChevronLeft,
  ChevronRight,
  Archive,
} from 'lucide-react'
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotification,
} from '@/lib/notifications/actions'
import { getNotificationsByCategory, getNotificationCount } from '@/lib/notifications/check'
import { useNotifications } from '@/components/notifications/notification-provider'
import {
  NOTIFICATION_CONFIG,
  CATEGORY_LABELS,
  type Notification,
  type NotificationAction,
  type NotificationCategory,
} from '@/lib/notifications/types'

// ─── Icon Map ────────────────────────────────────────────────────────────

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

const categoryColors: Record<string, string> = {
  inquiry: 'text-sky-500',
  quote: 'text-amber-500',
  event: 'text-brand-600',
  payment: 'text-emerald-500',
  chat: 'text-violet-500',
  client: 'text-stone-500',
  ops: 'text-orange-500',
  loyalty: 'text-pink-500',
  goals: 'text-teal-500',
  lead: 'text-cyan-500',
  protection: 'text-red-500',
  wellbeing: 'text-lime-500',
  review: 'text-yellow-500',
  system: 'text-stone-300',
}

const categoryBadgeColors: Record<string, string> = {
  inquiry: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  quote: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  event: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
  payment: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  chat: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  client: 'bg-stone-500/10 text-stone-400 border-stone-500/20',
  ops: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  loyalty: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  goals: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  lead: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  protection: 'bg-red-500/10 text-red-400 border-red-500/20',
  wellbeing: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
  review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  system: 'bg-stone-500/10 text-stone-400 border-stone-500/20',
}

// ─── Helpers ─────────────────────────────────────────────────────────────

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ─── Constants ───────────────────────────────────────────────────────────

const PAGE_SIZE = 20

// Filter tabs: 'all' plus categories that have enough content to warrant filtering
const FILTER_TABS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'ops', label: 'Ops' },
  { key: 'inquiry', label: 'Inquiries' },
  { key: 'event', label: 'Events' },
  { key: 'quote', label: 'Quotes' },
  { key: 'payment', label: 'Payments' },
  { key: 'client', label: 'Clients' },
  { key: 'system', label: 'System' },
]

// ─── Component ───────────────────────────────────────────────────────────

export function NotificationListClient() {
  const router = useRouter()
  const {
    markAsRead: contextMarkRead,
    markAllAsRead: contextMarkAllRead,
    refreshCount,
  } = useNotifications()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  // ─── Fetch ─────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const offset = page * PAGE_SIZE

      let data: Notification[]
      if (activeFilter === 'all') {
        data = await getNotifications(PAGE_SIZE, offset)
      } else {
        data = await getNotificationsByCategory(
          activeFilter as NotificationCategory,
          PAGE_SIZE,
          offset
        )
      }

      const count = await getNotificationCount(
        activeFilter === 'all' ? undefined : (activeFilter as NotificationCategory)
      )

      setNotifications(data)
      setTotalCount(count)
    } catch (err) {
      console.error('[NotificationListClient] Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }, [activeFilter, page])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // ─── Actions ───────────────────────────────────────────────────────

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.read_at) return
    await markAsRead(notification.id)
    await contextMarkRead(notification.id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
    )
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    await contextMarkAllRead()
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    )
  }

  const handleArchive = async (notificationId: string) => {
    await archiveNotification(notificationId)
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    setTotalCount((prev) => Math.max(0, prev - 1))
    await refreshCount()
  }

  const handleNavigate = async (notification: Notification) => {
    await handleMarkAsRead(notification)
    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    setPage(0)
  }

  // ─── Pagination ────────────────────────────────────────────────────

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasNext = page < totalPages - 1
  const hasPrev = page > 0

  // ─── Render ────────────────────────────────────────────────────────

  const unreadInView = notifications.filter((n) => !n.read_at).length

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleFilterChange(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeFilter === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Actions bar */}
      {unreadInView > 0 && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs text-stone-500">{unreadInView} unread on this page</span>
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-400 font-medium"
          >
            <Check className="w-3 h-3" />
            Mark all as read
          </button>
        </div>
      )}

      {/* Notification list */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-stone-700 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Bell className="w-10 h-10 text-stone-600 mb-3" />
            <p className="text-sm text-stone-500">
              {activeFilter === 'all'
                ? 'No notifications yet'
                : `No ${FILTER_TABS.find((t) => t.key === activeFilter)?.label ?? activeFilter} notifications`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-800">
            {notifications.map((notification) => {
              const config = NOTIFICATION_CONFIG[notification.action as NotificationAction]
              const iconName = config?.icon || 'Bell'
              const IconComponent = ICON_MAP[iconName] || Bell
              const colorClass = categoryColors[notification.category] || 'text-stone-500'
              const badgeClass =
                categoryBadgeColors[notification.category] ||
                'bg-stone-500/10 text-stone-400 border-stone-500/20'
              const isUnread = !notification.read_at
              const categoryLabel =
                CATEGORY_LABELS[notification.category as NotificationCategory] ||
                notification.category

              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors group ${
                    isUnread ? 'bg-brand-950/20' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className={`mt-1 flex-shrink-0 ${colorClass}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {/* Content — clickable */}
                  <button
                    type="button"
                    onClick={() => handleNavigate(notification)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-start gap-2">
                      <p
                        className={`text-sm ${
                          isUnread ? 'font-medium text-stone-100' : 'text-stone-300'
                        }`}
                      >
                        {notification.title}
                      </p>
                      {isUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-1.5 flex-shrink-0" />
                      )}
                    </div>
                    {notification.body && (
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border ${badgeClass}`}
                      >
                        {categoryLabel}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        {formatDate(notification.created_at)}
                      </span>
                      <span className="text-[10px] text-stone-600">
                        ({getRelativeTime(notification.created_at)})
                      </span>
                    </div>
                  </button>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(notification)}
                        title="Mark as read"
                        className="p-1 rounded hover:bg-stone-700 text-stone-500 hover:text-stone-300"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleArchive(notification.id)}
                      title="Archive"
                      className="p-1 rounded hover:bg-stone-700 text-stone-500 hover:text-stone-300"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs text-stone-500">
            Page {page + 1} of {totalPages} ({totalCount} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!hasPrev}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-stone-800 text-stone-400 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3 h-3" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-stone-800 text-stone-400 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
