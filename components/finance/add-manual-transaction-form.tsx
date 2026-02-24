'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { addManualTransaction } from '@/lib/finance/bank-feed-actions'

const EXPENSE_CATEGORIES = [
  'groceries',
  'alcohol',
  'specialty_items',
  'labor',
  'equipment',
  'supplies',
  'venue_rental',
  'uniforms',
  'gas_mileage',
  'vehicle',
  'marketing',
  'subscriptions',
  'insurance_licenses',
  'professional_services',
  'education',
  'utilities',
  'other',
]

export function AddManualTransactionForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
  })

  function handleSubmit() {
    if (!form.description.trim() || !form.amount) return
    setError('')
    startTransition(async () => {
      try {
        await addManualTransaction({
          description: form.description.trim(),
          amountCents: Math.round(parseFloat(form.amount) * 100),
          category: form.category,
          date: form.date,
        })
        setForm({
          description: '',
          amount: '',
          category: 'other',
          date: new Date().toISOString().split('T')[0],
        })
        setOpen(false)
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Failed to add transaction')
      }
    })
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + Add Transaction
      </Button>
    )
  }

  return (
    <Card className="max-w-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Add Manual Transaction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-sm font-medium text-stone-300">Description *</label>
          <input
            className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g. Farmer's market produce"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-stone-300">Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-300">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-300">Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSubmit}
            loading={isPending}
            disabled={!form.description.trim() || !form.amount}
          >
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
