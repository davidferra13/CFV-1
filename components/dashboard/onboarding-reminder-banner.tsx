'use client'

import { useState, useEffect } from 'react'
import {
  getOnboardingProgressSummary,
  getOnboardingDismissalState,
  dismissOnboardingReminder,
} from '@/lib/onboarding/onboarding-actions'
import { WIZARD_STEPS } from '@/lib/onboarding/onboarding-constants'

const REMINDER_MESSAGES: Record<string, { text: string; cta: string; href: string }> = {
  profile: {
    text: "Your profile isn't complete yet. Clients can't find you without a profile.",
    cta: 'Complete profile',
    href: '/onboarding',
  },
  portfolio: {
    text: "You haven't uploaded any food photos. Show clients what you can do.",
    cta: 'Add photos',
    href: '/onboarding',
  },
  pricing: {
    text: "Your pricing isn't set up yet. Clients won't know your rates.",
    cta: 'Set up pricing',
    href: '/onboarding',
  },
  connect_gmail: {
    text: 'Connect your email to auto-import leads from your inbox.',
    cta: 'Import leads',
    href: '/onboarding',
  },
  first_event: {
    text: "You haven't created your first event yet. Try it out to see how ChefFlow works.",
    cta: 'Create event',
    href: '/events',
  },
}

const MAX_DISMISSALS = 1

export function OnboardingReminderBanner() {
  const [reminder, setReminder] = useState<{
    text: string
    cta: string
    href: string
  } | null>(null)
  const [visible, setVisible] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  useEffect(() => {
    loadReminder()
  }, [])

  async function loadReminder() {
    try {
      const [status, dismissalState] = await Promise.all([
        getOnboardingProgressSummary(),
        getOnboardingDismissalState(),
      ])

      // Don't show reminders if wizard isn't completed yet (they'll see the banner instead)
      if (!dismissalState.wizardCompleted) return

      // Stop showing after MAX_DISMISSALS
      if (dismissalState.remindersDismissed >= MAX_DISMISSALS) return

      // Find the first incomplete step that has a reminder message
      const doneKeys = new Set(
        status.progress.filter((p: any) => p.completed_at || p.skipped).map((p: any) => p.step_key)
      )

      const incompleteStep = WIZARD_STEPS.find(
        (s) => !doneKeys.has(s.key) && REMINDER_MESSAGES[s.key]
      )

      if (!incompleteStep) return

      const msg = REMINDER_MESSAGES[incompleteStep.key]
      if (msg) {
        setReminder(msg)
        setVisible(true)
      }
    } catch (err) {
      console.error('[onboarding-reminder] Failed to load', err)
    }
  }

  async function handleDismiss() {
    if (dismissing) return
    setDismissing(true)
    setVisible(false)
    try {
      await dismissOnboardingReminder()
    } catch (err) {
      console.error('[onboarding-reminder] Failed to persist dismissal', err)
    }
  }

  if (!visible || !reminder) return null

  return (
    <div className="relative rounded-lg border border-border bg-card p-3 shadow-sm">
      {/* Dismiss button (top-right) */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-2 right-2 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss reminder"
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

      <p className="text-sm text-muted-foreground pr-6">{reminder.text}</p>
      <a
        href={reminder.href}
        className="mt-2 inline-block rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-orange-500"
      >
        {reminder.cta}
      </a>
    </div>
  )
}
