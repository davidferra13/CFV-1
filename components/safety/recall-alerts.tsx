'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, CheckCircle, X } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { dismissRecall } from '@/lib/safety/recall-actions'
import { toast } from 'sonner'

type RecallAlert = {
  id: string
  product_description: string
  reason_for_recall: string
  recall_initiation_date: string
}

type Props = {
  alerts: RecallAlert[]
}

export function RecallAlerts({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const visible = alerts.filter((a) => !dismissed.has(a.id))

  function handleDismiss(id: string) {
    startTransition(async () => {
      try {
        await dismissRecall(id)
        setDismissed((prev) => new Set([...prev, id]))
      } catch (err) {
        toast.error('Failed to dismiss recall alert')
      }
    })
  }

  if (visible.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-950 px-4 py-3 text-green-800">
        <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
        <span className="text-sm font-medium">No active recalls match your ingredients.</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <span className="text-sm font-semibold text-amber-800">
          {visible.length} active FDA recall{visible.length !== 1 ? 's' : ''} match your ingredients
        </span>
      </div>

      {visible.map((alert) => (
        <div
          key={alert.id}
          className="relative rounded-md border border-amber-300 bg-amber-950 px-4 py-3 pr-10"
        >
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleDismiss(alert.id)}
            className="absolute right-2 top-2 rounded p-1 text-amber-600 hover:bg-amber-900 disabled:opacity-50"
            aria-label="Dismiss recall alert"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <Badge variant="error">Recall</Badge>
              <p className="text-sm font-medium text-amber-900 leading-tight">
                {alert.product_description}
              </p>
            </div>
            <p className="text-xs text-amber-800">
              <span className="font-medium">Reason:</span> {alert.reason_for_recall}
            </p>
            {alert.recall_initiation_date && (
              <p className="text-xs text-amber-700">Initiated: {alert.recall_initiation_date}</p>
            )}
          </div>
        </div>
      ))}

      {dismissed.size > 0 && (
        <p className="text-xs text-muted-foreground">
          {dismissed.size} alert{dismissed.size !== 1 ? 's' : ''} dismissed this session.
        </p>
      )}
    </div>
  )
}
