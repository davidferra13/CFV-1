// ConfirmModal - reusable confirmation dialog with full accessibility.
// Built on AccessibleDialog (focus trap, escape key, scroll lock, focus restoration).
// Usage:
//   const [showConfirm, setShowConfirm] = useState(false)
//   <ConfirmModal
//     open={showConfirm}
//     title="Delete station?"
//     description="This cannot be undone."
//     confirmLabel="Delete"
//     variant="danger"
//     loading={deleting}
//     onConfirm={handleDelete}
//     onCancel={() => setShowConfirm(false)}
//   />

'use client'

import { type ReactNode } from 'react'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { Button } from '@/components/ui/button'

type ConfirmModalProps = {
  open: boolean
  title: string
  description?: string
  /** Custom body content rendered between description and buttons */
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger'
  loading?: boolean
  /** Disable confirm button (e.g. when a required field is empty) */
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
  maxWidth?: string
}

export function ConfirmModal({
  open,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  maxWidth = 'max-w-md',
}: ConfirmModalProps) {
  return (
    <AccessibleDialog
      open={open}
      title={title}
      description={description}
      onClose={loading ? () => {} : onCancel}
      escapeCloses={!loading}
      widthClassName={maxWidth}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
            disabled={loading || confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </AccessibleDialog>
  )
}
