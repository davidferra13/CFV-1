'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createFollowUpReminders } from '@/lib/prospecting/pipeline-actions'
import { Loader2, Bell } from 'lucide-react'

export function FollowUpReminderButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function handleRun() {
    setResult(null)
    startTransition(async () => {
      try {
        const res = await createFollowUpReminders()
        setResult(
          res.created > 0
            ? `Created ${res.created} follow-up reminder${res.created > 1 ? 's' : ''}`
            : 'No follow-ups due'
        )
      } catch (err) {
        setResult(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={handleRun} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <Bell className="h-4 w-4 mr-1" />
            Sync Reminders
          </>
        )}
      </Button>
      {result && <span className="text-xs text-stone-400">{result}</span>}
    </div>
  )
}
