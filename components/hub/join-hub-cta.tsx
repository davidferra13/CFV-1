'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getOrCreateEventHubGroup } from '@/lib/hub/integration-actions'

interface JoinHubCTAProps {
  eventId: string
  shareToken: string
  eventTitle: string
}

/**
 * Dinner Circle call-to-action shown on the share page after RSVP.
 * Creates or finds the hub group for this event, then redirects to the join page.
 */
export function JoinHubCTA({ eventId, shareToken, eventTitle }: JoinHubCTAProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleJoin = () => {
    startTransition(async () => {
      try {
        const { groupToken } = await getOrCreateEventHubGroup({
          eventId,
          shareToken,
          eventTitle,
        })
        router.push(`/hub/join/${groupToken}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create group')
      }
    })
  }

  return (
    <div className="rounded-2xl border border-[#e88f47]/20 bg-[#e88f47]/5 p-6 text-center">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#e88f47]">
        Dinner Circle
      </div>
      <h3 className="text-base font-semibold text-stone-200">Join the Dinner Circle</h3>
      <p className="mt-1 text-sm text-stone-400">
        Open the shared dinner page for guests to chat, share photos, vote on plans, and keep event
        details in one place.
      </p>
      <button
        type="button"
        onClick={handleJoin}
        disabled={isPending}
        className="mt-4 rounded-xl bg-[#e88f47] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-30"
      >
        {isPending ? 'Setting up...' : 'Open Dinner Circle'}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
