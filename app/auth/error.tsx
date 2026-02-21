'use client'

// Auth Flow Error Boundary
// Catches errors within the auth/ route group (sign-in, sign-up, password reset).
// Keeps the user on a friendly page rather than a blank crash screen.

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Auth Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 w-16 h-16 flex items-center justify-center rounded-full bg-amber-100">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <CardTitle className="text-xl">Authentication Error</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            There was a problem with this page. Please try again.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {error.digest && (
            <div className="bg-stone-100 rounded-md p-2.5">
              <p className="text-xs text-stone-500">Error ID: {error.digest}</p>
            </div>
          )}
          <Button variant="primary" onClick={reset} className="w-full">
            Try Again
          </Button>
          <Link href="/auth/login" className="block">
            <Button variant="secondary" className="w-full">
              Back to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
