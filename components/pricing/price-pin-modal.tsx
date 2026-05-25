'use client'

import { useState, useTransition } from 'react'
import { X } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { pinIngredientPrice } from '@/lib/pricing/price-pinning-actions'

interface PricePinModalProps {
  ingredientId: string
  ingredientName: string
  onClose: () => void
  onPinned: () => void
}

const UNIT_OPTIONS = [
  'lb',
  'oz',
  'each',
  'bunch',
  'head',
  'qt',
  'gal',
  'pint',
  'dozen',
  'can',
  'jar',
  'bag',
  'bottle',
  'package',
]

const EXPIRATION_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
]

export function PricePinModal({
  ingredientId,
  ingredientName,
  onClose,
  onPinned,
}: PricePinModalProps) {
  const [dollars, setDollars] = useState('')
  const [cents, setCents] = useState('')
  const [unit, setUnit] = useState('lb')
  const [source, setSource] = useState('')
  const [vendor, setVendor] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const d = parseInt(dollars || '0', 10)
    const c = parseInt(cents || '0', 10)
    const priceCents = d * 100 + c

    if (priceCents <= 0) {
      setError('Price must be greater than $0.00')
      return
    }

    if (!source.trim()) {
      setError('Source is required (e.g., "Whole Foods website")')
      return
    }

    startTransition(async () => {
      try {
        const result = await pinIngredientPrice({
          ingredientId,
          priceCents,
          unit,
          source: source.trim(),
          vendor: vendor.trim() || undefined,
          expiresInDays,
        })

        if (!result.success) {
          setError(result.error || 'Failed to pin price')
          return
        }

        onPinned()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to pin price')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} role="presentation" />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-stone-700 bg-stone-900 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700">
          <h2 className="text-lg font-medium text-white">Pin a Price</h2>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-stone-400 mb-1">Ingredient</label>
            <p className="text-sm text-white bg-stone-800 rounded px-3 py-2 border border-stone-700">
              {ingredientName}
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-stone-400 mb-1">Price</label>
              <div className="flex items-center gap-1">
                <span className="text-stone-400">$</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={dollars}
                  onChange={(e) => setDollars(e.target.value)}
                  className="w-20 rounded bg-stone-800 border border-stone-700 px-2 py-1.5 text-sm text-white placeholder:text-stone-500 focus:border-blue-500 focus:outline-none"
                />
                <span className="text-stone-400">.</span>
                <input
                  type="number"
                  min="0"
                  max="99"
                  placeholder="00"
                  value={cents}
                  onChange={(e) => setCents(e.target.value)}
                  className="w-16 rounded bg-stone-800 border border-stone-700 px-2 py-1.5 text-sm text-white placeholder:text-stone-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Per</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="rounded bg-stone-800 border border-stone-700 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">
              Source <span className="text-stone-500">(where you found this price)</span>
            </label>
            <input
              type="text"
              placeholder='e.g., "Whole Foods website", "Restaurant Depot"'
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-white placeholder:text-stone-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">
              Vendor <span className="text-stone-500">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Whole Foods, Restaurant Depot"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full rounded bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-white placeholder:text-stone-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Pin expires in</label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10))}
              className="w-full rounded bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              {EXPIRATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Pinning...' : 'Pin Price'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
