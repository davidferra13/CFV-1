'use client'

import type { ReactNode } from 'react'
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog'
import { DraftRestorePrompt } from '@/components/ui/draft-restore-prompt'
import { SaveStateBadge } from '@/components/ui/save-state-badge'
import type { SaveState } from '@/lib/save-state/model'

type FormShieldProps = {
  children: ReactNode

  // From useProtectedForm().guard
  guard: {
    open: boolean
    onStay: () => void
    onLeave: () => void
    onSaveDraftAndLeave: () => Promise<void>
    canSaveDraft: boolean
  }

  // Draft restore
  showRestorePrompt: boolean
  lastSavedAt: string | null
  onRestore: () => void
  onDiscard: () => void

  // Save state badge (optional, hidden if not provided)
  saveState?: SaveState
  onRetry?: () => void | Promise<unknown>
  /** Where to show the save badge: 'top-right' (absolute) or 'inline' */
  badgePosition?: 'top-right' | 'inline'
}

/**
 * FormShield - declarative wrapper that renders UnsavedChangesDialog,
 * DraftRestorePrompt, and SaveStateBadge for any form protected by
 * useProtectedForm. Drop-in, zero-config UI layer.
 *
 * Usage:
 *   const form = useProtectedForm({ ... })
 *   return (
 *     <FormShield
 *       guard={form.guard}
 *       showRestorePrompt={form.showRestorePrompt}
 *       lastSavedAt={form.lastSavedAt}
 *       onRestore={() => { const d = form.restoreDraft(); if (d) applyData(d) }}
 *       onDiscard={form.discardDraft}
 *       saveState={form.saveState}
 *     >
 *       <form ...>...</form>
 *     </FormShield>
 *   )
 */
export function FormShield({
  children,
  guard,
  showRestorePrompt,
  lastSavedAt,
  onRestore,
  onDiscard,
  saveState,
  onRetry,
  badgePosition = 'top-right',
}: FormShieldProps) {
  return (
    <>
      {saveState && badgePosition === 'top-right' && (
        <div className="flex justify-end mb-2">
          <SaveStateBadge state={saveState} onRetry={onRetry} />
        </div>
      )}

      {children}

      {saveState && badgePosition === 'inline' && (
        <div className="mt-2">
          <SaveStateBadge state={saveState} onRetry={onRetry} />
        </div>
      )}

      <UnsavedChangesDialog
        open={guard.open}
        canSaveDraft={guard.canSaveDraft}
        onStay={guard.onStay}
        onLeave={guard.onLeave}
        onSaveDraftAndLeave={guard.onSaveDraftAndLeave}
      />

      <DraftRestorePrompt
        open={showRestorePrompt}
        lastSavedAt={lastSavedAt}
        onRestore={onRestore}
        onDiscard={onDiscard}
      />
    </>
  )
}
