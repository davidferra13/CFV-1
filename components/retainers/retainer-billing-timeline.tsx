'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PeriodStatusBadge } from '@/components/retainers/retainer-status-badge'
import { formatCurrency } from '@/lib/utils/currency'
import { recordRetainerPayment } from '@/lib/retainers/actions'

type Period = {
  id: string
  period_start: string
  period_end: string
  status: string
  amount_cents: number
  events_used: number
  hours_used: number | string
  paid_at: string | null
}

type RetainerBillingTimelineProps = {
  periods: Period[]
  retainerId: string
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card' },
  { value: 'paypal', label: 'PayPal' },
]

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function RetainerBillingTimeline({ periods, retainerId }: RetainerBillingTimelineProps) {
  const router = useRouter()
  const [payingPeriodId, setPayingPeriodId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRecordPayment(periodId: string) {
    setError(null)
    setLoading(true)
    try {
      await recordRetainerPayment(periodId, paymentMethod, paymentNotes || undefined)
      setPayingPeriodId(null)
      setPaymentMethod('cash')
      setPaymentNotes('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  if (periods.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-stone-500">
          No billing periods yet. Activate the retainer to generate the first period.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-950 text-red-200 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {periods.map((period) => (
        <Card key={period.id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-stone-100">
                  {formatDate(period.period_start)} &ndash; {formatDate(period.period_end)}
                </span>
                <PeriodStatusBadge status={period.status} />
              </div>

              <div className="flex items-center gap-4 text-xs text-stone-500">
                <span>{formatCurrency(period.amount_cents)}</span>
                {period.events_used > 0 && (
                  <span>
                    {period.events_used} event{period.events_used !== 1 ? 's' : ''}
                  </span>
                )}
                {Number(period.hours_used) > 0 && (
                  <span>
                    {period.hours_used} hr{Number(period.hours_used) !== 1 ? 's' : ''}
                  </span>
                )}
                {period.paid_at && (
                  <span>
                    Paid{' '}
                    {new Date(period.paid_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </div>

            {(period.status === 'pending' || period.status === 'overdue') && (
              <div>
                {payingPeriodId === period.id ? (
                  <Button variant="ghost" size="sm" onClick={() => setPayingPeriodId(null)}>
                    Cancel
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPayingPeriodId(period.id)}
                  >
                    Record Payment
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Inline payment form */}
          {payingPeriodId === period.id && (
            <div className="mt-3 pt-3 border-t border-stone-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-lg border border-stone-600 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Notes <span className="text-stone-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Reference, memo..."
                    className="w-full rounded-lg border border-stone-600 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  loading={loading}
                  onClick={() => handleRecordPayment(period.id)}
                >
                  Confirm {formatCurrency(period.amount_cents)} Payment
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
