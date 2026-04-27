'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import {
  createEquipmentItemExtended,
  type CreateEquipmentExtendedInput,
} from '@/lib/equipment/intelligence-actions'
import type { EquipmentItem } from '@/lib/equipment/types'

const CATEGORIES = [
  { value: 'cookware', label: 'Cookware' },
  { value: 'knives', label: 'Knives' },
  { value: 'smallwares', label: 'Smallwares' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'serving', label: 'Serving' },
  { value: 'transport', label: 'Transport' },
  { value: 'linen', label: 'Linens' },
  { value: 'other', label: 'Other' },
] as const

interface Props {
  onClose: () => void
  onAdded: (item: EquipmentItem) => void
}

export function EquipmentAddModal({ onClose, onAdded }: Props) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('other')
  const [brand, setBrand] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [sizeLabel, setSizeLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    startTransition(async () => {
      try {
        const input: CreateEquipmentExtendedInput = {
          name: name.trim(),
          category: category as any,
          brand: brand.trim() || null,
          quantity_owned: quantity,
          size_label: sizeLabel.trim() || null,
          notes: notes.trim() || null,
          status: 'active',
        }
        const result = await createEquipmentItemExtended(input)
        onAdded(result as EquipmentItem)
      } catch (err: any) {
        setError(err?.message ?? 'Failed to add equipment')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <h2 className="text-lg font-semibold text-stone-100">Add Equipment</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-stone-400 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Half Sheet Tray"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-stone-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Brand + Size row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-stone-400 mb-1">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. All-Clad"
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Size</label>
              <input
                type="text"
                value={sizeLabel}
                onChange={(e) => setSizeLabel(e.target.value)}
                placeholder="e.g. 12 inch"
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm text-stone-400 mb-1">Quantity</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded bg-stone-800 text-stone-400 hover:bg-stone-700 flex items-center justify-center"
              >
                -
              </button>
              <span className="text-stone-100 w-8 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded bg-stone-800 text-stone-400 hover:bg-stone-700 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-stone-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isPending || !name.trim()}
              className="flex-1"
            >
              {isPending ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
