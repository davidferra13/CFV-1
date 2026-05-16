'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signUpClient, type ClientSignupInput } from '@/lib/auth/actions'
import { getInvitationByToken } from '@/lib/auth/invitations'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { CenteredLoadingState } from '@/components/ui/loading-state'

function ClientSignUpForm() {
  const router = useRouter()
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
    accepted_legal_terms: false,
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
      const result = await signUpClient(formData)
      router.push(result.autoSignedIn ? '/my-events' : '/auth/signin')
      router.refresh()
    } catch (err) {
      const error = err as Error
      setError(error.message)
    } finally {
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
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!token}
                helperText={token ? 'This email is from your invitation' : undefined}
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

              <label className="flex items-start gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={formData.accepted_legal_terms}
                  onChange={(e) =>
                    setFormData({ ...formData, accepted_legal_terms: e.target.checked })
                  }
                  required
                  className="mt-1"
                />
                <span>
                  I accept the ChefFlow{' '}
                  <Link href="/terms" className="text-brand-700">
                    Terms
                  </Link>
                  ,{' '}
                  <Link href="/privacy" className="text-brand-700">
                    Privacy Policy
                  </Link>
                  , and{' '}
                  <Link href="/client-terms" className="text-brand-700">
                    Client Terms
                  </Link>
                  .
                </span>
              </label>
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
