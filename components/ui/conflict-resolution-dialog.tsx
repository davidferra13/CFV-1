'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'

type ValueMap = Record<string, unknown>

type ConflictResolutionDialogProps = {
  open: boolean
  message?: string
  attempted: ValueMap | null
  latest: ValueMap | null
  loading?: boolean
  onKeepMine: () => void | Promise<unknown>
  onKeepLatest: () => void
  onCancel: () => void
}

type DiffRow = {
  field: string
  mine: string
  latest: string
}

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string') return value.trim() || '-'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((entry) => normalizeValue(entry)).join(', ')
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function labelize(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function ConflictResolutionDialog({
  open,
  message,
  attempted,
  latest,
  loading = false,
  onKeepMine,
  onKeepLatest,
  onCancel,
}: ConflictResolutionDialogProps) {
  const diffs = useMemo<DiffRow[]>(() => {
    if (!attempted || !latest) return []
    const keys = new Set([...Object.keys(attempted), ...Object.keys(latest)])
    const rows: DiffRow[] = []

    for (const key of keys) {
      const mine = normalizeValue(attempted[key])
      const newest = normalizeValue(latest[key])
      if (mine === newest) continue
      rows.push({ field: labelize(key), mine, latest: newest })
    }

    return rows.slice(0, 40)
  }, [attempted, latest])

  return (
    <AccessibleDialog
      open={open}
      onClose={onCancel}
      title="This record changed elsewhere."
      description={message || 'Compare your changes with the latest version and choose next step.'}
      widthClassName="max-w-3xl"
      closeOnBackdrop={false}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={onKeepLatest} disabled={loading}>
            Keep latest
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => void onKeepMine()}
            disabled={loading}
          >
            Keep mine
          </Button>
        </>
      }
    >
      {diffs.length === 0 ? (
        <p className="text-sm text-stone-400">No field-level differences available yet.</p>
      ) : (
        <div className="max-h-[50vh] overflow-auto rounded-lg border border-stone-700">
          <table className="w-full text-sm">
            <thead className="bg-stone-800 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 text-stone-400">Field</th>
                <th className="text-left px-3 py-2 text-stone-400">Your version</th>
                <th className="text-left px-3 py-2 text-stone-400">Latest version</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map((row) => (
                <tr key={row.field} className="border-t border-stone-800 align-top">
                  <td className="px-3 py-2 font-medium text-stone-300">{row.field}</td>
                  <td className="px-3 py-2 text-amber-700 whitespace-pre-wrap">{row.mine}</td>
                  <td className="px-3 py-2 text-emerald-700 whitespace-pre-wrap">{row.latest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AccessibleDialog>
  )
}
