'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
import { ServiceCurrentStep } from '@/components/mobile/service-current-step'
import { ServiceStepList } from '@/components/mobile/service-step-list'
import { ServiceAdvanceButton } from '@/components/mobile/service-advance-button'
import { advanceStep } from '@/lib/mobile/service-ticker-actions'
import type { ServiceTimeline, ServiceStep } from '@/lib/mobile/service-ticker'

interface ServiceTickerClientProps {
  initialTimeline: ServiceTimeline
}

export function ServiceTickerClient({ initialTimeline }: ServiceTickerClientProps) {
  const [timeline, setTimeline] = useState(initialTimeline)
  const [, startTransition] = useTransition()

  // Wake Lock API: keep screen on during service
  useEffect(() => {
    let wakeLock: any = null

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen')
        }
      } catch {
        // Wake Lock not supported or denied; non-blocking
      }
    }

    requestWakeLock()

    // Re-acquire on visibility change (lock releases when tab is hidden)
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      wakeLock?.release?.().catch(() => {})
    }
  }, [])

  const currentStep = timeline.steps[timeline.currentStepIndex] as ServiceStep | undefined
  const completedSteps = timeline.steps.filter((s) => s.status === 'completed')
  const upcomingSteps = timeline.steps.filter((s) => s.status === 'pending')
  const isLastStep = timeline.currentStepIndex === timeline.steps.length - 1
  const allComplete = !currentStep

  // Get the previous completed step's timestamp for elapsed timer
  const previousCompletedAt =
    completedSteps.length > 0
      ? completedSteps[completedSteps.length - 1].completedAt
      : null

  const handleAdvance = useCallback(() => {
    if (!currentStep) return

    const stepId = currentStep.id
    const now = new Date().toISOString()

    // Optimistic update
    setTimeline((prev) => {
      const newSteps = prev.steps.map((s) => {
        if (s.id === stepId) {
          return { ...s, status: 'completed' as const, completedAt: now }
        }
        return s
      })

      // Find and activate next step
      const completedIndex = newSteps.findIndex((s) => s.id === stepId)
      if (completedIndex >= 0 && completedIndex < newSteps.length - 1) {
        const nextIndex = completedIndex + 1
        newSteps[nextIndex] = { ...newSteps[nextIndex], status: 'active' as const }
      }

      const newCompleted = newSteps.filter((s) => s.status === 'completed').length
      const newCurrentIndex = newSteps.findIndex((s) => s.status === 'active')

      return {
        ...prev,
        steps: newSteps,
        completedSteps: newCompleted,
        currentStepIndex: newCurrentIndex >= 0 ? newCurrentIndex : newSteps.length,
      }
    })

    // Server sync
    startTransition(async () => {
      try {
        await advanceStep(timeline.eventId, stepId)
      } catch (err) {
        console.error('[ServiceTicker] Advance failed:', err)
        // Rollback
        setTimeline((prev) => {
          const newSteps = prev.steps.map((s, i) => {
            if (s.id === stepId) {
              return { ...s, status: 'active' as const, completedAt: null }
            }
            // Revert the one after to pending
            if (i === prev.currentStepIndex + 1 && s.status === 'active') {
              return { ...s, status: 'pending' as const }
            }
            return s
          })
          const newCurrentIndex = newSteps.findIndex((s) => s.id === stepId)
          return {
            ...prev,
            steps: newSteps,
            completedSteps: prev.completedSteps,
            currentStepIndex: newCurrentIndex >= 0 ? newCurrentIndex : prev.currentStepIndex,
          }
        })
      }
    })
  }, [currentStep, timeline.eventId])

  // All steps complete
  if (allComplete) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-6">{'\u2705'}</div>
        <h1 className="text-3xl font-black text-emerald-400 mb-2">SERVICE COMPLETE</h1>
        <p className="text-stone-400 text-lg mb-8">
          {timeline.completedSteps} steps completed
        </p>
        <a
          href={`/events/${timeline.eventId}`}
          className="px-6 py-3 bg-stone-800 text-stone-300 rounded-lg text-base font-medium active:bg-stone-700"
        >
          Back to Event
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Minimal header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800/50">
        <a
          href={`/events/${timeline.eventId}`}
          title="Back to event"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-900 active:bg-stone-800"
        >
          <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="sr-only">Back to event</span>
        </a>
        <div className="text-center">
          <div className="text-sm font-medium text-stone-300 truncate max-w-[200px]">
            {timeline.eventName}
          </div>
          <div className="text-xs text-stone-500">
            {timeline.clientName && `${timeline.clientName} \u00B7 `}
            {timeline.guestCount} guests
          </div>
        </div>
        <div className="text-xs text-stone-500 font-mono tabular-nums w-10 text-right">
          {timeline.completedSteps}/{timeline.totalSteps}
        </div>
      </div>

      {/* Completed steps (scrollable, top) */}
      {completedSteps.length > 0 && (
        <div className="max-h-32 overflow-y-auto border-b border-stone-800/30 py-2">
          <ServiceStepList steps={completedSteps} variant="completed" />
        </div>
      )}

      {/* Current step (center, dominant) */}
      <div className="flex-1 flex items-center justify-center">
        {currentStep && (
          <ServiceCurrentStep
            step={currentStep}
            previousCompletedAt={previousCompletedAt}
          />
        )}
      </div>

      {/* Upcoming steps */}
      {upcomingSteps.length > 0 && (
        <div className="max-h-28 overflow-y-auto border-t border-stone-800/30 py-2">
          <ServiceStepList steps={upcomingSteps} variant="upcoming" />
        </div>
      )}

      {/* Advance button */}
      <ServiceAdvanceButton onAdvance={handleAdvance} isLastStep={isLastStep} />
    </div>
  )
}
