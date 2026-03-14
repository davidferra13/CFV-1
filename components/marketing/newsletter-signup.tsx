'use client'

import { useState, FormEvent } from 'react'
import { subscribeToNewsletter } from '@/lib/marketing/newsletter-actions'

/**
 * Compact newsletter signup form for the public footer.
 * Collects email only, stores via server action.
 */
export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setErrorMsg('')

    const result = await subscribeToNewsletter(email)

    if (result.success) {
      setStatus('success')
      setEmail('')
    } else {
      setStatus('error')
      setErrorMsg(result.error || 'Something went wrong.')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-sm text-green-400">
        You&apos;re in! We&apos;ll send you chef tips and updates.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
      <div className="flex gap-2">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-md border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder-stone-500 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {status === 'loading' ? '...' : 'Subscribe'}
        </button>
      </div>
      {status === 'error' && <p className="text-xs text-red-400">{errorMsg}</p>}
    </form>
  )
}
