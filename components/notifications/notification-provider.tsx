'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { subscribeToNotifications } from '@/lib/notifications/realtime'
import {
  getUnreadCount,
  markAsRead as markAsReadAction,
  markAllAsRead as markAllAsReadAction,
  getNotificationPreferences,
} from '@/lib/notifications/actions'
import { NOTIFICATION_CONFIG } from '@/lib/notifications/types'
import type { Notification, NotificationAction } from '@/lib/notifications/types'

// ─── Context ────────────────────────────────────────────────────────────

type NotificationContextType = {
  unreadCount: number
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refreshCount: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refreshCount: async () => {},
})

export function useNotifications() {
  return useContext(NotificationContext)
}

// ─── Toast Component ────────────────────────────────────────────────────

function NotificationToast({
  notification,
  onClose,
}: {
  notification: Notification
  onClose: () => void
}) {
  const router = useRouter()

  const categoryColors: Record<string, string> = {
    inquiry: 'bg-sky-500',
    quote: 'bg-amber-500',
    event: 'bg-brand-600',
    payment: 'bg-emerald-500',
    chat: 'bg-violet-500',
    client: 'bg-stone-8000',
    system: 'bg-stone-700',
  }

  const dotColor = categoryColors[notification.category] || 'bg-stone-8000'

  return (
    <button
      type="button"
      onClick={() => {
        onClose()
        if (notification.action_url) {
          router.push(notification.action_url)
        }
      }}
      className="flex items-start gap-3 w-full text-left"
    >
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-100 truncate">{notification.title}</p>
        {notification.body && (
          <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{notification.body}</p>
        )}
      </div>
    </button>
  )
}

// ─── Provider ───────────────────────────────────────────────────────────

export function NotificationProvider({
  userId,
  children,
}: {
  userId: string
  children: React.ReactNode
}) {
  const [unreadCount, setUnreadCount] = useState(0)
  const preferencesRef = useRef<Map<string, boolean>>(new Map())

  // Load initial unread count
  const refreshCount = useCallback(async () => {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch (err) {
      console.error('[NotificationProvider] Failed to fetch unread count:', err)
    }
  }, [])

  // Load preferences
  useEffect(() => {
    async function loadPreferences() {
      try {
        const prefs = await getNotificationPreferences()
        const map = new Map<string, boolean>()
        for (const p of prefs) {
          map.set(p.category, p.toast_enabled)
        }
        preferencesRef.current = map
      } catch (err) {
        console.error('[NotificationProvider] Failed to load preferences:', err)
      }
    }
    loadPreferences()
  }, [])

  // Initial count fetch
  useEffect(() => {
    refreshCount()
  }, [refreshCount])

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = subscribeToNotifications(userId, (notification) => {
      // Increment badge count
      setUnreadCount((prev) => prev + 1)

      // Determine if we should show a toast
      const config = NOTIFICATION_CONFIG[notification.action as NotificationAction]
      const categoryPref = preferencesRef.current.get(notification.category)
      // If user has set a preference, use it. Otherwise use default from config.
      const shouldToast =
        categoryPref !== undefined ? categoryPref : (config?.toastByDefault ?? true)

      if (shouldToast) {
        toast.custom(
          (t) => <NotificationToast notification={notification} onClose={() => toast.dismiss(t)} />,
          { duration: 5000 }
        )
      }
    })

    return unsubscribe
  }, [userId])

  // Mark single as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsReadAction(notificationId)
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('[NotificationProvider] markAsRead failed:', err)
    }
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadAction()
      setUnreadCount(0)
    } catch (err) {
      console.error('[NotificationProvider] markAllAsRead failed:', err)
    }
  }, [])

  return (
    <NotificationContext.Provider value={{ unreadCount, markAsRead, markAllAsRead, refreshCount }}>
      {children}
    </NotificationContext.Provider>
  )
}
