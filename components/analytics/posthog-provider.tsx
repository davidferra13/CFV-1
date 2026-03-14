'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

/**
 * PostHog product analytics provider.
 *
 * Initializes posthog-js on mount and tracks page views on route changes.
 * Gracefully degrades if:
 *   - NEXT_PUBLIC_POSTHOG_KEY is not set
 *   - posthog-js package is not installed
 *
 * Place this inside <body> in the root layout.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const initialized = useRef(false)

  // Initialize PostHog once on mount (skip kiosk pages — dedicated tablets don't need analytics)
  useEffect(() => {
    if (!POSTHOG_KEY || initialized.current) return
    if (pathname?.startsWith('/kiosk')) return

    async function init() {
      try {
        const posthog = (await import('posthog-js')).default
        posthog.init(POSTHOG_KEY!, {
          api_host: POSTHOG_HOST,
          // We track page views manually via pathname changes
          capture_pageview: false,
          // Respect Do Not Track
          respect_dnt: true,
          // Load feature flags on init
          loaded: (ph) => {
            // Expose on window so lib/analytics/posthog.ts helpers work
            if (typeof window !== 'undefined') {
              ;(window as any).posthog = ph
            }
          },
        })
        initialized.current = true
      } catch {
        // posthog-js not installed or failed to load — silently skip
        console.debug('[PostHog] posthog-js not available, analytics disabled')
      }
    }

    init()
  }, [])

  // Track page views on route changes
  useEffect(() => {
    if (!POSTHOG_KEY || !initialized.current) return

    try {
      const posthog = (window as any).posthog
      if (posthog?.capture) {
        posthog.capture('$pageview')
      }
    } catch {
      // Silently skip if PostHog is not available
    }
  }, [pathname])

  return <>{children}</>
}
