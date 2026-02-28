'use client'

import { useRef, useCallback } from 'react'
import { showUndoToast } from '@/components/ui/undo-toast'

interface UseDeferredActionOptions {
  /** Delay in ms before executing the action (default: 5000) */
  delay?: number
  /** The actual destructive action to run after the delay */
  onExecute: () => Promise<void>
  /** Called if the user clicks Undo (restore UI state) */
  onUndo: () => void
  /** Called if the action fails after delay expires */
  onError?: (err: unknown) => void
  /** Toast message shown during the undo window */
  toastMessage: string
}

/**
 * Deferred destructive action with undo support.
 *
 * Flow:
 * 1. Call `execute()` — action is SCHEDULED, not run
 * 2. Undo toast appears for `delay` ms
 * 3. If user clicks Undo → `onUndo()` is called, action is cancelled
 * 4. If toast expires → `onExecute()` runs the real destructive action
 * 5. If `onExecute()` throws → `onError()` is called
 *
 * Usage:
 *   const { execute } = useDeferredAction({
 *     onExecute: async () => await deleteExpense(id),
 *     onUndo: () => setItems(prev => [...prev, deletedItem]),
 *     onError: (err) => toast.error('Failed to delete'),
 *     toastMessage: 'Expense deleted',
 *   })
 */
export function useDeferredAction({
  delay = 5000,
  onExecute,
  onUndo,
  onError,
  toastMessage,
}: UseDeferredActionOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)

  const execute = useCallback(() => {
    cancelledRef.current = false

    // Schedule the actual action
    timerRef.current = setTimeout(async () => {
      if (cancelledRef.current) return
      try {
        await onExecute()
      } catch (err) {
        onUndo() // Restore UI on failure
        onError?.(err)
      }
    }, delay)

    // Show undo toast
    showUndoToast(
      toastMessage,
      () => {
        // User clicked Undo
        cancelledRef.current = true
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
        onUndo()
      },
      delay
    )
  }, [delay, onExecute, onUndo, onError, toastMessage])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return { execute, cancel }
}
