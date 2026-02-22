'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createIngredient } from '@/lib/recipes/actions'

const CATEGORIES = [
  'protein',
  'produce',
  'dairy',
  'pantry',
  'spice',
  'oil',
  'alcohol',
  'baking',
  'frozen',
  'canned',
  'fresh_herb',
  'dry_herb',
  'condiment',
  'beverage',
  'specialty',
  'other',
]

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

export function AddIngredientForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    category: 'other',
    default_unit: 'unit',
    average_price_cents: '',
    is_staple: false,
  })

  function handleSubmit() {
    if (!form.name.trim()) return
    setError('')
    startTransition(async () => {
      try {
        await createIngredient({
          name: form.name.trim(),
          category: form.category,
          default_unit: form.default_unit,
          average_price_cents: form.average_price_cents
            ? Math.round(parseFloat(form.average_price_cents) * 100)
            : undefined,
          is_staple: form.is_staple,
        })
        setForm({
          name: '',
          category: 'other',
          default_unit: 'unit',
          average_price_cents: '',
          is_staple: false,
        })
        setOpen(false)
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Failed to add ingredient')
      }
    })
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + Add Ingredient
      </Button>
    )
  }

  return (
    <Card className="max-w-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Add Ingredient</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-sm font-medium text-stone-700">Name *</label>
          <input
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Olive Oil, Chicken Thigh, Basil"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-stone-700">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">Default Unit</label>
            <select
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.default_unit}
              onChange={(e) => setForm({ ...form, default_unit: e.target.value })}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-stone-700">Avg Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.average_price_cents}
              onChange={(e) => setForm({ ...form, average_price_cents: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_staple}
                onChange={(e) => setForm({ ...form, is_staple: e.target.checked })}
                className="rounded border-stone-300"
              />
              Staple item
            </label>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSubmit} loading={isPending} disabled={!form.name.trim()}>
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
