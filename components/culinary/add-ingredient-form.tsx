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
    default_yield_pct: '',
    weight_to_volume_ratio: '',
    storage_requirement: '',
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
          default_yield_pct: form.default_yield_pct ? parseInt(form.default_yield_pct) : undefined,
          weight_to_volume_ratio: form.weight_to_volume_ratio
            ? parseFloat(form.weight_to_volume_ratio)
            : undefined,
          storage_requirement: (form.storage_requirement || undefined) as
            | 'ambient'
            | 'refrigerated'
            | 'frozen'
            | undefined,
        })
        setForm({
          name: '',
          category: 'other',
          default_unit: 'unit',
          average_price_cents: '',
          is_staple: false,
          default_yield_pct: '',
          weight_to_volume_ratio: '',
          storage_requirement: '',
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
          <label className="text-sm font-medium text-stone-300">Name *</label>
          <input
            className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Olive Oil, Chicken Thigh, Basil"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-stone-300">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
            <label className="text-sm font-medium text-stone-300">Default Unit</label>
            <select
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
            <label className="text-sm font-medium text-stone-300">Avg Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.average_price_cents}
              onChange={(e) => setForm({ ...form, average_price_cents: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_staple}
                onChange={(e) => setForm({ ...form, is_staple: e.target.checked })}
                className="rounded border-stone-600"
              />
              Staple item
            </label>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-stone-300">Yield %</label>
            <input
              type="number"
              min="5"
              max="100"
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.default_yield_pct}
              onChange={(e) => setForm({ ...form, default_yield_pct: e.target.value })}
              placeholder="100"
            />
            <p className="text-[10px] text-stone-500 mt-0.5">
              Usable % after prep (e.g. 55 for shrimp)
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-300">Density (g/ml)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="3"
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.weight_to_volume_ratio}
              onChange={(e) => setForm({ ...form, weight_to_volume_ratio: e.target.value })}
              placeholder="e.g. 0.53 for flour"
            />
            <p className="text-[10px] text-stone-500 mt-0.5">For volume-to-weight conversion</p>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-300">Storage</label>
            <select
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.storage_requirement}
              onChange={(e) => setForm({ ...form, storage_requirement: e.target.value })}
            >
              <option value="">Not specified</option>
              <option value="ambient">Dry / Ambient</option>
              <option value="refrigerated">Refrigerated</option>
              <option value="frozen">Frozen</option>
            </select>
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
