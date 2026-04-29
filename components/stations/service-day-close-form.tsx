'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { closeServiceDay } from '@/lib/service-days/actions'
import { Card, CardContent } from '@/components/ui/card'

export function ServiceDayCloseForm({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const [actualCovers, setActualCovers] = useState('')
  const [revenue, setRevenue] = useState('')
  const [foodCost, setFoodCost] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [wasteCost, setWasteCost] = useState('')
  const [notes, setNotes] = useState('')

  function dollarsToCents(val: string, label: string): number | null {
    if (!val.trim()) return null
    const n = Number(val)
    if (!Number.isFinite(n) || n < 0) {
      throw new Error(`${label} must be a valid zero or positive dollar amount.`)
    }
    return Math.round(n * 100)
  }

  function parseActualCovers(val: string): number | null {
    if (!val.trim()) return null
    const n = Number(val)
    if (!Number.isInteger(n) || n < 0) {
      throw new Error('Actual covers must be a valid zero or positive whole number.')
    }
    return n
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResultMessage(null)

    let payload: Parameters<typeof closeServiceDay>[1]

    try {
      payload = {
        actual_covers: parseActualCovers(actualCovers),
        total_revenue_cents: dollarsToCents(revenue, 'Total revenue'),
        total_food_cost_cents: dollarsToCents(foodCost, 'Food cost'),
        total_labor_cost_cents: dollarsToCents(laborCost, 'Labor cost'),
        total_waste_cents: dollarsToCents(wasteCost, 'Waste cost'),
        notes: notes.trim() || null,
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid closeout value.')
      return
    }

    startTransition(async () => {
      try {
        const result = await closeServiceDay(id, payload)

        if (!result.success) {
          setError(result.error || 'Failed to close service day')
          return
        }

        setResultMessage('Service day closed. Refreshing summary...')
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
        <p className="mb-4 text-sm text-stone-400">
          Leave a field blank to keep the value already logged for this service day.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="actual-covers" className={labelClass}>
                Actual Covers
              </label>
              <input
                id="actual-covers"
                type="number"
                min="0"
                className={inputClass}
                value={actualCovers}
                onChange={(e) => setActualCovers(e.target.value)}
                placeholder="e.g. 42"
              />
            </div>
            <div>
              <label htmlFor="total-revenue" className={labelClass}>
                Total Revenue ($)
              </label>
              <input
                id="total-revenue"
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
              <label htmlFor="food-cost" className={labelClass}>
                Food Cost ($)
              </label>
              <input
                id="food-cost"
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
              <label htmlFor="labor-cost" className={labelClass}>
                Labor Cost ($)
              </label>
              <input
                id="labor-cost"
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
              <label htmlFor="waste-cost" className={labelClass}>
                Waste Cost ($)
              </label>
              <input
                id="waste-cost"
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
            <label htmlFor="closeout-notes" className={labelClass}>
              Notes (what went well, what went wrong)
            </label>
            <textarea
              id="closeout-notes"
              className={inputClass + ' min-h-[100px]'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Service notes, issues, highlights..."
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          {resultMessage && (
            <p aria-live="polite" className="text-sm text-emerald-300">
              {resultMessage}
            </p>
          )}

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
