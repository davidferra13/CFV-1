'use client'

// OfflineBanner — Displays a fixed top bar when the browser goes offline.
// Shows a brief "Back online" confirmation for 3 seconds on reconnection.
// Renders nothing when online and not in the reconnected window.

import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from '@/components/ui/icons'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    // Set initial state from browser API
    setIsOnline(navigator.onLine)
    let timer: NodeJS.Timeout | null = null

    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
      timer = setTimeout(() => setShowReconnected(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !showReconnected) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium transition-all backdrop-blur-md ${
        isOnline ? 'bg-green-500/40 text-green-100' : 'bg-red-500/40 text-red-100'
      }`}
    >
      {isOnline ? (
        <span className="flex items-center justify-center gap-2">
          <Wifi className="h-4 w-4" />
          Back online
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          You&apos;re offline — some features may be unavailable
        </span>
      )}
    </div>
  )
}
