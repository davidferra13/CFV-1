// Sign In Page
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { flushSync } from 'react-dom'
import { signIn, type SignInInput } from '@/lib/auth/actions'
import { getLastActivePath, clearLastActivePath } from '@/lib/session/recovery'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { CenteredLoadingState, LoadingSpinner } from '@/components/ui/loading-state'

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

function SignInProgress({ stage }: { stage: Exclude<SignInStage, 'idle'> }) {
  return (
    <div
      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-center"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center justify-center gap-3">
        <LoadingSpinner size="sm" />
        <p className="text-sm font-medium text-stone-700">
          {stage === 'authenticating' ? 'Signing you in...' : 'Signed in successfully'}
        </p>
      </div>
    </div>
  )
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
  const callbackError = searchParams?.get('error') ?? null
  const callbackMessage = searchParams?.get('message') ?? null
  const explicitRedirect = searchParams?.get('redirect')
  const redirectPath = safeRedirectPath(explicitRedirect || getLastActivePath())

  useEffect(() => {
    setError(callbackError || null)
    setMessage(callbackMessage || null)
  }, [callbackError, callbackMessage])

  const isWorking = stage !== 'idle'
  const progressStage = stage === 'idle' ? null : stage

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
          <h1 className="text-3xl font-bold text-gradient">ChefFlow</h1>
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
              <Button type="submit" variant="primary" className="w-full" loading={isWorking}>
                {stage === 'redirecting'
                  ? 'Opening Workspace'
                  : isWorking
                    ? 'Signing In'
                    : 'Sign In'}
              </Button>

              {progressStage ? <SignInProgress stage={progressStage} /> : null}

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
