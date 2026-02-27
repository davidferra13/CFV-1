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

    // Start the initial timer
    resetTimer()

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer)
      })
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [resetTimer, active])

  return <>{children}</>
}
