'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'

type UnsavedChangesDialogProps = {
  open: boolean
  canSaveDraft: boolean
  onStay: () => void
  onLeave: () => void
  onSaveDraftAndLeave?: () => void
}

export function UnsavedChangesDialog({
  open,
  canSaveDraft,
  onStay,
  onLeave,
  onSaveDraftAndLeave,
}: UnsavedChangesDialogProps) {
  const stayRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    stayRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <AccessibleDialog
      open={open}
      onClose={onStay}
      title="Leave without saving?"
      description="You have unsaved changes on this page."
      initialFocusRef={stayRef}
      closeOnBackdrop={false}
      escapeCloses
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onStay} ref={stayRef}>
            Stay
          </Button>
          {canSaveDraft && onSaveDraftAndLeave ? (
            <Button type="button" variant="secondary" onClick={onSaveDraftAndLeave}>
              Save draft & leave
            </Button>
          ) : null}
          <Button type="button" variant="danger" onClick={onLeave}>
            Leave
          </Button>
        </>
      }
    />
  )
}
