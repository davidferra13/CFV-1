'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/currency'
import {
  getBudgetVariance,
  setBudget,
  type BudgetSummary,
} from '@/lib/finance/budget-variance-actions'
import {
  BUDGET_CATEGORIES,
  BUDGET_CATEGORY_LABELS,
  type BudgetCategory,
} from '@/lib/finance/budget-variance-shared'

type Props = {
  initialData: BudgetSummary | null
  initialMonth: string
}

export function BudgetVarianceClient({ initialData, initialMonth }: Props) {
  const [month, setMonth] = useState(initialMonth)
  const [data, setData] = useState<BudgetSummary | null>(initialData)
  const [isPending, startTransition] = useTransition()
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null)
  const [budgetInput, setBudgetInput] = useState('')

  function handleMonthChange(newMonth: string) {
    setMonth(newMonth)
    const previous = data
    startTransition(async () => {
      try {
        const result = await getBudgetVariance(newMonth)
        setData(result)
      } catch (err) {
        setData(previous)
        toast.error('Failed to load budget data')
      }
    })
  }

  function handleSetBudget(category: BudgetCategory) {
    const cents = Math.round(parseFloat(budgetInput) * 100)
    if (isNaN(cents) || cents < 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const previous = data
    startTransition(async () => {
      try {
        await setBudget(month, category, cents)
        const result = await getBudgetVariance(month)
        setData(result)
        setEditingCategory(null)
        setBudgetInput('')
        toast.success('Budget updated')
      } catch (err) {
        setData(previous)
        toast.error('Failed to set budget')
      }
    })
  }

  function getVarianceColor(row: {
    variancePercent: number | null
    budgetCents: number
    actualCents: number
  }) {
    if (row.budgetCents === 0) return 'text-stone-400'
    if (row.variancePercent === null) return 'text-stone-400'
    if (row.variancePercent > 10) return 'text-red-400'
    if (row.variancePercent > 0) return 'text-amber-400'
    return 'text-green-400'
  }

  function getBarWidth(budget: number, actual: number): { budgetPct: string; actualPct: string } {
    const max = Math.max(budget, actual, 1)
    return {
      budgetPct: `${(budget / max) * 100}%`,
      actualPct: `${(actual / max) * 100}%`,
    }
  }

  // Month navigation
  function prevMonth() {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    handleMonthChange(newMonth)
  }

  function nextMonth() {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m, 1)
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    handleMonthChange(newMonth)
  }

  const monthLabel = (() => {
    const [y, m] = month.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  })()

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={prevMonth} disabled={isPending}>
          &larr;
        </Button>
        <span className="text-lg font-semibold text-stone-100 min-w-[180px] text-center">
          {monthLabel}
        </span>
        <Button variant="ghost" size="sm" onClick={nextMonth} disabled={isPending}>
          &rarr;
        </Button>
      </div>

      {/* Variance table */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-stone-400">
                  <th className="text-left py-3 px-4 font-medium">Category</th>
                  <th className="text-right py-3 px-4 font-medium">Budget</th>
                  <th className="text-right py-3 px-4 font-medium">Actual</th>
                  <th className="text-right py-3 px-4 font-medium">Variance</th>
                  <th className="text-right py-3 px-4 font-medium">%</th>
                  <th className="py-3 px-4 w-[200px]">Comparison</th>
                  <th className="py-3 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).map((row) => {
                  const bars = getBarWidth(row.budgetCents, row.actualCents)
                  const colorClass = getVarianceColor(row)

                  return (
                    <tr
                      key={row.category}
                      className="border-b border-stone-800 hover:bg-stone-800/40"
                    >
                      <td className="py-3 px-4 text-stone-200 font-medium">{row.categoryLabel}</td>
                      <td className="py-3 px-4 text-right text-stone-300">
                        {editingCategory === row.category ? (
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-stone-500">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={budgetInput}
                              onChange={(e) => setBudgetInput(e.target.value)}
                              className="w-24 text-right text-sm h-8"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSetBudget(row.category)
                                if (e.key === 'Escape') {
                                  setEditingCategory(null)
                                  setBudgetInput('')
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSetBudget(row.category)}
                              disabled={isPending}
                              className="h-8 px-2"
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="hover:text-brand-400 transition-colors"
                            onClick={() => {
                              setEditingCategory(row.category)
                              setBudgetInput(
                                row.budgetCents > 0 ? (row.budgetCents / 100).toFixed(2) : ''
                              )
                            }}
                          >
                            {row.budgetCents > 0 ? formatCurrency(row.budgetCents) : 'Set budget'}
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-stone-300">
                        {formatCurrency(row.actualCents)}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${colorClass}`}>
                        {row.budgetCents > 0
                          ? `${row.varianceCents >= 0 ? '+' : ''}${formatCurrency(row.varianceCents)}`
                          : '-'}
                      </td>
                      <td className={`py-3 px-4 text-right ${colorClass}`}>
                        {row.variancePercent !== null
                          ? `${row.variancePercent > 0 ? '+' : ''}${row.variancePercent.toFixed(1)}%`
                          : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-stone-500 w-3">B</span>
                            <div className="flex-1 bg-stone-800 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-brand-500 rounded-full transition-all"
                                style={{ width: bars.budgetPct }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-stone-500 w-3">A</span>
                            <div className="flex-1 bg-stone-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  row.actualCents > row.budgetCents && row.budgetCents > 0
                                    ? 'bg-red-400'
                                    : 'bg-green-400'
                                }`}
                                style={{ width: bars.actualPct }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  )
                })}

                {/* Totals row */}
                {data && (
                  <tr className="bg-stone-800/60 font-semibold">
                    <td className="py-3 px-4 text-stone-100">Total</td>
                    <td className="py-3 px-4 text-right text-stone-100">
                      {formatCurrency(data.totalBudgetCents)}
                    </td>
                    <td className="py-3 px-4 text-right text-stone-100">
                      {formatCurrency(data.totalActualCents)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right ${
                        data.totalVarianceCents >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {data.totalVarianceCents >= 0 ? '+' : ''}
                      {formatCurrency(data.totalVarianceCents)}
                    </td>
                    <td className="py-3 px-4 text-right text-stone-400">
                      {data.totalBudgetCents > 0
                        ? `${(((data.totalActualCents - data.totalBudgetCents) / data.totalBudgetCents) * 100).toFixed(1)}%`
                        : '-'}
                    </td>
                    <td className="py-3 px-4" colSpan={2}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-stone-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-400 inline-block" /> Under budget
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Within 10%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-400 inline-block" /> Over budget
        </span>
      </div>
    </div>
  )
}
