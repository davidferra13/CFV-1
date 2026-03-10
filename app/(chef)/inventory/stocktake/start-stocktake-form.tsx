// Start Stocktake Form
// Client component for starting a new physical count.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startStocktake } from '@/lib/inventory/stocktake-actions'

export function StartStocktakeForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [countedBy, setCountedBy] = useState('')
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const defaultName = `Count ${today}`

  const handleStart = () => {
    setError(null)
    const stocktakeName = name.trim() || defaultName

    startTransition(async () => {
      try {
        const id = await startStocktake(stocktakeName, countedBy.trim() || undefined)
        router.push(`/inventory/stocktake/${id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start stocktake')
      }
    })
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800 p-5 space-y-4">
      <h2 className="text-lg font-semibold text-stone-100">Start New Count</h2>

      <div className="space-y-3">
        <div>
          <label htmlFor="stocktake-name" className="block text-sm text-stone-400 mb-1">
            Name
          </label>
          <input
            id="stocktake-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={defaultName}
            className="w-full rounded-lg bg-stone-900 border border-stone-600 px-3 py-2 text-stone-200 text-sm placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="counted-by" className="block text-sm text-stone-400 mb-1">
            Counted by (optional)
          </label>
          <input
            id="counted-by"
            type="text"
            value={countedBy}
            onChange={(e) => setCountedBy(e.target.value)}
            placeholder="e.g. Chef Dave, Line Cook Maria"
            className="w-full rounded-lg bg-stone-900 border border-stone-600 px-3 py-2 text-stone-200 text-sm placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleStart}
        disabled={isPending}
        className="w-full px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
      >
        {isPending ? 'Starting...' : 'Start Counting'}
      </button>

      <p className="text-xs text-stone-600">
        This will pull all tracked inventory items and set their current quantities as the expected
        values. You then count each item and record the actual quantity.
      </p>
    </div>
  )
}
