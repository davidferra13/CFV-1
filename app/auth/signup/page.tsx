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
import { signInWithGoogle } from '@/lib/supabase/client'
import {
  isGoogleAuthButtonEnabled,
  normalizeGoogleOAuthErrorMessage,
} from '@/lib/auth/google-oauth-errors'
import {
  normalizeAuthEmail,
  normalizeWebsiteSignupErrorMessage,
  validateWebsiteSignupInput,
} from '@/lib/auth/website-signup'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'
import { getInvitationByToken } from '@/lib/auth/invitations'
import { Chrome } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams() ?? new URLSearchParams()
  const token = searchParams.get('token')
  const referralParam = searchParams.get('ref')?.trim().toLowerCase() || ''
  const isBetaReferral = referralParam === 'beta'
  const prefillEmail = searchParams.get('email')?.trim().toLowerCase() || ''

  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(!!token)
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null)

  const [chefFormData, setChefFormData] = useState<ChefSignupInput>({
    email: prefillEmail,
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

  const showGoogleAuth = isGoogleAuthButtonEnabled()
  const isSubmitting = loading || googleLoading

  useEffect(() => {
    if (!token) return

    getInvitationByToken(token)
      .then((invitation) => {
        if (invitation) {
          setInvitationEmail(invitation.email)
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
  }, [token])

  // Preserve beta invite context by pre-filling email when provided via query params.
  useEffect(() => {
    if (!token && prefillEmail) {
      setChefFormData((prev) => ({
        ...prev,
        email: prev.email || prefillEmail,
      }))
    }
  }, [token, prefillEmail])

  const handleChefSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setError(null)

    const normalizedEmail = normalizeAuthEmail(chefFormData.email)
    const validationError = validateWebsiteSignupInput({
      email: normalizedEmail,
      password: chefFormData.password,
    })
    if (validationError) {
      setError(validationError)
      return
    }

    trackEvent(ANALYTICS_EVENTS.SIGNUP_STARTED, {
      role: 'chef',
      method: 'email',
      source: isBetaReferral ? 'beta' : 'website',
    })

    setLoading(true)
    try {
      await signUpChef({
        ...chefFormData,
        email: normalizedEmail,
        business_name: chefFormData.business_name?.trim(),
        phone: chefFormData.phone?.trim(),
        signup_ref: isBetaReferral ? 'beta' : undefined,
      })
      router.push('/auth/signin?redirect=/onboarding')
    } catch (err) {
      const actionError = err as Error
      setError(normalizeWebsiteSignupErrorMessage(actionError.message))
    } finally {
      setLoading(false)
    }
  }

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setError(null)

    const normalizedEmail = normalizeAuthEmail(clientFormData.email)
    const validationError = validateWebsiteSignupInput({
      email: normalizedEmail,
      password: clientFormData.password,
      fullName: clientFormData.full_name,
      invitationEmail: invitationEmail || undefined,
    })
    if (validationError) {
      setError(validationError)
      return
    }

    trackEvent(ANALYTICS_EVENTS.SIGNUP_STARTED, {
      role: 'client',
      method: 'email',
      source: token ? 'invitation' : 'website',
    })

    setLoading(true)
    try {
      await signUpClient({
        ...clientFormData,
        email: normalizedEmail,
        full_name: clientFormData.full_name.trim(),
        phone: clientFormData.phone?.trim(),
      })
      router.push('/auth/signin')
    } catch (err) {
      const actionError = err as Error
      setError(normalizeWebsiteSignupErrorMessage(actionError.message))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    if (isSubmitting) return
    setError(null)
    trackEvent(ANALYTICS_EVENTS.SIGNUP_STARTED, {
      role: 'chef',
      method: 'google',
      source: isBetaReferral ? 'beta' : 'website',
    })
    setGoogleLoading(true)
    try {
      await signInWithGoogle(
        isBetaReferral ? '/auth/role-selection?ref=beta' : '/auth/role-selection'
      )
    } catch (err) {
      const oauthError = err as Error
      setError(normalizeGoogleOAuthErrorMessage(oauthError.message))
      setGoogleLoading(false)
    }
  }

  // Client signup (invitation-based)
  if (token) {
    if (invitationLoading) {
      return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
            <p className="mt-4 text-stone-400">Loading invitation...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-stone-100">ChefFlow</h1>
            <p className="text-stone-400 mt-2">Complete your client registration</p>
          </div>

          <Card>
            <form onSubmit={handleClientSubmit}>
              <CardHeader>
                <CardTitle>Client Sign Up</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                <Alert variant="info">You were invited to join as a client.</Alert>

                <Input
                  type="text"
                  label="Full Name"
                  value={clientFormData.full_name}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
                  helperText="Optional"
                />

                <Input
                  type="password"
                  label="Password"
                  value={clientFormData.password}
                  disabled={isSubmitting}
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
                  Create account with email
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
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-100">ChefFlow</h1>
          <p className="text-stone-400 mt-2">Manage your chef work, your way</p>
        </div>

        <Card>
          <form onSubmit={handleChefSubmit}>
            <CardHeader>
              <CardTitle>Chef Sign Up</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}
              {isBetaReferral && (
                <Alert variant="info">
                  This signup is linked to your beta invitation and will be tracked automatically.
                </Alert>
              )}
              <Alert variant="info">
                Recommended: create your account with email and password.
              </Alert>

              <Input
                type="email"
                label="Email"
                value={chefFormData.email}
                disabled={isSubmitting}
                onChange={(e) => setChefFormData({ ...chefFormData, email: e.target.value })}
                required
                autoComplete="email"
                autoFocus
                helperText={prefillEmail ? 'Pre-filled from your beta invite link' : undefined}
              />

              <Input
                type="password"
                label="Password"
                value={chefFormData.password}
                disabled={isSubmitting}
                onChange={(e) => setChefFormData({ ...chefFormData, password: e.target.value })}
                required
                helperText="Minimum 8 characters"
                autoComplete="new-password"
              />

              <Input
                type="text"
                label="Your Name or Business Name"
                value={chefFormData.business_name}
                disabled={isSubmitting}
                onChange={(e) =>
                  setChefFormData({ ...chefFormData, business_name: e.target.value })
                }
                helperText="How you want to appear in ChefFlow - a personal name works perfectly."
              />

              <Input
                type="tel"
                label="Phone"
                value={chefFormData.phone}
                disabled={isSubmitting}
                onChange={(e) => setChefFormData({ ...chefFormData, phone: e.target.value })}
                helperText="Optional"
              />
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Create account with email
              </Button>

              {showGoogleAuth && (
                <>
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-stone-900 px-2 text-stone-400">Optional</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={handleGoogleSignUp}
                    loading={googleLoading}
                    disabled={loading}
                  >
                    <Chrome className="mr-2 h-4 w-4" />
                    Sign up with Google (optional)
                  </Button>
                </>
              )}

              <div className="text-sm text-center text-stone-400">
                Already have an account?{' '}
                <Link
                  href="/auth/signin"
                  className="text-brand-600 hover:text-brand-400 font-medium"
                >
                  Sign in
                </Link>
                <span className="mx-1">|</span>
                <Link
                  href="/auth/client-signup"
                  className="text-brand-600 hover:text-brand-400 font-medium"
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
        <div className="min-h-screen bg-stone-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  )
}
