// ConfirmDestructiveDialog - self-contained destructive action confirmation.
// Wraps ConfirmModal with built-in open/loading state management.
// Usage:
//   <ConfirmDestructiveDialog
//     trigger={<Button variant="danger" size="sm">Delete</Button>}
//     title="Delete this item?"
//     description="This action cannot be undone."
//     confirmLabel="Delete"
//     onConfirm={handleDelete}
//   />

'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { ConfirmModal } from '@/components/ui/confirm-modal'

interface ConfirmDestructiveDialogProps {
  trigger: ReactNode
  title: string
  description: string
  /** Custom body content rendered between description and buttons */
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
}

export function ConfirmDestructiveDialog({
  trigger,
  title,
  description,
  children,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
}: ConfirmDestructiveDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = useCallback(async () => {
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch (err) {
      console.error('[confirm-destructive] Action failed:', err)
    } finally {
      setLoading(false)
    }
  }, [onConfirm])

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <ConfirmModal
        open={open}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        variant="danger"
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      >
        {children}
      </ConfirmModal>
    </>
  )
}
