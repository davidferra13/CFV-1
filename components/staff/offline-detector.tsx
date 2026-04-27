// Offline Detector - shows a banner when the staff portal loses connectivity
// and auto-replays queued task mutations when reconnected.
'use client'

import { useEffect, useState, useCallback } from 'react'
import { replayTaskQueue, getQueueSize } from '@/lib/staff/offline-task-queue'
import { completeMyTask, uncompleteMyTask } from '@/lib/staff/staff-portal-actions'
import { useRouter } from 'next/navigation'

export function OfflineDetector() {
  const [isOffline, setIsOffline] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const router = useRouter()

  const replayQueued = useCallback(async () => {
    const queueSize = getQueueSize()
    if (queueSize === 0) return

    setSyncing(true)
    try {
      const synced = await replayTaskQueue(async (taskId, action) => {
        if (action === 'complete') {
          await completeMyTask(taskId)
        } else {
          await uncompleteMyTask(taskId)
        }
      })

      if (synced > 0) {
        setSyncResult(`Synced ${synced} task${synced > 1 ? 's' : ''}.`)
        router.refresh()
        // Clear the sync result message after 3 seconds
        setTimeout(() => setSyncResult(null), 3000)
      }
    } catch (err) {
      console.error('[offline-detector] Replay failed:', err)
    } finally {
      setSyncing(false)
    }
  }, [router])

  useEffect(() => {
    // Set initial state (only runs client-side)
    setIsOffline(!navigator.onLine)

    function handleOffline() {
      setIsOffline(true)
      setSyncResult(null)
    }

    function handleOnline() {
      setIsOffline(false)
      // Replay queued mutations on reconnect
      replayQueued()
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [replayQueued])

  // Nothing to show when online and not syncing
  if (!isOffline && !syncing && !syncResult) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-colors ${
        isOffline
          ? 'bg-amber-600 text-white'
          : syncing
            ? 'bg-blue-600 text-white'
            : 'bg-emerald-600 text-white'
      }`}
    >
      {isOffline && (
        <>
          <span className="mr-2">&#9888;</span>
          You are offline. Task updates will sync when reconnected.
          {getQueueSize() > 0 && (
            <span className="ml-2 text-amber-200">
              ({getQueueSize()} queued)
            </span>
          )}
        </>
      )}
      {!isOffline && syncing && 'Syncing queued tasks...'}
      {!isOffline && !syncing && syncResult && syncResult}
    </div>
  )
}
