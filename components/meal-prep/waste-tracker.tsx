'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { logBatchResult } from '@/lib/meal-prep/waste-tracking-actions'
import type { BatchLogEntry, WasteSummary } from '@/lib/meal-prep/waste-tracking-actions'
import { format } from 'date-fns'

// ============================================
// Summary Cards
// ============================================

function SummaryCards({ summary }: { summary: WasteSummary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <p className="text-xs text-stone-500 uppercase tracking-wide">Yield %</p>
        <p className="text-2xl font-bold text-stone-900">{summary.yield_percentage}%</p>
        <p className="text-xs text-stone-500">
          {summary.total_actual} of {summary.total_planned} portions
        </p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-stone-500 uppercase tracking-wide">Waste %</p>
        <p className="text-2xl font-bold text-red-600">{summary.waste_percentage}%</p>
        <p className="text-xs text-stone-500">{summary.total_wasted} portions wasted</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-stone-500 uppercase tracking-wide">Cost of Waste</p>
        <p className="text-2xl font-bold text-stone-900">
          ${(summary.cost_of_waste_cents / 100).toFixed(2)}
        </p>
        <p className="text-xs text-stone-500">
          of ${(summary.total_cost_cents / 100).toFixed(2)} total
        </p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-stone-500 uppercase tracking-wide">Batches</p>
        <p className="text-2xl font-bold text-stone-900">{summary.batch_count}</p>
        {summary.top_waste_reasons.length > 0 && (
          <p className="text-xs text-stone-500">
            Top reason: {summary.top_waste_reasons[0].reason}
          </p>
        )}
      </Card>
    </div>
  )
}

// ============================================
// Batch Log Table
// ============================================

const REASON_LABELS: Record<string, string> = {
  overcooked: 'Overcooked',
  underseasoned: 'Underseasoned',
  contamination: 'Contamination',
  excess: 'Excess',
  other: 'Other',
}

function BatchLogTable({ entries }: { entries: BatchLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card className="p-6 text-center text-stone-500">
        No batch logs yet. Log your first batch to start tracking waste and yield.
      </Card>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-stone-500">
            <th className="py-2 px-3 font-medium">Date</th>
            <th className="py-2 px-3 font-medium">Dish</th>
            <th className="py-2 px-3 font-medium text-center">Planned</th>
            <th className="py-2 px-3 font-medium text-center">Actual</th>
            <th className="py-2 px-3 font-medium text-center">Waste</th>
            <th className="py-2 px-3 font-medium">Reason</th>
            <th className="py-2 px-3 font-medium text-right">Cost</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const yieldPct =
              entry.planned_portions > 0
                ? Math.round((entry.actual_portions / entry.planned_portions) * 100)
                : 0
            return (
              <tr key={entry.id} className="border-b border-stone-100 hover:bg-stone-50">
                <td className="py-2 px-3 whitespace-nowrap">
                  {format(new Date(entry.batch_date), 'MMM d')}
                </td>
                <td className="py-2 px-3 font-medium text-stone-900">{entry.dish_name}</td>
                <td className="py-2 px-3 text-center">{entry.planned_portions}</td>
                <td className="py-2 px-3 text-center">{entry.actual_portions}</td>
                <td className="py-2 px-3 text-center">
                  {entry.waste_portions > 0 ? (
                    <span className="text-red-600 font-medium">{entry.waste_portions}</span>
                  ) : (
                    <span className="text-stone-400">0</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {entry.waste_reason ? (
                    <Badge variant="default">
                      {REASON_LABELS[entry.waste_reason] || entry.waste_reason}
                    </Badge>
                  ) : (
                    <span className="text-stone-400">-</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  {entry.total_ingredient_cost_cents != null
                    ? `$${(entry.total_ingredient_cost_cents / 100).toFixed(2)}`
                    : '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================
// Log Batch Form
// ============================================

const WASTE_REASONS = [
  { value: '', label: 'No waste' },
  { value: 'overcooked', label: 'Overcooked' },
  { value: 'underseasoned', label: 'Underseasoned' },
  { value: 'contamination', label: 'Contamination' },
  { value: 'excess', label: 'Excess' },
  { value: 'other', label: 'Other' },
]

function LogBatchForm({ onLogged }: { onLogged: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = new FormData(e.currentTarget)
    const dishName = (form.get('dish_name') as string)?.trim()
    const batchDate = (form.get('batch_date') as string) || today
    const plannedPortions = parseInt(form.get('planned_portions') as string) || 0
    const actualPortions = parseInt(form.get('actual_portions') as string) || 0
    const wastePortions = parseInt(form.get('waste_portions') as string) || 0
    const wasteReason = (form.get('waste_reason') as string) || null
    const notes = (form.get('notes') as string)?.trim() || null
    const costPerPortion = form.get('cost_per_portion') as string
    const totalCost = form.get('total_cost') as string

    if (!dishName) {
      setError('Dish name is required')
      return
    }

    startTransition(async () => {
      try {
        await logBatchResult({
          batch_date: batchDate,
          dish_name: dishName,
          planned_portions: plannedPortions,
          actual_portions: actualPortions,
          waste_portions: wastePortions,
          waste_reason: wasteReason as any,
          notes,
          cost_per_portion_cents: costPerPortion
            ? Math.round(parseFloat(costPerPortion) * 100)
            : null,
          total_ingredient_cost_cents: totalCost ? Math.round(parseFloat(totalCost) * 100) : null,
        })
        onLogged()
        ;(e.target as HTMLFormElement).reset()
      } catch (err: any) {
        setError(err.message || 'Failed to log batch')
      }
    })
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-stone-200 mb-3">Log Batch Result</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Dish Name *</label>
            <input
              name="dish_name"
              type="text"
              required
              className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm"
              placeholder="e.g. Grilled Chicken Bowls"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Date</label>
            <input
              name="batch_date"
              type="date"
              defaultValue={today}
              className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Planned Portions
            </label>
            <input
              name="planned_portions"
              type="number"
              min={0}
              defaultValue={0}
              className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Actual Portions</label>
            <input
              name="actual_portions"
              type="number"
              min={0}
              defaultValue={0}
              className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Waste Portions</label>
            <input
              name="waste_portions"
              type="number"
              min={0}
              defaultValue={0}
              className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Waste Reason</label>
            <select
              name="waste_reason"
              className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm"
            >
              {WASTE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Cost/Portion ($)
              </label>
              <input
                name="cost_per_portion"
                type="number"
                step="0.01"
                min={0}
                className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Total Cost ($)
              </label>
              <input
                name="total_cost"
                type="number"
                step="0.01"
                min={0}
                className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Notes</label>
          <textarea
            name="notes"
            rows={2}
            className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm"
            placeholder="Any details about this batch..."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Logging...' : 'Log Batch'}
        </Button>
      </form>
    </Card>
  )
}

// ============================================
// Main Waste Tracker Component
// ============================================

interface WasteTrackerProps {
  initialEntries: BatchLogEntry[]
  initialSummary: WasteSummary
  startDate: string
  endDate: string
}

export function WasteTracker({
  initialEntries,
  initialSummary,
  startDate,
  endDate,
}: WasteTrackerProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [summary, setSummary] = useState(initialSummary)
  const [showForm, setShowForm] = useState(false)

  function handleLogged() {
    // After logging, refresh data via server revalidation.
    // The page will re-render with fresh data on next navigation.
    setShowForm(false)
    // Force a page reload to get fresh server data
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <SummaryCards summary={summary} />

      {/* Log Batch Button / Form */}
      <div>
        {showForm ? (
          <div className="space-y-3">
            <LogBatchForm onLogged={handleLogged} />
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Log Batch
          </Button>
        )}
      </div>

      {/* Batch History */}
      <div>
        <h2 className="text-lg font-semibold text-stone-900 mb-3">
          Batch History ({startDate} to {endDate})
        </h2>
        <BatchLogTable entries={entries} />
      </div>
    </div>
  )
}
