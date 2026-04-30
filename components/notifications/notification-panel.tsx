'use client'

import { useState, useEffect, useMemo, memo } from 'react'
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
  Award,
  BarChart2,
  Battery,
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  Camera,
  ChefHat,
  ClipboardCheck,
  Edit,
  Eye,
  FileText,
  Flame,
  Globe,
  PartyPopper,
  Target,
  Ticket,
  Trophy,
  UserMinus,
  Users,
  Info,
} from '@/components/ui/icons'
import { getNotifications } from '@/lib/notifications/actions'
import { getSignalPolicy } from '@/lib/notifications/signal-os'
import { useNotifications } from './notification-provider'
import { usePushSubscription } from './use-push-subscription'
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
  Award,
  BarChart2,
  Battery,
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  Camera,
  ChefHat,
  ClipboardCheck,
  Edit,
  Eye,
  FileText,
  Flame,
  Globe,
  PartyPopper,
  Target,
  Ticket,
  Trophy,
  UserMinus,
  Users,
}

import { NOTIFICATION_CONFIG } from '@/lib/notifications/types'

const categoryColors: Record<string, string> = {
  inquiry: 'text-brand-500',
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

const NotificationItem = memo(function NotificationItem({
  notification,
  onNavigate,
  isExpanded,
  onToggleExplain,
}: {
  notification: Notification
  onNavigate: (notification: Notification) => void
  isExpanded: boolean
  onToggleExplain: (notificationId: string) => void
}) {
  const config = NOTIFICATION_CONFIG[notification.action as NotificationAction]
  const iconName = config?.icon || 'Bell'
  const IconComponent = ICON_MAP[iconName] || Bell
  const colorClass = categoryColors[notification.category] || 'text-stone-500'
  const isUnread = !notification.read_at
  const policy = getSignalPolicy(notification.action as NotificationAction)
  const channels = [
    policy.defaultChannels.sms ? 'SMS' : null,
    policy.defaultChannels.push ? 'push' : null,
    policy.defaultChannels.email ? 'email' : null,
  ].filter(Boolean)

  return (
    <div className={isUnread ? 'bg-brand-950/30' : ''}>
      <div className="flex items-start gap-2 px-4 py-3 transition-colors hover:bg-stone-800">
        <button
          type="button"
          onClick={() => onNavigate(notification)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
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
            <p className="text-xxs text-stone-400 mt-1">
              {getRelativeTime(notification.created_at)}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggleExplain(notification.id)
          }}
          className="mt-0.5 rounded-md p-1 text-stone-500 transition-colors hover:bg-stone-700 hover:text-stone-200"
          aria-label={`Why this alert: ${notification.title}`}
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
      {isExpanded && (
        <div className="border-t border-stone-800 bg-stone-950 px-4 py-3">
          <div className="grid grid-cols-2 gap-2 text-xxs text-stone-400">
            <span>Attention: {policy.attention}</span>
            <span>Cadence: {policy.cadence.replace(/_/g, ' ')}</span>
            <span>Risk: {policy.risk}</span>
            <span>Source: {policy.source}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-300">{policy.why}</p>
          <p className="mt-1 text-xxs leading-relaxed text-stone-500">
            Delivery: {channels.length > 0 ? channels.join(', ') : 'in-app only'}. Source of truth:{' '}
            {policy.sourceOfTruth}.
          </p>
        </div>
      )}
    </div>
  )
})

// ─── Filter bar config ──────────────────────────────────────────────────

const PANEL_FILTER_CATEGORIES: Array<{ key: NotificationCategory | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'event', label: 'Event' },
  { key: 'payment', label: 'Payment' },
  { key: 'chat', label: 'Chat' },
  { key: 'system', label: 'System' },
]

// ─── Inline push subscribe prompt ────────────────────────────────────────────

const PUSH_PANEL_DISMISSED_KEY = 'chefflow:push-panel-dismissed'

function PushSubscribeBanner() {
  const { state, isLoading, subscribe } = usePushSubscription()
  const [dismissed, setDismissed] = useState(true) // start hidden

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(PUSH_PANEL_DISMISSED_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  if (state !== 'default' || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(PUSH_PANEL_DISMISSED_KEY, '1')
    } catch {
      /* ok */
    }
  }

  const handleEnable = async () => {
    await subscribe()
  }

  return (
    <div className="px-4 py-3 border-b border-stone-800 bg-stone-850">
      <div className="flex items-start gap-2.5">
        <Bell className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-stone-200">
            Get alerts even when the app is closed
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleEnable}
              disabled={isLoading}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Enabling...' : 'Enable'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main panel ─────────────────────────────────────────────────────────────

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { markAsRead, markAllAsRead, unreadCount } = useNotifications()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'all'>('all')
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all')
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null)

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
            className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 font-medium"
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
              className={`px-2.5 py-1 text-xs-tight font-medium rounded-full transition-colors ${
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
            className={`ml-auto flex items-center gap-1 px-2.5 py-1 text-xs-tight font-medium rounded-full transition-colors ${
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

      {/* Push subscribe prompt - contextual, shown inside the bell panel */}
      <PushSubscribeBanner />

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
              isExpanded={expandedSignalId === notification.id}
              onToggleExplain={(notificationId) =>
                setExpandedSignalId((current) =>
                  current === notificationId ? null : notificationId
                )
              }
            />
          ))
        )}
      </div>

      {/* Footer - View all link */}
      <div className="border-t border-stone-800 px-4 py-2">
        <button
          type="button"
          onClick={() => {
            onClose()
            router.push('/notifications')
          }}
          className="w-full text-center text-xs text-brand-500 hover:text-brand-400 font-medium py-1"
        >
          View all notifications
        </button>
      </div>
    </div>
  )
}
