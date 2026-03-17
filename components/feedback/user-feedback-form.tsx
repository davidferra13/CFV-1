'use client'

import { useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { submitFeedback, type FeedbackInput } from '@/lib/feedback/actions'
import { Button } from '@/components/ui/button'

const SENTIMENT_OPTIONS: Array<{ value: FeedbackInput['sentiment']; label: string }> = [
  { value: 'love', label: 'Love it' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'frustrated', label: 'Frustrated' },
  { value: 'bug', label: 'Bug' },
  { value: 'other', label: 'Other' },
]

type UserFeedbackFormProps = {
  pageContext?: string
}

export function UserFeedbackForm({ pageContext }: UserFeedbackFormProps) {
  const pathname = usePathname()
  const [sentiment, setSentiment] = useState<FeedbackInput['sentiment']>('suggestion')
  const [message, setMessage] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function detectDeviceType() {
    if (typeof window === 'undefined') return 'unknown'
    if (window.innerWidth < 768) return 'mobile'
    if (window.innerWidth < 1024) return 'tablet'
    return 'desktop'
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const effectivePageContext = pageContext ?? pathname ?? 'unknown'

    startTransition(async () => {
      const result = await submitFeedback({
        sentiment,
        message,
        anonymous,
        page_context: effectivePageContext,
        metadata: {
          source: 'in-app-feedback-form',
          pathname: effectivePageContext,
          deviceType: detectDeviceType(),
          viewportWidth: typeof window === 'undefined' ? undefined : window.innerWidth,
          viewportHeight: typeof window === 'undefined' ? undefined : window.innerHeight,
          appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
          appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
        },
      })

      if (!result.success) {
        setError(result.error ?? 'Failed to send feedback.')
        return
      }

      setSubmitted(true)
      setMessage('')
    })
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
        Feedback sent. It has been routed to the internal review queue.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-200">
          What kind of feedback is this?
        </label>
        <select
          value={sentiment}
          onChange={(event) => setSentiment(event.target.value as FeedbackInput['sentiment'])}
          className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
        >
          {SENTIMENT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-200">Message</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Describe what happened, what you expected, and what would make this better."
          className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
          required
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(event) => setAnonymous(event.target.checked)}
          className="rounded border-stone-600 bg-stone-950"
        />
        Send anonymously
      </label>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? 'Sending...' : 'Send feedback'}
        </Button>
      </div>
    </form>
  )
}
