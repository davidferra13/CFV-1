'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { closeServiceDay } from '@/lib/service-days/actions'
import { Card, CardContent } from '@/components/ui/card'

export function ServiceDayCloseForm({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [actualCovers, setActualCovers] = useState('')
  const [revenue, setRevenue] = useState('')
  const [foodCost, setFoodCost] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [wasteCost, setWasteCost] = useState('')
  const [notes, setNotes] = useState('')

  function dollarsToCents(val: string): number | null {
    const n = parseFloat(val)
    if (isNaN(n)) return null
    return Math.round(n * 100)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const result = await closeServiceDay(id, {
          actual_covers: actualCovers ? parseInt(actualCovers, 10) : null,
          total_revenue_cents: dollarsToCents(revenue),
          total_food_cost_cents: dollarsToCents(foodCost),
          total_labor_cost_cents: dollarsToCents(laborCost),
          total_waste_cents: dollarsToCents(wasteCost),
          notes: notes.trim() || null,
        })

        if (!result.success) {
          setError(result.error || 'Failed to close service day')
          return
        }

        router.refresh()
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const inputClass =
    'w-full bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2'
  const labelClass = 'block text-sm font-medium text-stone-300 mb-1'

  return (
    <Card>
      <CardContent className="py-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-4">Close Out Day</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Actual Covers</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={actualCovers}
                onChange={(e) => setActualCovers(e.target.value)}
                placeholder="e.g. 42"
              />
            </div>
            <div>
              <label className={labelClass}>Total Revenue ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelClass}>Food Cost ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={foodCost}
                onChange={(e) => setFoodCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelClass}>Labor Cost ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelClass}>Waste Cost ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={wasteCost}
                onChange={(e) => setWasteCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes (what went well, what went wrong)</label>
            <textarea
              className={inputClass + ' min-h-[100px]'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Service notes, issues, highlights..."
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Closing...' : 'Close Out Day'}
          </button>
        </form>
      </CardContent>
    </Card>
  )
}
