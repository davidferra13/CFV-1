'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { optOutDirectoryEmail } from '@/lib/discover/outreach'

type Props = {
  initialEmail: string
}

export function UnsubscribeForm({ initialEmail }: Props) {
  const [email, setEmail] = useState(initialEmail)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        const result = await optOutDirectoryEmail(email.trim())
        if (result.success) {
          setDone(true)
        } else {
          toast.error(result.error || 'Failed to unsubscribe.')
        }
      } catch {
        toast.error('Something went wrong.')
      }
    })
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-6">
        <p className="text-sm font-semibold text-emerald-300">You have been unsubscribed.</p>
        <p className="mt-1 text-xs text-emerald-200/60">
          You will no longer receive emails about directory listings. Your listing (if any) remains
          active and unchanged.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
          className="h-11 w-full rounded-lg border border-stone-700 bg-stone-900/80 px-4 text-center text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !email.trim()}
        className="w-full rounded-lg bg-stone-800 px-4 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-700 disabled:opacity-50"
      >
        {isPending ? 'Processing...' : 'Unsubscribe'}
      </button>
      <p className="text-[11px] text-stone-600">
        This only affects directory notification emails. It does not remove your listing.
      </p>
    </form>
  )
}
