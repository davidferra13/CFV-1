'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDurableDraft } from '@/lib/drafts/use-durable-draft'
import { useUnsavedChangesGuard } from '@/lib/navigation/use-unsaved-changes-guard'
import type { SaveState } from '@/lib/save-state/model'
import { UNSAVED_STATE } from '@/lib/save-state/model'

type ProtectedFormOptions<T extends Record<string, unknown>> = {
  /** Unique surface identifier (e.g., 'recipe-create', 'expense-form') */
  surfaceId: string
  /** Record ID for edit mode, null/undefined for create mode */
  recordId?: string | null
  /** Tenant/chef ID for scoping drafts */
  tenantId: string
  /** Schema version - bump when form shape changes to invalidate old drafts */
  schemaVersion?: number
  /** Default/initial form data */
  defaultData: T
  /** Current form data (must be kept up to date by the consumer) */
  currentData: T
  /** External save state from useIdempotentMutation or similar */
  saveState?: SaveState
  /** Called when save state is stale after edit (e.g., mutation.markUnsaved) */
  onMarkUnsaved?: () => void
  /** Debounce interval for draft saves in ms (default: 700) */
  debounceMs?: number
  /**
   * Throttle interval for guaranteed periodic saves in ms.
   * Useful for long-form text where debounce alone risks losing
   * minutes of continuous typing. Set 0 to disable. Default: 0.
   */
  throttleMs?: number
}

function deepEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

/**
 * useProtectedForm - composite hook that provides:
 * 1. IndexedDB draft persistence (auto-save on change)
 * 2. Unsaved changes navigation guard (beforeunload + popstate + link intercept)
 * 3. Visibility change auto-save (saves when tab goes hidden, more reliable on mobile)
 * 4. Optional throttled periodic backup save
 * 5. Draft restore prompt management
 *
 * Combines useDurableDraft + useUnsavedChangesGuard + visibilitychange + throttle
 * into a single hook call, reducing per-form boilerplate from ~30 lines to ~5.
 */
export function useProtectedForm<T extends Record<string, unknown>>(
  options: ProtectedFormOptions<T>
) {
  const {
    surfaceId,
    recordId,
    tenantId,
    schemaVersion = 1,
    defaultData,
    currentData,
    saveState = UNSAVED_STATE,
    onMarkUnsaved,
    debounceMs = 700,
    throttleMs = 0,
  } = options

  // Track committed data for dirty detection
  const [committedData, setCommittedData] = useState<T>(defaultData)
  const currentDataRef = useRef<T>(currentData)
  currentDataRef.current = currentData

  // ---- Draft persistence ----
  const durableDraft = useDurableDraft<T>(surfaceId, recordId, {
    schemaVersion,
    tenantId,
    defaultData,
    debounceMs,
  })

  // ---- Dirty detection ----
  const isDirty = useMemo(
    () => !deepEqual(currentData, committedData),
    [currentData, committedData]
  )

  // ---- Auto-persist on change ----
  useEffect(() => {
    if (!isDirty) return
    void durableDraft.persistDraft(currentData)
    if (saveState.status === 'SAVED' && onMarkUnsaved) {
      onMarkUnsaved()
    }
  }, [currentData, durableDraft, isDirty, saveState.status, onMarkUnsaved])

  // ---- Throttled periodic backup (for long-form editors) ----
  useEffect(() => {
    if (!throttleMs || throttleMs <= 0) return
    const interval = setInterval(() => {
      if (!deepEqual(currentDataRef.current, committedData)) {
        void durableDraft.persistDraft(currentDataRef.current, { immediate: true })
      }
    }, throttleMs)
    return () => clearInterval(interval)
  }, [throttleMs, committedData, durableDraft])

  // ---- Visibility change auto-save (reliable on mobile) ----
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Save immediately when tab goes hidden (user switching apps, locking phone)
        if (!deepEqual(currentDataRef.current, committedData)) {
          void durableDraft.persistDraft(currentDataRef.current, { immediate: true })
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [committedData, durableDraft])

  // ---- Unsaved changes guard ----
  const guard = useUnsavedChangesGuard({
    isDirty,
    onSaveDraft: () => durableDraft.persistDraft(currentData, { immediate: true }),
    canSaveDraft: true,
    saveState,
  })

  // ---- Restore handler ----
  const restoreDraft = useCallback(() => {
    const data = durableDraft.restoreDraft()
    return data
  }, [durableDraft])

  const discardDraft = useCallback(() => {
    void durableDraft.discardDraft()
  }, [durableDraft])

  // ---- Mark data as committed (call after successful save) ----
  const markCommitted = useCallback(
    (data?: T) => {
      const committed = data ?? currentDataRef.current
      setCommittedData(committed)
      void durableDraft.clearDraft()
    },
    [durableDraft]
  )

  return useMemo(
    () => ({
      // Draft state
      isDirty,
      showRestorePrompt: durableDraft.showRestorePrompt,
      pendingDraft: durableDraft.pendingDraft,
      lastSavedAt: durableDraft.lastSavedAt,

      // Draft actions
      restoreDraft,
      discardDraft,
      clearDraft: durableDraft.clearDraft,
      markCommitted,

      // Guard (for UnsavedChangesDialog)
      guard: {
        open: guard.open,
        onStay: guard.onStay,
        onLeave: guard.onLeave,
        onSaveDraftAndLeave: guard.onSaveDraftAndLeave,
        canSaveDraft: guard.canSaveDraft,
      },

      // Save state (pass-through for SaveStateBadge)
      saveState,
    }),
    [
      isDirty,
      durableDraft.showRestorePrompt,
      durableDraft.pendingDraft,
      durableDraft.lastSavedAt,
      durableDraft.clearDraft,
      restoreDraft,
      discardDraft,
      markCommitted,
      guard.open,
      guard.onStay,
      guard.onLeave,
      guard.onSaveDraftAndLeave,
      guard.canSaveDraft,
      saveState,
    ]
  )
}
