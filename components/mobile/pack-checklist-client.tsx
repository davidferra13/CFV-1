'use client'

import { useState, useTransition } from 'react'
import { PackProgress } from './pack-progress'
import { PackCategoryGroup } from './pack-category'
import { togglePackItem, markAllPacked } from '@/lib/mobile/pack-checklist'
import type { PackCategoryGroup as PackCategoryGroupType } from '@/lib/mobile/pack-checklist'
import { CheckCircle, Loader2 } from '@/components/ui/icons'
import { toast } from 'sonner'

export function PackChecklistClient({
  eventId,
  initialGroups,
}: {
  eventId: string
  initialGroups: PackCategoryGroupType[]
}) {
  const [groups, setGroups] = useState(initialGroups)
  const [isPending, startTransition] = useTransition()

  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0)
  const checkedItems = groups.reduce(
    (sum, g) => sum + g.items.filter((i) => i.checked).length,
    0
  )
  const allPacked = checkedItems === totalItems && totalItems > 0

  function handleToggle(itemId: string, checked: boolean) {
    // Optimistic update
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((i) =>
          i.id === itemId ? { ...i, checked } : i
        ),
      }))
    )

    // Server sync (fire-and-forget with rollback on error)
    startTransition(async () => {
      try {
        const result = await togglePackItem(eventId, itemId, checked)
        if (!result.success) {
          // Rollback
          setGroups((prev) =>
            prev.map((g) => ({
              ...g,
              items: g.items.map((i) =>
                i.id === itemId ? { ...i, checked: !checked } : i
              ),
            }))
          )
          toast.error('Failed to save')
        }
      } catch {
        // Rollback
        setGroups((prev) =>
          prev.map((g) => ({
            ...g,
            items: g.items.map((i) =>
              i.id === itemId ? { ...i, checked: !checked } : i
            ),
          }))
        )
        toast.error('Failed to save')
      }
    })
  }

  function handleMarkAllPacked() {
    startTransition(async () => {
      try {
        const result = await markAllPacked(eventId)
        if (result.success) {
          setGroups((prev) =>
            prev.map((g) => ({
              ...g,
              items: g.items.map((i) => ({ ...i, checked: true })),
            }))
          )
          toast.success('All packed! Have a great service.')
        } else {
          toast.error('Failed to mark all packed')
        }
      } catch {
        toast.error('Failed to mark all packed')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <PackProgress checked={checkedItems} total={totalItems} />

      {/* Category groups */}
      {groups.map((group) => (
        <PackCategoryGroup
          key={group.category}
          label={group.label}
          category={group.category}
          items={group.items}
          onToggle={handleToggle}
        />
      ))}

      {/* All Packed button */}
      {!allPacked && totalItems > 0 && (
        <button
          onClick={handleMarkAllPacked}
          disabled={isPending}
          className="w-full py-4 rounded-2xl bg-green-700 text-white text-lg font-bold hover:bg-green-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle className="h-5 w-5" />
          )}
          Mark All Packed
        </button>
      )}

      {/* All done confirmation */}
      {allPacked && (
        <div className="text-center py-6 rounded-2xl bg-green-950 border border-green-800">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" weight="fill" />
          <p className="text-xl font-bold text-green-300">All Packed!</p>
          <p className="text-sm text-green-500 mt-1">
            Everything is ready. Have a great service.
          </p>
        </div>
      )}
    </div>
  )
}
