'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface BreakEvenCalculatorProps {
  initialFixedMonthlyCents?: number
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

export function BreakEvenCalculator({ initialFixedMonthlyCents = 0 }: BreakEvenCalculatorProps) {
  const [fixedMonthly, setFixedMonthly] = useState((initialFixedMonthlyCents / 100).toFixed(2))
  const [variableCost, setVariableCost] = useState('')
  const [avgRevenue, setAvgRevenue] = useState('')

  const fixedCents = dollarsToCents(parseFloat(fixedMonthly) || 0)
  const variableCents = dollarsToCents(parseFloat(variableCost) || 0)
  const revenueCents = dollarsToCents(parseFloat(avgRevenue) || 0)

  const contributionMarginCents = revenueCents - variableCents
  const hasValidInputs = revenueCents > 0 && contributionMarginCents > 0 && fixedCents > 0

  const eventsPerMonth = hasValidInputs ? fixedCents / contributionMarginCents : null
  const revenueNeededCents = hasValidInputs ? Math.ceil(eventsPerMonth!) * revenueCents : null

  // Build a simple bar chart for 1-10 events showing cost vs revenue
  const chartPoints = hasValidInputs
    ? Array.from({ length: 10 }, (_, i) => {
        const count = i + 1
        const totalRevenue = count * revenueCents
        const totalCost = fixedCents + count * variableCents
        return { count, totalRevenue, totalCost }
      })
    : []

  const maxValue =
    chartPoints.length > 0
      ? Math.max(...chartPoints.map((p) => Math.max(p.totalRevenue, p.totalCost)))
      : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Break-Even Calculator</CardTitle>
        <p className="text-sm text-stone-500 mt-1">
          Find how many events you need each month to cover your costs.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Fixed monthly overhead ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={fixedMonthly}
              onChange={(e) => setFixedMonthly(e.target.value)}
              placeholder="e.g. 2000"
              className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-stone-400 mt-1">Rent, insurance, subscriptions, etc.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Variable cost per event ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={variableCost}
              onChange={(e) => setVariableCost(e.target.value)}
              placeholder="e.g. 300"
              className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-stone-400 mt-1">Groceries, supplies, transport per event.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Average revenue per event ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={avgRevenue}
              onChange={(e) => setAvgRevenue(e.target.value)}
              placeholder="e.g. 800"
              className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-stone-400 mt-1">Typical price charged per event.</p>
          </div>
        </div>

        {/* Result */}
        {hasValidInputs && eventsPerMonth !== null && revenueNeededCents !== null && (
          <div className="rounded-xl bg-brand-950 border border-brand-700 p-4">
            <p className="text-lg font-semibold text-brand-300">
              You break even at{' '}
              <span className="text-brand-600">
                {eventsPerMonth < 1 ? 'less than 1 event' : `${eventsPerMonth.toFixed(1)} events`}
              </span>{' '}
              per month
            </p>
            <p className="text-sm text-brand-400 mt-1">
              That requires {centsToDisplay(revenueNeededCents)} in monthly revenue (
              {Math.ceil(eventsPerMonth)} events at {centsToDisplay(revenueCents)} each).
            </p>
          </div>
        )}

        {!hasValidInputs &&
          contributionMarginCents <= 0 &&
          revenueCents > 0 &&
          variableCents > 0 && (
            <div className="rounded-xl bg-red-950 border border-red-200 p-4">
              <p className="text-sm text-red-700 font-medium">
                Variable cost per event exceeds revenue — you cannot break even at these numbers.
                Increase your pricing or reduce variable costs.
              </p>
            </div>
          )}

        {/* Bar chart */}
        {chartPoints.length > 0 && maxValue > 0 && (
          <div>
            <p className="text-sm font-medium text-stone-400 mb-3">
              Revenue vs. Cost (1-10 events)
            </p>
            <div className="flex items-end gap-1.5 h-32">
              {chartPoints.map((point) => {
                const revenueH = Math.round((point.totalRevenue / maxValue) * 100)
                const costH = Math.round((point.totalCost / maxValue) * 100)
                const isProfitable = point.totalRevenue >= point.totalCost
                return (
                  <div
                    key={point.count}
                    className="flex-1 flex flex-col items-center gap-0.5"
                    title={`${point.count} events — Revenue: ${centsToDisplay(point.totalRevenue)}, Cost: ${centsToDisplay(point.totalCost)}`}
                  >
                    {/* Revenue bar */}
                    <div
                      className={`w-full rounded-t ${isProfitable ? 'bg-emerald-400' : 'bg-red-300'}`}
                      style={{ height: `${revenueH}%` }}
                    />
                    <span className="text-xs text-stone-400">{point.count}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-400 inline-block" />
                Profitable
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-300 inline-block" />
                Below break-even
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
