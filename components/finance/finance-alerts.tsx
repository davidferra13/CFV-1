'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { getFinanceAlerts, type FinanceAlerts } from '@/lib/finance/alert-actions'
import { formatCurrency } from '@/lib/utils/format'
import { EXPENSE_CATEGORIES } from '@/lib/constants/expense-categories'

const EXPENSE_ROUTE_MAP: Record<string, string> = {
  groceries: '/finance/expenses/food-ingredients',
  alcohol: '/finance/expenses/food-ingredients',
  specialty_items: '/finance/expenses/food-ingredients',
  gas_mileage: '/finance/expenses/travel',
  vehicle: '/finance/expenses/travel',
  equipment: '/finance/expenses/rentals-equipment',
  supplies: '/finance/expenses/miscellaneous',
  venue_rental: '/finance/expenses/rentals-equipment',
  labor: '/finance/expenses/labor',
  uniforms: '/finance/expenses/miscellaneous',
  subscriptions: '/finance/expenses/software',
  marketing: '/finance/expenses/marketing',
  insurance_licenses: '/finance/expenses/miscellaneous',
  professional_services: '/finance/expenses/miscellaneous',
  education: '/finance/expenses/miscellaneous',
  utilities: '/finance/expenses/miscellaneous',
  platform_commission: '/finance/expenses/software',
  other: '/finance/expenses/miscellaneous',
}

export function FinanceAlertBanner() {
  const [alerts, setAlerts] = useState<FinanceAlerts | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getFinanceAlerts()
        setAlerts(data)
      } catch {
        // Silently fail; alerts are non-critical
      }
    })
  }, [])

  if (!alerts || isPending) return null

  const dismiss = (key: string) => {
    setDismissed((prev) => new Set(prev).add(key))
  }

  const showOverdue = alerts.overdueCount > 0 && !dismissed.has('overdue')
  const visibleExpenses = alerts.unusualExpenses.filter(
    (e) => !dismissed.has(`expense-${e.category}`)
  )

  if (!showOverdue && visibleExpenses.length === 0) return null

  return (
    <div className="space-y-2">
      {showOverdue && (
        <div className="flex items-center justify-between rounded-lg border border-red-800 bg-red-950/60 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-red-400 text-lg shrink-0">⚠</span>
            <p className="text-sm text-red-300">
              <span className="font-semibold">
                {alerts.overdueCount} invoice{alerts.overdueCount !== 1 ? 's' : ''} overdue
              </span>{' '}
              totaling{' '}
              <span className="font-semibold">{formatCurrency(alerts.overdueTotalCents)}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/finance/invoices/overdue"
              className="text-xs font-medium text-red-400 hover:text-red-300 hover:underline"
            >
              View Overdue
            </Link>
            <button
              onClick={() => dismiss('overdue')}
              className="text-stone-600 hover:text-stone-400 text-sm"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {visibleExpenses.map((expense) => {
        const categoryLabel =
          EXPENSE_CATEGORIES[expense.category as keyof typeof EXPENSE_CATEGORIES]?.label ??
          expense.category
        const route = EXPENSE_ROUTE_MAP[expense.category] ?? '/finance/expenses'

        return (
          <div
            key={expense.category}
            className="flex items-center justify-between rounded-lg border border-amber-800 bg-amber-950/60 px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-amber-400 text-lg shrink-0">📊</span>
              <p className="text-sm text-amber-300">
                <span className="font-semibold">Unusual expense:</span>{' '}
                {formatCurrency(expense.amountCents)} in {categoryLabel}{' '}
                <span className="text-amber-500">({expense.ratio}x your average)</span>
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={route}
                className="text-xs font-medium text-amber-400 hover:text-amber-300 hover:underline"
              >
                Review
              </Link>
              <button
                onClick={() => dismiss(`expense-${expense.category}`)}
                className="text-stone-600 hover:text-stone-400 text-sm"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
