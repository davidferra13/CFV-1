// Staff Login Page — Limited portal for kitchen/service staff
'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, type SignInInput } from '@/lib/auth/actions'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

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

function StaffLoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<SignInInput>({
    email: '',
    password: '',
    rememberMe: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signIn(formData)
      router.push('/staff-dashboard')
      router.refresh()
    } catch (err) {
      const error = err as Error
      setError(normalizeAuthErrorMessage(error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-100">ChefFlow</h1>
          <p className="text-stone-400 mt-2">Staff Portal</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Staff Sign In</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
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

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-stone-400">Stay signed in</span>
              </label>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Sign In
              </Button>

              <p className="text-xs text-center text-stone-500">
                This portal is for staff members only. If you are a chef, please use the{' '}
                <a href="/auth/signin" className="text-brand-600 hover:text-brand-400">
                  main sign in
                </a>
                .
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-800 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
        </div>
      }
    >
      <StaffLoginForm />
    </Suspense>
  )
}
