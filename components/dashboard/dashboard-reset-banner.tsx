'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateChefPreferences } from '@/lib/chef/actions'
import { DEFAULT_DASHBOARD_WIDGETS } from '@/lib/scheduling/types'
import { Button } from '@/components/ui/button'

/**
 * Shows once for existing users who have all 107 widgets enabled.
 * Offers to switch to the curated defaults (~25 widgets).
 * Dismissed permanently via localStorage.
 */
export function DashboardResetBanner({
  enabledCount,
  totalCount,
}: {
  enabledCount: number
  totalCount: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('cf-dashboard-reset-dismissed') === '1'
  })

  // Only show if they have way too many widgets on (80%+)
  if (dismissed || enabledCount < totalCount * 0.8) return null

  const handleReset = () => {
    startTransition(async () => {
      try {
        await updateChefPreferences({ dashboard_widgets: DEFAULT_DASHBOARD_WIDGETS })
        localStorage.setItem('cf-dashboard-reset-dismissed', '1')
        setDismissed(true)
        router.refresh()
      } catch {
        // silently fail - not critical
      }
    })
  }

  const handleDismiss = () => {
    localStorage.setItem('cf-dashboard-reset-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="col-span-1 md:col-span-2 rounded-xl border border-brand-700/50 bg-brand-950/30 px-4 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-brand-200">
          Your dashboard has {enabledCount} widgets enabled.
        </p>
        <p className="text-xs text-brand-400/70 mt-0.5">
          We added categories and smart defaults. Switch to the recommended layout to see only what
          matters.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          disabled={isPending}
          className="text-xs"
        >
          Keep mine
        </Button>
        <Button type="button" size="sm" onClick={handleReset} disabled={isPending}>
          {isPending ? 'Switching...' : 'Use recommended'}
        </Button>
      </div>
    </div>
  )
}
