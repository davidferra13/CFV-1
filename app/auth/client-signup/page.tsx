'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signUpClient, signIn, type ClientSignupInput } from '@/lib/auth/actions'
import { getInvitationByToken } from '@/lib/auth/invitations'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { CenteredLoadingState } from '@/components/ui/loading-state'

function ClientSignUpForm() {
  const searchParams = useSearchParams() ?? new URLSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [invitationLoading, setInvitationLoading] = useState(!!token)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<ClientSignupInput>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    invitation_token: token || '',
  })

  useEffect(() => {
    if (!token) {
      setInvitationLoading(false)
      return
    }

    getInvitationByToken(token)
      .then((invitation) => {
        if (!invitation) {
          setError('Invalid or expired invitation link.')
          return
        }

        setFormData((prev) => ({
          ...prev,
          email: invitation.email,
          full_name: invitation.full_name || '',
          invitation_token: token,
        }))
      })
      .catch(() => setError('Failed to load invitation'))
      .finally(() => setInvitationLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signUpClient(formData)
      // Auto-login: sign in immediately with the same credentials
      await signIn({ email: formData.email, password: formData.password, rememberMe: true })
      window.location.href = '/my-events'
    } catch (err) {
      const error = err as Error
      setError(error.message)
      setLoading(false)
    }
  }

  if (invitationLoading) {
    return (
      <CenteredLoadingState
        contextId="auth-sign-up"
        message="Loading invitation..."
        minHeightClassName="min-h-screen"
        className="bg-surface-muted"
      />
    )
  }

  // No invitation token: client signup requires an invitation from a chef
  if (!token) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-stone-900">ChefFlow</h1>
            <p className="text-stone-600 mt-2">Client accounts are created by invitation</p>
          </div>

          <Card>
            <CardContent className="py-8 space-y-4">
              <p className="text-stone-600 text-center">
                To create a client account, your chef will send you an invitation link via email.
              </p>
              <p className="text-stone-500 text-sm text-center">
                Already have an account?
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Link href="/auth/signin" className="w-full">
                <Button variant="primary" className="w-full">
                  Sign In
                </Button>
              </Link>
              <div className="text-sm text-center text-stone-600">
                Are you a chef?{' '}
                <Link
                  href="/auth/signup"
                  className="text-brand-700 hover:text-brand-700 font-medium"
                >
                  Create a chef account
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900">ChefFlow</h1>
          <p className="text-stone-600 mt-2">Create your client account</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Client Sign Up</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}

              <Alert variant="info">You&apos;ve been invited to join as a client.</Alert>

              <Input
                type="text"
                label="Full Name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                autoFocus
              />

              <Input
                type="email"
                label="Email"
                value={formData.email}
                disabled
                helperText="This email is from your invitation"
                required
              />

              <Input
                type="tel"
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                helperText="Optional"
              />

              <Input
                type="password"
                label="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                helperText="Minimum 8 characters"
                autoComplete="new-password"
              />
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Create Client Account
              </Button>

              <div className="text-sm text-center text-stone-600">
                Already have an account?{' '}
                <Link
                  href="/auth/signin"
                  className="text-brand-700 hover:text-brand-700 font-medium"
                >
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function ClientSignUpPage() {
  return (
    <Suspense
      fallback={
        <CenteredLoadingState
          contextId="auth-sign-up"
          minHeightClassName="min-h-screen"
          className="bg-surface-muted"
        />
      }
    >
      <ClientSignUpForm />
    </Suspense>
  )
}
