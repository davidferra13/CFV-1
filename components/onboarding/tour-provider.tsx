'use client'

// OnboardingTourProvider
// Wraps a portal layout to provide tour state (progress, current step, actions)
// to all child components via React context.

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
    // Client-side fallback: survives full-page navigations that race the server write
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cf-welcome-seen') === '1'
    }
    return false
  })
  const [checklistDismissed, setChecklistDismissed] = useState(
    !!initialProgress.checklistDismissedAt
  )
  const [tourDismissed, setTourDismissed] = useState(!!initialProgress.tourDismissedAt)

  // Tour (step-by-step spotlight) state
  const [isTourActive, setIsTourActive] = useState(false)
  const [currentTourIndex, setCurrentTourIndex] = useState(0)

  const totalSteps = config.steps.length
  const completedCount = config.steps.filter((s) => completedSteps.has(s.id)).length
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0
  const allComplete = completedCount === totalSteps

  // Show welcome if never seen and not all steps complete
  const showWelcome = !welcomeSeen && !allComplete

  // Show checklist if welcome seen, not dismissed, and not all complete
  const showChecklist = welcomeSeen && !checklistDismissed && !allComplete

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

  // Clean up localStorage fallback once server confirms the write.
  // This ensures resetTourProgress() can correctly re-show the modal.
  useEffect(() => {
    if (initialProgress.welcomeSeenAt && typeof window !== 'undefined') {
      localStorage.removeItem('cf-welcome-seen')
    }
  }, [initialProgress.welcomeSeenAt])

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
    // Persist immediately to survive full-page navigations (race condition protection)
    if (typeof window !== 'undefined') {
      localStorage.setItem('cf-welcome-seen', '1')
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
    setCurrentTourIndex(firstIncomplete >= 0 ? firstIncomplete : 0)
    setIsTourActive(true)
  }, [config.steps, completedSteps])

  const nextTourStep = useCallback(() => {
    const nextIdx = currentTourIndex + 1
    if (nextIdx >= config.steps.length) {
      setIsTourActive(false)
      return
    }
    setCurrentTourIndex(nextIdx)
  }, [currentTourIndex, config.steps.length])

  const prevTourStep = useCallback(() => {
    setCurrentTourIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const stopTour = useCallback(() => {
    setIsTourActive(false)
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
