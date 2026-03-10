// Stocktake Reconciliation
// Shows items with variances, allows setting reasons and marking items for inventory adjustment.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  setVarianceReason,
  toggleAdjusted,
  completeStocktake,
  adjustInventory,
} from '@/lib/inventory/stocktake-actions'
import type { StocktakeItem } from '@/lib/inventory/stocktake-actions'

const VARIANCE_REASONS = [
  { value: '', label: 'Select reason...' },
  { value: 'waste', label: 'Waste' },
  { value: 'spoilage', label: 'Spoilage' },
  { value: 'theft', label: 'Theft' },
  { value: 'recording_error', label: 'Recording error' },
  { value: 'donation', label: 'Donation' },
  { value: 'unknown', label: 'Unknown' },
]

type Props = {
  stocktakeId: string
  stocktakeName: string
  items: StocktakeItem[]
}

function varianceColor(pct: number | null): string {
  if (pct == null) return 'text-stone-500'
  const abs = Math.abs(pct)
  if (abs <= 5) return 'text-green-400'
  if (abs <= 15) return 'text-yellow-400'
  return 'text-red-400'
}

function varianceBg(pct: number | null): string {
  if (pct == null) return ''
  const abs = Math.abs(pct)
  if (abs <= 5) return 'bg-green-500/5'
  if (abs <= 15) return 'bg-yellow-500/5'
  return 'bg-red-500/5'
}

function formatCents(cents: number): string {
  const abs = Math.abs(cents)
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${(abs / 100).toFixed(2)}`
}

export function StocktakeReconciliation({ stocktakeId, stocktakeName, items }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localItems, setLocalItems] = useState<StocktakeItem[]>(items)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)

  // Only show items with variances
  const varianceItems = localItems.filter(
    (i) => i.countedQuantity != null && i.variance != null && i.variance !== 0
  )

  const totalVarianceCents = varianceItems.reduce(
    (sum, i) => sum + Math.abs(i.varianceValueCents || 0),
    0
  )
  const adjustedCount = varianceItems.filter((i) => i.adjusted).length

  const handleReasonChange = (itemId: string, reason: string) => {
    const previous = [...localItems]
    setLocalItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, varianceReason: reason || null } : i))
    )

    startTransition(async () => {
      try {
        await setVarianceReason(itemId, reason)
      } catch {
        setLocalItems(previous)
      }
    })
  }

  const handleAdjustToggle = (itemId: string, adjusted: boolean) => {
    const previous = [...localItems]
    setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, adjusted } : i)))

    startTransition(async () => {
      try {
        await toggleAdjusted(itemId, adjusted)
      } catch {
        setLocalItems(previous)
      }
    })
  }

  const handleAdjustAll = () => {
    for (const item of varianceItems) {
      if (!item.adjusted) {
        handleAdjustToggle(item.id, true)
      }
    }
  }

  const handleComplete = () => {
    setCompleting(true)
    startTransition(async () => {
      try {
        // First adjust inventory for items marked
        const markedForAdjust = localItems.filter((i) => i.adjusted)
        if (markedForAdjust.length > 0) {
          await adjustInventory(stocktakeId)
        }

        await completeStocktake(stocktakeId)
        setCompleted(true)
      } catch {
        setCompleting(false)
      }
    })
  }

  if (completed) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800 p-8 text-center space-y-4">
        <div className="text-4xl">&#10003;</div>
        <h2 className="text-xl font-semibold text-stone-100">Stocktake Complete</h2>
        <p className="text-stone-400">
          {varianceItems.length} variance{varianceItems.length !== 1 ? 's' : ''} found.
          {adjustedCount > 0 && ` ${adjustedCount} item${adjustedCount !== 1 ? 's' : ''} adjusted.`}
          {totalVarianceCents > 0 && ` Total variance: ${formatCents(totalVarianceCents)}.`}
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => router.push('/inventory/stocktake/history')}
            className="px-4 py-2 rounded-lg bg-stone-700 text-stone-200 text-sm hover:bg-stone-600"
          >
            View History
          </button>
          <button
            onClick={() => router.push('/inventory/stocktake')}
            className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm hover:bg-brand-600"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{varianceItems.length}</p>
          <p className="text-xs text-stone-500">Items with variances</p>
        </div>
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{formatCents(totalVarianceCents)}</p>
          <p className="text-xs text-stone-500">Total variance</p>
        </div>
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{adjustedCount}</p>
          <p className="text-xs text-stone-500">Items to adjust</p>
        </div>
      </div>

      {varianceItems.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-400">
            No variances found. All counts match expected quantities.
          </p>
          <button
            onClick={handleComplete}
            disabled={completing || isPending}
            className="mt-4 px-6 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {completing ? 'Completing...' : 'Complete Stocktake'}
          </button>
        </div>
      ) : (
        <>
          {/* Bulk actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleAdjustAll}
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              Adjust all to counted
            </button>
          </div>

          {/* Variance table */}
          <div className="overflow-x-auto rounded-lg border border-stone-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-800 text-stone-400 text-left">
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium text-right">Expected</th>
                  <th className="px-3 py-2 font-medium text-right">Counted</th>
                  <th className="px-3 py-2 font-medium text-right">Variance</th>
                  <th className="px-3 py-2 font-medium text-right">%</th>
                  <th className="px-3 py-2 font-medium text-right">$ Impact</th>
                  <th className="px-3 py-2 font-medium">Reason</th>
                  <th className="px-3 py-2 font-medium text-center">Adjust?</th>
                </tr>
              </thead>
              <tbody>
                {varianceItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-t border-stone-700/50 ${varianceBg(item.variancePercent)}`}
                  >
                    <td className="px-3 py-2 text-stone-200 font-medium">{item.ingredientName}</td>
                    <td className="px-3 py-2 text-right text-stone-400">
                      {item.expectedQuantity} {item.unit}
                    </td>
                    <td className="px-3 py-2 text-right text-stone-200">
                      {item.countedQuantity} {item.unit}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${varianceColor(item.variancePercent)}`}
                    >
                      {item.variance != null && item.variance > 0 ? '+' : ''}
                      {item.variance}
                    </td>
                    <td className={`px-3 py-2 text-right ${varianceColor(item.variancePercent)}`}>
                      {item.variancePercent != null
                        ? `${item.variancePercent > 0 ? '+' : ''}${item.variancePercent.toFixed(1)}%`
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-stone-300">
                      {item.varianceValueCents != null ? formatCents(item.varianceValueCents) : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={item.varianceReason ?? ''}
                        onChange={(e) => handleReasonChange(item.id, e.target.value)}
                        className="w-full rounded bg-stone-800 border border-stone-600 text-stone-300 text-xs px-2 py-1 focus:border-brand-500 focus:outline-none"
                        disabled={isPending}
                      >
                        {VARIANCE_REASONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={item.adjusted}
                        onChange={(e) => handleAdjustToggle(item.id, e.target.checked)}
                        className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-brand-500 focus:ring-brand-500"
                        disabled={isPending}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Complete button */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => router.push(`/inventory/stocktake/${stocktakeId}`)}
              className="text-sm text-stone-500 hover:text-stone-300"
            >
              Back to counting
            </button>
            <button
              onClick={handleComplete}
              disabled={completing || isPending}
              className="px-6 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {completing
                ? 'Completing...'
                : `Complete Stocktake${adjustedCount > 0 ? ` (adjust ${adjustedCount} items)` : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
