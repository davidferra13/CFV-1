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
type StepState = 'pending' | 'active' | 'complete'

const SLOW_SIGN_IN_MS = 4000

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

function formatElapsedMs(elapsedMs: number): string {
  if (elapsedMs < 10_000) {
    return `${(elapsedMs / 1000).toFixed(1)}s`
  }
  return `${Math.round(elapsedMs / 1000)}s`
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'complete') {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <svg
          className="h-3 w-3"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 6.5 4.5 9 10 3.5" />
        </svg>
      </span>
    )
  }

  if (state === 'active') {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <LoadingSpinner size="xs" className="text-current" />
      </span>
    )
  }

  return (
    <span className="h-5 w-5 rounded-full border border-stone-300 bg-white" aria-hidden="true" />
  )
}

function SignInProgress({
  stage,
  elapsedMs,
}: {
  stage: Exclude<SignInStage, 'idle'>
  elapsedMs: number
}) {
  const steps: Array<{
    title: string
    description: string
    state: StepState
  }> = [
    {
      title: 'Submitting sign-in request',
      description: 'Verifying your email and password.',
      state: stage === 'authenticating' ? 'active' : 'complete',
    },
    {
      title: 'Session established',
      description: 'Your authenticated session is ready.',
      state: stage === 'redirecting' ? 'complete' : 'pending',
    },
    {
      title: 'Opening your workspace',
      description:
        stage === 'redirecting'
          ? 'Redirecting to the next screen now.'
          : 'Waiting for the sign-in request to finish first.',
      state: stage === 'redirecting' ? 'active' : 'pending',
    },
  ]

  return (
    <div
      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-left"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-stone-900">
            {stage === 'authenticating' ? 'Signing you in' : 'Opening your workspace'}
          </p>
          <p className="text-xs text-stone-600">
            {stage === 'authenticating'
              ? 'Showing only the steps that have actually happened.'
              : 'Your session is ready. Waiting on the destination page to finish loading.'}
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium tabular-nums text-stone-600">
          {formatElapsedMs(elapsedMs)}
        </span>
      </div>

      <ol className="mt-3 space-y-2" aria-label="Live sign-in progress">
        {steps.map((step) => (
          <li key={step.title} className="flex items-start gap-3">
            <StepIcon state={step.state} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-800">{step.title}</p>
              <p className="text-xs text-stone-500">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      {elapsedMs >= SLOW_SIGN_IN_MS ? (
        <p className="mt-3 text-xs text-stone-500">
          Still working. Either the sign-in request or the redirect is taking longer than usual.
        </p>
      ) : null}
    </div>
  )
}

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [stage, setStage] = useState<SignInStage>('idle')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
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

  useEffect(() => {
    if (stage === 'idle' || startedAt === null) {
      setElapsedMs(0)
      return
    }

    const updateElapsed = () => setElapsedMs(Date.now() - startedAt)
    updateElapsed()
    const timer = window.setInterval(updateElapsed, 200)
    return () => window.clearInterval(timer)
  }, [stage, startedAt])

  const isWorking = stage !== 'idle'
  const progressStage = stage === 'idle' ? null : stage

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setStage('authenticating')
    setStartedAt(Date.now())

    try {
      await signIn(formData)
      clearLastActivePath()
      flushSync(() => {
        setStage('redirecting')
      })
      router.push(redirectPath)
      router.refresh()
    } catch (err) {
      const error = err as Error
      setError(normalizeAuthErrorMessage(error.message))
      setStage('idle')
      setStartedAt(null)
    }
  }

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900">ChefFlow</h1>
          <p className="text-stone-600 mt-2">Sign in to your account</p>
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
                    className="h-4 w-4 rounded border-stone-300 text-brand-700 focus:ring-brand-500"
                  />
                  <span className="text-sm text-stone-600">Stay signed in</span>
                </label>

                <Link
                  href="/auth/forgot-password"
                  className={`text-sm font-medium text-brand-700 hover:text-brand-700 ${
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

              {progressStage ? (
                <SignInProgress stage={progressStage} elapsedMs={elapsedMs} />
              ) : null}

              <div className="text-sm text-center text-stone-600">
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/signup"
                  className={`font-medium text-brand-700 hover:text-brand-700 ${
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
                  className={`font-medium text-brand-700 hover:text-brand-700 ${
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
          className="bg-surface-muted"
        />
      }
    >
      <SignInForm />
    </Suspense>
  )
}
