'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle } from '@/components/ui/icons'
import { updateHealthItem, type HealthItemStatus } from '@/lib/protection/business-health-actions'
import {
  HEALTH_ITEM_LABELS,
  HEALTH_ITEM_WHY,
  type HealthItemKey,
} from '@/lib/protection/business-health-constants'
import { toast } from 'sonner'

type HealthItem = {
  item_key: string
  status: HealthItemStatus
  notes: string | null
  document_url: string | null
  completed_at: string | null
}

export function BusinessHealthChecklist({ items }: { items: HealthItem[] }) {
  const [localItems, setLocalItems] = useState(items)
  const [isPending, startTransition] = useTransition()
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const completedCount = localItems.filter((i) => i.status === 'complete').length
  const totalCount = localItems.length

  if (totalCount === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-stone-400">
          <p className="text-sm">No checklist items configured yet.</p>
        </CardContent>
      </Card>
    )
  }

  function toggleItem(item: HealthItem) {
    const previous = [...localItems]
    const newStatus: HealthItemStatus = item.status === 'complete' ? 'incomplete' : 'complete'

    // Optimistic update
    setLocalItems((prev) =>
      prev.map((i) => (i.item_key === item.item_key ? { ...i, status: newStatus } : i))
    )
    setPendingKey(item.item_key)

    startTransition(async () => {
      try {
        await updateHealthItem(item.item_key, newStatus, item.notes ?? undefined)
        toast.success(
          newStatus === 'complete'
            ? `Marked "${HEALTH_ITEM_LABELS[item.item_key as HealthItemKey] ?? item.item_key}" complete`
            : `Unmarked "${HEALTH_ITEM_LABELS[item.item_key as HealthItemKey] ?? item.item_key}"`
        )
      } catch {
        setLocalItems(previous)
        toast.error('Failed to update checklist item')
      } finally {
        setPendingKey(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant={completedCount === totalCount ? 'success' : 'warning'}>
          {completedCount}/{totalCount} complete
        </Badge>
      </div>

      <Card>
        <CardContent className="py-4 divide-y divide-stone-800">
          {localItems.map((item) => {
            const label = HEALTH_ITEM_LABELS[item.item_key as HealthItemKey] ?? item.item_key
            const why = HEALTH_ITEM_WHY[item.item_key as HealthItemKey]
            const isToggling = pendingKey === item.item_key

            return (
              <button
                key={item.item_key}
                type="button"
                onClick={() => toggleItem(item)}
                disabled={isPending && isToggling}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 w-full text-left hover:bg-stone-800/50 rounded-md px-2 -mx-2 transition-colors"
              >
                {item.status === 'complete' ? (
                  <CheckCircle2
                    className={`h-5 w-5 text-green-600 mt-0.5 shrink-0 ${isToggling ? 'opacity-50' : ''}`}
                  />
                ) : (
                  <Circle
                    className={`h-5 w-5 text-stone-500 mt-0.5 shrink-0 ${isToggling ? 'opacity-50' : ''}`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${item.status === 'complete' ? 'text-stone-400 line-through' : 'text-stone-200'}`}
                  >
                    {label}
                  </p>
                  {why && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{why}</p>}
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
