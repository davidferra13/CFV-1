'use client'

// Void Payment Panel - Shows recent offline payments with a void button
// Only displays offline (non-Stripe) payments. Voiding creates a reversal
// entry in the immutable ledger.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { voidOfflinePayment } from '@/lib/events/offline-payment-actions'

type LedgerEntry = {
  id: string
  entry_type: string
  amount_cents: number
  payment_method: string
  description: string
  is_refund: boolean
  received_at: string | null
  created_at: string
}

type Props = {
  eventId: string
  entries: LedgerEntry[]
}

export function VoidPaymentPanel({ eventId, entries }: Props) {
  const router = useRouter()
  const [voidingId, setVoidingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter to only non-refund offline payments
  const offlinePayments = entries.filter((e) => !e.is_refund && e.payment_method !== 'stripe')

  if (offlinePayments.length === 0) return null

  async function handleVoid(entryId: string) {
    if (!reason.trim()) {
      setError('Reason required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await voidOfflinePayment({ entryId, reason: reason.trim() })
      setVoidingId(null)
      setReason('')
      router.refresh()
    } catch (err) {
      setError((err as Error).message || 'Failed to void payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-stone-300 mb-3">Recorded Payments</h3>
      <div className="space-y-2">
        {offlinePayments.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-stone-800 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-stone-100">
                  {formatCurrency(entry.amount_cents)}
                </span>
                <span className="text-xs text-stone-500 capitalize">{entry.payment_method}</span>
                <span className="text-xs text-stone-600">{entry.entry_type}</span>
              </div>
              {entry.received_at && (
                <p className="text-xs text-stone-500 mt-0.5">
                  {new Date(entry.received_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {voidingId === entry.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for void"
                  className="w-40 px-2 py-1 text-xs border border-stone-600 rounded bg-stone-800 text-stone-100"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleVoid(entry.id)}
                  disabled={loading}
                >
                  {loading ? '...' : 'Void'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setVoidingId(null)
                    setReason('')
                    setError(null)
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setVoidingId(entry.id)}
                className="text-xs text-stone-500 hover:text-red-400"
              >
                Void
              </Button>
            )}
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </Card>
  )
}
