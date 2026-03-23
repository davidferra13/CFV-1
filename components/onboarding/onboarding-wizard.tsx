'use client'

import { useState, useEffect, useTransition } from 'react'
import { getOnboardingProgress, completeStep, skipStep } from '@/lib/onboarding/onboarding-actions'
import { WIZARD_STEPS } from '@/lib/onboarding/onboarding-constants'
import { ProfileStep } from './onboarding-steps/profile-step'
import { ConnectGmailStep } from './onboarding-steps/connect-gmail-step'

type ProgressEntry = {
  step_key: string
  completed_at: string | null
  skipped: boolean
  data: Record<string, unknown>
}

export function OnboardingWizard() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState<ProgressEntry[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    loadProgress()

    // If returning from Gmail OAuth during onboarding, auto-complete the gmail step
    const gmailFlag = sessionStorage.getItem('onboarding_gmail_step')
    if (gmailFlag) {
      sessionStorage.removeItem('onboarding_gmail_step')
      completeStep('connect_gmail', { connected: true }).catch(() => {})
    }
  }, [])

  async function loadProgress() {
    try {
      const data = await getOnboardingProgress()
      setProgress(data as ProgressEntry[])
      // Find first incomplete step
      const doneKeys = new Set(data.map((p: ProgressEntry) => p.step_key))
      const firstIncomplete = WIZARD_STEPS.findIndex((s) => !doneKeys.has(s.key))
      if (firstIncomplete === -1) {
        setIsComplete(true)
      } else {
        setCurrentIndex(firstIncomplete)
      }
    } catch (err) {
      console.error('[onboarding] Failed to load progress', err)
    }
  }

  function handleComplete(data?: Record<string, unknown>) {
    const stepKey = WIZARD_STEPS[currentIndex].key
    const previousProgress = [...progress]

    // Optimistic update
    const newEntry: ProgressEntry = {
      step_key: stepKey,
      completed_at: new Date().toISOString(),
      skipped: false,
      data: data ?? {},
    }
    const updated = [...progress.filter((p) => p.step_key !== stepKey), newEntry]
    setProgress(updated)

    startTransition(async () => {
      try {
        const result = await completeStep(stepKey, data)
        if (!result.success) {
          setProgress(previousProgress)
          return
        }
        advanceStep()
      } catch (err) {
        console.error('[onboarding] Failed to complete step', err)
        setProgress(previousProgress)
      }
    })
  }

  function handleSkip() {
    const stepKey = WIZARD_STEPS[currentIndex].key
    const previousProgress = [...progress]

    const newEntry: ProgressEntry = {
      step_key: stepKey,
      completed_at: null,
      skipped: true,
      data: {},
    }
    const updated = [...progress.filter((p) => p.step_key !== stepKey), newEntry]
    setProgress(updated)

    startTransition(async () => {
      try {
        const result = await skipStep(stepKey)
        if (!result.success) {
          setProgress(previousProgress)
          return
        }
        advanceStep()
      } catch (err) {
        console.error('[onboarding] Failed to skip step', err)
        setProgress(previousProgress)
      }
    })
  }

  function advanceStep() {
    if (currentIndex >= WIZARD_STEPS.length - 1) {
      setIsComplete(true)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  function goBack() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
  }

  function goToStep(index: number) {
    setCurrentIndex(index)
    if (isComplete) setIsComplete(false)
  }

  const completedCount = progress.filter((p) => p.completed_at).length
  const percentComplete = Math.round((completedCount / WIZARD_STEPS.length) * 100)

  if (isComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="mx-auto max-w-lg text-center p-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-10 w-10 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">You're all set!</h1>
          <p className="mt-3 text-gray-600">
            Your ChefFlow account is ready to go. You just replaced 8 apps in 10 minutes.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <a
              href="/dashboard"
              className="rounded-md bg-orange-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-500"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  const currentStep = WIZARD_STEPS[currentIndex]

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Sidebar */}
      <div className="hidden w-72 border-r border-orange-200 bg-white/80 backdrop-blur-sm p-6 lg:block">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-900">ChefFlow Setup</h1>
          <p className="text-xs text-gray-500 mt-1">Replace 8 apps in 10 minutes</p>
        </div>

        <nav className="space-y-1">
          {WIZARD_STEPS.map((step, i) => {
            const entry = progress.find((p) => p.step_key === step.key)
            const isDone = !!entry?.completed_at
            const isSkipped = !!entry?.skipped
            const isCurrent = i === currentIndex

            return (
              <button
                key={step.key}
                onClick={() => goToStep(i)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  isCurrent
                    ? 'bg-orange-100 text-orange-900 font-medium'
                    : isDone
                      ? 'text-green-700 hover:bg-green-50'
                      : isSkipped
                        ? 'text-gray-400 hover:bg-gray-50'
                        : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    isCurrent
                      ? 'bg-orange-600 text-white'
                      : isDone
                        ? 'bg-green-100 text-green-700'
                        : isSkipped
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {isDone ? (
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="truncate">{step.title}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1">
        {/* Progress bar */}
        <div className="border-b border-orange-200 bg-white/60 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1.5">
            <span>
              Step {currentIndex + 1} of {WIZARD_STEPS.length}
            </span>
            <span>{percentComplete}% complete</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-orange-500 transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="mx-auto max-w-2xl px-6 py-10">
          {/* Mobile step indicator */}
          <div className="mb-6 lg:hidden">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{currentStep.title}</p>
          </div>

          {/* Back button */}
          {currentIndex > 0 && (
            <button
              onClick={goBack}
              disabled={isPending}
              className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
          )}

          {/* Render current step */}
          {currentStep.key === 'profile' && (
            <ProfileStep onComplete={handleComplete} onSkip={handleSkip} />
          )}
          {currentStep.key === 'connect_gmail' && (
            <ConnectGmailStep onComplete={handleComplete} onSkip={handleSkip} />
          )}
          {currentStep.key === 'first_event' && (
            <RedirectStep
              title="Create your first event"
              description="Set up an upcoming event, dinner, or booking to see how ChefFlow manages your workflow."
              href="/events"
              buttonLabel="Go to Events"
              onSkip={handleSkip}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Redirect step: sends user to the actual page to complete the task
function RedirectStep({
  title,
  description,
  href,
  buttonLabel,
  onSkip,
}: {
  title: string
  description: string
  href: string
  buttonLabel: string
  onSkip: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center space-y-3">
        <p className="text-sm text-gray-600">
          Complete this step from the main app. You can return to onboarding anytime.
        </p>
        <a
          href={href}
          className="inline-block rounded-md bg-orange-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          {buttonLabel}
        </a>
      </div>

      <div className="flex items-center justify-end pt-4">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
