// Reset Password Page - Set new password after clicking reset link
'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { updatePassword } from '@/lib/auth/actions'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const recoveryToken = searchParams?.get('token') ?? null
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    !recoveryToken ? 'Invalid or missing reset link. Please request a new one.' : null
  )
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!recoveryToken) {
      setError('Invalid or missing reset link. Please request a new one.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters')
      return
    }

    setLoading(true)

    try {
      await updatePassword(password, recoveryToken)
      setSuccess(true)
      setTimeout(() => {
        router.push('/auth/signin?message=Password updated successfully')
      }, 2000)
    } catch (err) {
      const error = err as Error
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-stone-900">ChefFlow</h1>
            <p className="text-stone-600 mt-2">Password updated</p>
          </div>

          <Card>
            <CardContent className="space-y-4 py-6">
              <Alert variant="success">
                Your password has been updated successfully. Redirecting you to sign in...
              </Alert>
            </CardContent>

            <CardFooter>
              <Link href="/auth/signin" className="w-full">
                <Button variant="primary" className="w-full">
                  Go to Sign In
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900">ChefFlow</h1>
          <p className="text-stone-600 mt-2">Set your new password</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}

              <Input
                type="password"
                label="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!recoveryToken}
                helperText="Minimum 12 characters. Passphrases welcome."
                autoComplete="new-password"
                autoFocus
              />

              <Input
                type="password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={!recoveryToken}
                autoComplete="new-password"
              />
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={loading}
                disabled={!recoveryToken}
              >
                Update Password
              </Button>

              <div className="text-sm text-center text-stone-600">
                <Link
                  href="/auth/signin"
                  className="text-brand-700 hover:text-brand-700 font-medium"
                >
                  Back to Sign In
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
