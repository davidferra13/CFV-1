'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import type { TourConfig, TourStep, TourViewport } from '@/lib/onboarding/tour-config'
import type { TourProgress } from '@/lib/onboarding/tour-actions'
import {
  completeStep as serverCompleteStep,
  markWelcomeSeen as serverMarkWelcomeSeen,
  dismissChecklist as serverDismissChecklist,
  dismissTour as serverDismissTour,
} from '@/lib/onboarding/tour-actions'
import { getTourStorageKeys } from '@/lib/onboarding/tour-storage'

type TourContextValue = {
  config: TourConfig
  completedSteps: Set<string>
  blockedSteps: Set<string>
  totalSteps: number
  completedCount: number
  progressPercent: number
  showWelcome: boolean
  showChecklist: boolean
  isChecklistDismissed: boolean
  isTourActive: boolean
  currentTourStep: TourStep | null
  currentTourIndex: number
  completeStep: (stepId: string) => void
  blockStep: (stepId: string) => void
  markWelcomeSeen: () => void
  dismissChecklist: () => void
  startTour: (stepId?: string) => void
  nextTourStep: () => void
  prevTourStep: () => void
  stopTour: () => void
  isPending: boolean
}

const TourContext = createContext<TourContextValue | null>(null)

function getViewport(): TourViewport {
  if (typeof window === 'undefined') return 'desktop'
  return window.innerWidth < 1024 ? 'mobile' : 'desktop'
}

function matchesViewport(step: TourStep, viewport: TourViewport) {
  return !step.viewport || step.viewport === 'any' || step.viewport === viewport
}

function readStorage(key: string) {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  if (typeof window === 'undefined') return
  try {
    console.log('[tour] storage:set', {
      key,
      value,
      pathname: window.location.pathname,
    })
    window.localStorage.setItem(key, value)
  } catch {
    // Non-blocking.
  }
}

function removeStorage(key: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Non-blocking.
  }
}

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
  const [isPending, startTransition] = useTransition()
  const storageKeys = useMemo(() => getTourStorageKeys(config.role), [config.role])
  const [viewport, setViewport] = useState<TourViewport>(getViewport)
  const [blockedSteps, setBlockedSteps] = useState<Set<string>>(new Set())

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(initialProgress.completedSteps)
  )
  const [welcomeSeen, setWelcomeSeen] = useState(() => {
    if (initialProgress.welcomeSeenAt) return true
    return readStorage(storageKeys.welcomeSeen) === '1'
  })
  const [checklistDismissed, setChecklistDismissed] = useState(
    !!initialProgress.checklistDismissedAt
  )
  const [isTourActive, setIsTourActive] = useState(
    () => readStorage(storageKeys.tourActive) === '1'
  )
  const [currentTourIndex, setCurrentTourIndex] = useState(() => {
    const stored = readStorage(storageKeys.tourStep)
    if (!stored) return 0
    const parsed = Number.parseInt(stored, 10)
    return Number.isFinite(parsed) ? parsed : 0
  })

  useEffect(() => {
    const syncViewport = () => setViewport(getViewport())
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  const steps = useMemo(
    () =>
      config.steps.filter((step) => !blockedSteps.has(step.id) && matchesViewport(step, viewport)),
    [blockedSteps, config.steps, viewport]
  )

  useEffect(() => {
    const storedStep = readStorage(storageKeys.tourStep)
    const storedActive = readStorage(storageKeys.tourActive)
    console.log('[tour] provider-state', {
      role: config.role,
      currentTourIndex,
      currentTourStepId: steps[currentTourIndex]?.id ?? null,
      isTourActive,
      storedStep,
      storedActive,
    })
  }, [
    config.role,
    currentTourIndex,
    isTourActive,
    steps,
    storageKeys.tourActive,
    storageKeys.tourStep,
  ])

  const totalSteps = steps.length
  const completedCount = steps.filter((step) => completedSteps.has(step.id)).length
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0
  const allComplete = totalSteps === 0 || completedCount === totalSteps

  useEffect(() => {
    if (!isTourActive) return

    if (steps.length === 0) {
      setIsTourActive(false)
      removeStorage(storageKeys.tourActive)
      removeStorage(storageKeys.tourStep)
      return
    }

    setCurrentTourIndex((prev) => {
      const next = Math.min(prev, steps.length - 1)
      if (next !== prev) {
        writeStorage(storageKeys.tourStep, String(next))
      }
      return next
    })
  }, [isTourActive, steps.length, storageKeys.tourActive, storageKeys.tourStep])

  const currentTourStep = isTourActive ? (steps[currentTourIndex] ?? null) : null
  const effectiveConfig = useMemo(() => ({ ...config, steps }), [config, steps])

  const showWelcome = !welcomeSeen && !allComplete && !isTourActive
  const showChecklist = welcomeSeen && !checklistDismissed && !allComplete && !isTourActive

  const completeStep = useCallback(
    (stepId: string) => {
      if (completedSteps.has(stepId)) return

      setCompletedSteps((prev) => {
        const next = new Set(prev)
        next.add(stepId)
        return next
      })

      startTransition(async () => {
        try {
          console.log('[tour] completeStep:start', { role: config.role, stepId })
          await serverCompleteStep(stepId)
          console.log('[tour] completeStep:done', { role: config.role, stepId })
        } catch {
          console.error('[tour] Failed to complete step', stepId)
        }
      })
    },
    [completedSteps, config.role]
  )

  const blockStep = useCallback((stepId: string) => {
    setBlockedSteps((prev) => {
      if (prev.has(stepId)) return prev
      const next = new Set(prev)
      next.add(stepId)
      return next
    })
  }, [])

  const markWelcomeSeen = useCallback(() => {
    setWelcomeSeen(true)
    writeStorage(storageKeys.welcomeSeen, '1')

    startTransition(async () => {
      try {
        await serverMarkWelcomeSeen()
      } catch {
        console.error('[tour] Failed to mark welcome seen')
      }
    })
  }, [storageKeys.welcomeSeen])

  const dismissChecklist = useCallback(() => {
    setChecklistDismissed(true)

    startTransition(async () => {
      try {
        await serverDismissChecklist()
      } catch {
        console.error('[tour] Failed to dismiss checklist')
      }
    })
  }, [])

  const startTour = useCallback(
    (stepId?: string) => {
      const requestedIndex = stepId ? steps.findIndex((step) => step.id === stepId) : -1
      const firstIncompleteIndex = steps.findIndex((step) => !completedSteps.has(step.id))
      const idx =
        requestedIndex >= 0 ? requestedIndex : firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0

      setCurrentTourIndex(idx)
      setIsTourActive(true)
      writeStorage(storageKeys.tourActive, '1')
      writeStorage(storageKeys.tourStep, String(idx))
    },
    [completedSteps, steps, storageKeys.tourActive, storageKeys.tourStep]
  )

  const nextTourStep = useCallback(() => {
    const nextIdx = currentTourIndex + 1
    console.log('[tour] nextTourStep', {
      role: config.role,
      currentTourIndex,
      nextIdx,
      totalSteps: steps.length,
    })
    if (nextIdx >= steps.length) {
      setIsTourActive(false)
      removeStorage(storageKeys.tourActive)
      removeStorage(storageKeys.tourStep)
      return
    }

    setCurrentTourIndex(nextIdx)
    writeStorage(storageKeys.tourStep, String(nextIdx))
  }, [currentTourIndex, steps.length, storageKeys.tourActive, storageKeys.tourStep])

  const prevTourStep = useCallback(() => {
    setCurrentTourIndex((prev) => {
      const next = Math.max(0, prev - 1)
      writeStorage(storageKeys.tourStep, String(next))
      return next
    })
  }, [storageKeys.tourStep])

  const stopTour = useCallback(() => {
    setIsTourActive(false)
    removeStorage(storageKeys.tourActive)
    removeStorage(storageKeys.tourStep)

    startTransition(async () => {
      try {
        await serverDismissTour()
      } catch {
        console.error('[tour] Failed to dismiss tour')
      }
    })
  }, [storageKeys.tourActive, storageKeys.tourStep])

  return (
    <TourContext.Provider
      value={{
        config: effectiveConfig,
        completedSteps,
        blockedSteps,
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
        blockStep,
        markWelcomeSeen,
        dismissChecklist,
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
