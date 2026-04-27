// Staff Notification List - client component for read/unread tracking via localStorage
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { StaffNotification } from '@/lib/staff/staff-portal-actions'

const STORAGE_KEY = 'cf-staff-read-notifications'

function getReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // localStorage full or unavailable; silently ignore
  }
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'task_assigned':
      return '📋'
    case 'schedule_changed':
      return '📅'
    case 'shift_reminder':
      return '⏰'
    case 'message_from_chef':
      return '💬'
    default:
      return '🔔'
  }
}

function getNotificationLabel(type: string): string {
  switch (type) {
    case 'task_assigned':
      return 'Task'
    case 'schedule_changed':
      return 'Schedule'
    case 'shift_reminder':
      return 'Shift'
    case 'message_from_chef':
      return 'Message'
    default:
      return 'Notification'
  }
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type Props = {
  notifications: StaffNotification[]
}

export function StaffNotificationList({ notifications }: Props) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setReadIds(getReadIds())
    setMounted(true)
  }, [])

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map((n) => n.id))
    setReadIds(allIds)
    saveReadIds(allIds)
  }

  if (!mounted) {
    return (
      <div className="text-center py-12 text-stone-500 text-sm">Loading notifications...</div>
    )
  }

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🔔</div>
        <p className="text-stone-400 text-sm">No notifications in the last 7 days.</p>
        <p className="text-stone-500 text-xs mt-1">
          Task assignments and schedule changes will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header with mark all as read */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-400">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={markAllAsRead}
            className="text-sm text-brand-500 hover:text-brand-400 transition-colors"
          >
            Mark all as read
          </button>
        </div>
      )}

      {/* Notification items */}
      <div className="space-y-1">
        {notifications.map((n) => {
          const isRead = readIds.has(n.id)
          const content = (
            <div
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                isRead
                  ? 'bg-stone-800/30 hover:bg-stone-800/50'
                  : 'bg-stone-800/80 hover:bg-stone-700/60 border-l-2 border-brand-500'
              }`}
              onClick={() => markAsRead(n.id)}
            >
              {/* Icon */}
              <div className="text-xl flex-shrink-0 mt-0.5">{getNotificationIcon(n.type)}</div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-xs font-medium uppercase tracking-wide ${
                      isRead ? 'text-stone-500' : 'text-brand-400'
                    }`}
                  >
                    {getNotificationLabel(n.type)}
                  </span>
                  {!isRead && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500" />
                  )}
                </div>
                <p
                  className={`text-sm ${isRead ? 'text-stone-400' : 'text-stone-200 font-medium'}`}
                >
                  {n.message}
                </p>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-stone-500 flex-shrink-0 whitespace-nowrap">
                {formatTimestamp(n.timestamp)}
              </div>
            </div>
          )

          if (n.actionUrl) {
            return (
              <Link
                key={n.id}
                href={n.actionUrl}
                onClick={() => markAsRead(n.id)}
                className="block"
              >
                {content}
              </Link>
            )
          }

          return <div key={n.id}>{content}</div>
        })}
      </div>
    </div>
  )
}
