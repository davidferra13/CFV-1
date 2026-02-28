'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { ScopeDriftResult } from '@/lib/events/scope-drift'
import { acknowledgeScopeDrift } from '@/lib/events/scope-drift-actions'

type Props = {
  eventId: string
  driftResult: ScopeDriftResult
  acknowledged: boolean
}

export function ScopeDriftBanner({ eventId, driftResult, acknowledged }: Props) {
  const [isPending, startTransition] = useTransition()

  if (!driftResult.hasDrift || acknowledged) {
    return null
  }

  function handleAcknowledge() {
    startTransition(async () => {
      try {
        await acknowledgeScopeDrift(eventId)
      } catch (err) {
        toast.error('Failed to acknowledge scope drift')
      }
    })
  }

  return (
    <div className="rounded-md border border-amber-300 bg-amber-950 px-4 py-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold text-amber-900">
            Scope has changed from original quote
          </p>

          <ul className="space-y-1">
            {driftResult.changes.map((change) => (
              <li key={change.field} className="text-sm text-amber-800">
                <span className="font-medium">{change.field}:</span>{' '}
                <span className="line-through text-amber-600">{change.original}</span>
                {' → '}
                <span className="font-medium">{change.current}</span>
                {change.deltaPercent != null && (
                  <span className="ml-1 text-xs text-amber-600">
                    ({change.deltaPercent}% change)
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button variant="secondary" size="sm" disabled={isPending} onClick={handleAcknowledge}>
              Acknowledge &amp; Continue
            </Button>
            <Link
              href={`/quotes/new?from_event=${eventId}`}
              className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-amber-900 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-200 transition-colors"
            >
              Issue Change Order
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
