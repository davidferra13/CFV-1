'use client'

import { AlertTriangle } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import type { ActionVariant } from '@/lib/actions/types'

interface ActionConfirmDialogProps {
  message: string
  actionLabel: string
  variant?: ActionVariant
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ActionConfirmDialog({
  message,
  actionLabel,
  variant = 'default',
  isPending,
  onConfirm,
  onCancel,
}: ActionConfirmDialogProps) {
  const confirmVariant = variant === 'destructive' ? 'danger' : 'primary'

  return (
    <div className="bg-stone-800 rounded-lg p-3 border border-stone-700/50">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-stone-300">{message}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={isPending}>
          {isPending ? '...' : actionLabel}
        </Button>
      </div>
    </div>
  )
}
