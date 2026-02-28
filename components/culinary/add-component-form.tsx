'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { addComponentToDish } from '@/lib/menus/actions'

const COMPONENT_CATEGORIES = [
  'sauce',
  'protein',
  'starch',
  'vegetable',
  'garnish',
  'base',
  'topping',
  'seasoning',
  'other',
]

type Props = {
  /** Pre-filter the category (e.g. "sauce" for the sauces sub-page) */
  defaultCategory?: string
  dishes: { id: string; name: string; menuName?: string }[]
}

export function AddComponentForm({ defaultCategory, dishes }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    category: defaultCategory ?? 'other',
    dish_id: '',
    is_make_ahead: false,
    execution_notes: '',
  })

  function handleSubmit() {
    if (!form.name.trim() || !form.dish_id) return
    setError('')
    startTransition(async () => {
      try {
        await addComponentToDish({
          name: form.name.trim(),
          category: form.category,
          dish_id: form.dish_id,
          is_make_ahead: form.is_make_ahead,
          execution_notes: form.execution_notes || undefined,
        } as any)
        setForm({
          name: '',
          category: defaultCategory ?? 'other',
          dish_id: '',
          is_make_ahead: false,
          execution_notes: '',
        })
        setOpen(false)
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Failed to add component')
      }
    })
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + Add Component
      </Button>
    )
  }

  return (
    <Card className="max-w-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Add Component</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-sm font-medium text-stone-300">Component Name *</label>
          <input
            className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Red Wine Reduction, Herb Crust"
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
              {COMPONENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-300">Dish *</label>
            <select
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.dish_id}
              onChange={(e) => setForm({ ...form, dish_id: e.target.value })}
            >
              <option value="">Select a dish...</option>
              {dishes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.menuName ? ` (${d.menuName})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-stone-300">Execution Notes</label>
          <input
            className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={form.execution_notes}
            onChange={(e) => setForm({ ...form, execution_notes: e.target.value })}
            placeholder="Optional prep or plating notes"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_make_ahead}
            onChange={(e) => setForm({ ...form, is_make_ahead: e.target.checked })}
            className="rounded border-stone-600"
          />
          Make-ahead component
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSubmit}
            loading={isPending}
            disabled={!form.name.trim() || !form.dish_id}
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
