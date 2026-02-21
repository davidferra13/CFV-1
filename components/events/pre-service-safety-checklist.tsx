'use client'

import { useTransition } from 'react'
import { CheckCircle, Circle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toggleSafetyItem, completeSafetyChecklist } from '@/lib/events/safety-checklist-actions'

type SafetyItem = {
  key: string
  label: string
  completed: boolean
  completed_at: string | null
}

type SafetyChecklist = {
  id: string
  items: SafetyItem[]
  completed_at: string | null
}

type Props = {
  eventId: string
  checklist: SafetyChecklist | null
}

export function PreServiceSafetyChecklist({ eventId, checklist }: Props) {
  const [isPending, startTransition] = useTransition()

  if (!checklist) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Safety checklist not initialized. Refresh the page to load it.
      </div>
    )
  }

  const items = checklist.items as SafetyItem[]
  const completedCount = items.filter((i) => i.completed).length
  const totalCount = items.length
  const allComplete = completedCount === totalCount
  const isChecklistComplete = !!checklist.completed_at

  function handleToggle(itemKey: string) {
    if (isChecklistComplete) return
    startTransition(async () => {
      await toggleSafetyItem(checklist!.id, itemKey)
    })
  }

  function handleComplete() {
    startTransition(async () => {
      await completeSafetyChecklist(checklist!.id)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-base">Pre-Service Safety Check</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {completedCount}/{totalCount} complete
          </span>
          {isChecklistComplete && <Badge variant="success">Completed</Badge>}
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              disabled={isPending || isChecklistComplete}
              onClick={() => handleToggle(item.key)}
              className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {item.completed ? (
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
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

      {allComplete && !isChecklistComplete && (
        <Button variant="primary" size="sm" disabled={isPending} onClick={handleComplete}>
          Mark Checklist Complete
        </Button>
      )}

      {isChecklistComplete && (
        <p className="text-xs text-muted-foreground">
          Completed at {new Date(checklist.completed_at!).toLocaleString()}
        </p>
      )}
    </div>
  )
}
