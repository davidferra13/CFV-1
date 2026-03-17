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
    // Parse as if relative to localhost — rejects anything with an external host
    const url = new URL(raw, 'http://localhost')
    if (url.origin !== 'http://localhost') return '/'
    return url.pathname + url.search
  } catch {
    return '/'
  }
}

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      await signIn(formData)
      clearLastActivePath()
      router.push(redirectPath)
      router.refresh()
    } catch (err) {
      const error = err as Error
      setError(error.message)
    } finally {
      setLoading(false)
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
