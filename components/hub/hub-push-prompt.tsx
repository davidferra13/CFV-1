'use client'

import { useState, useEffect } from 'react'
import { saveHubPushSubscription } from '@/lib/hub/hub-push-subscriptions'

interface HubPushPromptProps {
  profileToken: string
}

/**
 * Soft banner prompting hub guests to enable push notifications.
 * Only shown when Notification.permission === 'default' (not granted, not denied).
 * Registers a Web Push subscription keyed to the guest's profile token.
 */
export function HubPushPrompt({ profileToken }: HubPushPromptProps) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Only show if push is supported and permission hasn't been decided yet
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    )
      return

    if (Notification.permission === 'default') {
      // Small delay so it doesn't compete with the page loading
      const t = setTimeout(() => setVisible(true), 2000)
      return () => clearTimeout(t)
    }
  }, [])

  if (!visible || done) return null

  const handleAllow = async () => {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setVisible(false)
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('[HubPushPrompt] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set')
        setVisible(false)
        return
      }

      // Register service worker (reuse existing if already active)
      const reg = await navigator.serviceWorker.ready

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      })

      const subJson = sub.toJSON()
      const keys = subJson.keys as { p256dh: string; auth: string } | undefined

      if (!keys?.p256dh || !keys?.auth) {
        console.error('[HubPushPrompt] Subscription missing keys')
        setVisible(false)
        return
      }

      await saveHubPushSubscription({
        profileToken,
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      })

      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (err) {
      console.error('[HubPushPrompt] Subscribe failed:', err)
    } finally {
      setLoading(false)
      setVisible(false)
    }
  }

  return (
    <div className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-xl bg-stone-800/60 border border-stone-700 px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg">🔔</span>
        <p className="text-xs text-stone-300 truncate">Get notified when someone posts</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-xs text-stone-500 hover:text-stone-400"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleAllow}
          disabled={loading}
          className="rounded-lg bg-[#e88f47] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Enabling...' : 'Allow'}
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}
