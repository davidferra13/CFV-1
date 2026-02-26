'use client'

import { Button } from '@/components/ui/button'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'

type ConflictDialogProps = {
  open: boolean
  message: string
  onReloadLatest: () => void
  onCancel: () => void
}

export function ConflictDialog({ open, message, onReloadLatest, onCancel }: ConflictDialogProps) {
  return (
    <AccessibleDialog
      open={open}
      onClose={onCancel}
      title="This record changed elsewhere."
      description={message}
      footer={
        <>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onReloadLatest}>
            Reload latest
          </Button>
        </>
      }
    />
  )
}
