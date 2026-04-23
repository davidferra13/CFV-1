'use client'

import { useEffect, useState, type RefObject } from 'react'

type AuthFailureSubscriber = () => void

type GoogleMapsAuthWindow = Window & {
  gm_authFailure?: () => void
  __googleMapsAuthFailurePatched__?: boolean
  __googleMapsAuthFailureTriggered__?: boolean
  __googleMapsAuthFailureOriginal__?: (() => void) | null
  __googleMapsAuthFailureSubscribers__?: Set<AuthFailureSubscriber>
}

function getAuthWindow() {
  return window as GoogleMapsAuthWindow
}

function ensureGoogleMapsAuthFailureHook() {
  const authWindow = getAuthWindow()

  if (authWindow.__googleMapsAuthFailurePatched__) {
    return authWindow
  }

  authWindow.__googleMapsAuthFailureSubscribers__ ??= new Set<AuthFailureSubscriber>()
  authWindow.__googleMapsAuthFailureOriginal__ = authWindow.gm_authFailure ?? null
  authWindow.gm_authFailure = () => {
    authWindow.__googleMapsAuthFailureTriggered__ = true
    authWindow.__googleMapsAuthFailureOriginal__?.()

    for (const subscriber of authWindow.__googleMapsAuthFailureSubscribers__ ?? []) {
      subscriber()
    }
  }
  authWindow.__googleMapsAuthFailurePatched__ = true

  return authWindow
}

export function useGoogleMapsAuthFailure(enabled: boolean) {
  const [authFailed, setAuthFailed] = useState(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const authWindow = ensureGoogleMapsAuthFailureHook()

    if (authWindow.__googleMapsAuthFailureTriggered__) {
      setAuthFailed(true)
      return
    }

    const markAuthFailure = () => {
      setAuthFailed(true)
    }

    authWindow.__googleMapsAuthFailureSubscribers__?.add(markAuthFailure)

    return () => {
      authWindow.__googleMapsAuthFailureSubscribers__?.delete(markAuthFailure)
    }
  }, [enabled])

  return authFailed
}

export function useGoogleMapsRuntimeFailure(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  const [runtimeFailed, setRuntimeFailed] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const container = containerRef.current
    if (!container) return

    const hasRuntimeError = () =>
      Boolean(
        container.querySelector('.gm-err-container') ||
          Array.from(container.querySelectorAll('.gm-err-message')).some((node) =>
            node.textContent?.includes("didn't load Google Maps correctly")
          )
      )

    if (hasRuntimeError()) {
      setRuntimeFailed(true)
      return
    }

    const observer = new MutationObserver(() => {
      if (!hasRuntimeError()) return
      setRuntimeFailed(true)
      observer.disconnect()
    })

    observer.observe(container, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
    }
  }, [containerRef, enabled])

  return runtimeFailed
}
