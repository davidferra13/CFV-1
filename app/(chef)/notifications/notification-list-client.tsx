'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, ChevronLeft, ChevronRight, EyeOff, Layers } from '@/components/ui/icons'
import { toast } from 'sonner'
import { showUndoToast } from '@/components/ui/undo-toast'
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotification,
} from '@/lib/notifications/actions'
import {
  getNotificationsByCategory,
  getNotificationCount,
  getUnreadNotifications,
  getNotificationDigests,
  type NotificationDigest,
} from '@/lib/notifications/check'
import { useNotifications } from '@/components/notifications/notification-provider'
import { type Notification, type NotificationCategory } from '@/lib/notifications/types'
import {
  DigestCard,
  FILTER_TABS,
  NotificationCard,
  PAGE_SIZE,
  groupNotificationsByDate,
} from './notification-list-components'

// ─── Icon Map ────────────────────────────────────────────────────────────

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
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [digests, setDigests] = useState<NotificationDigest[]>([])
  const [expandedDigests, setExpandedDigests] = useState<Set<string>>(new Set())

  // ─── Fetch ─────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const offset = page * PAGE_SIZE

      let data: Notification[]
      if (readFilter === 'unread' && activeFilter === 'all') {
        // Unread-only mode, no category filter - use dedicated server query
        data = await getUnreadNotifications(PAGE_SIZE, offset)
      } else if (activeFilter === 'all') {
        data = await getNotifications(PAGE_SIZE, offset)
      } else {
        data = await getNotificationsByCategory(
          activeFilter as NotificationCategory,
          PAGE_SIZE,
          offset
        )
      }

      // Client-side unread filter when combined with a category filter
      // (server already handles unread-only for 'all' category)
      if (readFilter === 'unread' && activeFilter !== 'all') {
        data = data.filter((n) => !n.read_at)
      }

      const count = await getNotificationCount(
        activeFilter === 'all' ? undefined : (activeFilter as NotificationCategory)
      )

      setNotifications(data)
      setTotalCount(count)

      // Fetch digests for the "Today" group (only on first page, no category filter)
      if (page === 0 && activeFilter === 'all' && readFilter === 'all') {
        try {
          const digestData = await getNotificationDigests(5)
          setDigests(digestData)
        } catch {
          // Digests are non-critical; silently fall back to empty
          setDigests([])
        }
      } else {
        setDigests([])
      }
    } catch (err) {
      console.error('[NotificationListClient] Failed to load:', err)
      setLoadError('Could not load notifications. Please retry.')
      setNotifications([])
      setTotalCount(0)
      setDigests([])
    } finally {
      setLoading(false)
    }
  }, [activeFilter, readFilter, page])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // ─── Actions ───────────────────────────────────────────────────────

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.read_at) return
    try {
      await markAsRead(notification.id)
      await contextMarkRead(notification.id)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
    } catch (err) {
      console.error('[NotificationListClient] Failed to mark as read:', err)
      toast.error('Could not mark notification as read')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead()
      await contextMarkAllRead()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
    } catch (err) {
      console.error('[NotificationListClient] Failed to mark all read:', err)
      toast.error('Could not mark all notifications as read')
    }
  }

  const handleArchive = async (notificationId: string) => {
    const target = notifications.find((n) => n.id === notificationId)
    if (!target) return

    // Optimistic removal
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    setTotalCount((prev) => Math.max(0, prev - 1))

    // Deferred execution with undo
    const timer = setTimeout(async () => {
      try {
        await archiveNotification(notificationId)
        await refreshCount()
      } catch (err) {
        console.error('[NotificationListClient] Failed to archive notification:', err)
        setNotifications((prev) => [...prev, target])
        setTotalCount((prev) => prev + 1)
        toast.error('Could not archive notification')
      }
    }, 8000)

    showUndoToast(
      'Notification archived',
      () => {
        clearTimeout(timer)
        setNotifications((prev) => [...prev, target])
        setTotalCount((prev) => prev + 1)
      },
      8000
    )
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

  const handleReadFilterToggle = () => {
    setReadFilter((prev) => (prev === 'all' ? 'unread' : 'all'))
    setPage(0)
  }

  const toggleDigest = (action: string) => {
    setExpandedDigests((prev) => {
      const next = new Set(prev)
      if (next.has(action)) {
        next.delete(action)
      } else {
        next.add(action)
      }
      return next
    })
  }

  // ─── Pagination ────────────────────────────────────────────────────

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasNext = page < totalPages - 1
  const hasPrev = page > 0

  // ─── Date grouping ─────────────────────────────────────────────────

  const groupedNotifications = useMemo(
    () => groupNotificationsByDate(notifications),
    [notifications]
  )

  // Build set of notification IDs that are covered by a digest (for collapsing)
  const digestActionSet = useMemo(() => new Set(digests.map((d) => d.action)), [digests])

  // ─── Render helpers ────────────────────────────────────────────────

  const unreadInView = notifications.filter((n) => !n.read_at).length

  return (
    <div>
      {loadError && (
        <div
          className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          role="alert"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => fetchNotifications()}
            className="rounded px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleFilterChange(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              activeFilter === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          onClick={handleReadFilterToggle}
          className={`ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
            readFilter === 'unread'
              ? 'bg-brand-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
          }`}
        >
          <EyeOff className="w-3 h-3" />
          Unread
        </button>
      </div>

      {/* Actions bar */}
      {unreadInView > 0 && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs text-stone-500">{unreadInView} unread on this page</span>
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 font-medium"
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
              {loadError
                ? 'Unable to load notifications right now.'
                : activeFilter === 'all' && readFilter === 'all'
                  ? "You're all caught up"
                  : `No ${readFilter === 'unread' ? 'unread ' : ''}${activeFilter !== 'all' ? (FILTER_TABS.find((t) => t.key === activeFilter)?.label ?? activeFilter) + ' ' : ''}notifications`}
            </p>
          </div>
        ) : (
          <div>
            {groupedNotifications.map(({ group, items }, groupIndex) => {
              const showDigests = group === 'Today' && digests.length > 0

              // For the Today group, split items into digested (collapsible) and non-digested
              const digestedItems = showDigests
                ? items.filter((n) => digestActionSet.has(n.action))
                : []
              const nonDigestedItems = showDigests
                ? items.filter((n) => !digestActionSet.has(n.action))
                : items

              return (
                <div key={group}>
                  {/* Divider between groups (not before first) */}
                  {groupIndex > 0 && <div className="border-t border-stone-700" />}

                  {/* Date group header */}
                  <div className="px-4 py-2 bg-stone-850 border-b border-stone-800 sticky top-0 z-10">
                    <h3 className="text-xs-tight font-semibold text-stone-500 uppercase tracking-wider">
                      {group}
                    </h3>
                  </div>

                  {/* Digest cards at top of Today group */}
                  {showDigests && (
                    <div className="px-4 py-3 space-y-2 border-b border-stone-800 bg-stone-900/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Layers className="w-3.5 h-3.5 text-stone-500" />
                        <span className="text-xxs font-medium text-stone-500 uppercase tracking-wider">
                          Activity Summary
                        </span>
                      </div>
                      {digests.map((digest) => (
                        <div key={digest.action}>
                          <DigestCard
                            digest={digest}
                            onExpand={() => toggleDigest(digest.action)}
                            expanded={expandedDigests.has(digest.action)}
                          />
                          {/* Expanded digest items */}
                          {expandedDigests.has(digest.action) && (
                            <div className="ml-2 mt-1 border-l-2 border-stone-700 pl-2 space-y-0">
                              {digestedItems
                                .filter((n) => n.action === digest.action)
                                .map((notification) => (
                                  <div
                                    key={notification.id}
                                    className="divide-y divide-stone-800/50"
                                  >
                                    <NotificationCard
                                      key={notification.id}
                                      notification={notification}
                                      onNavigate={handleNavigate}
                                      onArchive={handleArchive}
                                      onMarkRead={handleMarkAsRead}
                                    />
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Non-digested notifications (or all items for non-Today groups) */}
                  <div className="divide-y divide-stone-800">
                    {nonDigestedItems.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onNavigate={handleNavigate}
                        onArchive={handleArchive}
                        onMarkRead={handleMarkAsRead}
                      />
                    ))}
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
