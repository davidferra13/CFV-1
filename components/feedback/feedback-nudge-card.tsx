'use client'

// FeedbackNudgeCard - Slide-in corner card for collecting product feedback.
// Replaces the old full-screen FeedbackNudgeModal with a non-intrusive card.
//
// Key differences from the old modal:
// - Bottom-right corner card instead of full-screen backdrop
// - Uses requestIdleCallback (with setTimeout fallback) instead of a 5s timer
// - Participates in the overlay queue (priority 10, lowest)
// - Only fires after the user has interacted with the page at least once

import { useState, useEffect, useTransition, useRef, useCallback } from 'react'
import { submitUserFeedback, type FeedbackSentiment } from '@/lib/feedback/user-feedback-actions'
import { useIsDemoMode } from '@/lib/demo-mode'
import { useOnboardingPeripheralsEnabled } from '@/lib/onboarding/peripheral-visibility'
import { useOverlaySlot } from '@/lib/overlay/overlay-queue'
import { X } from '@/components/ui/icons'

const STORAGE_KEY = 'chefflow:feedback-nudge-done'
const MIN_IDLE_DELAY_MS = 15_000 // 15s floor before showing

const SENTIMENTS: { emoji: string; label: string; value: FeedbackSentiment }[] = [
  { emoji: '\u2764\uFE0F', label: 'Love it', value: 'love' },
  { emoji: '\uD83D\uDCA1', label: 'Suggestions', value: 'suggestion' },
  { emoji: '\uD83D\uDE24', label: 'Frustrated', value: 'frustrated' },
  { emoji: '\uD83D\uDC1B', label: 'Found a bug', value: 'bug' },
]

export function FeedbackNudgeCard({ daysSinceCreation }: { daysSinceCreation: number }) {
  const isDemo = useIsDemoMode()
  const peripheralsEnabled = useOnboardingPeripheralsEnabled()
  const [idleReady, setIdleReady] = useState(false)
  const [alreadyDone, setAlreadyDone] = useState(true) // start hidden
  const [selected, setSelected] = useState<FeedbackSentiment | null>(null)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const hasInteractedRef = useRef(false)

  // Check localStorage on mount
  useEffect(() => {
    try {
      setAlreadyDone(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      setAlreadyDone(false)
    }
  }, [])

  // The card wants to show if: 7+ days old, not already submitted, not demo, peripherals allowed
  const wantsToShow =
    daysSinceCreation >= 7 && !alreadyDone && !isDemo && peripheralsEnabled && idleReady

  // Register with overlay queue at priority 10 (lowest)
  const { visible } = useOverlaySlot('feedback-nudge', 10, wantsToShow)

  // Wait for user interaction + idle before becoming ready
  useEffect(() => {
    if (alreadyDone || isDemo || daysSinceCreation < 7) return

    const markInteracted = () => {
      hasInteractedRef.current = true
    }

    // Listen for any user interaction
    document.addEventListener('click', markInteracted, { once: true, passive: true })
    document.addEventListener('keydown', markInteracted, { once: true, passive: true })

    // Start idle detection after minimum delay
    const minTimer = setTimeout(() => {
      if (!hasInteractedRef.current) {
        // User hasn't interacted yet, wait for interaction
        const waitForInteraction = () => {
          scheduleIdle()
        }
        document.addEventListener('click', waitForInteraction, { once: true, passive: true })
        return
      }
      scheduleIdle()
    }, MIN_IDLE_DELAY_MS)

    function scheduleIdle() {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => setIdleReady(true), { timeout: 5000 })
      } else {
        // Safari fallback
        setTimeout(() => setIdleReady(true), 2000)
      }
    }

    return () => {
      clearTimeout(minTimer)
      document.removeEventListener('click', markInteracted)
      document.removeEventListener('keydown', markInteracted)
    }
  }, [alreadyDone, isDemo, daysSinceCreation])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ok */
    }
    setAlreadyDone(true)
  }, [])

  function handleSubmit() {
    if (!selected) return
    startTransition(async () => {
      try {
        await submitUserFeedback({
          sentiment: selected,
          message: message.trim(),
          pageContext: window.location.pathname,
        })
      } catch {
        // Fail silently, feedback loss is acceptable
      }
      try {
        localStorage.setItem(STORAGE_KEY, '1')
      } catch {
        /* ok */
      }
      setSubmitted(true)
    })
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="rounded-xl border border-stone-700 bg-stone-900 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
          <span className="text-sm font-semibold text-stone-100">
            {submitted ? 'Thank you!' : "How's ChefFlow?"}
          </span>
          <button
            onClick={dismiss}
            className="p-1 text-stone-400 hover:text-stone-200 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-4 py-3">
          {submitted ? (
            <p className="text-xs text-stone-400 leading-relaxed">
              Your feedback goes directly to the team and shapes what we build next.
            </p>
          ) : (
            <>
              <p className="text-xs text-stone-500 mb-3">
                You&apos;ve been here a week. Your honest take helps us improve.
              </p>

              {/* Sentiment picker */}
              <div className="flex gap-1.5 mb-3">
                {SENTIMENTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSelected(s.value)}
                    title={s.label}
                    className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border transition-colors text-xs font-medium flex-1
                      ${
                        selected === s.value
                          ? 'border-brand-600 bg-brand-950/40 text-stone-100'
                          : 'border-stone-700 text-stone-500 hover:border-stone-500'
                      }`}
                  >
                    <span className="text-lg">{s.emoji}</span>
                    <span className="leading-tight text-center text-[10px]">{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Optional message */}
              {selected && (
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything specific? (optional)"
                  maxLength={2000}
                  rows={2}
                  className="w-full text-xs rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 resize-none text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-600 mb-3"
                />
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
                >
                  Skip
                </button>
                <button
                  type="button"
                  disabled={!selected || isPending}
                  onClick={handleSubmit}
                  className="px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Sending...' : 'Send feedback'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
