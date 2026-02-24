'use client'

import { useState, useTransition, useEffect } from 'react'
import { submitFeedback } from '@/lib/feedback/actions'
import { Button } from '@/components/ui/button'

const SENTIMENTS = [
  { value: 'love', emoji: '😍', label: 'Love it' },
  { value: 'frustrated', emoji: '😤', label: 'Frustrated' },
  { value: 'suggestion', emoji: '💡', label: 'Suggestion' },
  { value: 'bug', emoji: '🐛', label: 'Bug' },
  { value: 'other', emoji: '💬', label: 'Other' },
] as const

type Sentiment = (typeof SENTIMENTS)[number]['value']

export function FeedbackForm() {
  const [sentiment, setSentiment] = useState<Sentiment | null>(null)
  const [message, setMessage] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [pageContext, setPageContext] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setPageContext(window.location.pathname)
  }, [])

  function reset() {
    setSentiment(null)
    setMessage('')
    setAnonymous(false)
    setStatus('idle')
    setErrorMsg('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sentiment) return
    if (!message.trim()) return

    startTransition(async () => {
      const result = await submitFeedback({
        sentiment,
        message: message.trim(),
        anonymous,
        page_context: pageContext || undefined,
      })

      if (result.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg(result.error ?? 'Something went wrong.')
      }
    })
  }

  if (status === 'success') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-950 p-5 text-center space-y-2">
        <p className="text-2xl">🙏</p>
        <p className="font-medium text-emerald-800">Thanks for your feedback!</p>
        <p className="text-sm text-emerald-700">
          We read every submission and use it to make ChefFlow better.
        </p>
        <button
          onClick={reset}
          className="mt-2 text-sm text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
        >
          Send another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Sentiment picker */}
      <div>
        <p className="text-sm font-medium text-stone-300 mb-2">
          How are you feeling about ChefFlow?
        </p>
        <div className="flex flex-wrap gap-2">
          {SENTIMENTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSentiment(s.value)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                sentiment === s.value
                  ? 'border-brand-600 bg-brand-950 text-brand-400'
                  : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-600 hover:bg-stone-800'
              }`}
            >
              <span>{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="feedback-message" className="block text-sm font-medium text-stone-300 mb-1">
          Tell us more <span className="text-stone-400 font-normal">(required)</span>
        </label>
        <textarea
          id="feedback-message"
          rows={4}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's on your mind? Be as specific as you like — every detail helps."
          className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
        />
        <p className="mt-1 text-right text-xs text-stone-400">{message.length}/2000</p>
      </div>

      {/* Anonymous toggle */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-stone-400">
          <span className="font-medium text-stone-200">Send anonymously</span>
          <span className="block text-stone-500">
            Your name and account won&apos;t be attached to this feedback.
          </span>
        </span>
      </label>

      {/* Error */}
      {status === 'error' && (
        <p className="text-sm text-red-600 bg-red-950 border border-red-200 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        disabled={!sentiment || !message.trim() || isPending}
        loading={isPending}
      >
        Send Feedback
      </Button>
    </form>
  )
}
