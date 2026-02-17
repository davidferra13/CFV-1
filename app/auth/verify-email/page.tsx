// Verify Email Page
// Shown after signup to instruct user to check their email

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Verify Email - ChefFlow' }
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900">ChefFlow</h1>
          <p className="text-stone-600 mt-2">Almost there!</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Check Your Email</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-stone-700">
              Check your email to verify your account. Click the link in your email to complete registration.
            </p>
            <p className="text-sm text-stone-500">
              If you don&apos;t see the email, check your spam folder. The verification link will expire after 24 hours.
            </p>
          </CardContent>

          <CardFooter>
            <div className="w-full text-sm text-center text-stone-600">
              Already verified?{' '}
              <Link href="/auth/signin" className="text-brand-600 hover:text-brand-700 font-medium">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
