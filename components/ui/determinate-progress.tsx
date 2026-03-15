'use client'

// DeterminateProgress - A clear 0-100% progress bar that replaces
// indeterminate shimmer/pulse animations. Users always know how close
// to completion they are.
//
// Two modes:
//   1. Real progress: pass a `value` prop (0-100) from actual progress data
//   2. Simulated progress: pass a `contextId` or `expectedMs` and the bar
//      advances automatically using an asymptotic curve, snapping to 100%
//      when `complete` is called from the outside via ref or callback.
//
// Usage (real progress):
//   <DeterminateProgress value={uploadPercent} />
//
// Usage (simulated - auto-advancing):
//   <DeterminateProgress contextId="ai-allergen-check" isComplete={isDone} />
//
// Usage (with label):
//   <DeterminateProgress value={75} label="Extracting ingredients..." showPercent />

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSimulatedProgress } from '@/lib/loading/use-simulated-progress'

interface DeterminateProgressProps {
  /** Real progress value (0-100). When provided, simulation is disabled. */
  value?: number
  /** Loading context ID for simulated progress calibration */
  contextId?: string
  /** Expected duration in ms for simulated progress */
  expectedMs?: number
  /** Signal that the operation completed (triggers snap to 100%) */
  isComplete?: boolean
  /** Signal that the operation failed (freezes progress) */
  isFailed?: boolean
  /** Label text above the bar */
  label?: string
  /** Show percentage number */
  showPercent?: boolean
  /** Bar height */
  size?: 'xs' | 'sm' | 'md'
  /** Bar color (brand by default, red on failure) */
  variant?: 'brand' | 'success' | 'warning'
  /** Additional CSS classes */
  className?: string
}

export function DeterminateProgress({
  value: realValue,
  contextId,
  expectedMs,
  isComplete = false,
  isFailed = false,
  label,
  showPercent = true,
  size = 'sm',
  variant = 'brand',
  className,
}: DeterminateProgressProps) {
  const isSimulated = realValue === undefined
  const sim = useSimulatedProgress({
    contextId,
    expectedMs,
    active: isSimulated && !isComplete && !isFailed,
  })

  // Snap to 100% when isComplete changes
  useEffect(() => {
    if (isComplete && isSimulated) sim.complete()
  }, [isComplete, isSimulated, sim])

  // Freeze on failure
  useEffect(() => {
    if (isFailed && isSimulated) sim.fail()
  }, [isFailed, isSimulated, sim])

  const progress = isSimulated ? sim.progress : Math.min(100, Math.max(0, realValue ?? 0))
  const displayPercent = Math.round(progress)
  const done = displayPercent >= 100
  const failed = isFailed || sim.isFailed

  const heightClasses = {
    xs: 'h-0.5',
    sm: 'h-1.5',
    md: 'h-2.5',
  }

  const colorClasses = failed
    ? 'bg-red-500'
    : done
      ? 'bg-emerald-500'
      : variant === 'brand'
        ? 'bg-brand-500'
        : variant === 'success'
          ? 'bg-emerald-500'
          : 'bg-amber-500'

  const trackColor = failed ? 'bg-red-500/10' : 'bg-stone-700'

  return (
    <div
      className={cn('w-full', className)}
      role="progressbar"
      aria-valuenow={displayPercent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Label row */}
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span
              className={cn(
                'text-xs font-medium truncate',
                failed ? 'text-red-400' : done ? 'text-emerald-400' : 'text-stone-300'
              )}
            >
              {failed ? label : done ? 'Complete' : label}
            </span>
          )}
          {showPercent && (
            <span
              className={cn(
                'text-xs tabular-nums ml-2 shrink-0',
                failed ? 'text-red-400' : done ? 'text-emerald-400' : 'text-stone-400'
              )}
            >
              {failed ? 'Failed' : `${displayPercent}%`}
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div className={cn('w-full rounded-full overflow-hidden', trackColor, heightClasses[size])}>
        {/* Fill */}
        <div
          className={cn(
            'h-full rounded-full transition-all ease-out',
            colorClasses,
            // Smooth transition normally, instant snap to 100%
            done ? 'duration-300' : 'duration-150'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
