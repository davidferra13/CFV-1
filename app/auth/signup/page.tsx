// Sign Up Page - Chef or Client based on invitation token
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signUpChef, signUpClient, type ChefSignupInput, type ClientSignupInput } from '@/lib/auth/actions'
import { signInWithGoogle } from '@/lib/supabase/client'
import { getInvitationByToken } from '@/lib/auth/invitations'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(!!token)
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null)
  const [invitationName, setInvitationName] = useState<string | null>(null)

  const [chefFormData, setChefFormData] = useState<ChefSignupInput>({
    email: '',
    password: '',
    business_name: '',
    phone: ''
  })

  const [clientFormData, setClientFormData] = useState<ClientSignupInput>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    invitation_token: token || ''
  })

  // Check invitation if token present
  useEffect(() => {
    if (token) {
      getInvitationByToken(token)
        .then((invitation) => {
          if (invitation) {
            setInvitationEmail(invitation.email)
            setInvitationName(invitation.full_name || '')
            setClientFormData(prev => ({
              ...prev,
              email: invitation.email,
              full_name: invitation.full_name || '',
              invitation_token: token
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
      router.push('/auth/signin?message=Account created successfully')
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
      router.push('/auth/signin?message=Account created successfully')
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
        <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
            <p className="mt-4 text-stone-600">Loading invitation...</p>
          </div>
        </div>
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
                {error && (
                  <Alert variant="error">{error}</Alert>
                )}

                <Alert variant="info">
                  You&apos;ve been invited to join as a client.
                </Alert>

                <Input
                  type="text"
                  label="Full Name"
                  value={clientFormData.full_name}
                  onChange={(e) => setClientFormData({ ...clientFormData, full_name: e.target.value })}
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
                  onChange={(e) => setClientFormData({ ...clientFormData, password: e.target.value })}
                  required
                  helperText="Minimum 8 characters"
                  autoComplete="new-password"
                />
              </CardContent>

              <CardFooter>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={loading}
                >
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
          <p className="text-stone-600 mt-2">Start managing your private chef business</p>
        </div>

        <Card>
          <form onSubmit={handleChefSubmit}>
            <CardHeader>
              <CardTitle>Chef Sign Up</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <Alert variant="error">{error}</Alert>
              )}

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
                label="Business Name"
                value={chefFormData.business_name}
                onChange={(e) => setChefFormData({ ...chefFormData, business_name: e.target.value })}
                helperText="Optional — you can add this later"
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
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={loading}
              >
                Create Account
              </Button>

              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-stone-500">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                loading={googleLoading}
                onClick={async () => {
                  setGoogleLoading(true)
                  setError(null)
                  try {
                    await signInWithGoogle()
                  } catch (err) {
                    const error = err as Error
                    setError(error.message)
                    setGoogleLoading(false)
                  }
                }}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>

              <div className="text-sm text-center text-stone-600">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-brand-600 hover:text-brand-700 font-medium">
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

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}
