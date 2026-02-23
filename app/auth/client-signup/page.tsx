'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signUpClient, type ClientSignupInput } from '@/lib/auth/actions'
import { signInWithGoogle } from '@/lib/supabase/client'
import { getInvitationByToken } from '@/lib/auth/invitations'
import { Chrome } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

function ClientSignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams() ?? new URLSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [invitationLoading, setInvitationLoading] = useState(!!token)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<ClientSignupInput>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    invitation_token: token || '',
  })

  useEffect(() => {
    if (!token) {
      setInvitationLoading(false)
      return
    }

    getInvitationByToken(token)
      .then((invitation) => {
        if (!invitation) {
          setError('Invalid or expired invitation link.')
          return
        }

        setFormData((prev) => ({
          ...prev,
          email: invitation.email,
          full_name: invitation.full_name || '',
          invitation_token: token,
        }))
      })
      .catch(() => setError('Failed to load invitation'))
      .finally(() => setInvitationLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signUpClient(formData)
      router.push('/auth/signin')
    } catch (err) {
      const error = err as Error
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      const error = err as Error
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  if (invitationLoading) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto" />
          <p className="mt-4 text-stone-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900">ChefFlow</h1>
          <p className="text-stone-600 mt-2">Create your client account</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Client Sign Up</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}

              <Input
                type="text"
                label="Full Name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                autoFocus
              />

              <Input
                type="email"
                label="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!token}
                helperText={token ? 'This email is from your invitation' : undefined}
                required
              />

              <Input
                type="tel"
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                helperText="Optional"
              />

              <Input
                type="password"
                label="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                helperText="Minimum 8 characters"
                autoComplete="new-password"
              />
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Create Client Account
              </Button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-stone-500">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleGoogleSignUp}
                loading={googleLoading}
              >
                <Chrome className="mr-2 h-4 w-4" />
                Sign up with Google
              </Button>

              <div className="text-sm text-center text-stone-600">
                Already have an account?{' '}
                <Link
                  href="/auth/signin"
                  className="text-brand-600 hover:text-brand-700 font-medium"
                >
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function ClientSignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-muted flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
        </div>
      }
    >
      <ClientSignUpForm />
    </Suspense>
  )
}
