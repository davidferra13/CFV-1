'use client'

import { useState, useCallback, useMemo, useRef } from 'react'

// ─── Types ──────────────────────────────────────────────────────

export type StepKey = string

export type StepValidator<TData> = (data: TData) => boolean | string

export type StepConfig<TData> = {
  key: StepKey
  title: string
  /** Return true to pass, or a string error message to block */
  validate?: StepValidator<TData>
  /** If provided, step is only visible when this returns true */
  visible?: (data: TData) => boolean
}

export interface UseStepWizardOptions<TData extends Record<string, unknown>> {
  steps: StepConfig<TData>[]
  initialData?: TData
  /** Called when the wizard completes (last step validated + next) */
  onComplete?: (data: TData) => void | Promise<void>
  /** Called on every step change */
  onStepChange?: (stepKey: StepKey, stepIndex: number) => void
}

export interface UseStepWizardReturn<TData extends Record<string, unknown>> {
  /** All step configs (including hidden ones) */
  allSteps: StepConfig<TData>[]
  /** Only the currently visible steps */
  visibleSteps: StepConfig<TData>[]
  /** Current visible step index (0-based) */
  stepIndex: number
  /** Current step config */
  currentStep: StepConfig<TData>
  /** Total number of visible steps */
  totalSteps: number
  /** Shared wizard data */
  data: TData
  /** Update wizard data (shallow merge) */
  setData: (partial: Partial<TData>) => void
  /** Replace wizard data entirely */
  replaceData: (next: TData) => void
  /** Go to next step. Returns false if validation fails. */
  next: () => Promise<boolean>
  /** Go to previous step */
  prev: () => void
  /** Jump to a step by key. Skips validation. */
  goTo: (key: StepKey) => void
  /** Whether we can go forward (not on last step) */
  canGoNext: boolean
  /** Whether we can go back (not on first step) */
  canGoPrev: boolean
  /** Whether the wizard has been completed */
  isComplete: boolean
  /** Validation error for current step (null if valid) */
  validationError: string | null
  /** Set of step keys that have been visited */
  visitedSteps: Set<StepKey>
  /** Set of step keys whose validation passed */
  completedSteps: Set<StepKey>
  /** Whether the current step is the last visible step */
  isLastStep: boolean
  /** Whether the current step is the first visible step */
  isFirstStep: boolean
  /** Reset wizard to initial state */
  reset: () => void
}

// ─── Hook ───────────────────────────────────────────────────────

export function useStepWizard<TData extends Record<string, unknown>>(
  options: UseStepWizardOptions<TData>
): UseStepWizardReturn<TData> {
  const { steps: allSteps, initialData, onComplete, onStepChange } = options

  const [data, setDataRaw] = useState<TData>((initialData ?? {}) as TData)
  const [stepIndex, setStepIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [visitedSteps, setVisitedSteps] = useState<Set<StepKey>>(
    () => new Set(allSteps.length > 0 ? [allSteps[0].key] : [])
  )
  const [completedSteps, setCompletedSteps] = useState<Set<StepKey>>(new Set())

  // Ref to avoid stale closure in async onComplete
  const dataRef = useRef(data)
  dataRef.current = data

  // Compute visible steps based on current data
  const visibleSteps = useMemo(
    () => allSteps.filter((s) => !s.visible || s.visible(data)),
    [allSteps, data]
  )

  // Clamp stepIndex if steps were removed dynamically
  const clampedIndex = Math.min(stepIndex, Math.max(0, visibleSteps.length - 1))

  const currentStep = visibleSteps[clampedIndex] ?? visibleSteps[0]
  const totalSteps = visibleSteps.length
  const isLastStep = clampedIndex === totalSteps - 1
  const isFirstStep = clampedIndex === 0

  const setData = useCallback((partial: Partial<TData>) => {
    setDataRaw((prev) => ({ ...prev, ...partial }))
    setValidationError(null)
  }, [])

  const replaceData = useCallback((next: TData) => {
    setDataRaw(next)
    setValidationError(null)
  }, [])

  const validateCurrentStep = useCallback((): boolean => {
    if (!currentStep?.validate) return true
    const result = currentStep.validate(dataRef.current)
    if (result === true) {
      setValidationError(null)
      return true
    }
    setValidationError(
      typeof result === 'string' ? result : 'Please complete this step before continuing.'
    )
    return false
  }, [currentStep])

  const markStepCompleted = useCallback((key: StepKey) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }, [])

  const markStepVisited = useCallback((key: StepKey) => {
    setVisitedSteps((prev) => {
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }, [])

  const next = useCallback(async (): Promise<boolean> => {
    if (!validateCurrentStep()) return false

    markStepCompleted(currentStep.key)

    if (isLastStep) {
      setIsComplete(true)
      if (onComplete) {
        await onComplete(dataRef.current)
      }
      return true
    }

    const nextIndex = clampedIndex + 1
    const nextStep = visibleSteps[nextIndex]
    setStepIndex(nextIndex)
    setValidationError(null)
    if (nextStep) {
      markStepVisited(nextStep.key)
      onStepChange?.(nextStep.key, nextIndex)
    }
    return true
  }, [
    validateCurrentStep,
    markStepCompleted,
    currentStep,
    isLastStep,
    onComplete,
    clampedIndex,
    visibleSteps,
    markStepVisited,
    onStepChange,
  ])

  const prev = useCallback(() => {
    if (isFirstStep) return
    const prevIndex = clampedIndex - 1
    const prevStep = visibleSteps[prevIndex]
    setStepIndex(prevIndex)
    setValidationError(null)
    if (prevStep) {
      onStepChange?.(prevStep.key, prevIndex)
    }
  }, [isFirstStep, clampedIndex, visibleSteps, onStepChange])

  const goTo = useCallback(
    (key: StepKey) => {
      const idx = visibleSteps.findIndex((s) => s.key === key)
      if (idx === -1) return
      setStepIndex(idx)
      setValidationError(null)
      markStepVisited(key)
      onStepChange?.(key, idx)
    },
    [visibleSteps, markStepVisited, onStepChange]
  )

  const reset = useCallback(() => {
    setDataRaw((initialData ?? {}) as TData)
    setStepIndex(0)
    setIsComplete(false)
    setValidationError(null)
    setVisitedSteps(new Set(allSteps.length > 0 ? [allSteps[0].key] : []))
    setCompletedSteps(new Set())
  }, [allSteps, initialData])

  return {
    allSteps,
    visibleSteps,
    stepIndex: clampedIndex,
    currentStep,
    totalSteps,
    data,
    setData,
    replaceData,
    next,
    prev,
    goTo,
    canGoNext: !isLastStep,
    canGoPrev: !isFirstStep,
    isComplete,
    validationError,
    visitedSteps,
    completedSteps,
    isLastStep,
    isFirstStep,
    reset,
  }
}
