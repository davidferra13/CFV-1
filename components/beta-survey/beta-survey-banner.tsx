'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, ClipboardList } from '@/components/ui/icons'
import { useOnboardingPeripheralsEnabled } from '@/lib/onboarding/peripheral-visibility'

const DISMISS_KEY = 'beta-survey-banner-dismissed'
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

interface BetaSurveyBannerClientProps {
  surveySlug: string
  surveyTitle: string
  /** Route to the survey page (differs by portal) */
  href: string
}

export function BetaSurveyBannerClient({
  surveySlug,
  surveyTitle,
  href,
}: BetaSurveyBannerClientProps) {
  const onboardingPeripheralsEnabled = useOnboardingPeripheralsEnabled()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!onboardingPeripheralsEnabled) {
      setVisible(false)
      return
    }

    // Check if dismissed within the last 24 hours
    const dismissedAt = localStorage.getItem(`${DISMISS_KEY}-${surveySlug}`)
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt)
      if (elapsed < DISMISS_DURATION_MS) return
    }
    setVisible(true)
  }, [onboardingPeripheralsEnabled, surveySlug])

  const dismiss = () => {
    localStorage.setItem(`${DISMISS_KEY}-${surveySlug}`, String(Date.now()))
    setVisible(false)
  }

  if (!onboardingPeripheralsEnabled) return null
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
