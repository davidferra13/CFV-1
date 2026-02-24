'use client'

// useNetworkStatus — Network detection using browser-native online/offline events.
//
// Previous version polled /api/health every 30s, which caused false "offline"
// when the dev server wasn't running. navigator.onLine + window events reliably
// detect actual network loss without any server dependency.

import { useState, useEffect, useCallback, useRef } from 'react'

export type NetworkStatus = 'online' | 'offline'

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  )
  const [lastOnline, setLastOnline] = useState<Date | null>(null)
  const [wasOffline, setWasOffline] = useState(false)
  const wasOfflineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goOffline = useCallback(() => {
    setStatus('offline')
  }, [])

  const goOnline = useCallback(() => {
    setStatus((prev) => {
      if (prev === 'offline') {
        setWasOffline(true)
        setLastOnline(new Date())
        // Clear the "was offline" flag after 5 seconds
        if (wasOfflineTimerRef.current) clearTimeout(wasOfflineTimerRef.current)
        wasOfflineTimerRef.current = setTimeout(() => setWasOffline(false), 5000)
      }
      return 'online'
    })
  }, [])

  useEffect(() => {
    // Sync initial state (SSR may have defaulted to 'online')
    if (!navigator.onLine) setStatus('offline')

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      if (wasOfflineTimerRef.current) clearTimeout(wasOfflineTimerRef.current)
    }
  }, [goOnline, goOffline])

  return {
    /** Current network status */
    status,
    /** Whether the app is currently online */
    isOnline: status === 'online',
    /** Whether the app is currently offline */
    isOffline: status === 'offline',
    /** Whether we just recovered from an offline period (true for 5s after reconnection) */
    wasOffline,
    /** Timestamp of last reconnection */
    lastOnline,
    /** Force a status re-read from the browser */
    checkNow: () => {
      if (navigator.onLine) goOnline()
      else goOffline()
    },
  }
}
