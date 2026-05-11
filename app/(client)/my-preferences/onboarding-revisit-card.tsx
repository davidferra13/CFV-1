'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { generateRevisitToken } from '@/lib/onboarding/client-revisit-actions'

export function OnboardingRevisitCard() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRevisit() {
    startTransition(async () => {
      try {
        const result = await generateRevisitToken()
        if ('error' in result) {
          toast.error(result.error)
          return
        }
        router.push(`/onboarding/${result.token}`)
      } catch {
        toast.error('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Card variant="highlight">
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div>
          <p className="text-sm font-medium text-stone-200">Update Your Preferences</p>
          <p className="text-xs text-stone-500 mt-0.5">
            Re-visit the guided setup to update your kitchen details, household info, and dietary
            needs all at once.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRevisit}
          disabled={isPending}
          className="shrink-0 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {isPending ? 'Loading...' : 'Re-do Setup'}
        </button>
      </CardContent>
    </Card>
  )
}
