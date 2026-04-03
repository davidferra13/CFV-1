'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, ClipboardList } from '@/components/ui/icons'
import { useOnboardingPeripheralsEnabled } from '@/lib/onboarding/peripheral-visibility'
import {
  BETA_SURVEY_BANNER_DISMISS_DURATION_MS,
  getBetaSurveyBannerDismissKey,
  getBetaSurveyCompletionKey,
} from '@/lib/beta-survey/survey-presence'

interface BetaSurveyBannerClientProps {
  surveySlug: string
  surveyTitle: string
  /** Route to the survey page (differs by portal) */
  href: string
  respectOnboardingPeripherals?: boolean
}

export function BetaSurveyBannerClient({
  surveySlug,
  surveyTitle,
  href,
  respectOnboardingPeripherals = true,
}: BetaSurveyBannerClientProps) {
  const onboardingPeripheralsEnabled = useOnboardingPeripheralsEnabled()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (respectOnboardingPeripherals && !onboardingPeripheralsEnabled) {
      setVisible(false)
      return
    }

    try {
      if (localStorage.getItem(getBetaSurveyCompletionKey(surveySlug))) {
        setVisible(false)
        return
      }

      const dismissedAt = localStorage.getItem(getBetaSurveyBannerDismissKey(surveySlug))
      if (dismissedAt) {
        const elapsed = Date.now() - Number(dismissedAt)
        if (elapsed < BETA_SURVEY_BANNER_DISMISS_DURATION_MS) {
          setVisible(false)
          return
        }
      }
    } catch {
      // Fail open if browser storage is unavailable.
    }

    setVisible(true)
  }, [onboardingPeripheralsEnabled, respectOnboardingPeripherals, surveySlug])

  const dismiss = () => {
    try {
      localStorage.setItem(getBetaSurveyBannerDismissKey(surveySlug), String(Date.now()))
    } catch {
      // Ignore storage failures and still hide the banner for this render.
    }
    setVisible(false)
  }

  if (respectOnboardingPeripherals && !onboardingPeripheralsEnabled) return null
  if (!visible) return null

  return (
    <div className="bg-brand-500/15 border-b border-brand-500/30">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <ClipboardList size={16} className="text-brand-400 shrink-0" />
        <p className="text-sm text-stone-200 flex-1">
          <strong className="text-brand-300">{surveyTitle}</strong>
          {': '}
          Help us build a better ChefFlow. Takes about 3 minutes.
        </p>
        <Link
          href={href}
          className="text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors whitespace-nowrap"
        >
          Take Survey
        </Link>
        <button
          onClick={dismiss}
          className="text-stone-500 hover:text-stone-300 transition-colors"
          aria-label="Dismiss survey banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
