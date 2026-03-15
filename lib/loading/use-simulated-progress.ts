'use client'

// useSimulatedProgress - Determinate progress simulation for async operations.
//
// Problem: Most async operations (DB reads, AI calls, PDF generation) don't
// report real progress. But indeterminate loaders (shimmer, spin) give users
// zero information about completion. Users can't tell 10% from 90%.
//
// Solution: Simulate progress using an asymptotic curve calibrated to the
// expected duration. The bar advances quickly at first (perceived responsiveness),
// slows as it approaches ~90% (never overshoots), and snaps to 100% when the
// operation actually completes.
//
// The curve: progress = maxBefore * (1 - e^(-k * elapsed))
//   - Fast start: jumps to ~30% in the first 20% of expected time
//   - Gradual middle: crawls through 30-70% (the "working" phase)
//   - Asymptotic cap: approaches but never reaches maxBefore (default 92%)
//   - Snap to 100%: only when complete() is called
//
// Usage:
//   const { progress, complete, reset } = useSimulatedProgress({
//     expectedMs: 5000,  // how long we expect the operation to take
//   })
//   // Start an async operation - progress begins automatically
//   await doSomething()
//   complete()  // snaps to 100%
//
// Or with the registry:
//   const { progress, complete } = useSimulatedProgress({ contextId: 'ai-allergen-check' })

import { useState, useEffect, useCallback, useRef } from 'react'
import { getLoadingContext } from '@/lib/loading/loading-registry'

// Expected durations in ms for each duration category
const DURATION_MS: Record<string, number> = {
  instant: 300,
  short: 1500,
  medium: 5000,
  long: 15000,
}

interface UseSimulatedProgressOptions {
  /** Expected duration in ms (takes priority over contextId) */
  expectedMs?: number
  /** Loading context ID - derives expectedMs from registry */
  contextId?: string
  /** Maximum progress before complete() is called (default 92) */
  maxBefore?: number
  /** Whether the progress is currently active (default true) */
  active?: boolean
  /** Tick interval in ms (default 100) */
  tickMs?: number
}

interface UseSimulatedProgressReturn {
  /** Current progress value (0-100) */
  progress: number
  /** Call when the operation actually finishes - snaps to 100% */
  complete: () => void
  /** Call if the operation fails - freezes at current value */
  fail: () => void
  /** Reset to 0 for reuse */
  reset: () => void
  /** Whether complete() has been called */
  isComplete: boolean
  /** Whether fail() has been called */
  isFailed: boolean
}

export function useSimulatedProgress(
  options: UseSimulatedProgressOptions = {}
): UseSimulatedProgressReturn {
  const {
    expectedMs: expectedMsOverride,
    contextId,
    maxBefore = 92,
    active = true,
    tickMs = 100,
  } = options

  // Resolve expected duration
  const ctx = contextId ? getLoadingContext(contextId) : undefined
  const expectedMs = expectedMsOverride ?? (ctx ? DURATION_MS[ctx.expectedDuration] : 3000)

  // Rate constant: calibrated so we reach ~63% of maxBefore at expectedMs
  // k = -ln(1 - 0.63) / expectedMs = ~1.0 / expectedMs
  const k = 1.0 / expectedMs

  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [isFailed, setIsFailed] = useState(false)
  const startTime = useRef(Date.now())
  const rafId = useRef<ReturnType<typeof setInterval> | null>(null)

  // Advance progress on a tick
  useEffect(() => {
    if (!active || isComplete || isFailed) return

    startTime.current = Date.now()

    rafId.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current
      // Asymptotic curve: fast start, slow approach to maxBefore
      const raw = maxBefore * (1 - Math.exp(-k * elapsed))
      setProgress(Math.min(raw, maxBefore))
    }, tickMs)

    return () => {
      if (rafId.current) clearInterval(rafId.current)
    }
  }, [active, isComplete, isFailed, k, maxBefore, tickMs])

  const complete = useCallback(() => {
    if (rafId.current) clearInterval(rafId.current)
    setIsComplete(true)
    // Animate to 100% over 300ms
    setProgress(100)
  }, [])

  const fail = useCallback(() => {
    if (rafId.current) clearInterval(rafId.current)
    setIsFailed(true)
  }, [])

  const reset = useCallback(() => {
    if (rafId.current) clearInterval(rafId.current)
    setProgress(0)
    setIsComplete(false)
    setIsFailed(false)
    startTime.current = Date.now()
  }, [])

  return { progress, complete, fail, reset, isComplete, isFailed }
}
