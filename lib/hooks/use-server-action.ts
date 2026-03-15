'use client'

// useServerAction - Standardized server action execution with automatic toast feedback.
//
// Problem: 453 files use startTransition for server actions, but ~44% have no
// user-visible error feedback. Users click a button, it silently fails, and
// they have no idea what happened. This violates Zero Hallucination Law 1.
//
// Solution: A single hook that wraps the startTransition + try/catch + toast
// pattern. Every action gets error feedback by default. Success toast is opt-in.
//
// Usage (simple):
//   const { execute, isPending } = useServerAction(deleteEvent, {
//     successMessage: 'Event deleted',
//     errorMessage: 'Failed to delete event',
//   })
//   <Button onClick={() => execute(eventId)} loading={isPending}>Delete</Button>
//
// Usage (with optimistic update):
//   const { execute, isPending } = useServerAction(toggleApproval, {
//     onOptimistic: () => setApproved(!approved),
//     onRollback: () => setApproved(approved),
//     errorMessage: 'Failed to update approval',
//   })
//
// Usage (with result handling):
//   const { execute, isPending } = useServerAction(createEvent, {
//     onSuccess: (result) => router.push(`/events/${result.id}`),
//     successMessage: 'Event created',
//   })

import { useTransition, useCallback } from 'react'
import { toast } from 'sonner'

interface UseServerActionOptions<TResult> {
  /** Message shown on success (omit for no success toast) */
  successMessage?: string | ((result: TResult) => string)
  /** Message shown on error (default: 'Something went wrong') */
  errorMessage?: string
  /** Called before the action executes (for optimistic updates) */
  onOptimistic?: () => void
  /** Called when the action fails (for rolling back optimistic updates) */
  onRollback?: () => void
  /** Called when the action succeeds */
  onSuccess?: (result: TResult) => void
  /** Called when the action fails (in addition to toast + rollback) */
  onError?: (error: Error) => void
  /** Suppress the error toast (for cases that use inline error state) */
  suppressErrorToast?: boolean
}

interface UseServerActionReturn<TArgs extends unknown[], TResult> {
  /** Execute the server action with the given arguments */
  execute: (...args: TArgs) => void
  /** Whether the action is currently executing */
  isPending: boolean
}

/**
 * Wraps a server action with standardized error handling and toast feedback.
 *
 * Every action gets:
 * - useTransition for non-blocking UI
 * - try/catch with automatic toast.error on failure
 * - Optional optimistic update + rollback
 * - Optional success toast
 * - Optional callbacks for success/error
 */
export function useServerAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: UseServerActionOptions<TResult> = {}
): UseServerActionReturn<TArgs, TResult> {
  const {
    successMessage,
    errorMessage = 'Something went wrong',
    onOptimistic,
    onRollback,
    onSuccess,
    onError,
    suppressErrorToast = false,
  } = options

  const [isPending, startTransition] = useTransition()

  const execute = useCallback(
    (...args: TArgs) => {
      // Apply optimistic update before starting the transition
      onOptimistic?.()

      startTransition(async () => {
        try {
          const result = await action(...args)

          // Success feedback
          if (successMessage) {
            const msg =
              typeof successMessage === 'function' ? successMessage(result) : successMessage
            toast.success(msg)
          }

          onSuccess?.(result)
        } catch (err) {
          // Rollback optimistic update
          onRollback?.()

          // Error feedback (toast by default)
          if (!suppressErrorToast) {
            const message = err instanceof Error && err.message ? err.message : errorMessage
            toast.error(message)
          }

          onError?.(err instanceof Error ? err : new Error(String(err)))
        }
      })
    },
    [
      action,
      successMessage,
      errorMessage,
      onOptimistic,
      onRollback,
      onSuccess,
      onError,
      suppressErrorToast,
    ] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return { execute, isPending }
}

// ─── Convenience wrapper for actions that return { success, error } ─────────
// Many ChefFlow server actions return { success: boolean, error?: string }
// instead of throwing. This variant handles that pattern.

interface ActionResult {
  success: boolean
  error?: string
}

interface UseCheckedActionOptions<TResult extends ActionResult> extends Omit<
  UseServerActionOptions<TResult>,
  'errorMessage'
> {
  /** Fallback error message when result.error is missing */
  errorMessage?: string
}

export function useCheckedAction<TArgs extends unknown[], TResult extends ActionResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: UseCheckedActionOptions<TResult> = {}
): UseServerActionReturn<TArgs, TResult> {
  const {
    successMessage,
    errorMessage = 'Something went wrong',
    onOptimistic,
    onRollback,
    onSuccess,
    onError,
    suppressErrorToast = false,
  } = options

  const [isPending, startTransition] = useTransition()

  const execute = useCallback(
    (...args: TArgs) => {
      onOptimistic?.()

      startTransition(async () => {
        try {
          const result = await action(...args)

          if (!result.success) {
            // Action returned a failure result (didn't throw)
            onRollback?.()

            if (!suppressErrorToast) {
              toast.error(result.error || errorMessage)
            }

            onError?.(new Error(result.error || errorMessage))
            return
          }

          // Success
          if (successMessage) {
            const msg =
              typeof successMessage === 'function' ? successMessage(result) : successMessage
            toast.success(msg)
          }

          onSuccess?.(result)
        } catch (err) {
          onRollback?.()

          if (!suppressErrorToast) {
            const message = err instanceof Error && err.message ? err.message : errorMessage
            toast.error(message)
          }

          onError?.(err instanceof Error ? err : new Error(String(err)))
        }
      })
    },
    [
      action,
      successMessage,
      errorMessage,
      onOptimistic,
      onRollback,
      onSuccess,
      onError,
      suppressErrorToast,
    ] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return { execute, isPending }
}
