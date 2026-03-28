'use client'

import { useState, useEffect } from 'react'
import {
  getOnboardingStatus,
  getOnboardingDismissalState,
  dismissOnboardingBanner,
} from '@/lib/onboarding/onboarding-actions'
import { ONBOARDING_STEPS } from '@/lib/onboarding/onboarding-constants'

export function OnboardingBanner() {
  const [status, setStatus] = useState<{
    totalSteps: number
    completed: number
    skipped: number
    percentComplete: number
    currentStep: string | null
  } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    try {
      const [s, dismissalState] = await Promise.all([
        getOnboardingStatus(),
        getOnboardingDismissalState(),
      ])

      // If wizard is completed or banner was dismissed in DB, don't show
      if (dismissalState.wizardCompleted || dismissalState.bannerDismissed) {
        setDismissed(true)
        return
      }

      setStatus(s)
    } catch (err) {
      console.error('[onboarding-banner] Failed to load status', err)
      setLoadError(true)
    }
  }

  async function handleDismiss() {
    setDismissed(true)
    try {
      await dismissOnboardingBanner()
    } catch (err) {
      console.error('[onboarding-banner] Failed to persist dismissal', err)
    }
  }

  // Don't render if: loading failed, dismissed, no data, or fully complete
  if (loadError || dismissed || !status) return null
  if (status.completed + status.skipped >= status.totalSteps) return null

  const currentStepData = ONBOARDING_STEPS.find((s) => s.key === status.currentStep)

  return (
    <div className="relative rounded-lg border border-orange-200 dark:border-orange-800/50 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 p-4 shadow-sm">
      {/* Dismiss button (only if some progress made) */}
      {status.completed > 0 && (
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Complete your setup</h3>
            <span className="rounded-full bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-300">
              {status.percentComplete}%
            </span>
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {status.completed} of {status.totalSteps} steps done
            {currentStepData ? ` - Next: ${currentStepData.title}` : ''}
          </p>

          {/* Mini progress bar */}
          <div className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-orange-500 transition-all duration-300"
              style={{ width: `${status.percentComplete}%` }}
            />
          </div>
        </div>

        <a
          href="/onboarding"
          className="shrink-0 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-500"
        >
          Continue Setup
        </a>
      </div>
    </div>
  )
}
