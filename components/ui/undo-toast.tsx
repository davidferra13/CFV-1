'use client'
import { toast } from 'sonner'

/**
 * Simple undo toast (legacy signature).
 */
export function showUndoToast(message: string, onUndo: () => void, duration?: number): void

/**
 * Deferred-execution undo toast.
 * The server action runs AFTER the undo window closes.
 * If the user clicks Undo, onUndo fires instead of onExecute.
 */
export function showUndoToast(opts: {
  message: string
  duration?: number
  onExecute: () => Promise<void> | void
  onUndo: () => void
}): void

export function showUndoToast(
  messageOrOpts:
    | string
    | {
        message: string
        duration?: number
        onExecute: () => Promise<void> | void
        onUndo: () => void
      },
  onUndoLegacy?: () => void,
  durationLegacy?: number
) {
  // Legacy signature: showUndoToast(message, onUndo, duration)
  if (typeof messageOrOpts === 'string') {
    toast(messageOrOpts, {
      action: {
        label: 'Undo',
        onClick: onUndoLegacy!,
      },
      duration: durationLegacy ?? 5000,
    })
    return
  }

  // Deferred-execution signature
  const { message, duration = 8000, onExecute, onUndo } = messageOrOpts
  let undone = false

  toast(message, {
    action: {
      label: 'Undo',
      onClick: () => {
        undone = true
        onUndo()
      },
    },
    duration,
    onDismiss: () => {
      if (!undone) {
        Promise.resolve(onExecute()).catch(() => {
          // onExecute handles its own error reporting
        })
      }
    },
  })
}
