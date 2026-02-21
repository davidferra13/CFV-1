'use client'

import { useRef, useCallback, useState } from 'react'

/**
 * Throttle a callback — fires at most once per intervalMs.
 * Useful for preventing duplicate form submissions or rapid-fire button clicks.
 *
 * @example
 * const handleSubmit = useThrottle(async () => {
 *   await submitForm()
 * }, 2000)
 */
export function useThrottle<T extends (...args: Parameters<T>) => void>(
  callback: T,
  intervalMs = 1000
): (...args: Parameters<T>) => void {
  const lastCalledAt = useRef<number>(0)

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCalledAt.current >= intervalMs) {
        lastCalledAt.current = now
        callback(...args)
      }
    },
    [callback, intervalMs]
  )
}

/**
 * Throttle a callback and expose a cooldown state flag.
 * Useful for disabling submit buttons after a click to prevent double-submission.
 *
 * @example
 * const [handleSubmit, isCoolingDown] = useThrottleWithCooldown(submit, 2000)
 * <button disabled={isCoolingDown}>Save</button>
 */
export function useThrottleWithCooldown<T extends (...args: Parameters<T>) => void>(
  callback: T,
  intervalMs = 1000
): [(...args: Parameters<T>) => void, boolean] {
  const lastCalledAt = useRef<number>(0)
  const [isCoolingDown, setIsCoolingDown] = useState(false)

  const throttled = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCalledAt.current >= intervalMs) {
        lastCalledAt.current = now
        setIsCoolingDown(true)
        callback(...args)
        setTimeout(() => setIsCoolingDown(false), intervalMs)
      }
    },
    [callback, intervalMs]
  )

  return [throttled, isCoolingDown]
}
