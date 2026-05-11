// Merge Dialog
// Confirmation dialog for merging duplicate entities.
// Shows impact preview and handles the merge action with loading/error states.

'use client'

import { useState, useEffect, useCallback } from 'react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  mergeClients,
  mergeIngredients,
  mergeRecipes,
  getMergeImpact,
} from '@/lib/data-quality/merge-actions'

interface MergeDialogProps {
  open: boolean
  entityType: 'client' | 'ingredient' | 'recipe'
  keepId: string
  removeId: string
  keepLabel: string
  removeLabel: string
  onClose: () => void
  onComplete: () => void
}

export function MergeDialog({
  open,
  entityType,
  keepId,
  removeId,
  keepLabel,
  removeLabel,
  onClose,
  onComplete,
}: MergeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [impact, setImpact] = useState<{
    label: string
    details: { table: string; count: number }[]
  } | null>(null)

  // Load impact preview when dialog opens
  useEffect(() => {
    if (!open) return
    let cancelled = false

    getMergeImpact(entityType, removeId)
      .then((result) => {
        if (!cancelled) setImpact(result)
      })
      .catch(() => {
        if (!cancelled) setImpact({ label: 'Unable to load impact preview', details: [] })
      })

    return () => {
      cancelled = true
    }
  }, [open, entityType, removeId])

  const handleConfirm = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let result: { success: boolean; error?: string }

      if (entityType === 'client') {
        result = await mergeClients(keepId, removeId)
      } else if (entityType === 'ingredient') {
        result = await mergeIngredients(keepId, removeId)
      } else {
        result = await mergeRecipes(keepId, removeId)
      }

      if (result.success) {
        onComplete()
      } else {
        setError(result.error || 'Merge failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error during merge')
    } finally {
      setLoading(false)
    }
  }, [entityType, keepId, removeId, onComplete])

  const entityLabel =
    entityType === 'client' ? 'Client' : entityType === 'ingredient' ? 'Ingredient' : 'Recipe'

  return (
    <ConfirmModal
      open={open}
      title={`Merge ${entityLabel}s`}
      description={`This will merge "${removeLabel}" into "${keepLabel}". All references will be updated and the duplicate will be archived.`}
      confirmLabel={loading ? 'Merging...' : 'Merge'}
      variant="danger"
      loading={loading}
      onConfirm={handleConfirm}
      onCancel={onClose}
    >
      <div className="space-y-3 mt-3">
        {/* What stays */}
        <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 p-3">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            Keeping
          </p>
          <p className="text-sm text-stone-200">{keepLabel}</p>
        </div>

        {/* What goes */}
        <div className="rounded-lg border border-red-800/50 bg-red-950/30 p-3">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">
            Removing (will be archived)
          </p>
          <p className="text-sm text-stone-200">{removeLabel}</p>
        </div>

        {/* Impact preview */}
        {impact && impact.details.length > 0 && (
          <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              {impact.label}
            </p>
            <ul className="space-y-1">
              {impact.details.map((d) => (
                <li key={d.table} className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">{d.table}</span>
                  <span className="text-stone-400 font-mono text-xs">{d.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 p-3">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>
    </ConfirmModal>
  )
}
