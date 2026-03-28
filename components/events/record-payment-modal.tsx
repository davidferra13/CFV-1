'use client'

// Record Offline Payment Modal
// Allows chefs to record payments received outside of Stripe (Venmo, cash, Zelle, etc.)
// Calls recordOfflinePayment() server action and refreshes the page on success.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { recordOfflinePayment } from '@/lib/events/offline-payment-actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { trackAction } from '@/lib/ai/remy-activity-tracker'

const PAYMENT_METHODS = [
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'card', label: 'Card (manual)' },
  { value: 'other', label: 'Other' },
] as const

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

type Props = {
  eventId: string
  defaultAmountCents: number // Pre-populate with outstanding balance or deposit
  label?: string // "Record Deposit" vs "Record Payment"
  onClose: () => void
}

export function RecordPaymentModal({
  eventId,
  defaultAmountCents,
  label = 'Record Payment',
  onClose,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const defaultDollars = defaultAmountCents > 0 ? (defaultAmountCents / 100).toFixed(2) : ''

  const [amountDollars, setAmountDollars] = useState(defaultDollars)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('venmo')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate format: allow only up to 2 decimal places
    if (!/^\d+(\.\d{0,2})?$/.test(amountDollars.trim())) {
      setError('Please enter a valid dollar amount (e.g. 500.00)')
      return
    }

    const dollars = parseFloat(amountDollars)
    if (!amountDollars || isNaN(dollars) || dollars <= 0) {
      setError('Please enter a valid amount')
      return
    }

    const amountCents = Math.round(dollars * 100)

    startTransition(async () => {
      try {
        await recordOfflinePayment({
          eventId,
          amountCents,
          paymentMethod,
          paidAt,
          notes: notes.trim() || undefined,
        })
        trackAction('Recorded payment', `$${dollars.toFixed(2)} via ${paymentMethod}`)
        setSuccess(true)
        setTimeout(() => {
          onClose()
          router.refresh()
        }, 1200)
      } catch (err) {
        setError((err as Error).message || 'Failed to record payment')
      }
    })
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">✓</div>
          <p className="text-lg font-semibold text-stone-100">Payment recorded</p>
          <p className="text-sm text-stone-500 mt-1">Client receipt sent. Page refreshing...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-stone-100">{label}</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-400 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Amount received</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-stone-600 rounded-md text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Payment method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 border border-stone-600 rounded-md text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date received */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Date received</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full px-3 py-2 border border-stone-600 rounded-md text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Notes <span className="text-stone-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-stone-600 rounded-md text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="e.g. Venmo @username, check #1234..."
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-950 px-3 py-2 rounded-md">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={isPending}>
              {isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>

        <p className="text-xs text-stone-400 mt-4 text-center">
          A receipt will be emailed to the client automatically.
        </p>
      </Card>
    </div>
  )
}
