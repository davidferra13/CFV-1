'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { claimStaffInvite, decodeStaffInviteToken } from '@/lib/team/staff-invite-actions'
import { signIn } from '@/lib/auth/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import Link from 'next/link'

function StaffSignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get('token') ?? ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteInfo, setInviteInfo] = useState<{ name: string; email: string } | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(true)
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false)

  useEffect(() => {
    if (!token) {
      setInviteError('Missing invite token. Ask your chef for an invite link.')
      setInviteLoading(false)
      return
    }

    decodeStaffInviteToken(token)
      .then((result) => {
        if (result.valid) {
          setInviteInfo({ name: result.name, email: result.email })
          setEmail(result.email)
        } else {
          setInviteError(result.error)
        }
      })
      .catch(() => {
        setInviteError('Failed to validate invite link.')
      })
      .finally(() => setInviteLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await claimStaffInvite(token, email, password, acceptedLegalTerms)

      if ('error' in result) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Sign in with the new credentials
      try {
        await signIn({ email, password, rememberMe: true })
      } catch {
        setError('Account created but sign-in failed. Please sign in manually.')
        setLoading(false)
        return
      }

      router.push('/staff-dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <p className="text-sm text-stone-400">Validating invite...</p>
      </div>
    )
  }

  if (inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>{inviteError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/signin" className="text-sm text-brand-400 hover:text-brand-300">
              Sign in instead
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-100">Join the team</h1>
          <p className="mt-2 text-sm text-stone-400">
            {inviteInfo?.name ? `Welcome, ${inviteInfo.name}. ` : ''}
            Create your account to access team tasks and schedules.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label="Email"
                value={email}
                disabled
                helperText="This email is from your invitation"
              />

              <Input
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                autoFocus
                helperText="Minimum 8 characters"
              />

              <label className="flex items-start gap-2 rounded-lg border border-stone-700 bg-stone-900/50 p-3 text-sm text-stone-300">
                <input
                  type="checkbox"
                  checked={acceptedLegalTerms}
                  onChange={(e) => setAcceptedLegalTerms(e.target.checked)}
                  required
                  className="mt-1"
                />
                <span>
                  I accept the ChefFlow{' '}
                  <Link href="/privacy" className="text-brand-400">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link href="/staff-terms" className="text-brand-400">
                    Staff Terms
                  </Link>
                  .
                </span>
              </label>

              {error && <Alert variant="error">{error}</Alert>}

              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Create Account
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-stone-400">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-brand-400 hover:text-brand-300 font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function StaffSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-950">
          <p className="text-sm text-stone-400">Loading...</p>
        </div>
      }
    >
      <StaffSignupForm />
    </Suspense>
  )
}
