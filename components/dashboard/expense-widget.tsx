'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { getExpenseSummary, getMonthlyExpenseTrend } from '@/lib/finance/expense-actions'
import type { ExpenseSummary } from '@/lib/finance/expense-actions'

const CATEGORY_LABELS: Record<string, string> = {
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

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ExpenseWidget() {
  const [thisMonthTotal, setThisMonthTotal] = useState<number | null>(null)
  const [lastMonthTotal, setLastMonthTotal] = useState<number | null>(null)
  const [topCategory, setTopCategory] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const now = new Date()
        const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        const lastMonthEndStr = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`

        const [thisMonthSummary, lastMonthSummary] = await Promise.all([
          getExpenseSummary(thisMonthStart),
          getExpenseSummary(lastMonthStart, lastMonthEndStr),
        ])

        if (cancelled) return

        const thisTotal = thisMonthSummary.reduce((s, e) => s + e.total_cents, 0)
        const lastTotal = lastMonthSummary.reduce((s, e) => s + e.total_cents, 0)

        setThisMonthTotal(thisTotal)
        setLastMonthTotal(lastTotal)
        setTopCategory(thisMonthSummary.length > 0 ? thisMonthSummary[0] : null)
      } catch (err) {
        if (!cancelled) {
          console.error('[ExpenseWidget] Load failed:', err)
          setError('Could not load expense data')
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
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-stone-200 rounded w-24" />
            <div className="h-4 bg-stone-100 rounded w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const change = lastMonthTotal && lastMonthTotal > 0
    ? ((thisMonthTotal! - lastMonthTotal) / lastMonthTotal) * 100
    : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Expenses</CardTitle>
        <a
          href="/finance/expenses"
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          View all
        </a>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wide">This Month</p>
          <p className="text-2xl font-bold font-mono text-stone-900">
            {formatCents(thisMonthTotal ?? 0)}
          </p>
        </div>

        {change !== null && (
          <p className="text-sm">
            <span className={change > 0 ? 'text-red-600' : 'text-emerald-600'}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
            <span className="text-stone-500"> vs last month</span>
          </p>
        )}

        {topCategory && (
          <div className="pt-2 border-t border-stone-100">
            <p className="text-xs text-stone-500">Top category</p>
            <p className="text-sm font-medium text-stone-900">
              {CATEGORY_LABELS[topCategory.category] || topCategory.category}{' '}
              <span className="font-mono text-stone-600">
                {formatCents(topCategory.total_cents)}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
