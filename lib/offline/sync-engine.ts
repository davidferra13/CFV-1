// Sync Engine - Replays queued offline actions when connectivity returns.
// Processes pending actions in their stored order.
// Failed entries remain stored for recovery; this loop does not schedule retries.

import { getPendingActions, updateActionStatus, removeAction } from './idb-queue'
import { trackQolMetric } from '@/lib/qol/metrics-client'

const MAX_RETRIES = 3

export interface SyncProgress {
  total: number
  completed: number
  failed: number
  current: string | null
  isSyncing: boolean
}

export type SyncListener = (progress: SyncProgress) => void

// Registry of server actions that can be replayed offline.
// Each action is registered with a name and the actual function reference.
const actionRegistry = new Map<string, (...args: unknown[]) => Promise<unknown>>()

/** Register a server action for offline replay */
export function registerOfflineAction(name: string, fn: (...args: unknown[]) => Promise<unknown>) {
  actionRegistry.set(name, fn)
}

/** Check if an action is registered for offline replay */
export function isActionRegistered(name: string): boolean {
  return actionRegistry.has(name)
}

let isSyncing = false
let listeners: SyncListener[] = []

function notifyListeners(progress: SyncProgress) {
  for (const listener of listeners) {
    try {
      listener(progress)
    } catch (err) {
      console.error('[sync-engine] Listener error:', err)
    }
  }
}

/** Subscribe to sync progress updates. Returns unsubscribe function. */
export function onSyncProgress(listener: SyncListener): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

/** Replay all pending offline actions in order. Called when connectivity returns. */
export async function replayPendingActions(): Promise<SyncProgress> {
  if (isSyncing) {
    return { total: 0, completed: 0, failed: 0, current: null, isSyncing: true }
  }

  isSyncing = true
  const progress: SyncProgress = {
    total: 0,
    completed: 0,
    failed: 0,
    current: null,
    isSyncing: true,
  }

  try {
    const pending = await getPendingActions()
    progress.total = pending.length
    if (pending.length === 0) return progress

    notifyListeners(progress)

    for (const action of pending) {
      progress.current = action.actionName

      const fn = actionRegistry.get(action.actionName)
      if (!fn) {
        // Action not registered - can't replay, mark as failed
        await updateActionStatus(
          action.id,
          'failed',
          `Action "${action.actionName}" not registered`
        )
        trackQolMetric({
          metricKey: 'offline_replay_failed',
          entityType: action.actionName,
          entityId: action.id,
          metadata: { reason: 'action_not_registered' },
        })
        progress.failed += 1
        notifyListeners(progress)
        continue
      }

      if (action.retries >= MAX_RETRIES) {
        await updateActionStatus(action.id, 'failed', 'Max retries exceeded')
        trackQolMetric({
          metricKey: 'offline_replay_failed',
          entityType: action.actionName,
          entityId: action.id,
          metadata: { reason: 'max_retries_exceeded', retries: action.retries },
        })
        progress.failed += 1
        notifyListeners(progress)
        continue
      }

      try {
        await updateActionStatus(action.id, 'syncing')
        notifyListeners(progress)

        const result = await fn(...action.args)
        if (
          result &&
          typeof result === 'object' &&
          'success' in result &&
          result.success === false
        ) {
          const message =
            'error' in result && typeof result.error === 'string'
              ? result.error
              : 'The server rejected this offline change.'
          throw new Error(message)
        }

        // Success - remove from queue
        await removeAction(action.id)
        trackQolMetric({
          metricKey: 'offline_replay_succeeded',
          entityType: action.actionName,
          entityId: action.id,
          metadata: { retries: action.retries },
        })
        progress.completed += 1
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await updateActionStatus(action.id, 'failed', message)
        trackQolMetric({
          metricKey: 'offline_replay_failed',
          entityType: action.actionName,
          entityId: action.id,
          metadata: { reason: message, retries: action.retries },
        })
        progress.failed += 1
      }

      notifyListeners(progress)
    }

    return progress
  } finally {
    // Storage can fail before or during replay. Always permit the next attempt.
    progress.current = null
    progress.isSyncing = false
    isSyncing = false
    notifyListeners(progress)
  }
}

/** Get whether a sync is currently in progress */
export function isSyncInProgress(): boolean {
  return isSyncing
}
