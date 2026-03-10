'use client'

// Reservation Cancel Button
// Client-facing cancel with confirmation and error handling.

import { useState, useTransition } from 'react'
import { cancelClientReservation } from '@/lib/client-portal/portal-actions'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function ReservationCancelButton({ reservationId }: { reservationId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleCancel = () => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await cancelClientReservation(reservationId)
        if (!result.success) {
          setError(result.error || 'Failed to cancel')
          setConfirming(false)
          return
        }
        setConfirming(false)
        router.refresh()
      } catch (err) {
        setError('Something went wrong. Please try again.')
        setConfirming(false)
      }
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="danger" onClick={handleCancel} disabled={isPending}>
          {isPending ? 'Cancelling...' : 'Confirm Cancel'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setConfirming(false)
            setError(null)
          }}
          disabled={isPending}
        >
          Keep
        </Button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    )
  }

  return (
    <Button variant="ghost" onClick={() => setConfirming(true)}>
      Cancel
    </Button>
  )
}
