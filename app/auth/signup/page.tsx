// Sign Up Page - Chef or Client based on invitation token
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  signUpChef,
  signUpClient,
  type ChefSignupInput,
  type ClientSignupInput,
} from '@/lib/auth/actions'

import { getInvitationByToken } from '@/lib/auth/invitations'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { CenteredLoadingState } from '@/components/ui/loading-state'

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams() ?? new URLSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(!!token)
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null)
  const [invitationName, setInvitationName] = useState<string | null>(null)

  const [chefFormData, setChefFormData] = useState<ChefSignupInput>({
    email: '',
    password: '',
    business_name: '',
    phone: '',
  })

  const [clientFormData, setClientFormData] = useState<ClientSignupInput>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    invitation_token: token || '',
  })

  // Check invitation if token present
  useEffect(() => {
    if (token) {
      getInvitationByToken(token)
        .then((invitation) => {
          if (invitation) {
            setInvitationEmail(invitation.email)
            setInvitationName(invitation.full_name || '')
            setClientFormData((prev) => ({
              ...prev,
              email: invitation.email,
              full_name: invitation.full_name || '',
              invitation_token: token,
            }))
          } else {
            setError('Invalid or expired invitation')
          }
        })
        .catch(() => {
          setError('Failed to load invitation')
        })
        .finally(() => {
          setInvitationLoading(false)
        })
    }
  }, [token])

  const handleChefSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signUpChef(chefFormData)
      router.push('/auth/signin')
    } catch (err) {
      const error = err as Error
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signUpClient(clientFormData)
      router.push('/auth/signin')
    } catch (err) {
      const error = err as Error
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Client signup (invitation-based)
  if (token) {
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
            <p className="text-stone-600 mt-2">Complete your client registration</p>
          </div>

          <Card>
            <form onSubmit={handleClientSubmit}>
              <CardHeader>
                <CardTitle>Client Sign Up</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                <Alert variant="info">You&apos;ve been invited to join as a client.</Alert>

                <Input
                  type="text"
                  label="Full Name"
                  value={clientFormData.full_name}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, full_name: e.target.value })
                  }
                  required
                  autoFocus
                />

                <Input
                  type="email"
                  label="Email"
                  value={clientFormData.email}
                  disabled
                  helperText="This email is from your invitation"
                />

                <Input
                  type="tel"
                  label="Phone"
                  value={clientFormData.phone}
                  onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
                  helperText="Optional"
                />

                <Input
                  type="password"
                  label="Password"
                  value={clientFormData.password}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, password: e.target.value })
                  }
                  required
                  helperText="Minimum 8 characters"
                  autoComplete="new-password"
                />
              </CardContent>

              <CardFooter>
                <Button type="submit" variant="primary" className="w-full" loading={loading}>
                  Create Account
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    )
  }

  // Chef signup (public)
  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900">ChefFlow</h1>
          <p className="text-stone-600 mt-2">Manage your chef work, your way</p>
        </div>

        <Card>
          <form onSubmit={handleChefSubmit}>
            <CardHeader>
              <CardTitle>Chef Sign Up</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}

              <Input
                type="email"
                label="Email"
                value={chefFormData.email}
                onChange={(e) => setChefFormData({ ...chefFormData, email: e.target.value })}
                required
                autoComplete="email"
                autoFocus
              />

              <Input
                type="password"
                label="Password"
                value={chefFormData.password}
                onChange={(e) => setChefFormData({ ...chefFormData, password: e.target.value })}
                required
                helperText="Minimum 8 characters"
                autoComplete="new-password"
              />

              <Input
                type="text"
                label="Your Name or Business Name"
                value={chefFormData.business_name}
                onChange={(e) =>
                  setChefFormData({ ...chefFormData, business_name: e.target.value })
                }
                helperText="How you'd like to be known - a personal name works perfectly"
              />

              <Input
                type="tel"
                label="Phone"
                value={chefFormData.phone}
                onChange={(e) => setChefFormData({ ...chefFormData, phone: e.target.value })}
                helperText="Optional"
              />
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Create Account
              </Button>

              <div className="text-sm text-center text-stone-600">
                Already have an account?{' '}
                <Link
                  href="/auth/signin"
                  className="text-brand-700 hover:text-brand-700 font-medium"
                >
                  Sign in
                </Link>
                <span className="mx-1">·</span>
                <Link
                  href="/auth/client-signup"
                  className="text-brand-700 hover:text-brand-700 font-medium"
                >
                  Client sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function SignUpPage() {
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
      <SignUpForm />
    </Suspense>
  )
}
