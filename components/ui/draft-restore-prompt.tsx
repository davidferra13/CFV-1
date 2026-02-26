'use client'

import { useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'

type DraftRestorePromptProps = {
  open: boolean
  lastSavedAt: string | null
  onRestore: () => void
  onDiscard: () => void
}

export function DraftRestorePrompt({
  open,
  lastSavedAt,
  onRestore,
  onDiscard,
}: DraftRestorePromptProps) {
  const restoreButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreButtonRef.current?.focus()
  }, [open])

  if (!open) return null

  const timeLabel = lastSavedAt
    ? formatDistanceToNow(new Date(lastSavedAt), { addSuffix: true })
    : 'recently'

  return (
    <AccessibleDialog
      open={open}
      onClose={onDiscard}
      title="Restore unsent draft?"
      description={`We found an unsent draft from ${timeLabel}.`}
      initialFocusRef={restoreButtonRef}
      closeOnBackdrop={false}
      escapeCloses={false}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onDiscard}>
            Discard
          </Button>
          <Button type="button" ref={restoreButtonRef} onClick={onRestore}>
            Restore
          </Button>
        </>
      }
    />
  )
}
