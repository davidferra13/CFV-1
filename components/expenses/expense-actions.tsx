// Expense Actions — Delete button with confirmation
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { deleteExpense } from '@/lib/expenses/actions'

type Props = {
  expenseId: string
}

export function ExpenseActions({ expenseId }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      await deleteExpense(expenseId)
      router.push('/expenses')
    } catch (err: any) {
      setError(err.message || 'Failed to delete expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {!confirming ? (
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Delete Expense
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-stone-700">
            Are you sure you want to delete this expense? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={handleDelete} loading={loading}>
              Yes, Delete
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
