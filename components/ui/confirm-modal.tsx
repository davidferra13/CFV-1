// ConfirmModal - reusable confirmation dialog to replace browser confirm().
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

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'

type ConfirmModalProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Focus the confirm button when modal opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => confirmRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={loading ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby={description ? 'confirm-modal-desc' : undefined}
        className="relative bg-stone-900 border border-stone-700 rounded-lg shadow-xl w-full max-w-sm mx-4 p-6"
      >
        <h3 id="confirm-modal-title" className="text-lg font-semibold text-stone-100 mb-1">
          {title}
        </h3>

        {description && (
          <p id="confirm-modal-desc" className="text-sm text-stone-400 mb-6">
            {description}
          </p>
        )}

        {!description && <div className="mb-6" />}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
            disabled={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
