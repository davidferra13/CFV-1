'use client'

import { useEffect, useRef, useCallback } from 'react'
import { isLocalTurnstileHost, TURNSTILE_TEST_SITE_KEY } from '@/lib/security/turnstile-constants'

// Extend Window to include Turnstile types
declare global {
  interface Window {
    turnstile?: {
      render: (
        element: string | HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          size?: 'normal' | 'compact' | 'invisible'
          theme?: 'light' | 'dark' | 'auto'
          appearance?: 'always' | 'execute' | 'interaction-only'
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

interface TurnstileWidgetProps {
  /** Called when Turnstile verification succeeds with the token */
  onVerify: (token: string) => void
  /** Called when the token expires - form should clear the stored token */
  onExpire?: () => void
  /** Called on Turnstile error - non-blocking, form can still submit */
  onError?: () => void
  /** Theme for the invisible badge (does not render visibly in invisible mode) */
  theme?: 'light' | 'dark' | 'auto'
}

// Track whether the Turnstile script has been loaded globally
let scriptLoaded = false
let scriptLoading = false
const onLoadCallbacks: (() => void)[] = []

function loadTurnstileScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve()

  return new Promise((resolve) => {
    if (scriptLoading) {
      onLoadCallbacks.push(resolve)
      return
    }

    scriptLoading = true

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true

    script.onload = () => {
      scriptLoaded = true
      scriptLoading = false
      resolve()
      onLoadCallbacks.forEach((cb) => cb())
      onLoadCallbacks.length = 0
    }

    script.onerror = () => {
      scriptLoading = false
      console.warn('[turnstile] Failed to load Turnstile script - widget will be inactive')
      resolve() // Don't reject - graceful degradation
    }

    document.head.appendChild(script)
  })
}

/**
 * Invisible Cloudflare Turnstile CAPTCHA widget.
 *
 * Renders nothing visible - the widget runs in the background and calls
 * onVerify with a token when the challenge is passed.
 *
 * If NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set, this component renders
 * nothing and never calls onVerify (graceful degradation for dev/testing).
 *
 * Works inside iframes (embed use case).
 */
export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  theme = 'auto',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  // Stable callback refs to avoid re-renders triggering re-initialization
  const onVerifyRef = useRef(onVerify)
  const onExpireRef = useRef(onExpire)
  const onErrorRef = useRef(onError)
  onVerifyRef.current = onVerify
  onExpireRef.current = onExpire
  onErrorRef.current = onError

  const host =
    typeof window !== 'undefined' ? window.location.hostname || window.location.host : undefined
  const siteKey =
    process.env.NODE_ENV !== 'production' && isLocalTurnstileHost(host)
      ? process.env.NEXT_PUBLIC_TURNSTILE_TEST_SITE_KEY || TURNSTILE_TEST_SITE_KEY
      : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const initWidget = useCallback(async () => {
    if (!siteKey || !containerRef.current) return

    await loadTurnstileScript()

    // Check if component unmounted while loading
    if (!mountedRef.current || !containerRef.current) return

    // Wait for turnstile to be available (script loaded but API may not be ready)
    if (!window.turnstile) {
      console.warn('[turnstile] Turnstile API not available after script load')
      return
    }

    // Remove existing widget if any (handles re-renders)
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current)
      } catch {
        // Ignore - widget may already be removed
      }
      widgetIdRef.current = null
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        size: 'invisible',
        theme,
        appearance: 'interaction-only',
        callback: (token: string) => {
          onVerifyRef.current(token)
        },
        'expired-callback': () => {
          onExpireRef.current?.()
        },
        'error-callback': () => {
          onErrorRef.current?.()
        },
      })
    } catch (err) {
      console.warn('[turnstile] Failed to render widget:', err)
    }
  }, [siteKey, theme])

  useEffect(() => {
    mountedRef.current = true
    initWidget()

    return () => {
      mountedRef.current = false
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // Ignore cleanup errors
        }
        widgetIdRef.current = null
      }
    }
  }, [initWidget])

  // If no site key, render nothing - graceful degradation
  if (!siteKey) return null

  // The container div is required by Turnstile but renders nothing visible in invisible mode
  return <div ref={containerRef} />
}
