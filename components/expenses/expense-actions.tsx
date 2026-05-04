// Expense Actions - Delete button with deferred undo
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { toast } from 'sonner'
import { deleteExpense } from '@/lib/expenses/actions'
import { useDeferredAction } from '@/lib/hooks/use-deferred-action'

type Props = {
  expenseId: string
}

export function ExpenseActions({ expenseId }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { execute: deferDelete } = useDeferredAction({
    delay: 8000,
    toastMessage: 'Expense deleted',
    onExecute: async () => {
      await deleteExpense(expenseId)
      router.push('/expenses')
    },
    onUndo: () => {
      setDeleted(false)
      setConfirming(false)
    },
    onError: (err: unknown) => {
      setDeleted(false)
      setConfirming(false)
      const message = err instanceof Error ? err.message : 'Failed to delete expense'
      setError(message)
      toast.error(message)
    },
  })

  const handleDelete = () => {
    setError(null)
    setDeleted(true)
    deferDelete()
  }

  if (deleted) {
    return (
      <Card className="p-6">
        <p className="text-sm text-stone-400">Expense will be deleted. Check the toast to undo.</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {!confirming ? (
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Delete Expense
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-stone-300">
            Delete this expense? You'll have 8 seconds to undo.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={handleDelete}>
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
