'use client'

import { useState, FormEvent } from 'react'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'
import { subscribeToNewsletter } from '@/lib/marketing/newsletter-actions'

/**
 * Compact newsletter signup form for the public footer.
 * Collects email only, stores via server action.
 */
export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setErrorMsg('')

    const result = await subscribeToNewsletter({ email, website })

    if (result.success) {
      setStatus('success')
      setEmail('')
      setWebsite('')
      trackEvent(ANALYTICS_EVENTS.NEWSLETTER_SUBSCRIBED, { source: 'public_footer' })
    } else {
      setStatus('error')
      setErrorMsg(result.error || 'Something went wrong.')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-sm text-green-600 dark:text-green-400">
        You&apos;re in! We&apos;ll send you chef tips and updates.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
      <div className="absolute opacity-0 -z-10 pointer-events-none" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm text-stone-200 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-500 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 sm:w-auto"
        >
          {status === 'loading' ? '...' : 'Subscribe'}
        </button>
      </div>
      {status === 'error' && <p className="text-xs text-red-400">{errorMsg}</p>}
    </form>
  )
}
