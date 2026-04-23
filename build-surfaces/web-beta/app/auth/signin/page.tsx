'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, type SignInInput } from '@/lib/auth/actions'
import { clearLastActivePath, getLastActivePath } from '@/lib/session/recovery'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function safeRedirectPath(raw: string | null): string {
  if (!raw) return '/'

  try {
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
  const portal = searchParams?.get('portal')?.trim().toLowerCase() || 'chef'

  useEffect(() => {
    setError(callbackError || null)
    setMessage(callbackMessage || null)
  }, [callbackError, callbackMessage])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      await signIn(formData)
      clearLastActivePath()
      router.push(redirectPath)
      router.refresh()
    } catch (submitError) {
      setError((submitError as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-10 text-stone-100">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="text-center">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-300"
          >
            ChefFlow Beta
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-stone-50">Sign in</h1>
          <p className="mt-2 text-sm text-stone-400">
            {portal === 'client'
              ? 'Client beta access is limited to invited accounts.'
              : 'Operator beta access is limited to invited accounts.'}
          </p>
        </div>

        <Card className="border-stone-800 bg-stone-900/80 text-stone-100">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Account access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {message ? <Alert variant="success">{message}</Alert> : null}
              {error ? <Alert variant="error">{error}</Alert> : null}

              <Input
                type="email"
                label="Email"
                value={formData.email}
                onChange={(inputEvent) =>
                  setFormData((current) => ({ ...current, email: inputEvent.target.value }))
                }
                required
                autoComplete="email"
              />

              <Input
                type="password"
                label="Password"
                value={formData.password}
                onChange={(inputEvent) =>
                  setFormData((current) => ({ ...current, password: inputEvent.target.value }))
                }
                required
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-400">
                  <input
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(inputEvent) =>
                      setFormData((current) => ({
                        ...current,
                        rememberMe: inputEvent.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-stone-600 bg-stone-950 text-brand-600"
                  />
                  Stay signed in
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-brand-300 hover:text-brand-200"
                >
                  Forgot password?
                </Link>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Sign In
              </Button>
              <div className="text-center text-sm text-stone-400">
                Need access?{' '}
                <Link
                  href="/beta?source_page=signin&source_cta=request_access"
                  className="font-medium text-brand-300 hover:text-brand-200"
                >
                  Request beta access
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function WebBetaSignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-950">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand-500" />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  )
}
