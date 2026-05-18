'use client'

import { toast } from 'sonner'
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
  ChevronDown,
  ChevronUp,
  Archive,
  Send,
  ExternalLink,
  Calendar,
  Globe,
  ListChecks,
  Layers,
} from '@/components/ui/icons'
import {
  NOTIFICATION_CONFIG,
  CATEGORY_LABELS,
  INLINE_ACTIONS,
  type Notification,
  type NotificationAction,
  type NotificationCategory,
  type InlineActionButton,
} from '@/lib/notifications/types'
import type { NotificationDigest } from '@/lib/notifications/check'

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
  Send,
  ExternalLink,
  Calendar,
  Globe,
  ListChecks,
  Layers,
}

const categoryColors: Record<string, string> = {
  inquiry: 'text-brand-500',
  quote: 'text-amber-500',
  event: 'text-brand-600',
  payment: 'text-emerald-500',
  chat: 'text-violet-500',
  client: 'text-stone-500',
  ops: 'text-orange-500',
  loyalty: 'text-pink-500',
  goals: 'text-teal-500',
  lead: 'text-brand-500',
  protection: 'text-red-500',
  wellbeing: 'text-lime-500',
  review: 'text-yellow-500',
  system: 'text-stone-300',
}

const categoryBadgeColors: Record<string, string> = {
  inquiry: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
  quote: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  event: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
  payment: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  chat: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  client: 'bg-stone-500/10 text-stone-400 border-stone-500/20',
  ops: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  loyalty: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  goals: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  lead: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
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

export const PAGE_SIZE = 20

// Filter tabs: 'all' plus categories that have enough content to warrant filtering
export const FILTER_TABS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'ops', label: 'Ops' },
  { key: 'inquiry', label: 'Inquiries' },
  { key: 'event', label: 'Events' },
  { key: 'quote', label: 'Quotes' },
  { key: 'payment', label: 'Payments' },
  { key: 'chat', label: 'Chat' },
  { key: 'client', label: 'Clients' },
  { key: 'system', label: 'System' },
]

// ─── Date grouping ──────────────────────────────────────────────────────

type DateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Older'

function getDateGroup(dateStr: string): DateGroup {
  const now = new Date()
  const date = new Date(dateStr)

  // Reset to start of day for comparison
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)

  if (date >= todayStart) return 'Today'
  if (date >= yesterdayStart) return 'Yesterday'
  if (date >= weekStart) return 'This Week'
  return 'Older'
}

export function groupNotificationsByDate(
  notifications: Notification[]
): Array<{ group: DateGroup; items: Notification[] }> {
  const groups: Record<DateGroup, Notification[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  }

  for (const n of notifications) {
    groups[getDateGroup(n.created_at)].push(n)
  }

  const ordered: DateGroup[] = ['Today', 'Yesterday', 'This Week', 'Older']
  return ordered
    .filter((group) => groups[group].length > 0)
    .map((group) => ({ group, items: groups[group] }))
}

// ─── Digest Card ────────────────────────────────────────────────────────

export function DigestCard({
  digest,
  onExpand,
  expanded,
}: {
  digest: NotificationDigest
  onExpand: () => void
  expanded: boolean
}) {
  const config = NOTIFICATION_CONFIG[digest.action as NotificationAction]
  const iconName = config?.icon || 'Bell'
  const IconComponent = ICON_MAP[iconName] || Bell
  const colorClass = config ? categoryColors[config.category] || 'text-stone-500' : 'text-stone-500'

  // Build a readable summary: "3 new inquiries today"
  const actionLabel = digest.action.replace(/_/g, ' ')

  return (
    <button
      type="button"
      onClick={onExpand}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors w-full text-left ${
        expanded
          ? 'bg-stone-800 border-stone-700'
          : 'bg-stone-800/60 border-stone-800 hover:bg-stone-800 hover:border-stone-700'
      }`}
    >
      <div className={`flex-shrink-0 ${colorClass}`}>
        <IconComponent className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-stone-200">
          {digest.count} {actionLabel}
          {digest.count > 1 ? 's' : ''} today
        </span>
      </div>
      <div className="flex-shrink-0 text-stone-500">
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </div>
    </button>
  )
}

// ─── Inline Action Button ───────────────────────────────────────────────

function InlineActionButtonComponent({
  action,
  notification,
  onNavigate,
  onArchive,
  onMarkRead,
}: {
  action: InlineActionButton
  notification: Notification
  onNavigate: (n: Notification) => void
  onArchive: (id: string) => void
  onMarkRead: (n: Notification) => void
}) {
  const IconComponent = ICON_MAP[action.icon] || Bell

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (action.serverAction) {
      switch (action.serverAction) {
        case 'mark_read':
          onMarkRead(notification)
          break
        case 'archive':
          onArchive(notification.id)
          break
        case 'create_task':
          toast.info(`Task creation from notification: "${notification.title}"`)
          break
        case 'dismiss':
          onArchive(notification.id)
          break
      }
      return
    }

    // Navigation: use href if set, otherwise fall through to action_url
    if (action.href) {
      window.location.href = action.href
    } else {
      onNavigate(notification)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xxs font-medium rounded-full bg-stone-700 text-stone-300 hover:bg-stone-600 hover:text-stone-200 transition-colors whitespace-nowrap"
    >
      <IconComponent className="w-3 h-3" />
      {action.label}
    </button>
  )
}

// ─── Component ───────────────────────────────────────────────────────────

export function NotificationCard({
  notification,
  onNavigate,
  onArchive,
  onMarkRead,
}: {
  notification: Notification
  onNavigate: (n: Notification) => void
  onArchive: (id: string) => void
  onMarkRead: (n: Notification) => void
}) {
  const config = NOTIFICATION_CONFIG[notification.action as NotificationAction]
  const iconName = config?.icon || 'Bell'
  const IconComponent = ICON_MAP[iconName] || Bell
  const colorClass = categoryColors[notification.category] || 'text-stone-500'
  const badgeClass =
    categoryBadgeColors[notification.category] ||
    'bg-stone-500/10 text-stone-400 border-stone-500/20'
  const isUnread = !notification.read_at
  const categoryLabel =
    CATEGORY_LABELS[notification.category as NotificationCategory] || notification.category
  const inlineActions = INLINE_ACTIONS[notification.action as NotificationAction]

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

      {/* Content - clickable */}
      <div className="flex-1 min-w-0">
        <button type="button" onClick={() => onNavigate(notification)} className="w-full text-left">
          <div className="flex items-start gap-2">
            <p className={`text-sm ${isUnread ? 'font-medium text-stone-100' : 'text-stone-300'}`}>
              {notification.title}
            </p>
            {isUnread && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-1.5 flex-shrink-0" />
            )}
          </div>
          {notification.body && (
            <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{notification.body}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={`inline-flex items-center text-xxs px-1.5 py-0.5 rounded border ${badgeClass}`}
            >
              {categoryLabel}
            </span>
            <span className="text-xxs text-stone-500">{formatDate(notification.created_at)}</span>
            <span className="text-xxs text-stone-600">
              ({getRelativeTime(notification.created_at)})
            </span>
          </div>
        </button>

        {/* Inline action buttons: visible on hover (desktop), always visible on mobile */}
        {inlineActions && inlineActions.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {inlineActions.map((action) => (
              <InlineActionButtonComponent
                key={action.label}
                action={action}
                notification={notification}
                onNavigate={onNavigate}
                onArchive={onArchive}
                onMarkRead={onMarkRead}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mark read / Archive buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {isUnread && (
          <button
            type="button"
            onClick={() => onMarkRead(notification)}
            title="Mark as read"
            className="p-1 rounded hover:bg-stone-700 text-stone-500 hover:text-stone-300"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onArchive(notification.id)}
          title="Archive"
          className="p-1 rounded hover:bg-stone-700 text-stone-500 hover:text-stone-300"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
