'use client'

// StepProgress - Multi-step progress indicator for long operations.
// Shows which phase of a multi-phase operation is active, with context
// messages per step. Designed for recipe import, Gmail sync, contract
// generation, brain dump parsing, and similar multi-stage flows.
//
// Usage:
//   const steps = [
//     { label: 'Parsing recipe text', status: 'completed' },
//     { label: 'Extracting ingredients', status: 'active' },
//     { label: 'Saving to recipe book', status: 'pending' },
//   ]
//   <StepProgress steps={steps} />
//
// Or with the hook for automatic progression:
//   const { steps, advance, fail } = useStepProgress([
//     'Parsing recipe text',
//     'Extracting ingredients',
//     'Saving to recipe book',
//   ])
//   // Call advance() as each step completes
//   // Call fail('reason') if a step fails

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────

export type StepStatus = 'pending' | 'active' | 'completed' | 'failed'

export interface Step {
  label: string
  status: StepStatus
  /** Optional detail message shown below the label when active */
  detail?: string
}

// ─── Component ───────────────────────────────────────────────────

interface StepProgressProps {
  steps: Step[]
  /** Show Remy mascot above the steps */
  showRemy?: boolean
  /** Show elapsed time */
  showElapsed?: boolean
  /** Compact mode for inline use */
  compact?: boolean
  className?: string
}

export function StepProgress({
  steps,
  showRemy = false,
  showElapsed = false,
  compact = false,
  className,
}: StepProgressProps) {
  const completedCount = steps.filter((s) => s.status === 'completed').length
  const activeStep = steps.find((s) => s.status === 'active')
  const failedStep = steps.find((s) => s.status === 'failed')
  const progressPercent = (completedCount / steps.length) * 100
  const done = completedCount === steps.length

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'gap-3 py-4' : 'gap-4 py-8',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={activeStep?.label ?? failedStep?.label ?? 'Processing'}
    >
      {/* Remy mascot */}
      {showRemy && !compact && (
        <div className="relative">
          <div className="absolute inset-0 -m-3 rounded-full bg-brand-500/8 blur-xl" />
          <Image
            src="/images/remy/remy-idle.png"
            alt=""
            width={56}
            height={56}
            className="relative animate-mascot-bob opacity-90"
            priority
          />
        </div>
      )}

      {/* Overall progress bar with percentage */}
      <div className="w-full max-w-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span
            className={cn(
              'text-xs font-medium',
              failedStep ? 'text-red-400' : done ? 'text-emerald-400' : 'text-stone-300'
            )}
          >
            {failedStep
              ? `Failed at step ${steps.indexOf(failedStep) + 1}`
              : done
                ? 'Complete'
                : `Step ${Math.min(completedCount + 1, steps.length)} of ${steps.length}`}
          </span>
          <span
            className={cn(
              'text-xs tabular-nums',
              failedStep ? 'text-red-400' : done ? 'text-emerald-400' : 'text-stone-400'
            )}
          >
            {failedStep ? 'Failed' : `${Math.round(progressPercent)}%`}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-stone-700 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all ease-out',
              failedStep
                ? 'bg-red-500 duration-300'
                : done
                  ? 'bg-emerald-500 duration-300'
                  : 'bg-brand-500 duration-500'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className={cn('w-full max-w-xs', compact ? 'space-y-1.5' : 'space-y-2')}>
        {steps.map((step, i) => (
          <StepRow key={i} step={step} compact={compact} />
        ))}
      </div>

      {/* Elapsed timer */}
      {showElapsed && <ElapsedTimer />}
    </div>
  )
}

// ─── Step Row ────────────────────────────────────────────────────

function StepRow({ step, compact }: { step: Step; compact: boolean }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 text-left transition-opacity duration-200',
        step.status === 'pending' && 'opacity-40',
        step.status === 'active' && 'opacity-100',
        step.status === 'completed' && 'opacity-60',
        step.status === 'failed' && 'opacity-100'
      )}
    >
      {/* Status indicator */}
      <div className="mt-0.5 shrink-0">
        {step.status === 'completed' ? (
          <CheckIcon />
        ) : step.status === 'active' ? (
          <ActiveDot />
        ) : step.status === 'failed' ? (
          <FailedIcon />
        ) : (
          <PendingDot />
        )}
      </div>

      {/* Label + detail */}
      <div className="min-w-0">
        <p
          className={cn(
            compact ? 'text-xs' : 'text-sm',
            step.status === 'active' && 'text-stone-200 font-medium',
            step.status === 'completed' && 'text-stone-400 line-through',
            step.status === 'failed' && 'text-red-400 font-medium',
            step.status === 'pending' && 'text-stone-500'
          )}
        >
          {step.label}
        </p>
        {step.detail && step.status === 'active' && (
          <p className="text-xs text-stone-400 mt-0.5 animate-fade-slide-up">{step.detail}</p>
        )}
        {step.detail && step.status === 'failed' && (
          <p className="text-xs text-red-400/70 mt-0.5">{step.detail}</p>
        )}
      </div>
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-brand-400" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 8l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ActiveDot() {
  return (
    <div className="relative w-4 h-4 flex items-center justify-center">
      <div className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-pulse" />
      <div className="absolute w-4 h-4 rounded-full border-2 border-brand-400/30 animate-ping" />
    </div>
  )
}

function FailedIcon() {
  return (
    <svg className="w-4 h-4 text-red-400" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PendingDot() {
  return (
    <div className="w-4 h-4 flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-stone-600" />
    </div>
  )
}

// ─── Elapsed Timer ───────────────────────────────────────────────

function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0)

  // Using a ref-free approach since this is display-only
  useState(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  })

  if (elapsed < 3) return null

  return <p className="text-xs text-stone-500 tabular-nums">{elapsed}s elapsed</p>
}

// ─── Hook for automatic step progression ─────────────────────────

interface UseStepProgressReturn {
  steps: Step[]
  /** Mark current active step as completed, advance to next */
  advance: (detail?: string) => void
  /** Mark current active step as failed */
  fail: (reason?: string) => void
  /** Reset all steps to initial state */
  reset: () => void
  /** Whether all steps are completed */
  isDone: boolean
  /** Whether any step has failed */
  hasFailed: boolean
  /** The currently active step index (-1 if none) */
  activeIndex: number
}

export function useStepProgress(labels: string[]): UseStepProgressReturn {
  const [steps, setSteps] = useState<Step[]>(() =>
    labels.map((label, i) => ({
      label,
      status: i === 0 ? 'active' : 'pending',
    }))
  )

  const activeIndex = steps.findIndex((s) => s.status === 'active')
  const isDone = steps.every((s) => s.status === 'completed')
  const hasFailed = steps.some((s) => s.status === 'failed')

  const advance = useCallback((detail?: string) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.status === 'active')
      if (idx === -1) return prev
      return prev.map((s, i) => {
        if (i === idx) return { ...s, status: 'completed' as StepStatus }
        if (i === idx + 1) return { ...s, status: 'active' as StepStatus, detail }
        return s
      })
    })
  }, [])

  const fail = useCallback((reason?: string) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.status === 'active')
      if (idx === -1) return prev
      return prev.map((s, i) => {
        if (i === idx) return { ...s, status: 'failed' as StepStatus, detail: reason }
        return s
      })
    })
  }, [])

  const reset = useCallback(() => {
    setSteps(
      labels.map((label, i) => ({
        label,
        status: i === 0 ? 'active' : ('pending' as StepStatus),
      }))
    )
  }, [labels])

  return { steps, advance, fail, reset, isDone, hasFailed, activeIndex }
}
