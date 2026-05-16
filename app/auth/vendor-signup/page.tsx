'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { claimVendorInvite } from '@/lib/vendors/invite-actions'
import { signIn } from '@/lib/auth/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

function VendorSignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false)

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invite Link</CardTitle>
            <CardDescription>
              This vendor invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/signin" className="text-sm text-blue-600 hover:underline">
              Go to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await claimVendorInvite(token!, email, password, acceptedLegalTerms)

      if ('error' in result) {
        setError(result.error)
        setLoading(false)
        return
      }

      await signIn({ email, password, rememberMe: true })
      router.push('/vendor/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vendor Portal Signup</CardTitle>
          <CardDescription>
            Create your account to access purchase orders, invoices, and pricing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                minLength={8}
              />
            </div>
            <label className="flex items-start gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={acceptedLegalTerms}
                onChange={(e) => setAcceptedLegalTerms(e.target.checked)}
                required
                className="mt-1"
              />
              <span>
                I accept the ChefFlow{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link href="/vendor-agreement" className="text-blue-600 hover:underline">
                  Vendor Agreement
                </Link>
                .
              </span>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-stone-500">
            Already have an account?{' '}
            <Link href="/auth/signin?portal=vendor" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VendorSignupPage() {
  return (
    <Suspense>
      <VendorSignupForm />
    </Suspense>
  )
}
