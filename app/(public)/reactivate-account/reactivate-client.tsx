'use client'

import { useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { cancelAccountDeletion } from '@/lib/compliance/account-deletion-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { CheckCircle2 } from '@/components/ui/icons'

export function ReactivateAccountClient() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') ?? null
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-stone-300">
            No reactivation token found. Please use the link from your deletion confirmation email.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (success) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <div>
            <p className="text-lg font-medium text-stone-100">Account Reactivated</p>
            <p className="text-stone-300 mt-1">
              Your account has been restored. You can now sign in again.
            </p>
          </div>
          <Button variant="primary" href="/auth/signin">
            Sign In
          </Button>
        </CardContent>
      </Card>
    )
  }

  const handleReactivate = () => {
    setError(null)
    startTransition(async () => {
      try {
        await cancelAccountDeletion(token)
        setSuccess(true)
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cancel Deletion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <p className="text-sm text-stone-300">
          Your account is scheduled for deletion. Click below to cancel the deletion and restore
          full access to your account.
        </p>

        <Button onClick={handleReactivate} loading={isPending} variant="primary">
          Reactivate My Account
        </Button>
      </CardContent>
    </Card>
  )
}
