'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/currency'
import {
  recordOwnerDraw,
  deleteOwnerDraw,
  type OwnerDraw,
  type RecordOwnerDrawInput,
} from '@/lib/finance/owner-draw-actions'
import { format } from 'date-fns'
import { Wallet } from '@/components/ui/icons'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'other', label: 'Other' },
] as const

type Props = {
  draws: OwnerDraw[]
  year: number
}

export function OwnerDrawsClient({ draws: initialDraws, year }: Props) {
  const router = useRouter()
  const [draws, setDraws] = useState(initialDraws)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  const [form, setForm] = useState({
    drawDate: format(new Date(), 'yyyy-MM-dd'),
    amountDollars: '',
    paymentMethod: 'cash' as RecordOwnerDrawInput['paymentMethod'],
    description: '',
    notes: '',
  })

  function handleFieldChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const amountCents = Math.round(parseFloat(form.amountDollars) * 100)
    if (isNaN(amountCents) || amountCents <= 0) {
      setFormError('Please enter a valid amount greater than zero.')
      return
    }

    const previous = draws
    startTransition(async () => {
      try {
        const result = await recordOwnerDraw({
          drawDate: form.drawDate,
          amountCents,
          paymentMethod: form.paymentMethod,
          description: form.description,
          notes: form.notes || undefined,
        })
        setDraws((prev) => [result.ownerDraw, ...prev])
        setShowForm(false)
        setForm({
          drawDate: format(new Date(), 'yyyy-MM-dd'),
          amountDollars: '',
          paymentMethod: 'cash',
          description: '',
          notes: '',
        })
        router.refresh()
      } catch (err) {
        setDraws(previous)
        setFormError(err instanceof Error ? err.message : 'Failed to record draw')
      }
    })
  }

  function handleDelete(id: string) {
    const previous = draws
    setDraws((prev) => prev.filter((d) => d.id !== id))
    startTransition(async () => {
      try {
        await deleteOwnerDraw(id)
        router.refresh()
      } catch (err) {
        setDraws(previous)
        setFormError(err instanceof Error ? err.message : 'Failed to delete draw')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">
          {year} Draws
        </h2>
        <Button variant="secondary" size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ Record Draw'}
        </Button>
      </div>

      {formError && (
        <div className="rounded-lg bg-red-900 border border-red-700 px-4 py-3 text-sm text-red-200">
          {formError}
        </div>
      )}

      {showForm && (
        <Card className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-200">New Owner Draw</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Date</label>
                <Input
                  type="date"
                  value={form.drawDate}
                  onChange={(e) => handleFieldChange('drawDate', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Amount ($)</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="500.00"
                  value={form.amountDollars}
                  onChange={(e) => handleFieldChange('amountDollars', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Payment Method
                </label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) =>
                    handleFieldChange(
                      'paymentMethod',
                      e.target.value as RecordOwnerDrawInput['paymentMethod']
                    )
                  }
                  className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Description</label>
                <Input
                  placeholder="Personal transfer"
                  value={form.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Notes (optional)
              </label>
              <Input
                placeholder="Any additional context"
                value={form.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isPending}>
                {isPending ? 'Saving...' : 'Record Draw'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {draws.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Wallet className="mx-auto h-12 w-12 mb-4 text-stone-500" />
          <p className="text-lg font-medium text-stone-300">No owner draws for {year}</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Record equity draws when you transfer money from the business to yourself. These are tracked separately from expenses.
          </p>
        </div>
      ) : (
        <Card className="divide-y divide-stone-800">
          {draws.map((draw) => (
            <div key={draw.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-stone-100">{draw.description}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {draw.drawDate} &middot; {draw.paymentMethod}
                </p>
                {draw.notes && <p className="text-xs text-stone-500 mt-0.5 italic">{draw.notes}</p>}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-amber-400">
                  {formatCurrency(draw.amountCents)}
                </span>
                <button
                  onClick={() => handleDelete(draw.id)}
                  disabled={isPending}
                  className="text-xs text-stone-500 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
