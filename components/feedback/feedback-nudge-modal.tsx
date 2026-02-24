'use client'

// FeedbackNudgeModal — One-time feedback prompt shown after 7 days.
// Fires once per browser profile. Uses localStorage to prevent re-appearance.
// Submits to user_feedback table via server action.

import { useState, useEffect, useTransition } from 'react'
import { submitUserFeedback, type FeedbackSentiment } from '@/lib/feedback/user-feedback-actions'

const STORAGE_KEY = 'chefflow:feedback-nudge-done'

const SENTIMENTS: { emoji: string; label: string; value: FeedbackSentiment }[] = [
  { emoji: '❤️', label: 'Love it', value: 'love' },
  { emoji: '💡', label: 'Suggestions', value: 'suggestion' },
  { emoji: '😤', label: 'Frustrated', value: 'frustrated' },
  { emoji: '🐛', label: 'Found a bug', value: 'bug' },
]

export function FeedbackNudgeModal() {
  const [visible, setVisible] = useState(false)
  const [selected, setSelected] = useState<FeedbackSentiment | null>(null)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return
    } catch {
      // localStorage unavailable — still show once this session
    }
    const timer = setTimeout(() => setVisible(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ok */
    }
    setVisible(false)
  }

  function handleSubmit() {
    if (!selected) return
    startTransition(async () => {
      try {
        await submitUserFeedback({
          sentiment: selected,
          message: message.trim(),
          pageContext: '/dashboard',
        })
      } catch {
        // Fail silently — feedback loss is acceptable
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-200"
      onClick={dismiss}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-nudge-title"
      >
        {submitted ? (
          <>
            <div className="text-5xl" aria-hidden="true">
              🙏
            </div>
            <h2 id="feedback-nudge-title" className="text-xl font-bold text-stone-100">
              Thank you!
            </h2>
            <p className="text-stone-400 text-sm leading-relaxed">
              Your feedback goes directly to the team and shapes what we build next.
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="w-full py-2.5 px-4 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors"
            >
              Back to ChefFlow
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl" aria-hidden="true">
              👋
            </div>
            <h2 id="feedback-nudge-title" className="text-xl font-bold text-stone-100">
              How&apos;s ChefFlow treating you?
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed">
              You&apos;ve been using ChefFlow for a week — your honest take helps us make it better.
            </p>

            {/* Sentiment picker */}
            <div className="flex justify-center gap-2">
              {SENTIMENTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSelected(s.value)}
                  title={s.label}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-colors text-xs font-medium w-16
                    ${
                      selected === s.value
                        ? 'border-stone-900 bg-stone-800 text-stone-100'
                        : 'border-stone-700 text-stone-500 hover:border-stone-400'
                    }`}
                >
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="leading-tight text-center">{s.label}</span>
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
                rows={3}
                className="w-full text-sm rounded-lg border border-stone-700 px-3 py-2 resize-none text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/20"
              />
            )}

            <button
              type="button"
              disabled={!selected || isPending}
              onClick={handleSubmit}
              className="w-full py-2.5 px-4 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? 'Sending…' : 'Send feedback'}
            </button>

            <button
              type="button"
              onClick={dismiss}
              className="text-stone-400 text-xs hover:text-stone-400 transition-colors"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  )
}
