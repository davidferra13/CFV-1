'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { getExpenseSummary, getMonthlyExpenseTrend } from '@/lib/finance/expense-actions'
import type { ExpenseSummary, MonthlyTrend, ExpenseCategory } from '@/lib/finance/expense-actions'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: 'Food',
  equipment: 'Equipment',
  supplies: 'Supplies',
  mileage: 'Mileage',
  insurance: 'Insurance',
  subscriptions: 'Subscriptions',
  marketing: 'Marketing',
  rent: 'Rent',
  utilities: 'Utilities',
  professional_services: 'Prof. Services',
  training: 'Training',
  other: 'Other',
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: '#10b981',
  equipment: '#3b82f6',
  supplies: '#78716c',
  mileage: '#f59e0b',
  insurance: '#ef4444',
  subscriptions: '#6366f1',
  marketing: '#ec4899',
  rent: '#dc2626',
  utilities: '#a8a29e',
  professional_services: '#0ea5e9',
  training: '#22c55e',
  other: '#d6d3d1',
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatShortMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1)
  return d.toLocaleDateString('en-US', { month: 'short' })
}

export function ExpenseSummaryChart() {
  const [summaries, setSummaries] = useState<ExpenseSummary[]>([])
  const [trends, setTrends] = useState<MonthlyTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [summaryData, trendData] = await Promise.all([
          getExpenseSummary(),
          getMonthlyExpenseTrend(6),
        ])
        if (!cancelled) {
          setSummaries(summaryData)
          setTrends(trendData)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ExpenseSummaryChart] Load failed:', err)
          setError('Failed to load expense data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-stone-500">Loading charts...</div>
  }

  const grandTotal = summaries.reduce((sum, s) => sum + s.total_cents, 0)
  const top3 = summaries.slice(0, 3)
  const maxMonthly = Math.max(...trends.map((t) => t.total_cents), 1)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Category Donut */}
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-4">No expense data yet</p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {/* CSS donut chart */}
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {(() => {
                    let offset = 0
                    return summaries.map((s) => {
                      const pct = grandTotal > 0 ? (s.total_cents / grandTotal) * 100 : 0
                      const segment = (
                        <circle
                          key={s.category}
                          cx="18"
                          cy="18"
                          r="14"
                          fill="none"
                          stroke={CATEGORY_COLORS[s.category]}
                          strokeWidth="5"
                          strokeDasharray={`${pct} ${100 - pct}`}
                          strokeDashoffset={-offset}
                          className="transition-all duration-300"
                        />
                      )
                      offset += pct
                      return segment
                    })
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-stone-500">Total</span>
                  <span className="text-lg font-bold text-stone-900 font-mono">
                    {formatCents(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="w-full space-y-2">
                {summaries.map((s) => {
                  const pct = grandTotal > 0 ? ((s.total_cents / grandTotal) * 100).toFixed(1) : '0'
                  return (
                    <div key={s.category} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[s.category] }}
                        />
                        <span className="text-stone-700">
                          {CATEGORY_LABELS[s.category]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-stone-500">{pct}%</span>
                        <span className="font-mono font-medium text-stone-900">
                          {formatCents(s.total_cents)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Top 3 highlight */}
              {top3.length > 0 && (
                <div className="w-full pt-3 border-t border-stone-100">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                    Top Categories
                  </p>
                  <div className="flex gap-2">
                    {top3.map((s, i) => (
                      <div
                        key={s.category}
                        className="flex-1 rounded-lg p-2 text-center"
                        style={{ backgroundColor: CATEGORY_COLORS[s.category] + '15' }}
                      >
                        <div className="text-xs text-stone-500">#{i + 1}</div>
                        <div className="text-sm font-medium text-stone-900">
                          {CATEGORY_LABELS[s.category]}
                        </div>
                        <div className="text-xs font-mono text-stone-600">
                          {formatCents(s.total_cents)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trend Bars */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trends.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-4">No trend data yet</p>
          ) : (
            <div className="space-y-3">
              {trends.map((t) => {
                const pct = maxMonthly > 0 ? (t.total_cents / maxMonthly) * 100 : 0
                return (
                  <div key={t.month} className="flex items-center gap-3">
                    <span className="w-12 text-xs text-stone-500 text-right shrink-0">
                      {formatShortMonth(t.month)}
                    </span>
                    <div className="flex-1 h-7 bg-stone-100 rounded-md overflow-hidden relative">
                      <div
                        className="h-full bg-brand-500 rounded-md transition-all duration-300"
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                      {t.total_cents > 0 && (
                        <span className="absolute inset-y-0 right-2 flex items-center text-xs font-mono text-stone-600">
                          {formatCents(t.total_cents)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Total for period */}
              <div className="pt-3 border-t border-stone-100 flex justify-between text-sm">
                <span className="text-stone-500">
                  {trends.length}-month total
                </span>
                <span className="font-mono font-semibold text-stone-900">
                  {formatCents(trends.reduce((s, t) => s + t.total_cents, 0))}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
