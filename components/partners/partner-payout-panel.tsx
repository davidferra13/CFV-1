'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  recordPartnerPayout,
  deletePartnerPayout,
  type PartnerPayout,
  type CreatePayoutInput,
} from '@/lib/partners/payout-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { dateToDateString } from '@/lib/utils/format'
import { format } from 'date-fns'

const METHODS = [
  { value: 'check', label: 'Check' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Other' },
]

interface Props {
  partnerId: string
  initialPayouts: PartnerPayout[]
  totalEarnedCents: number
}

export function PartnerPayoutPanel({ partnerId, initialPayouts, totalEarnedCents }: Props) {
  const [payouts, setPayouts] = useState<PartnerPayout[]>(initialPayouts)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    amount_dollars: '',
    paid_on: dateToDateString(new Date().toISOString()),
    method: 'other' as CreatePayoutInput['method'],
    reference: '',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalPaidCents = payouts.reduce((s, p) => s + p.amount_cents, 0)
  const balanceDueCents = totalEarnedCents - totalPaidCents

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amount_cents = Math.round(parseFloat(form.amount_dollars || '0') * 100)
    if (!amount_cents || amount_cents <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    const prev = payouts
    const optimistic: PartnerPayout = {
      id: `tmp-${Date.now()}`,
      partner_id: partnerId,
      amount_cents,
      paid_on: form.paid_on,
      method: form.method,
      reference: form.reference || null,
      notes: form.notes || null,
      created_at: new Date().toISOString(),
    }
    setPayouts([optimistic, ...prev])
    setShowForm(false)
    setForm((f) => ({ ...f, amount_dollars: '', reference: '', notes: '' }))

    startTransition(async () => {
      try {
        const saved = await recordPartnerPayout({
          partner_id: partnerId,
          amount_cents,
          paid_on: form.paid_on,
          method: form.method,
          reference: form.reference || undefined,
          notes: form.notes || undefined,
        })
        setPayouts((cur) => cur.map((p) => (p.id === optimistic.id ? saved : p)))
      } catch {
        setPayouts(prev)
        setError('Failed to save payout. Try again.')
        setShowForm(true)
      }
    })
  }

  function handleDelete(payoutId: string) {
    const prev = payouts
    setPayouts((cur) => cur.filter((p) => p.id !== payoutId))
    startTransition(async () => {
      try {
        await deletePartnerPayout(payoutId, partnerId)
      } catch {
        setPayouts(prev)
      }
    })
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-100">Payout History</h2>
        <Button
          variant="secondary"
          onClick={() => setShowForm((v) => !v)}
          className="text-xs"
          disabled={isPending}
        >
          {showForm ? 'Cancel' : 'Record Payout'}
        </Button>
      </div>

      {/* Balance summary */}
      <div className="flex flex-wrap gap-8 mb-4 text-sm">
        <div>
          <p className="text-xl font-bold text-emerald-500">{formatCurrency(totalEarnedCents)}</p>
          <p className="text-xs text-stone-500 mt-0.5">Total earned</p>
        </div>
        <div>
          <p className="text-xl font-bold text-stone-300">{formatCurrency(totalPaidCents)}</p>
          <p className="text-xs text-stone-500 mt-0.5">Total paid out</p>
        </div>
        <div>
          <p
            className={`text-xl font-bold ${balanceDueCents > 0 ? 'text-amber-400' : 'text-stone-400'}`}
          >
            {formatCurrency(balanceDueCents)}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">Balance due</p>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border border-stone-700 rounded-lg p-4 mb-4 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Amount ($)</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.amount_dollars}
                onChange={(e) => update('amount_dollars', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Date paid</label>
              <Input
                type="date"
                value={form.paid_on}
                onChange={(e) => update('paid_on', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Method</label>
              <select
                title="Payment method"
                value={form.method}
                onChange={(e) => update('method', e.target.value)}
                className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-200"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Reference (optional)
              </label>
              <Input
                placeholder="Check #, transaction ID..."
                value={form.reference}
                onChange={(e) => update('reference', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">
              Notes (optional)
            </label>
            <Input
              placeholder="Any notes about this payout"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" disabled={isPending} className="text-sm">
            Save Payout
          </Button>
        </form>
      )}

      {payouts.length === 0 ? (
        <p className="text-sm text-stone-400 italic">No payouts recorded yet.</p>
      ) : (
        <div className="divide-y divide-stone-800">
          {payouts.map((payout) => (
            <div key={payout.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-stone-200">
                  {formatCurrency(payout.amount_cents)}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {format(new Date(payout.paid_on + 'T12:00:00'), 'MMM d, yyyy')}
                  {' - '}
                  {METHODS.find((m) => m.value === payout.method)?.label ?? payout.method}
                  {payout.reference ? ` (#${payout.reference})` : ''}
                </p>
                {payout.notes && <p className="text-xs text-stone-400 mt-0.5">{payout.notes}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(payout.id)}
                disabled={isPending || payout.id.startsWith('tmp-')}
                className="text-xs text-stone-500 hover:text-red-400 transition-colors disabled:opacity-40"
                title="Remove payout"
                aria-label="Remove payout"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
