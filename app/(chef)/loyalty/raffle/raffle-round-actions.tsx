'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { updateRaffleRound, markPrizeDelivered } from '@/lib/raffle/actions'
import type { RaffleRound } from '@/lib/raffle/actions'

type Props = {
  round: RaffleRound
  category?: 'random' | 'top_scorer' | 'most_dedicated'
}

export function RaffleRoundActions({ round, category }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleCancel = () => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await updateRaffleRound(round.id, { status: 'cancelled' })
        if (result.success) {
          router.refresh()
        } else {
          setError(result.error || 'Failed to cancel.')
        }
      } catch {
        setError('Something went wrong.')
      }
    })
    setShowConfirm(false)
  }

  const handleMarkDelivered = () => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await markPrizeDelivered(round.id, category || 'random')
        if (result.success) {
          router.refresh()
        } else {
          setError(result.error || 'Failed to update.')
        }
      } catch {
        setError('Something went wrong.')
      }
    })
  }

  // Determine delivery status for this specific category
  const isDelivered =
    category === 'top_scorer'
      ? round.prize_top_scorer_delivered
      : category === 'most_dedicated'
        ? round.prize_most_dedicated_delivered
        : round.prize_random_delivered || round.prize_delivered // backward compat

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg bg-red-950/50 border border-red-800 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Cancel — only for active rounds, and only when no specific category is passed */}
      {round.status === 'active' && !category && (
        <>
          {showConfirm ? (
            <div className="rounded-lg border border-red-800 bg-red-950/30 p-3 space-y-2">
              <p className="text-sm text-red-300">
                Cancel this raffle? All entries will be lost. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={handleCancel} disabled={isPending}>
                  {isPending ? 'Cancelling...' : 'Yes, Cancel Raffle'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>
                  Keep it
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirm(true)}
              className="text-red-400"
            >
              Cancel Raffle
            </Button>
          )}
        </>
      )}

      {/* Mark Delivered — per-category for completed rounds */}
      {round.status === 'completed' && !isDelivered && (
        <Button variant="secondary" size="sm" onClick={handleMarkDelivered} disabled={isPending}>
          {isPending ? 'Updating...' : 'Mark Delivered'}
        </Button>
      )}

      {round.status === 'completed' && isDelivered && <Badge variant="success">Delivered</Badge>}
    </div>
  )
}
