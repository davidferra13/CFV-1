'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle, Circle, ShieldAlert } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { toggleCrossContaminationItem } from '@/lib/events/cross-contamination-actions'

type XcItem = {
  key: string
  label: string
  completed: boolean
  completed_at: string | null
}

type XcChecklist = {
  id: string
  items: XcItem[]
  completed_at: string | null
  _embedded?: boolean
}

type Props = {
  eventId: string
  allergens: string[]
  checklist: XcChecklist | null
}

export function CrossContaminationChecklist({ eventId, allergens, checklist }: Props) {
  const [isPending, startTransition] = useTransition()

  if (!allergens || allergens.length === 0) {
    return null
  }

  const items: XcItem[] = checklist?.items ?? []
  const completedCount = items.filter((i) => i.completed).length
  const totalCount = items.length
  const allComplete = totalCount > 0 && completedCount === totalCount

  function handleToggle(itemKey: string) {
    if (!checklist) return
    startTransition(async () => {
      try {
        await toggleCrossContaminationItem(checklist!.id, itemKey)
      } catch (err) {
        toast.error('Failed to update checklist item')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          <h3 className="font-semibold text-base">Cross-Contamination Protocol</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{totalCount} complete
        </span>
      </div>

      {/* Allergen badges */}
      <div className="flex flex-wrap gap-1.5">
        {allergens.map((allergen) => (
          <Badge key={allergen} variant="error">
            {allergen}
          </Badge>
        ))}
      </div>

      {/* Hard gate warning if incomplete */}
      {!allComplete && items.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-950 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-xs font-medium text-red-800">
            Cannot skip cross-contamination protocol when allergens are flagged.
          </p>
        </div>
      )}

      {!checklist ? (
        <p className="text-sm text-muted-foreground italic">
          Checklist not initialized. Refresh the page to load it.
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No protocol items found. Ensure allergens are saved on the event.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleToggle(item.key)}
                className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {item.completed ? (
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                )}
                <span
                  className={
                    item.completed ? 'text-sm line-through text-muted-foreground' : 'text-sm'
                  }
                >
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {allComplete && (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />
          <span className="font-medium">All cross-contamination protocols complete.</span>
        </div>
      )}
    </div>
  )
}
