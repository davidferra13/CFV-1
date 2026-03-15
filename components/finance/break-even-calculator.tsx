'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import {
  calculateBreakEven,
  getBreakEvenScenarios,
  getMonthlyFixedCostEstimate,
  type BreakEvenResult,
  type BreakEvenScenario,
  type FixedCostEstimate,
} from '@/lib/finance/break-even-actions'

function StatusBadge({ status }: { status: BreakEvenResult['status'] }) {
  const config = {
    profitable: {
      label: 'Profitable',
      bg: 'bg-emerald-900',
      text: 'text-emerald-300',
      border: 'border-emerald-700',
    },
    'break-even': {
      label: 'Break-Even',
      bg: 'bg-amber-900',
      text: 'text-amber-300',
      border: 'border-amber-700',
    },
    'below-break-even': {
      label: 'Below Break-Even',
      bg: 'bg-red-900',
      text: 'text-red-300',
      border: 'border-red-700',
    },
  }
  const c = config[status]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}
    >
      {c.label}
    </span>
  )
}

export function BreakEvenCalculator() {
  const [fixedCostInput, setFixedCostInput] = useState('')
  const [result, setResult] = useState<BreakEvenResult | null>(null)
  const [scenarios, setScenarios] = useState<BreakEvenScenario[]>([])
  const [estimate, setEstimate] = useState<FixedCostEstimate>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estimateLoading, setEstimateLoading] = useState(true)

  // Load fixed cost estimate on mount
  useEffect(() => {
    let cancelled = false
    getMonthlyFixedCostEstimate()
      .then((est) => {
        if (cancelled) return
        setEstimate(est)
        if (est && !fixedCostInput) {
          setFixedCostInput((est.totalCents / 100).toFixed(0))
        }
        setEstimateLoading(false)
      })
      .catch(() => {
        if (!cancelled) setEstimateLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const runCalculation = useCallback(async () => {
    const dollars = parseFloat(fixedCostInput)
    if (!dollars || dollars <= 0) {
      setError('Enter your monthly fixed costs to calculate.')
      return
    }

    const cents = Math.round(dollars * 100)
    setLoading(true)
    setError(null)

    try {
      const [breakEven, scenarioData] = await Promise.all([
        calculateBreakEven(cents),
        getBreakEvenScenarios(cents),
      ])
      setResult(breakEven)
      setScenarios(scenarioData)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to calculate break-even.')
    } finally {
      setLoading(false)
    }
  }, [fixedCostInput])

  // Progress bar: current vs needed
  const progressPercent =
    result && result.breakEvenEvents !== Infinity && result.breakEvenEvents > 0
      ? Math.min(200, Math.round((result.currentMonthlyEventCount / result.breakEvenEvents) * 100))
      : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Break-Even Analysis</CardTitle>
        <p className="text-sm text-stone-500 mt-1">
          How many events per month do you need to cover fixed costs? Based on your real event data.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Fixed cost input */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Monthly fixed costs ($)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={fixedCostInput}
                onChange={(e) => setFixedCostInput(e.target.value)}
                placeholder="e.g. 2000"
                className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runCalculation()
                }}
              />
              <p className="text-xs text-stone-400 mt-1">
                Rent, insurance, software, vehicle, storage, etc.
              </p>
            </div>
            <button
              type="button"
              onClick={runCalculation}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Calculating...' : 'Calculate'}
            </button>
          </div>

          {/* Show estimated breakdown if available */}
          {estimate && !estimateLoading && (
            <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-3">
              <p className="text-xs font-medium text-stone-400 mb-1.5">
                Estimated from your expense records:
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-300">
                {estimate.breakdown.map((item) => (
                  <span key={item.category}>
                    {item.category}: {formatCurrency(item.amountCents)}
                  </span>
                ))}
                <span className="font-medium text-stone-200">
                  Total: {formatCurrency(estimate.totalCents)}/mo
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 p-3">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-5">
            {/* No data state */}
            {result.completedEventCount === 0 ? (
              <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
                <p className="text-sm text-stone-400">
                  No completed events yet. Complete some events to see your break-even analysis
                  based on real numbers.
                </p>
              </div>
            ) : (
              <>
                {/* Status + key numbers */}
                <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-300">Status</span>
                    <StatusBadge status={result.status} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-stone-500">Avg revenue/event</p>
                      <p className="text-sm font-semibold text-stone-200">
                        {formatCurrency(result.avgRevenuePerEventCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">Avg cost/event</p>
                      <p className="text-sm font-semibold text-stone-200">
                        {formatCurrency(result.avgVariableCostPerEventCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">Contribution margin</p>
                      <p className="text-sm font-semibold text-stone-200">
                        {result.contributionMarginCents <= 0
                          ? 'Negative'
                          : formatCurrency(result.contributionMarginCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">Based on</p>
                      <p className="text-sm font-semibold text-stone-200">
                        {result.completedEventCount} event
                        {result.completedEventCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Break-even bar */}
                {result.breakEvenEvents !== Infinity && (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium text-stone-300">
                        Events needed: {result.breakEvenEvents}/mo
                      </span>
                      <span className="text-sm text-stone-400">
                        Current pace: {result.currentMonthlyEventCount}/mo
                      </span>
                    </div>

                    {/* Visual bar */}
                    <div className="relative h-6 rounded-full bg-stone-700 overflow-hidden">
                      {/* Target line */}
                      <div className="absolute inset-y-0 left-1/2 w-px bg-stone-400 z-10" />
                      {/* Progress fill */}
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          result.status === 'profitable'
                            ? 'bg-emerald-500'
                            : result.status === 'break-even'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, progressPercent / 2)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>0</span>
                      <span>Break-even ({result.breakEvenEvents})</span>
                      <span>{Math.round(result.breakEvenEvents * 2)}</span>
                    </div>

                    {/* Surplus / deficit */}
                    <div
                      className={`text-sm font-medium ${
                        result.monthlySurplusDeficitCents >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {result.monthlySurplusDeficitCents >= 0
                        ? `Monthly surplus: ${formatCurrency(result.monthlySurplusDeficitCents)}`
                        : `Monthly deficit: ${formatCurrency(Math.abs(result.monthlySurplusDeficitCents))}`}
                    </div>
                  </div>
                )}

                {result.contributionMarginCents <= 0 && (
                  <div className="rounded-xl border border-red-800 bg-red-950 p-4">
                    <p className="text-sm text-red-300 font-medium">
                      Your average cost per event exceeds your average revenue. You cannot break
                      even at current pricing. Raise prices or reduce variable costs before anything
                      else.
                    </p>
                  </div>
                )}

                {/* Scenario table */}
                {scenarios.length > 0 && result.contributionMarginCents > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-stone-300 mb-2">What-if scenarios</h3>
                    <div className="rounded-lg border border-stone-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Scenario</TableHead>
                            <TableHead className="text-right">Avg price</TableHead>
                            <TableHead className="text-right">Margin/event</TableHead>
                            <TableHead className="text-right">Events to break even</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scenarios.map((s) => (
                            <TableRow
                              key={s.label}
                              className={s.label === 'Current price' ? 'bg-stone-800/50' : ''}
                            >
                              <TableCell className="text-sm">
                                {s.label}
                                {s.label === 'Current price' && (
                                  <span className="ml-1.5 text-xs text-stone-500">(you)</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(s.avgRevenuePerEventCents)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {s.contributionMarginCents <= 0
                                  ? 'Negative'
                                  : formatCurrency(s.contributionMarginCents)}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                {s.breakEvenEvents === Infinity ? 'N/A' : `${s.breakEvenEvents}/mo`}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-stone-500 mt-2">
                      Scenarios adjust your average event price while keeping variable costs
                      constant.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
