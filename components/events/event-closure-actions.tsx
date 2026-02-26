// Event Closure Actions — Mark reset complete, follow-up sent
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { markResetComplete, markFollowUpSent } from '@/lib/events/actions'

type Props = {
  eventId: string
  resetComplete: boolean
  followUpSent: boolean
}

export function EventClosureActions({ eventId, resetComplete, followUpSent }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (action: () => Promise<any>, key: string) => {
    setLoading(key)
    setError(null)
    try {
      await action()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {!resetComplete && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleAction(() => markResetComplete(eventId), 'reset')}
          loading={loading === 'reset'}
          disabled={loading !== null}
        >
          Mark Reset Complete
        </Button>
      )}

      {!followUpSent && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleAction(() => markFollowUpSent(eventId), 'followup')}
          loading={loading === 'followup'}
          disabled={loading !== null}
        >
          Mark Follow-Up Sent
        </Button>
      )}
    </div>
  )
}
