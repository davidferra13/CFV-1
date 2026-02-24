'use client'

// WasteLogForm — Quick waste logging form for post-event or day-to-day waste tracking.
// Captures ingredient, quantity, estimated cost, reason, and optional notes.

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { logWaste } from '@/lib/inventory/waste-actions'

const WASTE_REASONS = [
  { value: 'overcooked', label: 'Overcooked' },
  { value: 'leftover', label: 'Leftover' },
  { value: 'spoilage', label: 'Spoilage' },
  { value: 'overportioned', label: 'Over-portioned' },
  { value: 'trim', label: 'Trim / Prep Waste' },
  { value: 'mistake', label: 'Mistake' },
  { value: 'expired', label: 'Expired' },
  { value: 'other', label: 'Other' },
] as const

const UNIT_OPTIONS = [
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'each', label: 'each' },
  { value: 'cup', label: 'cup' },
  { value: 'qt', label: 'qt' },
  { value: 'gal', label: 'gal' },
  { value: 'ml', label: 'ml' },
  { value: 'L', label: 'L' },
]

export function WasteLogForm({ eventId }: { eventId?: string }) {
  const [pending, startTransition] = useTransition()
  const [ingredientName, setIngredientName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('oz')
  const [estimatedCostDollars, setEstimatedCostDollars] = useState('')
  const [reason, setReason] = useState('leftover')
  const [notes, setNotes] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setIngredientName('')
    setQuantity('')
    setUnit('oz')
    setEstimatedCostDollars('')
    setReason('leftover')
    setNotes('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ingredientName.trim()) {
      setError('Ingredient name is required.')
      return
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Quantity must be greater than zero.')
      return
    }

    setError(null)
    setSuccess(false)

    const costCents = estimatedCostDollars
      ? Math.round(parseFloat(estimatedCostDollars) * 100)
      : null

    startTransition(async () => {
      await logWaste({
        eventId: eventId || undefined,
        ingredientName: ingredientName.trim(),
        quantity: parseFloat(quantity),
        unit,
        estimatedCostCents: costCents ?? 0,
        reason: reason as
          | 'overcooked'
          | 'leftover'
          | 'spoilage'
          | 'overportioned'
          | 'trim'
          | 'mistake'
          | 'expired'
          | 'other',
        notes: notes.trim() || undefined,
      })
      setSuccess(true)
      resetForm()
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-stone-400" />
          Log Waste
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Ingredient Name"
            placeholder="e.g., Chicken breast"
            value={ingredientName}
            onChange={(e) => setIngredientName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity"
              type="number"
              min={0}
              step="0.1"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <Select
              label="Unit"
              options={UNIT_OPTIONS}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>

          <Input
            label="Estimated Cost"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={estimatedCostDollars}
            onChange={(e) => setEstimatedCostDollars(e.target.value)}
            helperText="Dollar amount (optional)"
          />

          <Select
            label="Reason"
            options={[...WASTE_REASONS]}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Notes</label>
            <textarea
              className="block w-full rounded-lg border border-stone-600 bg-surface px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 min-h-[72px] resize-y"
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {success && <p className="text-sm text-emerald-600">Waste entry logged successfully.</p>}

          <Button
            type="submit"
            variant="primary"
            loading={pending}
            disabled={pending}
            className="w-full"
          >
            <Plus className="h-4 w-4" />
            Log Waste Entry
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
