'use client'

// LiveIndicator - Shows SSE realtime connection status in the nav.
// Green dot = connected. Red dot + label = offline.
// Uses browser online/offline events + connection health.

import { useState, useEffect } from 'react'

export function LiveIndicator() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    // Initialize with current state
    setOnline(navigator.onLine)

    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Only show the indicator when offline - don't clutter the UI when everything's fine
  if (online) return null

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-950 border border-red-200 flex-shrink-0"
      title="No internet connection - changes will sync when reconnected"
    >
      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
      <span className="text-xs font-medium text-red-700">Offline</span>
    </div>
  )
}
