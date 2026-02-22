'use client'

// useNetworkStatus — Smart network detection that goes beyond navigator.onLine.
// navigator.onLine only detects cable disconnection, not actual internet loss.
// This hook combines the browser event with periodic connectivity checks.

import { useState, useEffect, useCallback, useRef } from 'react'

export type NetworkStatus = 'online' | 'offline'

interface UseNetworkStatusOptions {
  /** How often to poll connectivity when online (ms). Default: 30000 (30s) */
  pollInterval?: number
  /** How often to poll when offline, checking for recovery (ms). Default: 5000 (5s) */
  offlinePollInterval?: number
}

export function useNetworkStatus(options: UseNetworkStatusOptions = {}) {
  const { pollInterval = 30000, offlinePollInterval = 5000 } = options

  const [status, setStatus] = useState<NetworkStatus>('online')
  const [lastOnline, setLastOnline] = useState<Date | null>(null)
  const [wasOffline, setWasOffline] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    // First, fast check with navigator.onLine
    if (!navigator.onLine) return false

    // Then verify with a real network request (tiny, fast endpoint)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      // HEAD request to our own origin — cheapest possible check
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timeout)
      return response.ok
    } catch {
      // Network error = offline
      return false
    }
  }, [])

  const updateStatus = useCallback(
    async (fromEvent?: 'online' | 'offline') => {
      // If browser says offline, trust it immediately — don't waste a request
      if (fromEvent === 'offline' || !navigator.onLine) {
        setStatus('offline')
        return
      }

      // If browser says online, verify with a real request
      const isConnected = await checkConnectivity()
      if (isConnected) {
        setStatus((prev) => {
          if (prev === 'offline') {
            setWasOffline(true)
            setLastOnline(new Date())
            // Clear the "was offline" flag after 5 seconds
            setTimeout(() => setWasOffline(false), 5000)
          }
          return 'online'
        })
      } else {
        setStatus('offline')
      }
    },
    [checkConnectivity]
  )

  useEffect(() => {
    // Set initial status
    updateStatus()

    const handleOnline = () => updateStatus('online')
    const handleOffline = () => updateStatus('offline')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [updateStatus])

  // Polling: different intervals for online vs offline
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    const interval = status === 'online' ? pollInterval : offlinePollInterval
    intervalRef.current = setInterval(() => updateStatus(), interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [status, pollInterval, offlinePollInterval, updateStatus])

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
    /** Force a connectivity check now */
    checkNow: () => updateStatus(),
  }
}
