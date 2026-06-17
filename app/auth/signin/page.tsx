// Sign In Page
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { flushSync } from 'react-dom'
import { signIn as signInWithGoogle } from 'next-auth/react'
import { signIn, type SignInInput } from '@/lib/auth/actions'
import { getLastActivePath, clearLastActivePath } from '@/lib/session/recovery'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { CenteredLoadingState } from '@/components/ui/loading-state'

// Guard against open redirect: only allow same-origin paths (no external URLs)
function safeRedirectPath(raw: string | null): string {
  if (!raw) return '/'
  try {
    // Parse as if relative to localhost - rejects anything with an external host
    const url = new URL(raw, 'http://localhost')
    if (url.origin !== 'http://localhost') return '/'
    return url.pathname + url.search
  } catch {
    return '/'
  }
}

type SignInStage = 'idle' | 'authenticating' | 'redirecting'

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
  const searchParams = useSearchParams()
  const [stage, setStage] = useState<SignInStage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState<SignInInput>({
    email: '',
    password: '',
    rememberMe: true,
  })
  const [googleLoading, setGoogleLoading] = useState(false)
  const callbackError = searchParams?.get('error') ?? null
  const callbackMessage = searchParams?.get('message') ?? null
  const explicitRedirect = searchParams?.get('redirect')
  const redirectPath = safeRedirectPath(explicitRedirect || getLastActivePath())

  useEffect(() => {
    setError(callbackError || null)
    setMessage(callbackMessage || null)
  }, [callbackError, callbackMessage])

  const isWorking = stage !== 'idle' || googleLoading

  const handleGoogleSignIn = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      await signInWithGoogle('google', { callbackUrl: redirectPath })
    } catch (err) {
      setError('Failed to start Google sign in. Please try again.')
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setStage('authenticating')

    try {
      await signIn(formData)
      clearLastActivePath()
      flushSync(() => {
        setStage('redirecting')
      })
      // Hard navigation: sign-in crosses layout boundaries (auth -> chef/client)
      // and router.push() can't swap layout trees, leaving a blank page.
      window.location.href = redirectPath
    } catch (err) {
      const error = err as Error
      setError(normalizeAuthErrorMessage(error.message))
      setStage('idle')
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4 hero-glow">
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-100">ChefFlow</h1>
          <p className="text-stone-400 mt-2">Sign in to your account</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} aria-busy={isWorking}>
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
                disabled={isWorking}
                required
                autoComplete="email"
              />

              <Input
                type="password"
                label="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isWorking}
                required
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                    disabled={isWorking}
                    className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm text-stone-400">Stay signed in</span>
                </label>

                <Link
                  href="/auth/forgot-password"
                  className={`text-sm font-medium text-brand-400 hover:text-brand-300 ${
                    isWorking ? 'pointer-events-none opacity-60' : ''
                  }`}
                  aria-disabled={isWorking}
                  tabIndex={isWorking ? -1 : undefined}
                >
                  Forgot password?
                </Link>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" variant="primary" className="w-full" loading={stage !== 'idle'}>
                {stage === 'redirecting'
                  ? 'Signed in successfully'
                  : stage !== 'idle'
                    ? 'Signing In'
                    : 'Sign In'}
              </Button>

              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-stone-900 px-2 text-stone-500">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isWorking}
                loading={googleLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </Button>

              <div className="text-sm text-center text-stone-400">
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/signup"
                  className={`font-medium text-brand-400 hover:text-brand-300 ${
                    isWorking ? 'pointer-events-none opacity-60' : ''
                  }`}
                  aria-disabled={isWorking}
                  tabIndex={isWorking ? -1 : undefined}
                >
                  Chef sign up
                </Link>{' '}
                or{' '}
                <Link
                  href="/auth/client-signup"
                  className={`font-medium text-brand-400 hover:text-brand-300 ${
                    isWorking ? 'pointer-events-none opacity-60' : ''
                  }`}
                  aria-disabled={isWorking}
                  tabIndex={isWorking ? -1 : undefined}
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
        <CenteredLoadingState
          contextId="auth-sign-in"
          minHeightClassName="min-h-screen"
          className="bg-stone-950"
        />
      }
    >
      <SignInForm />
    </Suspense>
  )
}
