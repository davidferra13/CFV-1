// Sign In Page
'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn, type SignInInput } from '@/lib/auth/actions'
import { signInWithGoogle } from '@/lib/supabase/client'
import {
  isGoogleAuthButtonEnabled,
  normalizeGoogleOAuthErrorMessage,
} from '@/lib/auth/google-oauth-errors'
import { Chrome } from '@/components/ui/icons'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

// Guard against open redirect: only allow same-origin paths (no external URLs)
function safeRedirectPath(raw: string | null): string {
  if (!raw) return '/'
  try {
    // Parse as if relative to localhost — rejects anything with an external host
    const url = new URL(raw, 'http://localhost')
    if (url.origin !== 'http://localhost') return '/'
    return url.pathname + url.search
  } catch {
    return '/'
  }
}

function normalizeAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase()
  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch failed') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed')
  ) {
    return 'Connection issue while signing in. Please confirm the app server is running and try again.'
  }
  return message
}

function SignInForm() {
  const router = useRouter()
  const rawSearchParams = useSearchParams()
  const searchParams = useMemo(() => rawSearchParams ?? new URLSearchParams(), [rawSearchParams])
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [busyPhase, setBusyPhase] = useState<'idle' | 'credentials' | 'routing' | 'google'>('idle')
  const [showSlowNotice, setShowSlowNotice] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState<SignInInput>({
    email: '',
    password: '',
    rememberMe: true,
  })
  const showGoogleAuth = isGoogleAuthButtonEnabled()
  const redirectPath = safeRedirectPath(searchParams.get('redirect'))
  const isBusy = loading || googleLoading

  useEffect(() => {
    const callbackError = searchParams.get('error')
    const callbackMessage = searchParams.get('message')
    setError(callbackError || null)
    setMessage(callbackMessage || null)
  }, [searchParams])

  useEffect(() => {
    if (!isBusy) {
      setShowSlowNotice(false)
      return
    }

    const timer = window.setTimeout(() => setShowSlowNotice(true), 4000)
    return () => window.clearTimeout(timer)
  }, [isBusy])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    setBusyPhase('credentials')

    try {
      const result = await signIn(formData)
      setBusyPhase('routing')
      const destination = redirectPath === '/' ? result.destination : redirectPath
      router.replace(destination)
      return
    } catch (err) {
      const error = err as Error
      setLoading(false)
      setBusyPhase('idle')
      setError(normalizeAuthErrorMessage(error.message))
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setMessage(null)
    setGoogleLoading(true)
    setBusyPhase('google')
    try {
      await signInWithGoogle(redirectPath)
      // signInWithGoogle redirects, so no navigation or state change is needed here on success
    } catch (err) {
      const error = err as Error
      setBusyPhase('idle')
      setError(normalizeGoogleOAuthErrorMessage(normalizeAuthErrorMessage(error.message)))
      setGoogleLoading(false)
    }
  }

  const busyTitle =
    busyPhase === 'routing'
      ? 'Loading your workspace...'
      : busyPhase === 'google'
        ? 'Redirecting to Google...'
        : 'Signing you in...'
  const busyBody =
    busyPhase === 'routing'
      ? 'Your account is authenticated. Beta is opening the right dashboard now.'
      : busyPhase === 'google'
        ? 'Please keep this tab open while we hand off to Google sign-in.'
        : 'Please keep this tab open while we verify your account.'

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Warm radial glow behind the card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-brand-500/[0.04] blur-[100px]" />
      </div>
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-100">ChefFlow</h1>
          <p className="text-stone-400 mt-2">Sign in to your account</p>
        </div>

        <Card className="relative overflow-hidden">
          {isBusy && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-950/85 px-6 text-center backdrop-blur-sm">
              <div role="status" aria-live="polite" className="max-w-xs space-y-3">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-stone-700 border-t-brand-500" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-stone-100">{busyTitle}</p>
                  <p className="text-sm text-stone-300">{busyBody}</p>
                </div>
                {showSlowNotice && (
                  <p className="text-xs text-amber-200">
                    This is taking longer than normal on beta, but the sign-in request is still in
                    progress.
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} aria-busy={isBusy}>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {message && <Alert variant="success">{message}</Alert>}

              {error && <Alert variant="error">{error}</Alert>}

              <Input
                type="email"
                label="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isBusy}
                required
                autoComplete="email"
              />

              <Input
                type="password"
                label="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isBusy}
                required
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between">
                <label
                  htmlFor="remember-me"
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                    disabled={isBusy}
                    className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-stone-400">Stay signed in</span>
                </label>

                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-brand-600 hover:text-brand-400 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              {showGoogleAuth && (
                <>
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-stone-900 px-2 text-stone-400">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    loading={googleLoading}
                  >
                    <Chrome className="mr-2 h-4 w-4" />
                    {googleLoading ? 'Opening Google...' : 'Sign in with Google'}
                  </Button>
                </>
              )}

              <div className="text-sm text-center text-stone-400">
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="text-brand-600 hover:text-brand-400 font-medium"
                >
                  Chef sign up
                </Link>{' '}
                or{' '}
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

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  )
}
