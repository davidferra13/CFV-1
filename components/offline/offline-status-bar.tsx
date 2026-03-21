'use client'

// OfflineStatusBar - Smart connectivity indicator.
// Shows nothing when online. When offline, shows a compact bar with queue count.
// During sync, shows progress. On reconnection, shows brief success.

import { WifiOff, Wifi, CloudUpload, Loader2 } from '@/components/ui/icons'
import { useOffline } from './offline-provider'
import { useIsDemoMode } from '@/lib/demo-mode'

export function OfflineStatusBar() {
  const isDemo = useIsDemoMode()
  const { isOffline, justReconnected, pendingCount, syncProgress } = useOffline()

  if (isDemo) return null

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
        className="fixed top-0 left-0 right-0 z-[60] bg-brand-500/40 backdrop-blur-md text-brand-100"
      >
        <div className="py-2 px-4 text-center text-sm font-medium">
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing {syncProgress.completed + syncProgress.failed}/{syncProgress.total}...
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-brand-700/50">
          <div
            className="h-full bg-brand-200 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  // Just reconnected - brief success bar
  if (justReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[60] py-2 px-4 text-center text-sm font-medium bg-green-500/40 backdrop-blur-md text-green-100 animate-in slide-in-from-top duration-300"
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
        className="fixed top-0 left-0 right-0 z-[60] py-2 px-4 text-center text-sm font-medium bg-red-500/40 backdrop-blur-md text-red-100 animate-in slide-in-from-top duration-300"
      >
        <span className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          You&apos;re offline - your work is being saved locally
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-900/30 rounded-full px-2 py-0.5 text-xs">
              <CloudUpload className="h-3 w-3" />
              {pendingCount} pending
            </span>
          )}
        </span>
      </div>
    )
  }

  // Online and not recently reconnected - render nothing
  return null
}
