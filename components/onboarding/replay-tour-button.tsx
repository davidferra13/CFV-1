'use client'

// ReplayTourButton - Allows users to restart the onboarding tour
// from Settings. Resets all tour progress and refreshes the page.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { resetTourProgress } from '@/lib/onboarding/tour-actions'

export function ReplayTourButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  const handleReset = () => {
    startTransition(async () => {
      try {
        await resetTourProgress()
        setDone(true)
        // Redirect to dashboard so the welcome modal shows again
        router.push('/dashboard')
      } catch {
        // Non-critical, just log
        console.error('[tour] Failed to reset tour progress')
      }
    })
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-stone-200">Product Tour</p>
        <p className="text-xs text-stone-400">Replay the guided tour to rediscover features</p>
      </div>
      <Button variant="secondary" onClick={handleReset} loading={isPending} disabled={done}>
        {done ? 'Redirecting...' : 'Replay Tour'}
      </Button>
    </div>
  )
}
