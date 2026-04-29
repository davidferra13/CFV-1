'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { updateInventoryCount } from '@/lib/inventory/count-actions'

const UNITS = [
  'unit',
  'oz',
  'lb',
  'g',
  'kg',
  'cup',
  'tbsp',
  'tsp',
  'ml',
  'L',
  'each',
  'bunch',
  'head',
  'clove',
]

export function AddInventoryItemForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    ingredientName: '',
    currentQty: '',
    parLevel: '',
    unit: 'unit',
  })

  function handleSubmit() {
    if (!form.ingredientName.trim()) return
    setError('')
    startTransition(async () => {
      try {
        await updateInventoryCount({
          ingredientName: form.ingredientName.trim(),
          currentQty: parseFloat(form.currentQty) || 0,
          parLevel: form.parLevel ? parseFloat(form.parLevel) : undefined,
          unit: form.unit,
        })
        setForm({ ingredientName: '', currentQty: '', parLevel: '', unit: 'unit' })
        setOpen(false)
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Failed to add inventory item')
      }
    })
  }

  if (!open) {
    return (
      <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
        + Count Item
      </Button>
    )
  }

  return (
    <Card className="max-w-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Count New Inventory Item</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-sm font-medium text-stone-300">Ingredient Name *</label>
          <input
            className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={form.ingredientName}
            onChange={(e) => setForm({ ...form, ingredientName: e.target.value })}
            placeholder="e.g. Olive Oil, Chicken Thighs"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-stone-300">Current Qty</label>
            <input
              type="number"
              step="0.1"
              min="0"
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.currentQty}
              onChange={(e) => setForm({ ...form, currentQty: e.target.value })}
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-300">Par Level</label>
            <input
              type="number"
              step="0.1"
              min="0"
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.parLevel}
              onChange={(e) => setForm({ ...form, parLevel: e.target.value })}
              placeholder="Min qty"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-300">Unit</label>
            <select
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="primary"
            onClick={handleSubmit}
            loading={isPending}
            disabled={!form.ingredientName.trim()}
          >
            Save Count
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
