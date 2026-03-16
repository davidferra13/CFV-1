'use client'

import type { ReactNode } from 'react'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowRight,
  BadgeDollarSign,
  Chrome,
  ClipboardList,
  Repeat,
  ShieldCheck,
  Users,
} from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import {
  signUpChef,
  signUpClient,
  type ChefSignupInput,
  type ClientSignupInput,
} from '@/lib/auth/actions'
import {
  isGoogleAuthButtonEnabled,
  normalizeGoogleOAuthErrorMessage,
} from '@/lib/auth/google-oauth-errors'
import { getInvitationByToken } from '@/lib/auth/invitations'
import {
  normalizeAuthEmail,
  normalizeWebsiteSignupErrorMessage,
  validateWebsiteSignupInput,
} from '@/lib/auth/website-signup'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'
import { signInWithGoogle } from '@/lib/supabase/client'

const OPERATOR_SURFACES = [
  {
    icon: Users,
    title: 'Client memory that compounds',
    description:
      'Keep households, allergies, pricing history, and repeat-booking context in one durable record.',
  },
  {
    icon: ClipboardList,
    title: 'Execution outside the inbox',
    description:
      'Turn an inquiry into prep, shopping, staffing, packing, and service notes without losing context.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Margin visibility on real work',
    description:
      'Track groceries, labor, payouts, and repeat revenue so growth is measured against profit.',
  },
] as const

const OPERATOR_PROMISES = [
  'Start with email and password. Add the rest of your operator profile after you are inside.',
  'Keep marketplaces, referrals, and direct leads. ChefFlow is the operating layer behind them.',
  'Built for private chefs, caterers, meal prep operators, and chef-led hospitality teams.',
] as const

function buildRoleSelectionPath(options: {
  signupRef?: string
  sourceCta?: string
  sourcePage?: string
}) {
  const params = new URLSearchParams()

  if (options.signupRef) params.set('ref', options.signupRef)
  if (options.sourcePage) params.set('source_page', options.sourcePage)
  if (options.sourceCta) params.set('source_cta', options.sourceCta)

  const query = params.toString()
  return query ? `/auth/role-selection?${query}` : '/auth/role-selection'
}

function PropertyList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-7 text-stone-300">
          <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-brand-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = searchParams?.get('token')?.trim() || null
  const referralParam = searchParams?.get('ref')?.trim().toLowerCase() || ''
  const isBetaReferral = referralParam === 'beta'
  const prefillEmail = searchParams?.get('email')?.trim().toLowerCase() || ''
  const sourcePage = searchParams?.get('source_page')?.trim() || undefined
  const sourceCta = searchParams?.get('source_cta')?.trim() || undefined
  const resolvedSourcePage = sourcePage || (token ? 'client_invitation' : 'direct')

  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(Boolean(token))
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
  const pageViewName = token ? 'client_signup_invite' : 'operator_signup'
  const pageViewProperties = {
    surface: token ? 'client_invitation' : 'operator',
    source_page: resolvedSourcePage,
    ...(sourceCta ? { source_cta: sourceCta } : {}),
    ...(isBetaReferral ? { signup_ref: 'beta' } : {}),
    ...(prefillEmail ? { email_prefilled: true } : {}),
  }

  useEffect(() => {
    if (!token) return

    getInvitationByToken(token)
      .then((invitation) => {
        if (!invitation) {
          setError('Invalid or expired invitation')
          return
        }

        setInvitationEmail(invitation.email)
        setClientFormData((prev) => ({
          ...prev,
          email: invitation.email,
          full_name: invitation.full_name || '',
          invitation_token: token,
        }))
      })
      .catch(() => {
        setError('Failed to load invitation')
      })
      .finally(() => {
        setInvitationLoading(false)
      })
  }, [token])

  useEffect(() => {
    if (!token && prefillEmail) {
      setChefFormData((prev) => ({
        ...prev,
        email: prev.email || prefillEmail,
      }))
    }
  }, [token, prefillEmail])

  const handleChefSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
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
      source_page: resolvedSourcePage,
      source_cta: sourceCta || null,
      has_business_name: Boolean(chefFormData.business_name?.trim()),
      has_phone: Boolean(chefFormData.phone?.trim()),
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

  const handleClientSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
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
      source_page: resolvedSourcePage,
      source_cta: sourceCta || null,
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
      source_page: resolvedSourcePage,
      source_cta: sourceCta || null,
    })

    setGoogleLoading(true)
    try {
      await signInWithGoogle(
        buildRoleSelectionPath({
          signupRef: isBetaReferral ? 'beta' : undefined,
          sourcePage: resolvedSourcePage,
          sourceCta,
        })
      )
    } catch (err) {
      const oauthError = err as Error
      setError(normalizeGoogleOAuthErrorMessage(oauthError.message))
      setGoogleLoading(false)
    }
  }

  if (token && invitationLoading) {
    return (
      <>
        <PublicPageView pageName={pageViewName} properties={pageViewProperties} />
        <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-brand-600" />
            <p className="mt-4 text-stone-400">Loading invitation...</p>
          </div>
        </div>
      </>
    )
  }

  if (token) {
    return (
      <>
        <PublicPageView pageName={pageViewName} properties={pageViewProperties} />
        <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-stone-100">ChefFlow</h1>
              <p className="mt-2 text-stone-400">Complete your client registration</p>
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
                    name="fullName"
                    value={clientFormData.full_name}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setClientFormData({ ...clientFormData, full_name: event.target.value })
                    }
                    required
                    autoFocus
                  />

                  <Input
                    type="email"
                    label="Email"
                    name="email"
                    value={clientFormData.email}
                    disabled
                    helperText="This email is from your invitation."
                  />

                  <Input
                    type="tel"
                    label="Phone"
                    name="phone"
                    value={clientFormData.phone}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setClientFormData({ ...clientFormData, phone: event.target.value })
                    }
                    helperText="Optional"
                  />

                  <Input
                    type="password"
                    label="Password"
                    name="password"
                    value={clientFormData.password}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setClientFormData({ ...clientFormData, password: event.target.value })
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
      </>
    )
  }

  return (
    <>
      <PublicPageView pageName={pageViewName} properties={pageViewProperties} />
      <div className="min-h-screen overflow-x-clip bg-stone-950">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[105px]" />
        <div className="pointer-events-none absolute right-0 top-16 h-[320px] w-[360px] rounded-full bg-brand-800/20 blur-[75px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[260px] w-[320px] rounded-full bg-orange-950/20 blur-[80px]" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:py-18 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] lg:items-center lg:px-8">
          <section>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-brand-700/60 bg-brand-950/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-200">
                Operator sign up
              </span>
              <span className="rounded-full border border-stone-700 bg-stone-900/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-stone-300">
                Built for chef-led operations
              </span>
            </div>

            <h1 className="mt-6 max-w-4xl fluid-display-xl font-display tracking-tight text-stone-100">
              Start the system behind your bookings, not just another account.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-stone-300 md:text-lg">
              ChefFlow is where private chefs, caterers, and chef-led teams run the work that
              compounds after the inquiry lands: client memory, event execution, repeat business,
              and margin control.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {OPERATOR_SURFACES.map((item) => {
                const Icon = item.icon

                return (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-stone-700 bg-stone-900/80 p-5 shadow-[var(--shadow-card)]"
                  >
                    <div className="inline-flex rounded-xl bg-brand-950 p-2.5 text-brand-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-stone-100">{item.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-stone-300">{item.description}</p>
                  </article>
                )
              })}
            </div>

            <div className="mt-8 rounded-3xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                What changes here
              </p>
              <h2 className="mt-3 text-2xl font-display tracking-tight text-stone-100">
                The first booking should not disappear into inbox fragments.
              </h2>
              <div className="mt-5">
                <PropertyList items={OPERATOR_PROMISES} />
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/marketplace-chefs"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-brand-300 transition-colors hover:text-brand-200"
                >
                  Review the operator workflow
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="inline-flex items-center gap-2 text-sm text-stone-400">
                  <Repeat className="h-4 w-4 text-brand-300" />
                  Repeat work gets easier when the system remembers.
                </div>
              </div>
            </div>
          </section>

          <aside>
            <Card className="overflow-hidden border-stone-700 bg-stone-900/90">
              <form onSubmit={handleChefSubmit}>
                <CardHeader className="border-stone-700/80">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                    Create operator account
                  </p>
                  <CardTitle className="mt-2 text-2xl font-display tracking-tight">
                    Start with the minimum needed.
                  </CardTitle>
                  <p className="mt-3 text-sm leading-7 text-stone-300">
                    Email and password get you in. Name and phone stay optional until you need them.
                  </p>
                </CardHeader>

                <CardContent className="space-y-4 pt-5">
                  {error && <Alert variant="error">{error}</Alert>}
                  {isBetaReferral && (
                    <Alert variant="info">
                      This signup is linked to your beta invitation and will be tracked
                      automatically.
                    </Alert>
                  )}
                  <Alert variant="info">
                    Recommended path: create your account with email first, then finish setup inside
                    ChefFlow.
                  </Alert>

                  <Input
                    type="email"
                    label="Email"
                    name="email"
                    value={chefFormData.email}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setChefFormData({ ...chefFormData, email: event.target.value })
                    }
                    required
                    autoComplete="email"
                    autoFocus
                    helperText={prefillEmail ? 'Pre-filled from your invite link.' : undefined}
                  />

                  <Input
                    type="password"
                    label="Password"
                    name="password"
                    value={chefFormData.password}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setChefFormData({ ...chefFormData, password: event.target.value })
                    }
                    required
                    helperText="Minimum 8 characters"
                    autoComplete="new-password"
                  />

                  <details className="rounded-2xl border border-stone-700 bg-stone-950/70 p-4">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-stone-100">
                      Optional operator details
                    </summary>
                    <p className="mt-2 text-sm leading-6 text-stone-400">
                      Add these now if you want the account to be pre-shaped before onboarding.
                    </p>

                    <div className="mt-4 space-y-4">
                      <Input
                        type="text"
                        label="Your Name or Business Name"
                        name="businessName"
                        value={chefFormData.business_name}
                        disabled={isSubmitting}
                        onChange={(event) =>
                          setChefFormData({
                            ...chefFormData,
                            business_name: event.target.value,
                          })
                        }
                        helperText="A personal name works fine if you are solo."
                      />

                      <Input
                        type="tel"
                        label="Phone"
                        name="phone"
                        value={chefFormData.phone}
                        disabled={isSubmitting}
                        onChange={(event) =>
                          setChefFormData({ ...chefFormData, phone: event.target.value })
                        }
                        helperText="Optional"
                      />
                    </div>
                  </details>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                  <Button type="submit" variant="primary" className="w-full" loading={loading}>
                    Create account with email
                  </Button>

                  {showGoogleAuth && (
                    <>
                      <div className="relative my-2 w-full">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-stone-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-stone-800 px-2 text-stone-400">Optional</span>
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
                        Sign up with Google
                      </Button>
                    </>
                  )}

                  <div className="w-full border-t border-stone-700 pt-4 text-center text-sm text-stone-400">
                    Already have an account?{' '}
                    <Link
                      href="/auth/signin"
                      className="font-medium text-brand-500 hover:text-brand-400"
                    >
                      Sign in
                    </Link>
                    <span className="mx-1">|</span>
                    <Link
                      href="/auth/client-signup"
                      className="font-medium text-brand-500 hover:text-brand-400"
                    >
                      Client sign up
                    </Link>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </aside>
        </div>
      </div>
    </>
  )
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-950">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand-600" />
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  )
}
