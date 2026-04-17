'use client'

import { useState, useTransition } from 'react'
import { joinDirectoryWaitlist } from '@/lib/directory/waitlist-actions'

export function WaitlistCapture({ location }: { location?: string }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const loc = location || 'your area'

    startTransition(async () => {
      try {
        const result = await joinDirectoryWaitlist(email, loc)
        if (result.success) {
          setDone(true)
        } else {
          setError(result.error || 'Something went wrong.')
        }
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  if (done) {
    return (
      <div className="mt-6 rounded-xl border border-emerald-700/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
        You are on the list. We will email you when chefs join {location || 'your area'}.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 mx-auto max-w-sm">
      <p className="text-sm text-stone-400 mb-2">
        Get notified when chefs join {location || 'your area'}
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-xl border border-stone-600/80 bg-stone-900/80 px-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending ? 'Saving...' : 'Notify me'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </form>
  )
}
