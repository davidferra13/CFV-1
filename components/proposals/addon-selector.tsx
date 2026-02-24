'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createAddon,
  updateAddon,
  deleteAddon,
  type ProposalAddon,
} from '@/lib/proposals/addon-actions'
import { PlusCircle, Trash2, Edit2 } from 'lucide-react'

type Props = {
  initialAddons: ProposalAddon[]
  guestCount?: number
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function AddonSelector({ initialAddons, guestCount = 1 }: Props) {
  const [addons, setAddons] = useState(initialAddons)
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialAddons.filter((a) => a.isDefault).map((a) => a.id))
  )
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    priceCentsPerPerson: 0,
    isDefault: false,
  })

  const totalPerPerson = addons
    .filter((a) => selected.has(a.id))
    .reduce((s, a) => s + a.priceCentsPerPerson, 0)
  const totalForEvent = totalPerPerson * guestCount

  function toggleAddon(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCreate() {
    startTransition(async () => {
      const created = await createAddon({
        name: form.name,
        description: form.description || undefined,
        priceCentsPerPerson: form.priceCentsPerPerson,
        isDefault: form.isDefault,
      })
      setAddons((prev) => [...prev, created])
      if (created.isDefault) setSelected((prev) => new Set([...prev, created.id]))
      setShowCreate(false)
      setForm({ name: '', description: '', priceCentsPerPerson: 0, isDefault: false })
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteAddon(id)
      setAddons((prev) => prev.filter((a) => a.id !== id))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Add-Ons</h2>
          <p className="text-sm text-stone-500">
            {selected.size} selected · {formatCents(totalPerPerson)}/person ·{' '}
            {formatCents(totalForEvent)} total ({guestCount} guests)
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <PlusCircle className="h-4 w-4" />
          New Add-On
        </Button>
      </div>

      {showCreate && (
        <Card className="border-stone-600">
          <CardContent className="py-4 space-y-3">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Cocktail Hour"
              required
            />
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does this add-on include?"
            />
            <Input
              label="Price per Person ($)"
              type="number"
              min="0"
              step="0.01"
              value={(form.priceCentsPerPerson / 100).toString()}
              onChange={(e) =>
                setForm({
                  ...form,
                  priceCentsPerPerson: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
            />
            <label className="flex items-center gap-2 text-sm text-stone-300">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded border-stone-600"
              />
              Include by default in new proposals
            </label>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleCreate} loading={isPending} disabled={!form.name}>
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Addon Cards */}
      <div className="space-y-2">
        {addons.map((addon) => (
          <div
            key={addon.id}
            className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
              selected.has(addon.id)
                ? 'border-brand-600 bg-brand-950/30'
                : 'border-stone-700 bg-surface hover:bg-stone-800'
            }`}
            onClick={() => toggleAddon(addon.id)}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  selected.has(addon.id) ? 'border-brand-600 bg-brand-600' : 'border-stone-600'
                }`}
              >
                {selected.has(addon.id) && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-stone-100">{addon.name}</p>
                {addon.description && <p className="text-xs text-stone-500">{addon.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-stone-300">
                {formatCents(addon.priceCentsPerPerson)}/pp
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(addon.id)
                }}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5 text-stone-400" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {addons.length === 0 && !showCreate && (
        <div className="text-center py-8">
          <p className="text-sm text-stone-500">No add-ons yet. Create your first add-on option.</p>
        </div>
      )}
    </div>
  )
}
