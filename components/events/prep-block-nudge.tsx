'use client'

// PrepBlockNudgeBanner — shown on confirmed events with zero prep blocks.
// Offers one-click auto-scheduling via the rule-based engine.

import { useState } from 'react'
import { autoPlacePrepBlocks } from '@/lib/scheduling/prep-block-actions'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

type Props = {
  eventId: string
}

export function PrepBlockNudgeBanner({ eventId }: Props) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (dismissed) return null

  async function handleAutoSchedule() {
    setLoading(true)
    setError(null)
    try {
      const result = await autoPlacePrepBlocks(eventId)
      if (!result.success) {
        setError(result.error ?? 'Auto-schedule failed')
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-schedule failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-center gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900">No prep blocks scheduled</p>
        <p className="text-xs text-amber-700 mt-0.5">
          Auto-schedule will add shopping, prep, and setup blocks based on event timing.
        </p>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          type="button"
          variant="primary"
          loading={loading}
          disabled={loading}
          onClick={handleAutoSchedule}
        >
          Auto-schedule
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={loading}
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </Button>
      </div>
    </div>
  )
}
