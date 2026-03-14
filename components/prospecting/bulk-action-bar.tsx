'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { bulkUpdateProspects, bulkDeleteProspects } from '@/lib/prospecting/pipeline-actions'
import {
  PROSPECT_STATUSES,
  PIPELINE_STAGES,
  PROSPECT_PRIORITIES,
} from '@/lib/prospecting/constants'
import { Loader2, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BulkActionBarProps {
  selectedIds: string[]
  onClearSelection: () => void
}

export function BulkActionBar({ selectedIds, onClearSelection }: BulkActionBarProps) {
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  if (selectedIds.length === 0) return null

  function handleBulkUpdate(updates: Parameters<typeof bulkUpdateProspects>[1]) {
    setResult(null)
    startTransition(async () => {
      try {
        const res = await bulkUpdateProspects(selectedIds, updates)
        setResult(`Updated ${res.updated} prospects`)
        onClearSelection()
        router.refresh()
      } catch (err) {
        setResult(err instanceof Error ? err.message : 'Update failed')
      }
    })
  }

  function handleBulkDelete() {
    setShowDeleteConfirm(false)
    setResult(null)
    startTransition(async () => {
      try {
        const res = await bulkDeleteProspects(selectedIds)
        setResult(`Deleted ${res.deleted} prospects`)
        onClearSelection()
        router.refresh()
      } catch (err) {
        setResult(err instanceof Error ? err.message : 'Delete failed')
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg bg-brand-950 border border-brand-700 px-4 py-2.5">
        <span className="text-sm font-medium text-brand-400">{selectedIds.length} selected</span>

        <div className="h-4 w-px bg-stone-700" />

        {/* Status update */}
        <select
          disabled={isPending}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) handleBulkUpdate({ status: e.target.value })
            e.target.value = ''
          }}
          className="rounded border border-stone-700 px-2 py-1 text-xs"
        >
          <option value="" disabled>
            Set Status...
          </option>
          {PROSPECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>

        {/* Pipeline stage update */}
        <select
          disabled={isPending}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) handleBulkUpdate({ pipeline_stage: e.target.value })
            e.target.value = ''
          }}
          className="rounded border border-stone-700 px-2 py-1 text-xs"
        >
          <option value="" disabled>
            Set Stage...
          </option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>

        {/* Priority update */}
        <select
          disabled={isPending}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) handleBulkUpdate({ priority: e.target.value })
            e.target.value = ''
          }}
          className="rounded border border-stone-700 px-2 py-1 text-xs"
        >
          <option value="" disabled>
            Set Priority...
          </option>
          {PROSPECT_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Delete */}
        <Button
          variant="danger"
          size="sm"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Clear selection */}
        <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={isPending}>
          <X className="h-3.5 w-3.5" />
        </Button>

        {result && <span className="text-xs text-stone-400">{result}</span>}
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title={`Delete ${selectedIds.length} prospects permanently?`}
        description="This cannot be undone. All associated notes, outreach logs, and history will be deleted."
        confirmLabel="Delete All"
        variant="danger"
        loading={isPending}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
