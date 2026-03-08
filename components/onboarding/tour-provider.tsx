'use client'

// OnboardingTourProvider
// Wraps a portal layout to provide tour state (progress, current step, actions)
// to all child components via React context.
//
// Tour state (active flag, current step index, welcome seen) is persisted in
// localStorage so it survives the hard page navigations used during the tour.

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useTransition,
  useEffect,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import type { TourConfig, TourStep } from '@/lib/onboarding/tour-config'
import type { TourProgress } from '@/lib/onboarding/tour-actions'
import {
  completeStep as serverCompleteStep,
  completeMultipleSteps as serverCompleteMultipleSteps,
  markWelcomeSeen as serverMarkWelcomeSeen,
  dismissChecklist as serverDismissChecklist,
  dismissTour as serverDismissTour,
} from '@/lib/onboarding/tour-actions'

type TourContextValue = {
  // Config
  config: TourConfig
  // Progress
  completedSteps: Set<string>
  totalSteps: number
  completedCount: number
  progressPercent: number
  // Welcome modal
  showWelcome: boolean
  // Checklist
  showChecklist: boolean
  isChecklistDismissed: boolean
  // Tour (step-by-step spotlight)
  isTourActive: boolean
  currentTourStep: TourStep | null
  currentTourIndex: number
  // Actions
  completeStep: (stepId: string) => void
  markWelcomeSeen: () => void
  dismissChecklist: () => void
  startTour: () => void
  nextTourStep: () => void
  prevTourStep: () => void
  stopTour: () => void
  // Loading state
  isPending: boolean
}

const TourContext = createContext<TourContextValue | null>(null)

export function useTour() {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used within OnboardingTourProvider')
  return ctx
}

export function useTourOptional() {
  return useContext(TourContext)
}

type ProviderProps = {
  config: TourConfig
  initialProgress: TourProgress
  children: ReactNode
}

export function OnboardingTourProvider({ config, initialProgress, children }: ProviderProps) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  // Local state (optimistic, synced with server)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(initialProgress.completedSteps)
  )
  const [welcomeSeen, setWelcomeSeen] = useState(() => {
    if (initialProgress.welcomeSeenAt) return true
    // Also check localStorage (server action may not have persisted yet after hard nav)
    try {
      return localStorage.getItem('chefflow:welcome-seen') === '1'
    } catch {
      return false
    }
  })
  const [checklistDismissed, setChecklistDismissed] = useState(
    !!initialProgress.checklistDismissedAt
  )
  const [tourDismissed, setTourDismissed] = useState(!!initialProgress.tourDismissedAt)

  // Tour (step-by-step spotlight) state
  // Persisted in localStorage so it survives hard navigation between pages
  const [isTourActive, setIsTourActive] = useState(() => {
    try {
      return localStorage.getItem('chefflow:tour-active') === '1'
    } catch {
      return false
    }
  })
  const [currentTourIndex, setCurrentTourIndex] = useState(() => {
    try {
      const stored = localStorage.getItem('chefflow:tour-step')
      return stored ? parseInt(stored, 10) : 0
    } catch {
      return 0
    }
  })

  const totalSteps = config.steps.length
  const completedCount = config.steps.filter((s) => completedSteps.has(s.id)).length
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0
  const allComplete = completedCount === totalSteps

  // Show welcome if never seen, not all steps complete, and tour is not already active
  // (tour active from localStorage means we're mid-walkthrough after a page navigation)
  const showWelcome = !welcomeSeen && !allComplete && !isTourActive

  // Show checklist if welcome seen, not dismissed, not all complete, and tour isn't active
  const showChecklist = welcomeSeen && !checklistDismissed && !allComplete && !isTourActive

  // Current tour step
  const currentTourStep = isTourActive ? (config.steps[currentTourIndex] ?? null) : null

  // Auto-complete route-based steps
  useEffect(() => {
    const autoSteps = config.steps.filter(
      (s) =>
        s.autoComplete &&
        s.completionCheck?.type === 'route_visited' &&
        s.completionCheck.value &&
        pathname.startsWith(s.completionCheck.value) &&
        !completedSteps.has(s.id)
    )

    if (autoSteps.length > 0) {
      const ids = autoSteps.map((s) => s.id)
      setCompletedSteps((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
      startTransition(async () => {
        try {
          await serverCompleteMultipleSteps(ids)
        } catch {
          // Non-blocking side effect
          console.error('[tour] Failed to auto-complete steps', ids)
        }
      })
    }
  }, [pathname, config.steps, completedSteps])

  const completeStep = useCallback(
    (stepId: string) => {
      if (completedSteps.has(stepId)) return
      setCompletedSteps((prev) => new Set([...prev, stepId]))
      startTransition(async () => {
        try {
          await serverCompleteStep(stepId)
        } catch {
          console.error('[tour] Failed to complete step', stepId)
        }
      })
    },
    [completedSteps]
  )

  const handleMarkWelcomeSeen = useCallback(() => {
    setWelcomeSeen(true)
    try {
      localStorage.setItem('chefflow:welcome-seen', '1')
    } catch {
      /* ok */
    }
    startTransition(async () => {
      try {
        await serverMarkWelcomeSeen()
      } catch {
        console.error('[tour] Failed to mark welcome seen')
      }
    })
  }, [])

  const handleDismissChecklist = useCallback(() => {
    setChecklistDismissed(true)
    startTransition(async () => {
      try {
        await serverDismissChecklist()
      } catch {
        console.error('[tour] Failed to dismiss checklist')
      }
    })
  }, [])

  const startTour = useCallback(() => {
    // Find first incomplete step
    const firstIncomplete = config.steps.findIndex((s) => !completedSteps.has(s.id))
    const idx = firstIncomplete >= 0 ? firstIncomplete : 0
    setCurrentTourIndex(idx)
    setIsTourActive(true)
    try {
      localStorage.setItem('chefflow:tour-active', '1')
      localStorage.setItem('chefflow:tour-step', String(idx))
    } catch {
      /* ok */
    }
  }, [config.steps, completedSteps])

  const nextTourStep = useCallback(() => {
    const nextIdx = currentTourIndex + 1
    if (nextIdx >= config.steps.length) {
      setIsTourActive(false)
      try {
        localStorage.removeItem('chefflow:tour-active')
        localStorage.removeItem('chefflow:tour-step')
      } catch {
        /* ok */
      }
      return
    }
    setCurrentTourIndex(nextIdx)
    try {
      localStorage.setItem('chefflow:tour-step', String(nextIdx))
    } catch {
      /* ok */
    }
  }, [currentTourIndex, config.steps.length])

  const prevTourStep = useCallback(() => {
    setCurrentTourIndex((prev) => {
      const newIdx = Math.max(0, prev - 1)
      try {
        localStorage.setItem('chefflow:tour-step', String(newIdx))
      } catch {
        /* ok */
      }
      return newIdx
    })
  }, [])

  const stopTour = useCallback(() => {
    setIsTourActive(false)
    try {
      localStorage.removeItem('chefflow:tour-active')
      localStorage.removeItem('chefflow:tour-step')
    } catch {
      /* ok */
    }
    startTransition(async () => {
      try {
        await serverDismissTour()
      } catch {
        console.error('[tour] Failed to dismiss tour')
      }
    })
  }, [])

  return (
    <TourContext.Provider
      value={{
        config,
        completedSteps,
        totalSteps,
        completedCount,
        progressPercent,
        showWelcome,
        showChecklist,
        isChecklistDismissed: checklistDismissed,
        isTourActive,
        currentTourStep,
        currentTourIndex,
        completeStep,
        markWelcomeSeen: handleMarkWelcomeSeen,
        dismissChecklist: handleDismissChecklist,
        startTour,
        nextTourStep,
        prevTourStep,
        stopTour,
        isPending,
      }}
    >
      {children}
    </TourContext.Provider>
  )
}
