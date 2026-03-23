'use client'

// Partner Signup - Claim a partner account via chef-generated invite link.
// URL format: /auth/partner-signup?token=<uuid>
//
// Flow:
//   1. Chef generates invite → partner receives link
//   2. Partner opens link, fills in email + password
//   3. Server action creates auth user + links to referral_partners record
//   4. Client signs in with credentials → redirects to /partner/dashboard

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { claimPartnerInvite } from '@/lib/partners/invite-actions'
import { signIn } from '@/lib/auth/actions'
import Link from 'next/link'

function PartnerSignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get('token') ?? ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'signing-in'>('form')

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-800 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-stone-100 mb-2">Invalid invite link</h1>
          <p className="text-sm text-stone-400 mb-6">
            This link is missing the invite token. Ask your chef to send you a new invite.
          </p>
          <Link href="/auth/signin" className="text-sm text-stone-400 underline">
            Sign in instead
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Step 1: Server action creates the auth user + claims the invite
      const result = await claimPartnerInvite(token, email, password)

      if ('error' in result) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Step 2: Sign in via Auth.js credentials
      setStep('signing-in')
      try {
        await signIn({ email, password, rememberMe: true })
      } catch {
        setError('Account created but sign-in failed. Please try signing in manually.')
        setStep('form')
        setLoading(false)
        return
      }

      // Step 3: Redirect to the partner portal
      router.push('/partner/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setStep('form')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-800 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-100">Claim your partner account</h1>
          <p className="mt-2 text-sm text-stone-400">
            Create an account to access your partner showcase - see stats, photos, and event history
            from your space.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-stone-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-stone-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="Min. 8 characters"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-950 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-stone-900 text-white py-2.5 text-sm font-semibold hover:bg-stone-800 disabled:opacity-60 transition-colors"
          >
            {step === 'signing-in'
              ? 'Signing you in…'
              : loading
                ? 'Creating account…'
                : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-400">
          Already have an account?{' '}
          <Link href="/auth/signin?portal=partner" className="underline text-stone-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function PartnerSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-800">
          <div className="text-sm text-stone-400">Loading…</div>
        </div>
      }
    >
      <PartnerSignupForm />
    </Suspense>
  )
}
