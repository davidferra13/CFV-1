'use client'

import { useState, useEffect } from 'react'

const DEMO_COOKIE = 'chefflow-demo-mode'

/**
 * Returns true when the app is in demo/recording mode.
 * Checks for ?demo=true query param OR a chefflow-demo-mode cookie.
 * When true, all floating overlays (cookie banner, push prompt, Remy FAB,
 * feedback modal, offline bar, quick capture, milestone overlay,
 * test banner, environment badge) are suppressed.
 */
export function useIsDemoMode(): boolean {
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('demo') === 'true') {
      setIsDemo(true)
      return
    }
    const hasCookie = document.cookie.split('; ').some((c) => c.startsWith(`${DEMO_COOKIE}=`))
    if (hasCookie) {
      setIsDemo(true)
    }
  }, [])

  return isDemo
}
