'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type LocationChangeRequestReviewFormProps = {
  requestId: string
}

export function LocationChangeRequestReviewForm({
  requestId,
}: LocationChangeRequestReviewFormProps) {
  const router = useRouter()
  const [reviewNote, setReviewNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [activeDecision, setActiveDecision] = useState<'approved' | 'rejected' | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  async function submit(decision: 'approved' | 'rejected') {
    setError(null)
    setActiveDecision(decision)
    setIsPending(true)

    try {
      const response = await fetch(`/api/partners/location-change-requests/${requestId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision,
          reviewNote,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to review location change request')
      }

      router.refresh()
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'Failed to review location change request'
      )
    } finally {
      setIsPending(false)
      setActiveDecision(null)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <textarea
        name="reviewNote"
        rows={3}
        value={reviewNote}
        onChange={(event) => setReviewNote(event.target.value)}
        placeholder="Optional note back to the partner."
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={!isHydrated || isPending}
          onClick={() => submit('approved')}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && activeDecision === 'approved' ? 'Approving...' : 'Approve and Apply'}
        </button>
        <button
          type="button"
          disabled={!isHydrated || isPending}
          onClick={() => submit('rejected')}
          className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-semibold text-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && activeDecision === 'rejected' ? 'Rejecting...' : 'Reject'}
        </button>
      </div>
    </div>
  )
}
