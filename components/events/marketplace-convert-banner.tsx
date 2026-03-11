'use client'

// Marketplace "Convert to Direct" Banner
// Shows on completed marketplace-sourced events (Take a Chef, Yhangry, Cozymeal, etc.)
// Gives the chef a pre-written message + direct booking link to send to the client.
// Dismissable via localStorage.

import { useState, useCallback, useEffect } from 'react'

type Props = {
  clientName: string | null
  directBookingUrl: string
  eventId: string
  platformLabel: string
}

const DISMISS_KEY_PREFIX = 'marketplace_convert_dismissed_'

export function MarketplaceConvertBanner({
  clientName,
  directBookingUrl,
  eventId,
  platformLabel,
}: Props) {
  const dismissKey = `${DISMISS_KEY_PREFIX}${eventId}`
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(dismissKey)
      if (!dismissed) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [dismissKey])

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(dismissKey, 'true')
    } catch {
      // ignore
    }
    setVisible(false)
  }, [dismissKey])

  const suggestedMessage = `Hey ${clientName || 'there'}! It was such a pleasure cooking for you. For your next dinner, you can book me directly at ${directBookingUrl}. Same experience, and I can be even more flexible on custom menus. Looking forward to cooking for you again!`

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(suggestedMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback
    }
  }, [suggestedMessage])

  if (!visible) return null

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-950 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-200 text-sm font-bold">
              {platformLabel.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900 text-sm">
              This dinner came through {platformLabel}
            </p>
            <p className="text-amber-200 text-xs mt-0.5">
              {clientName
                ? `Send ${clientName} your direct booking link`
                : 'Send your client the direct booking link'}{' '}
              so they can skip the platform fee next time.
            </p>

            <div className="mt-3 bg-stone-900 border border-amber-200 rounded-lg p-3 text-sm text-stone-300 leading-relaxed">
              {suggestedMessage}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 text-white text-xs font-medium rounded-lg hover:bg-amber-900 transition-colors"
              >
                {copied ? (
                  <>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy Message
                  </>
                )}
              </button>

              <a
                href={directBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 border border-amber-300 text-amber-200 text-xs font-medium rounded-lg hover:bg-amber-950 transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Preview Link
              </a>
            </div>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-amber-400 hover:text-amber-600 transition-colors p-1"
          aria-label="Dismiss"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
