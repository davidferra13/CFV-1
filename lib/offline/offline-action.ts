// offline-action — Wraps server actions to queue them when offline.
// When online: executes normally.
// When offline: saves to IndexedDB queue and returns an optimistic result.
// When back online: sync engine replays queued actions in order.

import { enqueueAction } from './idb-queue'
import { registerOfflineAction } from './sync-engine'

interface OfflineActionOptions<T> {
  /** Unique name for this action (used to look up the function during replay) */
  name: string
  /** The actual server action function */
  action: (...args: unknown[]) => Promise<T>
  /** Return value to use when the action is queued offline (optimistic response) */
  optimisticResult?: T
}

/**
 * Creates an offline-aware wrapper around a server action.
 *
 * Usage:
 *   const saveNote = createOfflineAction({
 *     name: 'notes/save',
 *     action: saveNoteAction,
 *     optimisticResult: { success: true },
 *   })
 *
 *   // In component:
 *   const result = await saveNote(noteId, content)
 *   // If offline, returns optimisticResult and queues for later.
 *   // If online, executes normally.
 */
export function createOfflineAction<T>(options: OfflineActionOptions<T>) {
  const { name, action, optimisticResult } = options

  // Register the action so the sync engine can replay it
  registerOfflineAction(name, action as (...args: unknown[]) => Promise<unknown>)

  return async (...args: unknown[]): Promise<T & { _offlineQueued?: boolean }> => {
    // Try online execution first
    if (navigator.onLine) {
      try {
        return await action(...args)
      } catch (err) {
        // If the error is a network error (fetch failed), queue it
        const isNetworkError =
          (err instanceof TypeError && err.message.includes('fetch')) ||
          (err instanceof Error && err.message.includes('Failed to fetch')) ||
          (err instanceof Error && err.message.includes('NetworkError')) ||
          (err instanceof Error && err.message.includes('Load failed'))

        if (isNetworkError) {
          // Network error — queue the action for later
          await enqueueAction(name, args)
          console.info(`[offline] Queued "${name}" — network error while online`)
          if (optimisticResult !== undefined) {
            return { ...optimisticResult, _offlineQueued: true } as T & { _offlineQueued?: boolean }
          }
          throw err
        }

        // Non-network error — rethrow normally
        throw err
      }
    }

    // We're offline — queue the action
    await enqueueAction(name, args)
    console.info(`[offline] Queued "${name}" — device is offline`)

    if (optimisticResult !== undefined) {
      return { ...optimisticResult, _offlineQueued: true } as T & { _offlineQueued?: boolean }
    }

    // No optimistic result provided — throw a descriptive error
    throw new OfflineQueuedError(name)
  }
}

/** Error thrown when an action is queued but no optimistic result was provided */
export class OfflineQueuedError extends Error {
  public readonly actionName: string
  public readonly isOfflineQueued = true

  constructor(actionName: string) {
    super(`Action "${actionName}" has been saved and will sync when you're back online.`)
    this.name = 'OfflineQueuedError'
    this.actionName = actionName
  }
}
