/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

type CookieConsent = 'accepted' | 'declined' | 'unknown'

function readCookieConsent(): CookieConsent {
  if (typeof document === 'undefined') return 'unknown'
  const match = document.cookie.match(/(?:^|;\s*)cookieConsent=([^;]+)/)
  if (!match) return 'unknown'
  const value = decodeURIComponent(match[1])
  return value === 'accepted' || value === 'declined' ? value : 'unknown'
}

/**
 * PostHog product analytics provider.
 *
 * Initializes posthog-js only after cookie consent is accepted.
 * Tracks page views on initial load and route changes.
 * Gracefully degrades if:
 *   - NEXT_PUBLIC_POSTHOG_KEY is not set
 *   - posthog-js package is not installed
 *
 * Place this inside <body> in the root layout.
 */
export function PostHogProvider({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()
  const initialized = useRef(false)
  const [isReady, setIsReady] = useState(false)
  const [consent, setConsent] = useState<CookieConsent>('unknown')

  // Read consent and listen for changes emitted by the cookie banner.
  useEffect(() => {
    setConsent(readCookieConsent())

    const onConsentChanged = (event: Event) => {
      const detail = (event as CustomEvent<'accepted' | 'declined'>).detail
      if (detail === 'accepted' || detail === 'declined') {
        setConsent(detail)
      }
    }

    window.addEventListener('cf:cookie-consent', onConsentChanged as EventListener)
    return () => {
      window.removeEventListener('cf:cookie-consent', onConsentChanged as EventListener)
    }
  }, [])

  // Initialize PostHog once after consent.
  useEffect(() => {
    if (!POSTHOG_KEY || initialized.current) return
    if (consent !== 'accepted') return
    if (pathname?.startsWith('/kiosk')) return

    async function init() {
      try {
        const posthog = (await import('posthog-js')).default
        posthog.init(POSTHOG_KEY!, {
          api_host: POSTHOG_HOST,
          // We track page views manually via pathname changes.
          capture_pageview: false,
          // Respect Do Not Track.
          respect_dnt: true,
          loaded: (ph) => {
            // Expose on window so lib/analytics/posthog.ts helpers work.
            if (typeof window !== 'undefined') {
              ;(window as any).posthog = ph
            }
          },
        })
        initialized.current = true
        setIsReady(true)
      } catch {
        // posthog-js not installed or failed to load - silently skip.
        console.debug('[PostHog] posthog-js not available, analytics disabled')
      }
    }

    init()
  }, [consent, pathname])

  // Respect explicit decline even if consent changes after initialization.
  useEffect(() => {
    if (consent !== 'declined') return
    try {
      const posthog = (window as any).posthog
      if (posthog?.opt_out_capturing) {
        posthog.opt_out_capturing()
      }
    } catch {
      // Silently skip if PostHog is not available.
    }
  }, [consent])

  // Track page views on initial load and route changes.
  useEffect(() => {
    if (!POSTHOG_KEY || !isReady) return

    try {
      const posthog = (window as any).posthog
      if (posthog?.capture) {
        posthog.capture('$pageview', { pathname })
      }
    } catch {
      // Silently skip if PostHog is not available.
    }
  }, [pathname, isReady])

  return <>{children}</>
}
