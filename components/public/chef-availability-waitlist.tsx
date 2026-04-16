'use client'

// Q11: Waitlist capture for chefs not currently accepting inquiries.
// Shown on the public chef profile when discovery.accepting_inquiries is false.
// Stores to directory_waitlist with location = "chef:{chefId}" for later notification.

import { useState, useTransition } from 'react'
import { joinDirectoryWaitlist } from '@/lib/directory/waitlist-actions'

type Props = {
  chefId: string
  chefName: string
}

export function ChefAvailabilityWaitlist({ chefId, chefName }: Props) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const result = await joinDirectoryWaitlist(email, `chef:${chefId}`)
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
      <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 px-5 py-4 text-sm text-emerald-300 text-center">
        You are on the list. We will email you when {chefName} opens availability.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-5 py-5 text-center">
      <p className="text-sm font-medium text-stone-200 mb-1">
        {chefName} is not accepting inquiries right now
      </p>
      <p className="text-xs text-stone-400 mb-3">
        Leave your email to get notified when they open up
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg border border-stone-600/80 bg-stone-900/80 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending ? 'Saving...' : 'Notify me'}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
