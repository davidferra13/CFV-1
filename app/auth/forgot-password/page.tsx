// Forgot Password Page - Request password reset email
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/auth/actions'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await requestPasswordReset(email)
      setSuccess(true)
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
            <p className="text-stone-600 mt-2">Check your email</p>
          </div>

          <Card>
            <CardContent className="space-y-4 py-6">
              <Alert variant="success">
                If an account exists for that email, you will receive a password reset link shortly.
              </Alert>

              <p className="text-sm text-stone-600 text-center">
                Didn&apos;t receive an email? Check your spam folder or try again with a different
                email address.
              </p>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setSuccess(false)
                  setEmail('')
                }}
              >
                Try Again
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
          <p className="text-stone-600 mt-2">Reset your password</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Forgot Password</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}

              <p className="text-sm text-stone-600">
                Enter the email address associated with your account and we&apos;ll send you a link
                to reset your password.
              </p>

              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Send Reset Link
              </Button>

              <div className="text-sm text-center text-stone-600">
                Remember your password?{' '}
                <Link
                  href="/auth/signin"
                  className="text-brand-700 hover:text-brand-700 font-medium"
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
