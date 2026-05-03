'use client'

import { useCallback, useEffect, useState } from 'react'

type IdleCallbackHandle = number
type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: IdleCallback,
    options?: { timeout: number }
  ) => IdleCallbackHandle
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void
}

const FALLBACK_DELAY_MS = 1800
const IDLE_TIMEOUT_MS = 2500

export function useDeferredGoogleMapsLoader(enabled: boolean) {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (!enabled || shouldLoad) return

    let cancelled = false
    const idleWindow = window as IdleWindow
    let idleHandle: IdleCallbackHandle | null = null
    let timeoutHandle: number | null = null

    const loadWhenIdle = () => {
      if (!cancelled) {
        setShouldLoad(true)
      }
    }

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleHandle = idleWindow.requestIdleCallback(loadWhenIdle, { timeout: IDLE_TIMEOUT_MS })
    } else {
      timeoutHandle = window.setTimeout(loadWhenIdle, FALLBACK_DELAY_MS)
    }

    return () => {
      cancelled = true
      if (idleHandle != null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleHandle)
      }
      if (timeoutHandle != null) {
        window.clearTimeout(timeoutHandle)
      }
    }
  }, [enabled, shouldLoad])

  const prime = useCallback(() => {
    if (enabled) {
      setShouldLoad(true)
    }
  }, [enabled])

  return {
    shouldLoad,
    prime,
  }
}
