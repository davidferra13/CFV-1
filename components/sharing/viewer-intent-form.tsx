'use client'

import { useState } from 'react'
import { submitViewerIntent } from '@/lib/sharing/actions'

type Intent = 'join_event' | 'book_own'

export function ViewerIntentForm({
  viewerToken,
  allowJoinRequest = true,
  allowBookOwn = true,
  rsvpDeadlineAt,
}: {
  viewerToken: string
  allowJoinRequest?: boolean
  allowBookOwn?: boolean
  rsvpDeadlineAt?: string | null
}) {
  const [intent, setIntent] = useState<Intent>(allowJoinRequest ? 'join_event' : 'book_own')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<null | {
    mode: Intent
    guestPortalUrl?: string
    alreadyExists?: boolean
    pendingApproval?: boolean
  }>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await submitViewerIntent({
        viewerToken,
        full_name: fullName,
        email,
        intent,
        note: note || undefined,
      })

      setResult({
        mode: response.mode,
        guestPortalUrl: (response as any).guestPortalUrl,
        alreadyExists: (response as any).alreadyExists,
        pendingApproval: (response as any).pendingApproval,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900/40 p-4">
        {result.mode === 'join_event' ? (
          <>
            <h3 className="text-lg font-semibold text-stone-100">Request Received</h3>
            <p className="mt-2 text-sm text-stone-300">
              {result.pendingApproval
                ? 'Your join request is pending host approval.'
                : result.alreadyExists
                  ? 'You already have a guest profile for this event.'
                  : 'You were added as a pending guest. You can now complete your RSVP.'}
            </p>
            {result.guestPortalUrl && (
              <a
                href={result.guestPortalUrl}
                className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Open Guest Portal
              </a>
            )}
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-stone-100">You&apos;re In The Queue</h3>
            <p className="mt-2 text-sm text-stone-300">
              Your booking interest was sent to the chef. They can follow up directly.
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-lg border border-stone-700 bg-stone-900/40 p-4"
    >
      <div>
        <h3 className="text-lg font-semibold text-stone-100">Interested?</h3>
        <p className="mt-1 text-sm text-stone-400">
          Join this dinner if space opens, or request your own private chef experience.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {allowJoinRequest && (
          <button
            type="button"
            onClick={() => setIntent('join_event')}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              intent === 'join_event'
                ? 'bg-brand-600 text-white'
                : 'border border-stone-700 text-stone-300 hover:border-stone-600'
            }`}
          >
            Join This Dinner
          </button>
        )}
        {allowBookOwn && (
          <button
            type="button"
            onClick={() => setIntent('book_own')}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              intent === 'book_own'
                ? 'bg-brand-600 text-white'
                : 'border border-stone-700 text-stone-300 hover:border-stone-600'
            }`}
          >
            Book My Own
          </button>
        )}
      </div>

      {!allowJoinRequest && !allowBookOwn && (
        <p className="text-sm text-stone-400">
          This invite is view-only and not accepting requests at this time.
        </p>
      )}

      {intent === 'join_event' && rsvpDeadlineAt && (
        <p className="text-xs text-stone-500">
          RSVP deadline: {new Date(rsvpDeadlineAt).toLocaleString()}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
        />
      </div>

      <textarea
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={
          intent === 'join_event'
            ? 'Optional note for the host'
            : 'Tell the chef what kind of event you want'
        }
        className="w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
      />

      {error && <p className="rounded-md bg-red-950 px-3 py-2 text-xs text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading
          ? 'Submitting...'
          : intent === 'join_event'
            ? 'Submit Join Request'
            : 'Send Booking Interest'}
      </button>
    </form>
  )
}
