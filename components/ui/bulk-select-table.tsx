'use client'

// BulkSelectTable - adds checkbox selection and a floating bulk-action bar
// to any data table. Generic over items that have a string `id` field.

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'

export interface BulkAction {
  label: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  onClick: (selectedIds: string[]) => void | Promise<void>
  confirmMessage?: string
}

export interface BulkSelectTableProps<T extends { id: string }> {
  items: T[]
  renderHeader: () => React.ReactNode
  renderRow: (item: T, selected: boolean) => React.ReactNode
  bulkActions: BulkAction[]
  emptyState?: React.ReactNode
}

export function BulkSelectTable<T extends { id: string }>({
  items,
  renderHeader,
  renderRow,
  bulkActions,
  emptyState,
}: BulkSelectTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [running, setRunning] = useState(false)
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null)

  const allSelected = items.length > 0 && selectedIds.size === items.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)))
    }
  }, [allSelected, items])

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const runAction = useCallback(
    async (action: BulkAction) => {
      setRunning(true)
      try {
        await action.onClick(Array.from(selectedIds))
      } finally {
        setRunning(false)
        setSelectedIds(new Set())
      }
    },
    [selectedIds]
  )

  const handleAction = useCallback(
    (action: BulkAction) => {
      if (action.confirmMessage) {
        setPendingAction(action)
        return
      }
      runAction(action)
    },
    [runAction]
  )

  const handleConfirmedAction = useCallback(() => {
    if (!pendingAction) return
    const action = pendingAction
    setPendingAction(null)
    runAction(action)
  }, [pendingAction, runAction])

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-xl border border-stone-700 bg-stone-900 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-800 bg-stone-800/60">
              {/* Select-all checkbox */}
              <th className="w-10 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                  className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
              </th>
              {renderHeader()}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {items.map((item) => {
              const selected = selectedIds.has(item.id)
              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    selected ? 'bg-brand-950' : 'hover:bg-stone-800/60'
                  }`}
                >
                  {/* Per-row checkbox */}
                  <td className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleOne(item.id)}
                      aria-label={`Select row ${item.id}`}
                      className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                  </td>
                  {renderRow(item, selected)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Floating bulk-action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-stone-700 bg-stone-900 px-5 py-3 shadow-xl">
          <span className="text-sm font-medium text-stone-300 mr-1">
            {selectedIds.size} selected
          </span>
          {bulkActions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? 'secondary'}
              size="sm"
              disabled={running}
              onClick={() => handleAction(action)}
            >
              {action.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            disabled={running}
            onClick={() => setSelectedIds(new Set())}
          >
            Cancel
          </Button>
        </div>
      )}

      <ConfirmModal
        open={pendingAction !== null}
        title="Are you sure?"
        description={pendingAction?.confirmMessage}
        confirmLabel={pendingAction?.label ?? 'Confirm'}
        variant={pendingAction?.variant === 'danger' ? 'danger' : 'primary'}
        loading={running}
        onConfirm={handleConfirmedAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  )
}
