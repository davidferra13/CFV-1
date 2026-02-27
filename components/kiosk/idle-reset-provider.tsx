'use client'

import { useEffect, useRef, useCallback } from 'react'

interface IdleResetProviderProps {
  timeoutSeconds: number
  onReset: () => void
  active: boolean
  children: React.ReactNode
}

export function IdleResetProvider({
  timeoutSeconds,
  onReset,
  active,
  children,
}: IdleResetProviderProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    if (active) {
      timerRef.current = setTimeout(() => {
        onReset()
      }, timeoutSeconds * 1000)
    }
  }, [timeoutSeconds, onReset, active])

  useEffect(() => {
    if (!active) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll']

    events.forEach((event) => {
      document.addEventListener(event, resetTimer, { passive: true })
    })

    // Treat tab becoming hidden as immediate idle on a kiosk (shouldn't switch apps)
    function handleVisibilityChange() {
      if (document.hidden) {
        // Tab hidden — trigger idle reset immediately
        onReset()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Start the initial timer
    resetTimer()

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [resetTimer, active, onReset])

  return <>{children}</>
}
