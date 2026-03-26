'use client'

// Cost Variance Card
// Shows estimated vs actual food cost for an event.
// The core of the closed cost loop: did the chef spend what they estimated?

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import type { EventActualCost } from '@/lib/finance/expense-line-item-actions'
import { getEventCostVariance } from '@/lib/finance/expense-line-item-actions'

function formatCents(cents: number): string {
  return `$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function DataRow({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: 'over' | 'under' | null
}) {
  const valueColor =
    highlight === 'over'
      ? 'text-red-400'
      : highlight === 'under'
        ? 'text-green-400'
        : 'text-stone-100'

  return (
    <div className="flex justify-between items-baseline py-2 border-b border-stone-800 last:border-0">
      <span className="text-sm text-stone-400">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-medium ${valueColor}`}>{value}</span>
        {sub && <p className="text-xs text-stone-500">{sub}</p>}
      </div>
    </div>
  )
}

type Props = {
  eventId: string
}

export function CostVarianceCard({ eventId }: Props) {
  const [data, setData] = useState<EventActualCost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getEventCostVariance(eventId)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => {
        // Fail silently; the card just won't render
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  // Don't render if no data or no line items
  if (loading) {
    return (
      <Card className="p-5">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-stone-800 rounded w-1/3" />
          <div className="h-3 bg-stone-800 rounded w-full" />
        </div>
      </Card>
    )
  }

  if (!data || (data.totalActualCents === 0 && data.totalEstimatedCents === 0)) {
    return null
  }

  // No actual data yet (no receipts processed with line items)
  if (data.totalActualCents === 0 && data.totalEstimatedCents > 0) {
    return (
      <Card className="p-5">
        <h2 className="font-semibold text-stone-100 mb-2">Estimated vs Actual Cost</h2>
        <DataRow label="Estimated (from recipes)" value={formatCents(data.totalEstimatedCents)} />
        <p className="text-xs text-stone-500 mt-2">
          Actual cost will appear here once receipt line items are matched to ingredients.
        </p>
      </Card>
    )
  }

  const isOver = data.varianceCents > 0
  const varianceHighlight = data.varianceCents === 0 ? null : isOver ? 'over' : 'under'

  const varianceLabel = isOver
    ? `+${formatCents(data.varianceCents)}`
    : data.varianceCents < 0
      ? `-${formatCents(data.varianceCents)}`
      : '$0.00'

  const varianceSub =
    data.variancePercent !== null
      ? `${isOver ? '+' : ''}${data.variancePercent}% vs estimate`
      : undefined

  return (
    <Card className="p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-stone-100">Estimated vs Actual Cost</h2>
        {data.unmatchedCount > 0 && (
          <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-full">
            {data.unmatchedCount} unmatched item{data.unmatchedCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <DataRow
        label="Estimated (from recipes)"
        value={
          data.totalEstimatedCents > 0 ? formatCents(data.totalEstimatedCents) : 'No recipe data'
        }
      />
      <DataRow
        label="Actual (from receipts)"
        value={formatCents(data.totalActualCents)}
        sub={`${data.matchedCount} matched, ${data.unmatchedCount} unmatched`}
      />
      <DataRow
        label="Variance"
        value={varianceLabel}
        sub={varianceSub}
        highlight={varianceHighlight as 'over' | 'under' | null}
      />

      {/* Per-item breakdown for matched items */}
      {data.lineItems.filter((li) => li.ingredientName && li.estimatedCostCents !== null).length >
        0 && (
        <details className="mt-3">
          <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-300">
            Per-ingredient breakdown
          </summary>
          <div className="mt-2 space-y-1">
            {data.lineItems
              .filter((li) => li.ingredientName)
              .map((li, i) => {
                const delta =
                  li.estimatedCostCents !== null ? li.amountCents - li.estimatedCostCents : null
                return (
                  <div
                    key={i}
                    className="flex justify-between text-xs py-1 border-b border-stone-800/50"
                  >
                    <span className="text-stone-400 truncate flex-1">{li.ingredientName}</span>
                    <div className="flex gap-3 shrink-0">
                      <span className="text-stone-500">
                        Est:{' '}
                        {li.estimatedCostCents !== null ? formatCents(li.estimatedCostCents) : '-'}
                      </span>
                      <span className="text-stone-200">Act: {formatCents(li.amountCents)}</span>
                      {delta !== null && delta !== 0 && (
                        <span className={delta > 0 ? 'text-red-400' : 'text-green-400'}>
                          {delta > 0 ? '+' : '-'}
                          {formatCents(delta)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </details>
      )}
    </Card>
  )
}
