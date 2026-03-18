'use client'

// useNetworkStatus - Network detection with verification.
//
// navigator.onLine is unreliable on Windows with VPN software (e.g. NordVPN/NordLynx).
// VPN tunnel reconnections trigger false "offline" events even when the network is fine.
//
// Strategy:
//   - Trust "online" events immediately (no false positives there)
//   - When browser says "offline", verify with a real fetch before believing it
//   - If the fetch succeeds, the browser lied - stay online
//   - If the fetch also fails, we're genuinely offline

import { useState, useEffect, useCallback, useRef } from 'react'

export type NetworkStatus = 'online' | 'offline'

/** Lightweight connectivity check - fetch a tiny resource to verify real network state */
async function isActuallyOffline(): Promise<boolean> {
  try {
    // Use HEAD to /api/health - tiny response, no DB hit, already exists
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return false // fetch succeeded - we're online
  } catch {
    return true // fetch failed - genuinely offline
  }
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>('online')
  const [lastOnline, setLastOnline] = useState<Date | null>(null)
  const [wasOffline, setWasOffline] = useState(false)
  const wasOfflineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const verifyingRef = useRef(false)

  const goOnline = useCallback(() => {
    setStatus((prev) => {
      if (prev === 'offline') {
        setWasOffline(true)
        setLastOnline(new Date())
        if (wasOfflineTimerRef.current) clearTimeout(wasOfflineTimerRef.current)
        wasOfflineTimerRef.current = setTimeout(() => setWasOffline(false), 5000)
      }
      return 'online'
    })
  }, [])

  const goOfflineVerified = useCallback(async () => {
    // Don't stack multiple verification checks
    if (verifyingRef.current) return
    verifyingRef.current = true

    const reallyOffline = await isActuallyOffline()
    verifyingRef.current = false

    if (reallyOffline) {
      setStatus('offline')
    }
    // If not really offline, ignore the browser's false alarm
  }, [])

  useEffect(() => {
    // On mount, only mark offline if browser says so AND a real check confirms
    if (!navigator.onLine) {
      goOfflineVerified()
    }

    const handleOnline = () => goOnline()
    const handleOffline = () => goOfflineVerified()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (wasOfflineTimerRef.current) clearTimeout(wasOfflineTimerRef.current)
    }
  }, [goOnline, goOfflineVerified])

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
    /** Force a status re-read */
    checkNow: () => {
      if (navigator.onLine) goOnline()
      else goOfflineVerified()
    },
  }
}
