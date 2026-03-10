import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getBudgetVariance } from '@/lib/finance/budget-variance-actions'
import { BudgetVarianceClient } from '@/components/finance/budget-variance-client'

export const metadata: Metadata = { title: 'Budget vs Actual - ChefFlow' }

export default async function BudgetPage() {
  await requireChef()

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  let variance = null
  let fetchError: string | null = null

  try {
    variance = await getBudgetVariance(currentMonth)
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load budget data'
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display text-stone-100">Budget vs Actual</h1>
        <p className="text-sm text-stone-400 mt-1">
          Track monthly spending against your budget targets.
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-xl border border-red-800/30 bg-red-950/20 p-4 text-sm text-red-300">
          {fetchError}
        </div>
      ) : (
        <BudgetVarianceClient initialData={variance} initialMonth={currentMonth} />
      )}
    </div>
  )
}
