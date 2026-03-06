'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { dismissBetaChecklist, type BetaChecklist } from '@/lib/beta/onboarding-actions'

interface BetaOnboardingChecklistProps {
  discountPercent: number
  checklist: BetaChecklist | null
  stepsCompleted: number
  totalSteps: number
  chefName?: string
}

type StepConfig = {
  key: string
  label: string
  description: string
  href: string
  completedAt: string | null
}

export function BetaOnboardingChecklist({
  discountPercent,
  checklist,
  stepsCompleted,
  totalSteps,
  chefName,
}: BetaOnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(!!checklist?.dismissedAt)
  const [isPending, startTransition] = useTransition()

  if (dismissed) return null

  const allComplete = stepsCompleted === totalSteps

  const steps: StepConfig[] = [
    {
      key: 'taste_profile',
      label: 'Set up your taste profile',
      description:
        'Tell us about your dietary preferences, allergies, and favorite cuisines so we can personalize your experience.',
      href: '/my-profile',
      completedAt: checklist?.tasteProfileCompletedAt ?? null,
    },
    {
      key: 'circle_created',
      label: 'Create your dinner circle',
      description:
        'Invite the people who usually join your dinners. They can join with or without an account.',
      href: '/my-hub/create',
      completedAt: checklist?.circleCreatedAt ?? null,
    },
    {
      key: 'circle_members',
      label: 'Your circle fills out their profiles',
      description:
        "Once your crew shares their preferences, we will have everyone's dietary info ready before you book.",
      href: '/my-hub',
      completedAt: checklist?.circleMembersInvitedAt ?? null,
    },
    {
      key: 'first_event',
      label: 'Book your first event',
      description:
        "Ready to eat? Book your first dinner and your circle's info will be included automatically.",
      href: '/book-now',
      completedAt: checklist?.firstEventBookedAt ?? null,
    },
    {
      key: 'post_review',
      label: 'Tell us how dinner went',
      description:
        'After your dinner, share a quick review. Your feedback helps us improve the experience.',
      href: '/my-events',
      completedAt: checklist?.postEventReviewAt ?? null,
    },
  ]

  const progressPercent = totalSteps > 0 ? Math.round((stepsCompleted / totalSteps) * 100) : 0

  function handleDismiss() {
    const previous = dismissed
    setDismissed(true)
    startTransition(async () => {
      try {
        await dismissBetaChecklist()
      } catch {
        setDismissed(previous)
      }
    })
  }

  return (
    <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/20">
      {/* Subtle glow accent */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />

      <CardContent className="relative p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-stone-100">Welcome to the Beta!</h3>
              <Badge variant="warning">{discountPercent}% OFF</Badge>
            </div>
            <p className="text-sm text-stone-400">
              Your {discountPercent}% beta tester discount is already applied to every booking. Here
              is a quick guide to get the most out of your experience
              {chefName ? ` with ${chefName}` : ''}.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="ml-4 shrink-0 text-xs text-stone-500 hover:text-stone-300 transition-colors"
            title="Dismiss checklist"
          >
            Dismiss
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-stone-400">
              {allComplete
                ? 'All done! You are a pro.'
                : `${stepsCompleted} of ${totalSteps} completed`}
            </span>
            <span className="font-medium text-amber-400">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isComplete = !!step.completedAt
            const isNext = !isComplete && steps.slice(0, index).every((s) => !!s.completedAt)

            return (
              <div
                key={step.key}
                className={`group flex items-start gap-3 rounded-lg border p-3 transition-all ${
                  isComplete
                    ? 'border-emerald-800/40 bg-emerald-950/20'
                    : isNext
                      ? 'border-amber-600/40 bg-amber-950/10 hover:border-amber-500/60'
                      : 'border-stone-800 bg-stone-900/40'
                }`}
              >
                {/* Check circle */}
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                    isComplete
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : isNext
                        ? 'border-amber-500 text-amber-500'
                        : 'border-stone-600 text-stone-600'
                  }`}
                >
                  {isComplete ? (
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm font-medium ${
                        isComplete ? 'text-emerald-400 line-through' : 'text-stone-200'
                      }`}
                    >
                      {step.label}
                    </p>
                    {!isComplete && isNext && (
                      <Link href={step.href}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 text-xs text-amber-400 hover:text-amber-300"
                        >
                          Start
                        </Button>
                      </Link>
                    )}
                    {isComplete && <span className="shrink-0 text-xs text-emerald-500">Done</span>}
                  </div>
                  <p
                    className={`mt-0.5 text-xs ${isComplete ? 'text-stone-500' : 'text-stone-400'}`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Completion celebration */}
        {allComplete && (
          <div className="mt-4 rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4 text-center">
            <p className="text-sm font-medium text-emerald-400">
              You have completed everything! Thank you for being an amazing beta tester.
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Your {discountPercent}% discount continues on all future bookings during the beta
              period.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
