'use client'
// React hook for managing a browser push subscription.
// Handles the full lifecycle: check current state → request permission →
// subscribe via PushManager → save to server → unsubscribe.
//
// Returns 'unsupported' if the browser has no Push API (old browsers, iOS < 16.4).
// Returns 'denied' if the user has blocked notifications.
// Returns 'subscribed' when actively subscribed.
// Returns 'default' when eligible but not yet subscribed.

import { useState, useEffect, useCallback } from 'react'
import { savePushSubscription, removePushSubscription } from '@/lib/push/subscriptions'

export type PushState = 'unsupported' | 'denied' | 'default' | 'subscribed'

export function usePushSubscription() {
  const [state, setState] = useState<PushState>('default')
  const [isLoading, setIsLoading] = useState(false)

  // Detect current state on mount
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setState('unsupported')
      return
    }

    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }

    // Check if there's already an active subscription
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setState('subscribed')
        // else: stay 'default' - browser knows about push but not subscribed yet
      })
      .catch(() => {
        // Service worker not ready yet - stay 'default'
      })
  }, [])

  /**
   * Request permission and subscribe to push notifications.
   * Saves the subscription to the server automatically on success.
   */
  const subscribe = useCallback(async () => {
    if (state === 'unsupported') return
    setIsLoading(true)

    try {
      // Fetch the server's VAPID public key
      const res = await fetch('/api/push/vapid-public-key')
      const { key } = (await res.json()) as { key?: string }
      if (!key) throw new Error('VAPID public key not available')

      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      })

      // Extract keys from the subscription
      const rawP256dh = subscription.getKey('p256dh')
      const rawAuth = subscription.getKey('auth')
      if (!rawP256dh || !rawAuth) {
        throw new Error('Push subscription missing required keys')
      }

      await savePushSubscription({
        endpoint: subscription.endpoint,
        p256dh: bufToBase64url(rawP256dh),
        auth: bufToBase64url(rawAuth),
      })

      setState('subscribed')
    } catch (err) {
      if (typeof window !== 'undefined' && Notification.permission === 'denied') {
        setState('denied')
      }
      console.error('[usePushSubscription] subscribe failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [state])

  /**
   * Unsubscribe from push notifications and deactivate on the server.
   */
  const unsubscribe = useCallback(async () => {
    setIsLoading(true)

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await removePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setState('default')
    } catch (err) {
      console.error('[usePushSubscription] unsubscribe failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { state, isLoading, subscribe, unsubscribe }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

function bufToBase64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}
