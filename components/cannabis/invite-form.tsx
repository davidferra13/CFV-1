'use client'

// Cannabis Invite Form - used in app/(chef)/cannabis/invite/page.tsx
// Submitting goes to the admin approval queue, not directly to the invitee.

import { useState } from 'react'
import { sendCannabisInvite } from '@/lib/chef/cannabis-actions'

export function CannabisInviteForm() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setErrorMsg('')

    try {
      await sendCannabisInvite({
        inviteeEmail: email.trim(),
        inviteeName: name.trim() || undefined,
        personalNote: note.trim() || undefined,
      })
      setStatus('success')
      setEmail('')
      setName('')
      setNote('')
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message ?? 'Something went wrong.')
    }
  }

  if (status === 'success') {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          background: 'linear-gradient(135deg, #0f1a0f 0%, #131f14 100%)',
          border: '1px solid rgba(74, 124, 78, 0.3)',
          boxShadow: '0 0 20px rgba(74, 124, 78, 0.1)',
        }}
      >
        <div className="text-3xl mb-3">🌿</div>
        <h3 className="text-base font-semibold mb-1" style={{ color: '#e8f5e9' }}>
          Invite Submitted
        </h3>
        <p className="text-sm" style={{ color: '#6aaa6e' }}>
          Your invitation is being processed. Once approved, your guest will receive their
          invitation link.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-4 text-xs underline"
          style={{ color: '#4a7c4e' }}
        >
          Send another invite
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#8bc34a' }}>
          Guest Email <span style={{ color: '#e57373' }}>*</span>
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="guest@example.com"
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
          style={{
            background: '#0a140a',
            border: '1px solid rgba(74, 124, 78, 0.3)',
            color: '#e8f5e9',
            caretColor: '#8bc34a',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(139, 195, 74, 0.6)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(74, 124, 78, 0.3)')}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#8bc34a' }}>
          Guest Name <span style={{ color: '#4a7c4e' }}>(optional)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First Last"
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
          style={{
            background: '#0a140a',
            border: '1px solid rgba(74, 124, 78, 0.3)',
            color: '#e8f5e9',
            caretColor: '#8bc34a',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(139, 195, 74, 0.6)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(74, 124, 78, 0.3)')}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#8bc34a' }}>
          Personal Note <span style={{ color: '#4a7c4e' }}>(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why you think this guest would enjoy cannabis dining..."
          rows={3}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all resize-none"
          style={{
            background: '#0a140a',
            border: '1px solid rgba(74, 124, 78, 0.3)',
            color: '#e8f5e9',
            caretColor: '#8bc34a',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(139, 195, 74, 0.6)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(74, 124, 78, 0.3)')}
        />
      </div>

      {status === 'error' && (
        <p className="text-xs" style={{ color: '#ef9a9a' }}>
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #2d5a30 0%, #4a7c4e 100%)',
          color: '#e8f5e9',
          boxShadow: '0 0 16px rgba(74, 124, 78, 0.3)',
        }}
      >
        {status === 'loading' ? 'Submitting...' : 'Submit Invitation Request'}
      </button>

      <p className="text-center text-xs" style={{ color: '#4a7c4e' }}>
        Invitations are reviewed before being sent.
      </p>
    </form>
  )
}
