// Stocktake Landing Page
// Start a new stocktake or resume an active one.

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getActiveStocktake, getStocktakeHistory } from '@/lib/inventory/stocktake-actions'
import { StartStocktakeForm } from './start-stocktake-form'

export const metadata: Metadata = { title: 'Stocktake - ChefFlow' }

export default async function StocktakePage() {
  await requireChef()

  const [active, recentHistory] = await Promise.all([
    getActiveStocktake().catch(() => null),
    getStocktakeHistory(5).catch(() => []),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Physical Stocktake</h1>
        <p className="text-stone-500 mt-1">
          Count your physical inventory, reconcile against system quantities, and adjust for
          variances.
        </p>
      </div>

      {/* Active stocktake */}
      {active && (
        <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-100">Active Count</h2>
              <p className="text-sm text-stone-400">{active.name}</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-brand-500/20 px-2.5 py-0.5 text-xs text-brand-300">
              In Progress
            </span>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/inventory/stocktake/${active.id}`}
              className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm hover:bg-brand-600"
            >
              Resume Counting
            </Link>
            <Link
              href={`/inventory/stocktake/${active.id}/reconcile`}
              className="px-4 py-2 rounded-lg bg-stone-700 text-stone-200 text-sm hover:bg-stone-600"
            >
              Reconcile
            </Link>
          </div>
        </div>
      )}

      {/* Start new stocktake */}
      {!active && <StartStocktakeForm />}

      {active && (
        <p className="text-stone-600 text-xs text-center">
          Complete or cancel the active stocktake before starting a new one.
        </p>
      )}

      {/* Recent history */}
      {(recentHistory as any[]).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-100">Recent Counts</h2>
            <Link
              href="/inventory/stocktake/history"
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {(recentHistory as any[]).map((st: any) => (
              <Link
                key={st.id}
                href={`/inventory/stocktake/${st.id}/reconcile`}
                className="block rounded-lg border border-stone-700 bg-stone-800/50 p-3 hover:bg-stone-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-200">{st.name}</p>
                    <p className="text-xs text-stone-500">{st.stocktakeDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-stone-300">{st.totalItems} items</p>
                    {st.varianceValueCents > 0 && (
                      <p className="text-xs text-red-400">
                        ${(st.varianceValueCents / 100).toFixed(2)} variance
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
