// Confirm Email Change Page
// Handles the verification link sent to the new email address.

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { confirmEmailChange } from '@/lib/auth/actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

function ConfirmEmailChangeContent() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') ?? null
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [newEmail, setNewEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid or missing confirmation link.')
      return
    }

    confirmEmailChange(token)
      .then((result) => {
        setStatus('success')
        setNewEmail(result.email)
        setMessage('Your email address has been updated successfully.')
      })
      .catch((err: any) => {
        setStatus('error')
        setMessage(err?.message || 'Failed to confirm email change.')
      })
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Change</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <p className="text-stone-400">Confirming your new email address...</p>
          )}

          {status === 'success' && (
            <>
              <Alert variant="success">
                {message}
                {newEmail && (
                  <span className="block mt-1 text-sm">
                    Your account email is now <strong>{newEmail}</strong>.
                  </span>
                )}
              </Alert>
              <Link
                href="/settings/account"
                className="block text-center text-sm text-brand-400 hover:text-brand-300"
              >
                Go to Account Settings
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <Alert variant="error">{message}</Alert>
              <Link
                href="/settings/account"
                className="block text-center text-sm text-stone-400 hover:text-stone-200"
              >
                Back to Account Settings
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ConfirmEmailChangePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-950">
          <p className="text-stone-400">Loading...</p>
        </div>
      }
    >
      <ConfirmEmailChangeContent />
    </Suspense>
  )
}
