'use client'

// OfflineStatusBar — Smart connectivity indicator.
// Shows nothing when online. When offline, shows a compact bar with queue count.
// During sync, shows progress. On reconnection, shows brief success.

import { WifiOff, Wifi, CloudUpload, Loader2 } from 'lucide-react'
import { useOffline } from './offline-provider'

export function OfflineStatusBar() {
  const { isOffline, justReconnected, pendingCount, syncProgress } = useOffline()

  // Syncing in progress
  if (syncProgress?.isSyncing) {
    const pct =
      syncProgress.total > 0
        ? Math.round(((syncProgress.completed + syncProgress.failed) / syncProgress.total) * 100)
        : 0
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[60] bg-blue-600 text-white"
      >
        <div className="py-2 px-4 text-center text-sm font-medium">
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing {syncProgress.completed + syncProgress.failed}/{syncProgress.total}...
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-blue-700">
          <div
            className="h-full bg-stone-900 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  // Just reconnected — brief success bar
  if (justReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[60] py-2 px-4 text-center text-sm font-medium bg-green-600 text-white animate-in slide-in-from-top duration-300"
      >
        <span className="flex items-center justify-center gap-2">
          <Wifi className="h-4 w-4" />
          Back online
        </span>
      </div>
    )
  }

  // Offline
  if (isOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[60] py-2 px-4 text-center text-sm font-medium bg-stone-800 text-white animate-in slide-in-from-top duration-300"
      >
        <span className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          You&apos;re offline — your work is being saved locally
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-stone-900/20 rounded-full px-2 py-0.5 text-xs">
              <CloudUpload className="h-3 w-3" />
              {pendingCount} pending
            </span>
          )}
        </span>
      </div>
    )
  }

  // Online and not recently reconnected — render nothing
  return null
}
