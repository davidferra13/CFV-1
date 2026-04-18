'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { markEventCostReviewedAction } from '@/lib/pricing/cost-refresh-actions'

interface CostStaleBannerProps {
  eventId: string
  costNeedsRefresh: boolean
}

export function CostStaleBanner({ eventId, costNeedsRefresh }: CostStaleBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!costNeedsRefresh || dismissed) return null

  function handleMarkReviewed() {
    startTransition(async () => {
      try {
        await markEventCostReviewedAction(eventId)
        setDismissed(true)
      } catch {
        // Non-critical, let user try again
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-700/40 bg-amber-900/20 px-4 py-3">
      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <p className="text-sm text-amber-300 flex-1">
        Ingredient prices have changed since this menu was costed.
      </p>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleMarkReviewed}
        disabled={isPending}
        className="text-amber-400 hover:text-amber-300"
      >
        {isPending ? 'Marking...' : 'Mark as Reviewed'}
      </Button>
    </div>
  )
}
