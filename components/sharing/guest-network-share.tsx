'use client'

import { useState } from 'react'
import { createGuestInviteFromGuest, createViewerInviteFromGuest } from '@/lib/sharing/actions'

type Mode = 'viewer' | 'guest'

type Props = {
  shareToken: string
  eventId: string
  guestToken: string
}

export function GuestNetworkShare({ shareToken, eventId, guestToken }: Props) {
  const [mode, setMode] = useState<Mode>('viewer')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  async function onCreateInvite() {
    setLoading(true)
    setError('')

    try {
      if (mode === 'viewer') {
        const result = await createViewerInviteFromGuest({
          shareToken,
          guestToken,
          invited_name: fullName || undefined,
          invited_email: email || undefined,
          note: note || undefined,
        })
        setInviteUrl(result.viewerUrl)
      } else {
        if (!fullName.trim()) {
          throw new Error('Name is required to add someone as a guest')
        }

        const result = await createGuestInviteFromGuest({
          shareToken,
          guestToken,
          full_name: fullName,
          email: email || undefined,
          note: note || undefined,
        })
        setInviteUrl(result.guestPortalUrl)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setLoading(false)
    }
  }

  async function onCopyLink() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="space-y-4 rounded-lg border border-stone-700 bg-stone-900/40 p-4">
      <div>
        <h4 className="text-sm font-semibold text-stone-100">Share This Experience</h4>
        <p className="mt-1 text-xs text-stone-400">
          Invite someone as a read-only viewer or add them directly as a guest.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('viewer')}
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            mode === 'viewer'
              ? 'bg-brand-600 text-white'
              : 'border border-stone-700 text-stone-300 hover:border-stone-600'
          }`}
        >
          Viewer Link
        </button>
        <button
          type="button"
          onClick={() => setMode('guest')}
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            mode === 'guest'
              ? 'bg-brand-600 text-white'
              : 'border border-stone-700 text-stone-300 hover:border-stone-600'
          }`}
        >
          Add as Guest
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={mode === 'guest' ? 'Name (required)' : 'Name (optional)'}
          className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          type="email"
          className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
        />
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note"
        rows={2}
        className="w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
      />

      {error && <p className="rounded-md bg-red-950 px-3 py-2 text-xs text-red-200">{error}</p>}

      <button
        type="button"
        onClick={onCreateInvite}
        disabled={loading}
        className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? 'Creating...' : mode === 'viewer' ? 'Create Viewer Link' : 'Create Guest Invite'}
      </button>

      {inviteUrl && (
        <div className="space-y-2 rounded-md border border-stone-700 bg-stone-950 p-3">
          <p className="text-xs text-stone-400">
            {mode === 'viewer' ? 'Viewer link ready:' : 'Guest portal link ready:'}
          </p>
          <p className="break-all text-xs text-stone-300">{inviteUrl}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCopyLink}
              className="rounded-md border border-stone-600 px-2.5 py-1.5 text-xs text-stone-300 hover:border-stone-500"
            >
              {copied ? 'Copied' : 'Copy Link'}
            </button>
            {mode === 'guest' && (
              <a
                href={inviteUrl}
                className="rounded-md border border-stone-600 px-2.5 py-1.5 text-xs text-stone-300 hover:border-stone-500"
              >
                Open Portal
              </a>
            )}
            {mode === 'viewer' && (
              <a
                href={`/event/${eventId}/guest/${guestToken}`}
                className="rounded-md border border-stone-600 px-2.5 py-1.5 text-xs text-stone-300 hover:border-stone-500"
              >
                My Guest Portal
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
