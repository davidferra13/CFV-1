'use client'

// OfflineNavIndicator — Compact connectivity status for nav/sidebar.
// Green dot when online, red dot + "Offline" when offline,
// animated sync icon when syncing, pending count when queued.

import { CloudUpload, Loader2 } from 'lucide-react'
import { useOffline } from './offline-provider'

export function OfflineNavIndicator() {
  const { isOnline, isOffline, pendingCount, syncProgress } = useOffline()

  // Syncing
  if (syncProgress?.isSyncing) {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-950 border border-blue-200 flex-shrink-0"
        title={`Syncing ${syncProgress.completed}/${syncProgress.total} actions...`}
      >
        <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
        <span className="text-xs font-medium text-blue-700">Syncing</span>
      </div>
    )
  }

  // Offline with pending actions
  if (isOffline && pendingCount > 0) {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-stone-800 border border-stone-600 flex-shrink-0"
        title={`Offline — ${pendingCount} action${pendingCount === 1 ? '' : 's'} saved locally, will sync when reconnected`}
      >
        <span className="h-2 w-2 rounded-full bg-amber-9500 animate-pulse" aria-hidden="true" />
        <span className="text-xs font-medium text-stone-300">Offline</span>
        <span className="inline-flex items-center gap-0.5 bg-stone-700 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-stone-400">
          <CloudUpload className="h-2.5 w-2.5" />
          {pendingCount}
        </span>
      </div>
    )
  }

  // Offline (no pending)
  if (isOffline) {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-950 border border-red-200 flex-shrink-0"
        title="No internet connection — changes will sync when reconnected"
      >
        <span className="h-2 w-2 rounded-full bg-red-9500 animate-pulse" aria-hidden="true" />
        <span className="text-xs font-medium text-red-700">Offline</span>
      </div>
    )
  }

  // Online with pending (syncing should handle this, but just in case)
  if (isOnline && pendingCount > 0) {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-950 border border-amber-200 flex-shrink-0"
        title={`${pendingCount} action${pendingCount === 1 ? '' : 's'} waiting to sync`}
      >
        <CloudUpload className="h-3 w-3 text-amber-600" />
        <span className="text-xs font-medium text-amber-700">{pendingCount} pending</span>
      </div>
    )
  }

  // Online, nothing pending — show nothing (don't clutter the UI)
  return null
}
