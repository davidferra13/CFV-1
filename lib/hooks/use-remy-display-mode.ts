'use client'

import { useCallback, useEffect, useState } from 'react'

export type RemyDisplayMode = 'hidden' | 'docked' | 'expanded'

interface UseRemyDisplayModeOptions {
  storageKey: string
  desktopDefault?: RemyDisplayMode
  mobileDefault?: RemyDisplayMode
  mobileBreakpointPx?: number
}

const VALID_MODES = new Set<RemyDisplayMode>(['hidden', 'docked', 'expanded'])

function isValidMode(value: string | null): value is RemyDisplayMode {
  return value !== null && VALID_MODES.has(value as RemyDisplayMode)
}

export function useRemyDisplayMode({
  storageKey,
  desktopDefault = 'docked',
  mobileDefault = 'hidden',
  mobileBreakpointPx = 1024,
}: UseRemyDisplayModeOptions) {
  const [mode, setModeState] = useState<RemyDisplayMode>('hidden')
  const [isMobile, setIsMobile] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(`(max-width: ${mobileBreakpointPx - 1}px)`)
    const updateIsMobile = () => setIsMobile(mediaQuery.matches)
    updateIsMobile()

    mediaQuery.addEventListener('change', updateIsMobile)
    return () => mediaQuery.removeEventListener('change', updateIsMobile)
  }, [mobileBreakpointPx])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const fallback = window.matchMedia(`(max-width: ${mobileBreakpointPx - 1}px)`).matches
      ? mobileDefault
      : desktopDefault
    const stored = window.localStorage.getItem(storageKey)

    setModeState(isValidMode(stored) ? stored : fallback)
    setIsHydrated(true)
  }, [desktopDefault, mobileBreakpointPx, mobileDefault, storageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return
      if (!isValidMode(event.newValue)) return
      setModeState(event.newValue)
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [storageKey])

  const setMode = useCallback(
    (nextMode: RemyDisplayMode) => {
      // If mobile is configured as hidden, keep runtime mode hidden and
      // preserve the stored desktop preference instead of overwriting it.
      if (isMobile && mobileDefault === 'hidden') {
        setModeState('hidden')
        return
      }
      setModeState(nextMode)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, nextMode)
      }
    },
    [isMobile, mobileDefault, storageKey]
  )

  const effectiveMode: RemyDisplayMode = isMobile && mobileDefault === 'hidden' ? 'hidden' : mode

  return {
    mode: effectiveMode,
    isMobile,
    isHydrated,
    setMode,
  }
}
