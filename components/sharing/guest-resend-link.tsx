'use client'

// Guest Portal Link Resend (Q45)
// Shown on the share page for guests who lost their portal link.
// Collapsible form: email input -> sends portal link to email on file.

import { useState } from 'react'
import { resendGuestPortalLink } from '@/lib/sharing/guest-resend-actions'

type Props = {
  shareToken: string
}

export function GuestResendLink({ shareToken }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('sending')
    try {
      await resendGuestPortalLink({ email: email.trim(), shareToken })
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-stone-400 hover:text-stone-300 underline underline-offset-2"
      >
        Already RSVPed? Resend my portal link
      </button>
    )
  }

  if (status === 'sent') {
    return (
      <p className="text-xs text-green-600">
        If that email has an RSVP, a link has been sent. Check your inbox.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        required
        className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="rounded-md bg-stone-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-600 disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending...' : 'Resend'}
      </button>
      {status === 'error' && <span className="text-xs text-red-500">Failed. Try again.</span>}
    </form>
  )
}
