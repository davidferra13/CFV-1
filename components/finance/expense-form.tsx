'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { createExpense, updateExpense } from '@/lib/finance/expense-actions'
import type { Expense, CreateExpenseInput, ExpenseCategory } from '@/lib/finance/expense-actions'

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'mileage', label: 'Mileage' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
]

const INTERVAL_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
]

interface ExpenseFormProps {
  expense?: Expense | null
  eventOptions?: { value: string; label: string }[]
  onSaved?: () => void
  onCancel?: () => void
}

export function ExpenseForm({ expense, eventOptions, onSaved, onCancel }: ExpenseFormProps) {
  const isEditing = !!expense

  const [category, setCategory] = useState<string>(expense?.category ?? '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [amountDollars, setAmountDollars] = useState(
    expense ? (expense.amount_cents / 100).toFixed(2) : ''
  )
  const [date, setDate] = useState(
    expense?.date ??
      ((_ef) =>
        `${_ef.getFullYear()}-${String(_ef.getMonth() + 1).padStart(2, '0')}-${String(_ef.getDate()).padStart(2, '0')}`)(
        new Date()
      )
  )
  const [vendor, setVendor] = useState(expense?.vendor ?? '')
  const [eventId, setEventId] = useState(expense?.event_id ?? '')
  const [isRecurring, setIsRecurring] = useState(expense?.is_recurring ?? false)
  const [recurrenceInterval, setRecurrenceInterval] = useState(expense?.recurrence_interval ?? '')
  const [receiptUrl, setReceiptUrl] = useState(expense?.receipt_url ?? '')
  const [taxDeductible, setTaxDeductible] = useState(expense?.tax_deductible ?? true)
  const [notes, setNotes] = useState(expense?.notes ?? '')

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation
    if (!category) {
      setError('Category is required')
      return
    }
    if (!description.trim()) {
      setError('Description is required')
      return
    }
    const cents = Math.round(parseFloat(amountDollars) * 100)
    if (isNaN(cents) || cents <= 0) {
      setError('Amount must be a positive number')
      return
    }
    if (!date) {
      setError('Date is required')
      return
    }

    const input: CreateExpenseInput = {
      category: category as ExpenseCategory,
      description: description.trim(),
      amount_cents: cents,
      date,
      event_id: eventId || null,
      vendor: vendor.trim() || null,
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? recurrenceInterval || null : null,
      receipt_url: receiptUrl.trim() || null,
      tax_deductible: taxDeductible,
      notes: notes.trim() || null,
    }

    startTransition(async () => {
      try {
        if (isEditing && expense) {
          await updateExpense(expense.id, input)
        } else {
          await createExpense(input)
        }
        onSaved?.()
      } catch (err) {
        console.error('[ExpenseForm] Save failed:', err)
        setError('Failed to save expense. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Category"
          required
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <Input
          label="Date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <Input
        label="Description"
        required
        placeholder="e.g., Gas for event delivery"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Amount ($)"
          type="number"
          required
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={amountDollars}
          onChange={(e) => setAmountDollars(e.target.value)}
        />

        <Input
          label="Vendor"
          placeholder="e.g., Costco, Shell"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
        />
      </div>

      {eventOptions && eventOptions.length > 0 && (
        <Select
          label="Linked Event (optional)"
          options={eventOptions}
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        />
      )}

      {/* Recurring toggle */}
      <div className="flex items-center gap-3">
        <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
        <label className="text-sm text-stone-700">Recurring expense</label>
      </div>

      {isRecurring && (
        <Select
          label="Recurrence Interval"
          options={INTERVAL_OPTIONS}
          value={recurrenceInterval}
          onChange={(e) => setRecurrenceInterval(e.target.value)}
        />
      )}

      <Input
        label="Receipt URL (optional)"
        type="url"
        placeholder="https://..."
        value={receiptUrl}
        onChange={(e) => setReceiptUrl(e.target.value)}
      />

      {/* Tax deductible toggle */}
      <div className="flex items-center gap-3">
        <Switch checked={taxDeductible} onCheckedChange={setTaxDeductible} />
        <label className="text-sm text-stone-700">Tax deductible</label>
      </div>

      <Textarea
        label="Notes (optional)"
        placeholder="Any additional details..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isPending}>
          {isEditing ? 'Update Expense' : 'Add Expense'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
