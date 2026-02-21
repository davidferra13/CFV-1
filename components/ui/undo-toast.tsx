'use client'
import { toast } from 'sonner'

export function showUndoToast(message: string, onUndo: () => void, duration = 5000) {
  toast(message, {
    action: {
      label: 'Undo',
      onClick: onUndo,
    },
    duration,
  })
}
