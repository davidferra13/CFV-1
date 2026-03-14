'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  chefId: string
}

/**
 * Card shown on the delete account page when deletion is already pending.
 * Allows the chef to cancel the deletion request and keep their account.
 */
export function CancelDeletionCard({ chefId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleCancel = () => {
    setError(null)
    startTransition(async () => {
      try {
        // Use the server action that looks up the chef's reactivation token
        const { cancelDeletionByChefId } = await import('@/lib/compliance/account-deletion-actions')
        await cancelDeletionByChefId(chefId)
        setSuccess(true)
        router.refresh()
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  if (success) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <div>
            <p className="text-lg font-medium text-stone-100">Deletion Cancelled</p>
            <p className="text-stone-400 mt-1">
              Your account is safe. All your data has been preserved.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cancel Deletion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <p className="text-sm text-stone-400">
          Changed your mind? Cancel the deletion request to keep your account and all your data. You
          can always request deletion again later.
        </p>

        <Button onClick={handleCancel} loading={isPending} variant="primary">
          Keep My Account
        </Button>
      </CardContent>
    </Card>
  )
}
