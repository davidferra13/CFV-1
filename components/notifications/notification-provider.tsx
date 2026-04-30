'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { subscribeToNotifications } from '@/lib/notifications/realtime'
import {
  getUnreadCount,
  markAsRead as markAsReadAction,
  markAllAsRead as markAllAsReadAction,
  getNotificationPreferences,
  getNotificationRuntimeSettings,
  type NotificationRuntimeSettings,
} from '@/lib/notifications/actions'
import { NOTIFICATION_CONFIG } from '@/lib/notifications/types'
import { DEFAULT_TIER_MAP } from '@/lib/notifications/tier-config'
import type { Notification, NotificationAction } from '@/lib/notifications/types'
import {
  evaluateNotificationInterruption,
  type ChefMode,
  type InterruptionDecision,
} from '@/lib/notifications/interruption-policy'

type NotificationListener = (notification: Notification) => void

type NotificationContextType = {
  unreadCount: number
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refreshCount: () => Promise<void>
  /** Subscribe to incoming live notifications. Returns an unsubscribe function. */
  addNotificationListener: (fn: NotificationListener) => () => void
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refreshCount: async () => {},
  addNotificationListener: () => () => {},
})

export function useNotifications() {
  return useContext(NotificationContext)
}

type NotificationSeverity = 'info' | 'medium' | 'high'

type RuntimeSettings = NotificationRuntimeSettings

const DEVICE_ATTENTION_STORAGE_KEY = 'cheflow:notification-attention'
const DEVICE_ATTENTION_CHANGE_EVENT = 'cheflow-notification-attention-change'

type DeviceAttentionSettings = {
  hapticsEnabled: boolean
  inAppVibrationEnabled: boolean
  chefMode: ChefMode
}

const DEFAULT_DEVICE_ATTENTION_SETTINGS: DeviceAttentionSettings = {
  hapticsEnabled: true,
  inAppVibrationEnabled: true,
  chefMode: 'available',
}

function readDeviceAttentionSettings(): DeviceAttentionSettings {
  if (typeof window === 'undefined') return DEFAULT_DEVICE_ATTENTION_SETTINGS

  try {
    const raw = window.localStorage.getItem(DEVICE_ATTENTION_STORAGE_KEY)
    if (!raw) return DEFAULT_DEVICE_ATTENTION_SETTINGS
    const parsed = JSON.parse(raw) as Partial<DeviceAttentionSettings>
    return {
      hapticsEnabled:
        typeof parsed.hapticsEnabled === 'boolean'
          ? parsed.hapticsEnabled
          : DEFAULT_DEVICE_ATTENTION_SETTINGS.hapticsEnabled,
      inAppVibrationEnabled:
        typeof parsed.inAppVibrationEnabled === 'boolean'
          ? parsed.inAppVibrationEnabled
          : DEFAULT_DEVICE_ATTENTION_SETTINGS.inAppVibrationEnabled,
      chefMode:
        parsed.chefMode === 'prep' ||
        parsed.chefMode === 'service' ||
        parsed.chefMode === 'driving' ||
        parsed.chefMode === 'off_hours' ||
        parsed.chefMode === 'available'
          ? parsed.chefMode
          : DEFAULT_DEVICE_ATTENTION_SETTINGS.chefMode,
    }
  } catch {
    return DEFAULT_DEVICE_ATTENTION_SETTINGS
  }
}

function readDailyFatigueCount(): number {
  if (typeof window === 'undefined') return 0
  const today = new Date().toISOString().slice(0, 10)
  const key = `cheflow:notification-fatigue:${today}`
  const parsed = Number.parseInt(window.localStorage.getItem(key) ?? '0', 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function incrementDailyFatigueCount() {
  if (typeof window === 'undefined') return
  const today = new Date().toISOString().slice(0, 10)
  const key = `cheflow:notification-fatigue:${today}`
  const next = readDailyFatigueCount() + 1
  window.localStorage.setItem(key, String(next))
}

function parseTimeToMinutes(value: string | null): number | null {
  if (!value) return null
  const [hours, minutes] = value.split(':').map((part) => Number.parseInt(part, 10))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return Math.max(0, Math.min(23, hours)) * 60 + Math.max(0, Math.min(59, minutes))
}

function isWithinQuietWindow(settings: RuntimeSettings, now = new Date()): boolean {
  if (!settings.quietHoursEnabled) return false
  const start = parseTimeToMinutes(settings.quietHoursStart)
  const end = parseTimeToMinutes(settings.quietHoursEnd)
  if (start === null || end === null || start === end) return false

  const current = now.getHours() * 60 + now.getMinutes()
  if (start < end) {
    return current >= start && current < end
  }
  return current >= start || current < end
}

function getSeverity(action: NotificationAction): NotificationSeverity {
  const tier = DEFAULT_TIER_MAP[action]
  if (tier === 'critical') return 'high'
  if (tier === 'info') return 'info'
  return 'medium'
}

function buildNotificationKey(notification: Notification): string {
  return [
    notification.action,
    notification.action_url ?? '',
    notification.title,
    notification.body ?? '',
  ].join('::')
}

function shouldVibrateInApp(
  decision: InterruptionDecision,
  settings: DeviceAttentionSettings,
  hapticCooldowns: Map<string, number>
): boolean {
  if (!settings.hapticsEnabled || !settings.inAppVibrationEnabled) return false
  if (decision.pattern.length === 0) return false
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false

  const now = Date.now()
  for (const [key, at] of hapticCooldowns.entries()) {
    if (now - at > 60 * 60_000) hapticCooldowns.delete(key)
  }

  const existing = hapticCooldowns.get(decision.tag)
  if (existing && now - existing < decision.cooldownMs) return false

  hapticCooldowns.set(decision.tag, now)
  return true
}

function NotificationToast({
  notification,
  onClose,
}: {
  notification: Notification
  onClose: () => void
}) {
  const router = useRouter()

  const categoryColors: Record<string, string> = {
    inquiry: 'bg-brand-500',
    quote: 'bg-amber-500',
    event: 'bg-brand-600',
    payment: 'bg-emerald-500',
    chat: 'bg-violet-500',
    client: 'bg-stone-800',
    system: 'bg-stone-700',
  }

  const dotColor = categoryColors[notification.category] || 'bg-stone-800'
  const actionUrl = notification.action_url || '/inbox'

  return (
    <button
      type="button"
      onClick={() => {
        onClose()
        router.push(actionUrl)
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

function DigestToast({
  notifications,
  onClose,
}: {
  notifications: Notification[]
  onClose: () => void
}) {
  const router = useRouter()
  const count = notifications.length
  const first = notifications[0]

  return (
    <button
      type="button"
      onClick={() => {
        onClose()
        router.push('/inbox')
      }}
      className="w-full text-left"
    >
      <p className="text-sm font-semibold text-stone-100">{count} new notifications</p>
      <p className="text-xs text-stone-500 mt-0.5 truncate">
        Latest: {first?.title ?? 'New activity'}
      </p>
    </button>
  )
}

export function NotificationProvider({
  userId,
  children,
}: {
  userId: string
  children: React.ReactNode
}) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>({
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    digestEnabled: false,
    digestIntervalMinutes: 15,
  })

  const preferencesRef = useRef<Map<string, boolean>>(new Map())
  const runtimeSettingsRef = useRef<RuntimeSettings>(runtimeSettings)
  const digestBufferRef = useRef<Notification[]>([])
  const digestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dedupeRef = useRef<Map<string, number>>(new Map())
  const hapticCooldownRef = useRef<Map<string, number>>(new Map())
  const listenersRef = useRef<Set<NotificationListener>>(new Set())
  const deviceAttentionRef = useRef<DeviceAttentionSettings>(DEFAULT_DEVICE_ATTENTION_SETTINGS)

  const flushDigest = useCallback(() => {
    if (digestBufferRef.current.length === 0) return

    const notifications = [...digestBufferRef.current]
    digestBufferRef.current = []

    toast.custom(
      (t) => <DigestToast notifications={notifications} onClose={() => toast.dismiss(t)} />,
      {
        duration: 6000,
      }
    )
  }, [])

  const shouldDedupe = useCallback((notification: Notification) => {
    const now = Date.now()
    const key = buildNotificationKey(notification)

    for (const [storedKey, at] of dedupeRef.current.entries()) {
      if (now - at > 90_000) dedupeRef.current.delete(storedKey)
    }

    const existing = dedupeRef.current.get(key)
    if (existing && now - existing < 30_000) {
      return true
    }

    dedupeRef.current.set(key, now)
    return false
  }, [])

  const pushToDigest = useCallback((notification: Notification) => {
    digestBufferRef.current = [...digestBufferRef.current, notification].slice(-50)
  }, [])

  const refreshCount = useCallback(async () => {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch {
      // Keep last known count.
    }
  }, [])

  useEffect(() => {
    deviceAttentionRef.current = readDeviceAttentionSettings()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === DEVICE_ATTENTION_STORAGE_KEY) {
        deviceAttentionRef.current = readDeviceAttentionSettings()
      }
    }
    const handleDeviceAttentionChange = () => {
      deviceAttentionRef.current = readDeviceAttentionSettings()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(DEVICE_ATTENTION_CHANGE_EVENT, handleDeviceAttentionChange)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(DEVICE_ATTENTION_CHANGE_EVENT, handleDeviceAttentionChange)
    }
  }, [])

  useEffect(() => {
    async function loadPreferences() {
      try {
        const [prefs, runtime] = await Promise.all([
          getNotificationPreferences(),
          getNotificationRuntimeSettings(),
        ])

        const map = new Map<string, boolean>()
        for (const p of prefs) {
          map.set(p.category, p.toast_enabled)
        }
        preferencesRef.current = map

        const nextRuntime: RuntimeSettings = {
          quietHoursEnabled: runtime.quietHoursEnabled,
          quietHoursStart: runtime.quietHoursStart,
          quietHoursEnd: runtime.quietHoursEnd,
          digestEnabled: runtime.digestEnabled,
          digestIntervalMinutes: runtime.digestIntervalMinutes,
        }

        runtimeSettingsRef.current = nextRuntime
        setRuntimeSettings(nextRuntime)
      } catch {
        // Defaults remain active.
      }
    }

    void loadPreferences()
  }, [])

  useEffect(() => {
    refreshCount()
  }, [refreshCount])

  useEffect(() => {
    if (digestTimerRef.current) {
      clearInterval(digestTimerRef.current)
      digestTimerRef.current = null
    }

    if (!runtimeSettings.digestEnabled && !runtimeSettings.quietHoursEnabled) {
      flushDigest()
      return
    }

    const intervalMs = Math.min(120, Math.max(5, runtimeSettings.digestIntervalMinutes)) * 60_000
    digestTimerRef.current = setInterval(() => flushDigest(), intervalMs)

    return () => {
      if (digestTimerRef.current) {
        clearInterval(digestTimerRef.current)
        digestTimerRef.current = null
      }
    }
  }, [flushDigest, runtimeSettings])

  useEffect(() => {
    const unsubscribe = subscribeToNotifications(userId, (notification) => {
      setUnreadCount((prev) => prev + 1)
      // Dispatch to page-level listeners (e.g., live-refresh hooks)
      for (const fn of listenersRef.current) {
        try {
          fn(notification)
        } catch (err) {
          console.warn('[NotificationProvider] Listener failed:', err)
        }
      }

      const config = NOTIFICATION_CONFIG[notification.action as NotificationAction]
      const categoryPref = preferencesRef.current.get(notification.category)
      const shouldToast =
        categoryPref !== undefined ? categoryPref : (config?.toastByDefault ?? true)

      if (!shouldToast) return
      if (shouldDedupe(notification)) return

      const severity = getSeverity(notification.action as NotificationAction)
      const settings = runtimeSettingsRef.current
      const deviceSettings = deviceAttentionRef.current
      const interruption = evaluateNotificationInterruption({
        action: notification.action as NotificationAction,
        category: notification.category,
        metadata: notification.metadata,
        eventId: notification.event_id,
        inquiryId: notification.inquiry_id,
        clientId: notification.client_id,
        actionUrl: notification.action_url,
        chefMode: deviceSettings.chefMode,
        fatigueCount: readDailyFatigueCount(),
      })

      if (!interruption.bypassQuietHours && severity !== 'high') {
        const inQuietWindow = isWithinQuietWindow(settings)
        if (inQuietWindow || settings.digestEnabled) {
          pushToDigest(notification)
          return
        }
        if (interruption.shouldDigest) return
      }

      if (shouldVibrateInApp(interruption, deviceSettings, hapticCooldownRef.current)) {
        navigator.vibrate(interruption.pattern)
        incrementDailyFatigueCount()
      }

      toast.custom(
        (t) => <NotificationToast notification={notification} onClose={() => toast.dismiss(t)} />,
        {
          duration: severity === 'high' ? 9000 : 5000,
        }
      )
    })

    return unsubscribe
  }, [pushToDigest, shouldDedupe, userId])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsReadAction(notificationId)
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // non-fatal
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadAction()
      setUnreadCount(0)
    } catch {
      // non-fatal
    }
  }, [])

  const addNotificationListener = useCallback((fn: NotificationListener) => {
    listenersRef.current.add(fn)
    return () => {
      listenersRef.current.delete(fn)
    }
  }, [])

  const value = useMemo(
    () => ({ unreadCount, markAsRead, markAllAsRead, refreshCount, addNotificationListener }),
    [markAllAsRead, markAsRead, refreshCount, unreadCount, addNotificationListener]
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
