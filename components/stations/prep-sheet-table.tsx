'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { updatePrepStatus } from '@/lib/prep/prep-sheet-actions'
import type { PrepItem } from '@/lib/prep/prep-sheet-actions'

const statusBadge: Record<string, { variant: 'info' | 'warning' | 'success'; label: string }> = {
  pending: { variant: 'info', label: 'Pending' },
  in_progress: { variant: 'warning', label: 'In Progress' },
  done: { variant: 'success', label: 'Done' },
}

function nextAction(
  status: string
): { label: string; next: 'pending' | 'in_progress' | 'done' } | null {
  if (status === 'pending') return { label: 'Start', next: 'in_progress' }
  if (status === 'in_progress') return { label: 'Done', next: 'done' }
  if (status === 'done') return { label: 'Reset', next: 'pending' }
  return null
}

export function PrepSheetTable({ items }: { items: PrepItem[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Sort: done items at bottom, then by ingredient name
  const sorted = [...items].sort((a, b) => {
    if (a.prep_status === 'done' && b.prep_status !== 'done') return 1
    if (a.prep_status !== 'done' && b.prep_status === 'done') return -1
    return a.ingredient_name.localeCompare(b.ingredient_name)
  })

  function handleStatusChange(prepId: string, next: 'pending' | 'in_progress' | 'done') {
    startTransition(async () => {
      const result = await updatePrepStatus(prepId, next)
      if (!result.success) {
        console.error('[prep-sheet] status update failed:', result.error)
      }
      router.refresh()
    })
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        No prep items yet. Link menus and generate a prep sheet above.
      </div>
    )
  }

  const doneCount = items.filter((i) => i.prep_status === 'done').length
  const totalCount = items.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-stone-400">
        <span>
          {doneCount} of {totalCount} items complete
        </span>
        {doneCount === totalCount && <Badge variant="success">All Done</Badge>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-700 text-left text-xs uppercase text-stone-500">
              <th className="pb-2 pr-4">Ingredient</th>
              <th className="pb-2 pr-4 text-right">Qty Needed</th>
              <th className="pb-2 pr-4">Unit</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const badge = statusBadge[item.prep_status] ?? statusBadge.pending
              const action = nextAction(item.prep_status)
              return (
                <tr
                  key={item.id}
                  className={`border-b border-stone-800 ${item.prep_status === 'done' ? 'opacity-50' : ''}`}
                >
                  <td className="py-3 pr-4 text-stone-100">{item.ingredient_name}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-stone-200">
                    {Number(item.required_qty).toFixed(2)}
                  </td>
                  <td className="py-3 pr-4 text-stone-400">{item.unit}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </td>
                  <td className="py-3">
                    {action && (
                      <button
                        onClick={() => handleStatusChange(item.id, action.next)}
                        disabled={isPending}
                        className="rounded-lg bg-stone-800 border border-stone-700 px-3 py-1 text-xs text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors disabled:opacity-50"
                      >
                        {action.label}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
