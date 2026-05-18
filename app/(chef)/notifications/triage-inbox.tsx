'use client'

// Triage Inbox - Notification triage UI with bulk operations, snooze, filtering
// Extends the existing notification list with power-user triage capabilities.

import { useState, useEffect, useCallback, useTransition, useMemo } from 'react'
import {
  Bell,
  Check,
  CheckSquare,
  Clock,
  Filter,
  Square,
  Archive,
  Eye,
  EyeOff,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Info,
} from '@/components/ui/icons'
import { toast } from 'sonner'
import {
  getTriageInbox,
  bulkMarkRead,
  bulkMarkUnread,
  snoozeNotification,
  unsnoozeNotification,
  getNotificationSources,
  getPriorityBreakdown,
} from '@/lib/notifications/triage-actions'
import { useNotifications } from '@/components/notifications/notification-provider'
import type {
  TriageNotification,
  TriageFilter,
  PriorityBreakdown,
} from '@/lib/notifications/triage-types'
import type { Notification, NotificationCategory } from '@/lib/notifications/types'
import type { NotificationTier } from '@/lib/notifications/tier-config'
import { NotificationCard } from './notification-list-components'
import { markAsRead, archiveNotification } from '@/lib/notifications/actions'

// ---- Snooze presets ---------------------------------------------------------

const SNOOZE_PRESETS = [
  { label: '1 hour', hours: 1 },
  { label: '4 hours', hours: 4 },
  { label: 'Tomorrow', hours: 24 },
  { label: 'Next week', hours: 168 },
] as const

function getSnoozeDate(hours: number): Date {
  const d = new Date()
  d.setHours(d.getHours() + hours)
  return d
}

// ---- Priority badge ---------------------------------------------------------

const PRIORITY_STYLES: Record<
  NotificationTier,
  { bg: string; text: string; icon: typeof AlertTriangle }
> = {
  critical: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', icon: AlertTriangle },
  alert: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', icon: AlertCircle },
  info: { bg: 'bg-stone-500/10 border-stone-500/20', text: 'text-stone-400', icon: Info },
}

function PriorityBadge({ priority }: { priority: NotificationTier }) {
  const style = PRIORITY_STYLES[priority]
  const Icon = style.icon
  return (
    <span
      className={`inline-flex items-center gap-1 text-xxs px-1.5 py-0.5 rounded border ${style.bg} ${style.text}`}
    >
      <Icon className="w-3 h-3" />
      {priority}
    </span>
  )
}

// ---- Priority breakdown bar -------------------------------------------------

function PriorityBreakdownBar({
  breakdown,
  activeFilter,
  onFilter,
}: {
  breakdown: PriorityBreakdown
  activeFilter: NotificationTier | undefined
  onFilter: (p: NotificationTier | undefined) => void
}) {
  const total = breakdown.critical + breakdown.alert + breakdown.info
  if (total === 0) return null

  const items: Array<{ tier: NotificationTier; count: number; color: string }> = [
    { tier: 'critical', count: breakdown.critical, color: 'bg-red-500' },
    { tier: 'alert', count: breakdown.alert, color: 'bg-amber-500' },
    { tier: 'info', count: breakdown.info, color: 'bg-stone-500' },
  ]

  return (
    <div className="flex items-center gap-3 mb-4">
      {items.map(({ tier, count, color }) => (
        <button
          key={tier}
          type="button"
          onClick={() => onFilter(activeFilter === tier ? undefined : tier)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
            activeFilter === tier
              ? 'border-brand-600 bg-brand-600/10 text-brand-400'
              : 'border-stone-700 bg-stone-800 text-stone-400 hover:bg-stone-700'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${color}`} />
          <span className="capitalize">{tier}</span>
          <span className="text-stone-500 font-mono">{count}</span>
        </button>
      ))}
    </div>
  )
}

// ---- Main component ---------------------------------------------------------

export function TriageInbox() {
  const { refreshCount } = useNotifications()
  const [isPending, startTransition] = useTransition()

  // Data
  const [notifications, setNotifications] = useState<TriageNotification[]>([])
  const [sources, setSources] = useState<
    Array<{ category: NotificationCategory; label: string; count: number }>
  >([])
  const [breakdown, setBreakdown] = useState<PriorityBreakdown>({ critical: 0, alert: 0, info: 0 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filters
  const [sourceFilter, setSourceFilter] = useState<NotificationCategory | undefined>()
  const [priorityFilter, setPriorityFilter] = useState<NotificationTier | undefined>()
  const [readFilter, setReadFilter] = useState<boolean | undefined>()

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Snooze picker
  const [snoozeTarget, setSnoozeTarget] = useState<string | null>(null)

  // ---- Fetch ----------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const filter: TriageFilter = {}
      if (sourceFilter) filter.source = sourceFilter
      if (priorityFilter) filter.priority = priorityFilter
      if (readFilter !== undefined) filter.read = readFilter

      const [inbox, sourcesData, breakdownData] = await Promise.all([
        getTriageInbox(filter, 40, 0),
        getNotificationSources(),
        getPriorityBreakdown(),
      ])

      setNotifications(inbox)
      setSources(sourcesData)
      setBreakdown(breakdownData)
    } catch (err) {
      console.error('[TriageInbox] Fetch failed:', err)
      setLoadError('Could not load triage inbox. Please retry.')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [sourceFilter, priorityFilter, readFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---- Selection helpers ----------------------------------------------------

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  // ---- Bulk actions ---------------------------------------------------------

  const handleBulkMarkRead = () => {
    const ids = Array.from(selectedIds)
    startTransition(async () => {
      try {
        const result = await bulkMarkRead(ids)
        if (!result.success) {
          toast.error(result.error ?? 'Failed to mark as read')
          return
        }
        toast.success(`Marked ${result.affected ?? ids.length} as read`)
        clearSelection()
        await refreshCount()
        await fetchData()
      } catch (err) {
        console.error('[TriageInbox] bulkMarkRead failed:', err)
        toast.error('Failed to mark notifications as read')
      }
    })
  }

  const handleBulkMarkUnread = () => {
    const ids = Array.from(selectedIds)
    startTransition(async () => {
      try {
        const result = await bulkMarkUnread(ids)
        if (!result.success) {
          toast.error(result.error ?? 'Failed to mark as unread')
          return
        }
        toast.success(`Marked ${result.affected ?? ids.length} as unread`)
        clearSelection()
        await refreshCount()
        await fetchData()
      } catch (err) {
        console.error('[TriageInbox] bulkMarkUnread failed:', err)
        toast.error('Failed to mark notifications as unread')
      }
    })
  }

  // ---- Snooze ---------------------------------------------------------------

  const handleSnooze = (notificationId: string, hours: number) => {
    const snoozeUntil = getSnoozeDate(hours)
    startTransition(async () => {
      try {
        const result = await snoozeNotification(notificationId, snoozeUntil)
        if (!result.success) {
          toast.error(result.error ?? 'Failed to snooze')
          return
        }
        const preset = SNOOZE_PRESETS.find((p) => p.hours === hours)
        toast.success(`Snoozed for ${preset?.label ?? hours + 'h'}`)
        setSnoozeTarget(null)
        await fetchData()
      } catch (err) {
        console.error('[TriageInbox] snooze failed:', err)
        toast.error('Failed to snooze notification')
      }
    })
  }

  // ---- Single notification actions (delegated to existing) ------------------

  const handleMarkRead = async (notification: TriageNotification | Notification) => {
    if (notification.read_at) return
    try {
      await markAsRead(notification.id)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
      await refreshCount()
    } catch (err) {
      console.error('[TriageInbox] markAsRead failed:', err)
      toast.error('Could not mark notification as read')
    }
  }

  const handleArchive = async (notificationId: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      await archiveNotification(notificationId)
      await refreshCount()
      toast.success('Notification archived')
    } catch (err) {
      console.error('[TriageInbox] archive failed:', err)
      toast.error('Could not archive notification')
      await fetchData()
    }
  }

  const handleNavigate = async (notification: TriageNotification | Notification) => {
    await handleMarkRead(notification)
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }

  // ---- Derived state --------------------------------------------------------

  const hasSelection = selectedIds.size > 0
  const allSelected = notifications.length > 0 && selectedIds.size === notifications.length

  // ---- Render ---------------------------------------------------------------

  return (
    <div>
      {/* Priority breakdown */}
      <PriorityBreakdownBar
        breakdown={breakdown}
        activeFilter={priorityFilter}
        onFilter={setPriorityFilter}
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Source filter */}
        <div className="relative">
          <select
            value={sourceFilter ?? ''}
            onChange={(e) =>
              setSourceFilter((e.target.value || undefined) as NotificationCategory | undefined)
            }
            className="appearance-none bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 pr-8 text-xs text-stone-300 focus:outline-none focus:border-brand-600"
          >
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s.category} value={s.category}>
                {s.label} ({s.count})
              </option>
            ))}
          </select>
          <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" />
        </div>

        {/* Read/Unread toggle */}
        <div className="flex items-center gap-1 bg-stone-800 border border-stone-700 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setReadFilter(undefined)}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              readFilter === undefined
                ? 'bg-brand-600 text-white'
                : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setReadFilter(false)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
              readFilter === false
                ? 'bg-brand-600 text-white'
                : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            <EyeOff className="w-3 h-3" />
            Unread
          </button>
          <button
            type="button"
            onClick={() => setReadFilter(true)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
              readFilter === true
                ? 'bg-brand-600 text-white'
                : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            <Eye className="w-3 h-3" />
            Read
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {hasSelection && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-brand-950/30 border border-brand-600/30 rounded-lg">
          <span className="text-xs text-brand-400 font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={handleBulkMarkRead}
              disabled={isPending}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-stone-700 text-stone-300 hover:bg-stone-600 disabled:opacity-50 transition-colors"
            >
              <Check className="w-3 h-3" />
              Mark Read
            </button>
            <button
              type="button"
              onClick={handleBulkMarkUnread}
              disabled={isPending}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-stone-700 text-stone-300 hover:bg-stone-600 disabled:opacity-50 transition-colors"
            >
              <EyeOff className="w-3 h-3" />
              Mark Unread
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-2.5 py-1 text-xs text-stone-500 hover:text-stone-300 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {loadError && (
        <div
          className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          role="alert"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => fetchData()}
            className="rounded px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-500/20"
          >
            Retry
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
              {sourceFilter || priorityFilter || readFilter !== undefined
                ? 'No notifications match your filters'
                : "You're all caught up"}
            </p>
          </div>
        ) : (
          <>
            {/* Select all header */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-800 bg-stone-850">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-stone-500 hover:text-stone-300 transition-colors"
                title={allSelected ? 'Deselect all' : 'Select all'}
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-brand-500" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
              <span className="text-xs text-stone-500">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Items */}
            <div className="divide-y divide-stone-800">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-start">
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleSelect(notification.id)}
                    className="flex-shrink-0 p-3 pt-4 text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    {selectedIds.has(notification.id) ? (
                      <CheckSquare className="w-4 h-4 text-brand-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  {/* Notification content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 px-2 pt-3 pb-1">
                      <PriorityBadge priority={notification.priority} />
                      <span className="text-xxs text-stone-500">{notification.source_label}</span>
                      {/* Snooze button */}
                      <div className="relative ml-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSnoozeTarget(
                              snoozeTarget === notification.id ? null : notification.id
                            )
                          }}
                          className="flex items-center gap-1 px-1.5 py-0.5 text-xxs text-stone-500 hover:text-stone-300 rounded hover:bg-stone-700 transition-colors"
                          title="Snooze"
                        >
                          <Clock className="w-3 h-3" />
                          Snooze
                        </button>
                        {/* Snooze dropdown */}
                        {snoozeTarget === notification.id && (
                          <div className="absolute right-0 top-full mt-1 z-20 bg-stone-800 border border-stone-700 rounded-lg shadow-xl py-1 min-w-[140px]">
                            {SNOOZE_PRESETS.map((preset) => (
                              <button
                                key={preset.hours}
                                type="button"
                                onClick={() => handleSnooze(notification.id, preset.hours)}
                                disabled={isPending}
                                className="w-full text-left px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700 disabled:opacity-50 transition-colors"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <NotificationCard
                      notification={notification}
                      onNavigate={handleNavigate}
                      onArchive={handleArchive}
                      onMarkRead={handleMarkRead}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
