'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  bulkUpdateClientWeekMealRequests,
  sendWeekRecommendationFromBoard,
  type RecurringPlanningBoardRecommendationStatus,
} from '@/lib/recurring/actions'

interface RecurringBoardRowActionsProps {
  clientId: string
  weekStart: string
  openRequestCount: number
  recommendationStatus: RecurringPlanningBoardRecommendationStatus
}

export function RecurringBoardRowActions({
  clientId,
  weekStart,
  openRequestCount,
  recommendationStatus,
}: RecurringBoardRowActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function runAction(task: () => Promise<string>) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        const message = await task()
        setSuccess(message)
      } catch (err: any) {
        setError(err?.message || 'Action failed')
      }
    })
  }

  const canSendRecommendation = recommendationStatus !== 'sent'
  const hasOpenRequests = openRequestCount > 0

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending || !canSendRecommendation}
          onClick={() =>
            runAction(async () => {
              await sendWeekRecommendationFromBoard({
                client_id: clientId,
                week_start: weekStart,
              })
              return 'Recommendation sent for this week.'
            })
          }
        >
          {isPending
            ? 'Working...'
            : canSendRecommendation
              ? 'Send Recommendation'
              : 'Awaiting Client Reply'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending || !hasOpenRequests}
          onClick={() =>
            runAction(async () => {
              const result = await bulkUpdateClientWeekMealRequests({
                client_id: clientId,
                week_start: weekStart,
                status: 'reviewed',
              })
              return result.updatedCount > 0
                ? `Marked ${result.updatedCount} request${result.updatedCount === 1 ? '' : 's'} reviewed.`
                : 'No open requests found for review.'
            })
          }
        >
          Mark Requests Reviewed
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={isPending || !hasOpenRequests}
          onClick={() =>
            runAction(async () => {
              const result = await bulkUpdateClientWeekMealRequests({
                client_id: clientId,
                week_start: weekStart,
                status: 'scheduled',
              })
              return result.updatedCount > 0
                ? `Scheduled ${result.updatedCount} request${result.updatedCount === 1 ? '' : 's'}.`
                : 'No requests available to schedule.'
            })
          }
        >
          Schedule Week Requests
        </Button>
      </div>
      {(success || error) && (
        <p
          className={`text-xs ${error ? 'text-red-400' : 'text-emerald-400'}`}
          aria-live="polite"
          role="status"
        >
          {error ?? success}
        </p>
      )}
    </div>
  )
}
