// Sign In Page
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn, type SignInInput } from '@/lib/auth/actions'
import { getLastActivePath, clearLastActivePath } from '@/lib/session/recovery'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

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

// Rotating transition messages shown after successful sign-in
const TRANSITION_MESSAGES = [
  'Signing you in...',
  'Loading your workspace...',
  'Preparing your portal...',
]

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [transitionMsg, setTransitionMsg] = useState(TRANSITION_MESSAGES[0])

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

  // Rotate transition messages while redirecting
  useEffect(() => {
    if (!transitioning) return
    let idx = 0
    const timer = setInterval(() => {
      idx = (idx + 1) % TRANSITION_MESSAGES.length
      setTransitionMsg(TRANSITION_MESSAGES[idx])
    }, 2000)
    return () => clearInterval(timer)
  }, [transitioning])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      await signIn(formData)
      clearLastActivePath()
      // Show full-screen transition overlay (never released, page navigates away)
      setTransitioning(true)
      router.push(redirectPath)
      router.refresh()
    } catch (err) {
      const error = err as Error
      setError(error.message)
      setLoading(false)
    }
  }

  // Full-screen transition overlay after successful sign-in
  if (transitioning) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center px-4 gap-6">
        <div className="relative">
          <div className="absolute inset-0 -m-4 rounded-full bg-brand-500/10 blur-2xl" />
          <div className="relative w-16 h-16 rounded-full bg-brand-600/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-brand-400 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" strokeDasharray="60 15" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div className="text-center space-y-2">
          <p
            key={transitionMsg}
            className="text-lg font-medium text-stone-200 animate-fade-slide-up"
          >
            {transitionMsg}
          </p>
          <p className="text-sm text-stone-500">This will only take a moment</p>
        </div>
        {/* Animated progress bar */}
        <div className="w-48">
          <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 animate-pulse"
              style={{ width: '65%', transition: 'width 2s ease-out' }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900">ChefFlow</h1>
          <p className="text-stone-600 mt-2">Sign in to your account</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
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
                required
                autoComplete="email"
              />

              <Input
                type="password"
                label="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                    className="h-4 w-4 rounded border-stone-300 text-brand-700 focus:ring-brand-500"
                  />
                  <span className="text-sm text-stone-600">Stay signed in</span>
                </label>

                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-brand-700 hover:text-brand-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Sign In
              </Button>

              <div className="text-sm text-center text-stone-600">
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="text-brand-700 hover:text-brand-700 font-medium"
                >
                  Chef sign up
                </Link>{' '}
                or{' '}
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

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-muted flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  )
}
