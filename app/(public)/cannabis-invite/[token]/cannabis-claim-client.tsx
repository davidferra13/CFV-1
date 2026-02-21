'use client'

// The Dispensary Door — full-screen cannabis invite claim experience.
// When you receive this link, it feels like you're being let into something special.

import { useState, useEffect } from 'react'
import { claimCannabisInvite } from '@/lib/cannabis/invitation-actions'

interface Invite {
  id: string
  invitee_email: string
  invitee_name: string | null
  personal_note: string | null
  expires_at: string
}

interface Props {
  invite: Invite | null
  token: string
}

export function CannabisClaimClient({ invite, token }: Props) {
  const [phase, setPhase] = useState<'door' | 'enter' | 'claiming' | 'success'>('door')
  const [errorMsg, setErrorMsg] = useState('')
  const [glowPulse, setGlowPulse] = useState(false)

  // Subtle breathing glow animation
  useEffect(() => {
    const timer = setInterval(() => setGlowPulse((p) => !p), 2200)
    return () => clearInterval(timer)
  }, [])

  async function handleClaim() {
    setPhase('claiming')
    try {
      const result = await claimCannabisInvite(token)
      if (result.success) {
        setPhase('success')
      } else {
        setErrorMsg(result.error ?? 'Something went wrong.')
        setPhase('enter')
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Something went wrong.')
      setPhase('enter')
    }
  }

  // Invalid / expired token
  if (!invite) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: '#080d08' }}
      >
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🍂</div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: '#e8f5e9' }}>
            Invitation Not Found
          </h1>
          <p className="text-sm" style={{ color: '#4a7c4e' }}>
            This invitation link is invalid, has expired, or has already been used.
          </p>
        </div>
      </div>
    )
  }

  // Success state
  if (phase === 'success') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: '#080d08' }}
      >
        <div
          className="text-center max-w-sm"
          style={{
            filter: 'drop-shadow(0 0 40px rgba(74, 124, 78, 0.4))',
          }}
        >
          <div className="text-5xl mb-5">🌿</div>
          <h1
            className="text-2xl font-bold mb-3"
            style={{ color: '#e8f5e9', letterSpacing: '-0.02em' }}
          >
            Welcome to Cannabis Dining
          </h1>
          <p className="text-sm mb-6" style={{ color: '#6aaa6e' }}>
            Your access is now active. Sign in to your account to begin.
          </p>
          <a
            href="/auth/signin"
            className="inline-block px-6 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, #2d5a30 0%, #4a7c4e 100%)',
              color: '#e8f5e9',
              boxShadow: '0 0 24px rgba(74, 124, 78, 0.5)',
            }}
          >
            Sign In →
          </a>
        </div>
      </div>
    )
  }

  // The Door — initial view before entering
  if (phase === 'door') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden"
        style={{ background: '#080d08' }}
      >
        {/* Ambient green glow — the "dispensary atmosphere" */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-[2200ms]"
          style={{
            background: glowPulse
              ? 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(74, 124, 78, 0.18) 0%, transparent 70%)'
              : 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(74, 124, 78, 0.10) 0%, transparent 70%)',
          }}
        />

        {/* Subtle corner leaf decorations */}
        <div className="absolute top-6 left-6 text-5xl opacity-10 pointer-events-none">🌿</div>
        <div className="absolute bottom-6 right-6 text-5xl opacity-10 pointer-events-none">🍃</div>

        <div className="relative text-center max-w-sm">
          {/* The exclusive header */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{
              background: 'rgba(74, 124, 78, 0.15)',
              border: '1px solid rgba(74, 124, 78, 0.3)',
              color: '#8bc34a',
              boxShadow: '0 0 12px rgba(74, 124, 78, 0.2)',
            }}
          >
            <span>🌿</span>
            <span>Private Cannabis Tier</span>
          </div>

          <h1
            className="text-3xl font-bold mb-3"
            style={{
              color: '#e8f5e9',
              letterSpacing: '-0.03em',
              lineHeight: '1.1',
              textShadow: '0 0 30px rgba(74, 124, 78, 0.3)',
            }}
          >
            You&rsquo;ve Been Invited
          </h1>

          {invite.invitee_name && (
            <p className="text-base mb-2" style={{ color: '#8bc34a' }}>
              Welcome, {invite.invitee_name}
            </p>
          )}

          <p className="text-sm mb-8" style={{ color: '#4a7c4e', lineHeight: '1.6' }}>
            You&rsquo;ve been granted access to an exclusive cannabis dining experience. Once
            accepted, you&rsquo;ll be able to book and track cannabis-infused private chef dinners.
          </p>

          {invite.personal_note && (
            <div
              className="rounded-xl px-5 py-4 mb-8 text-left"
              style={{
                background: 'rgba(74, 124, 78, 0.08)',
                border: '1px solid rgba(74, 124, 78, 0.15)',
              }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: '#4a7c4e' }}>
                Personal note:
              </p>
              <p className="text-sm italic" style={{ color: '#6aaa6e' }}>
                &ldquo;{invite.personal_note}&rdquo;
              </p>
            </div>
          )}

          {/* The Buzzer */}
          <button
            type="button"
            onClick={() => setPhase('enter')}
            className="w-full py-4 rounded-2xl text-base font-semibold transition-all duration-300 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #1e3d20 0%, #2d5a30 50%, #4a7c4e 100%)',
              color: '#e8f5e9',
              boxShadow: glowPulse
                ? '0 0 40px rgba(74, 124, 78, 0.5), 0 4px 20px rgba(0,0,0,0.5)'
                : '0 0 24px rgba(74, 124, 78, 0.3), 0 4px 20px rgba(0,0,0,0.5)',
              border: '1px solid rgba(139, 195, 74, 0.2)',
              letterSpacing: '0.02em',
            }}
          >
            Enter
          </button>

          <p className="text-xs mt-4" style={{ color: '#2d5a30' }}>
            You must have an account to accept this invitation
          </p>
        </div>
      </div>
    )
  }

  // Confirmation step
  if (phase === 'enter') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden"
        style={{ background: '#080d08' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(74, 124, 78, 0.15) 0%, transparent 70%)',
          }}
        />

        <div className="relative text-center max-w-sm">
          <div className="text-4xl mb-6">🌿</div>

          <h2
            className="text-xl font-bold mb-3"
            style={{ color: '#e8f5e9', letterSpacing: '-0.02em' }}
          >
            Accept the Invitation
          </h2>
          <p className="text-sm mb-2" style={{ color: '#6aaa6e' }}>
            This will activate cannabis tier access for your account.
          </p>
          <p className="text-xs mb-8" style={{ color: '#4a7c4e' }}>
            Invitation sent to <span style={{ color: '#6aaa6e' }}>{invite.invitee_email}</span>
          </p>

          {errorMsg && (
            <p className="text-sm mb-4" style={{ color: '#ef9a9a' }}>
              {errorMsg}
            </p>
          )}

          <button
            type="button"
            onClick={handleClaim}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, #2d5a30 0%, #4a7c4e 100%)',
              color: '#e8f5e9',
              boxShadow: '0 0 24px rgba(74, 124, 78, 0.4)',
            }}
          >
            Accept Invitation
          </button>

          <button
            type="button"
            onClick={() => setPhase('door')}
            className="mt-3 text-xs underline block mx-auto"
            style={{ color: '#2d5a30' }}
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  // Claiming state
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#080d08' }}
    >
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🌿</div>
        <p className="text-sm" style={{ color: '#4a7c4e' }}>
          Activating your access...
        </p>
      </div>
    </div>
  )
}
