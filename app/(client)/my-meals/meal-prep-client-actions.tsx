'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import {
  skipWeek,
  pauseMySubscription,
  resumeMySubscription,
} from '@/lib/meal-prep/client-portal-actions'

interface MealPrepClientActionsProps {
  programId: string
  status: 'active' | 'paused' | 'ended'
}

export function MealPrepClientActions({ programId, status }: MealPrepClientActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleSkipNextWeek() {
    const nextWeekDate = getNextWeekDate()
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await skipWeek(programId, nextWeekDate)
        if (result.success) {
          setMessage({ type: 'success', text: 'Skip request sent to your chef.' })
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to request skip.' })
        }
      } catch {
        setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
      }
    })
  }

  function handlePause() {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await pauseMySubscription(programId)
        if (result.success) {
          setMessage({ type: 'success', text: 'Subscription paused. Your chef has been notified.' })
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to pause.' })
        }
      } catch {
        setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
      }
    })
  }

  function handleResume() {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await resumeMySubscription(programId)
        if (result.success) {
          setMessage({
            type: 'success',
            text: 'Subscription resumed. Your chef has been notified.',
          })
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to resume.' })
        }
      } catch {
        setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
      }
    })
  }

  if (status === 'ended') return null

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-stone-100">Quick Actions</h2>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'error'}>{message.text}</Alert>
      )}

      <div className="flex gap-3 flex-wrap">
        {status === 'active' && (
          <>
            <Button variant="secondary" size="sm" onClick={handleSkipNextWeek} disabled={isPending}>
              {isPending ? 'Requesting...' : 'Skip Next Week'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handlePause} disabled={isPending}>
              Pause Subscription
            </Button>
          </>
        )}
        {status === 'paused' && (
          <Button variant="primary" size="sm" onClick={handleResume} disabled={isPending}>
            {isPending ? 'Resuming...' : 'Resume Subscription'}
          </Button>
        )}
      </div>
    </div>
  )
}

function getNextWeekDate(): string {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  return nextWeek.toISOString().split('T')[0]
}
