'use client'

// OfflineProvider — Central context for offline state management.
// Wraps the chef portal so every component can check connectivity,
// see pending queue size, and react to sync progress.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { useNetworkStatus } from '@/lib/offline/use-network-status'
import { replayPendingActions, onSyncProgress, type SyncProgress } from '@/lib/offline/sync-engine'
import { getPendingCount } from '@/lib/offline/idb-queue'
import { toast } from 'sonner'

interface OfflineContextValue {
  /** Whether the app is currently online */
  isOnline: boolean
  /** Whether the app is currently offline */
  isOffline: boolean
  /** Whether we just recovered from offline (true for 5s) */
  justReconnected: boolean
  /** Number of actions waiting to sync */
  pendingCount: number
  /** Current sync progress (null when not syncing) */
  syncProgress: SyncProgress | null
  /** Force a connectivity check now */
  checkNow: () => void
}

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  isOffline: false,
  justReconnected: false,
  pendingCount: 0,
  syncProgress: null,
  checkNow: () => {},
})

export function useOffline() {
  return useContext(OfflineContext)
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isOnline, isOffline, wasOffline, checkNow } = useNetworkStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const prevOnlineRef = useRef(true)
  const hasSyncedRef = useRef(false)

  // Poll pending count
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount()
      setPendingCount(count)
    } catch {
      // IndexedDB may not be available (private browsing)
    }
  }, [])

  // Refresh pending count periodically and after status changes
  useEffect(() => {
    refreshPendingCount()
    const interval = setInterval(refreshPendingCount, 3000)
    return () => clearInterval(interval)
  }, [refreshPendingCount])

  // Subscribe to sync progress
  useEffect(() => {
    return onSyncProgress((progress) => {
      setSyncProgress(progress)
      if (!progress.isSyncing) {
        // Sync finished — refresh the count
        refreshPendingCount()
      }
    })
  }, [refreshPendingCount])

  // Toast when going offline
  useEffect(() => {
    if (isOffline && prevOnlineRef.current) {
      toast.warning("You're offline", {
        description: 'Your work will be saved and synced when you reconnect.',
        duration: 6000,
        id: 'offline-toast',
      })
      prevOnlineRef.current = false
      hasSyncedRef.current = false
    }
  }, [isOffline])

  // When back online: toast + replay queue
  useEffect(() => {
    if (isOnline && !prevOnlineRef.current) {
      prevOnlineRef.current = true

      // Check if we have pending actions to sync
      getPendingCount()
        .then((count) => {
          if (count > 0 && !hasSyncedRef.current) {
            hasSyncedRef.current = true
            toast.info('Back online', {
              description: `Syncing ${count} pending action${count === 1 ? '' : 's'}...`,
              duration: 4000,
              id: 'online-toast',
            })

            // Start replaying
            replayPendingActions().then((result) => {
              refreshPendingCount()
              if (result.failed > 0) {
                toast.error('Some actions failed to sync', {
                  description: `${result.completed} synced, ${result.failed} failed. Check your data.`,
                  duration: 8000,
                })
              } else if (result.completed > 0) {
                toast.success('All caught up', {
                  description: `${result.completed} action${result.completed === 1 ? '' : 's'} synced successfully.`,
                  duration: 4000,
                })
              }
            })
          } else {
            toast.success('Back online', {
              duration: 3000,
              id: 'online-toast',
            })
          }
        })
        .catch(() => {
          toast.success('Back online', {
            duration: 3000,
            id: 'online-toast',
          })
        })
    }
  }, [isOnline, refreshPendingCount])

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isOffline,
        justReconnected: wasOffline,
        pendingCount,
        syncProgress,
        checkNow,
      }}
    >
      {children}
    </OfflineContext.Provider>
  )
}
