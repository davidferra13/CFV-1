import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getPlateCostSummary } from '@/lib/finance/plate-cost-actions'
import { PlateCostTable } from '@/components/finance/plate-cost-table'

export const metadata: Metadata = { title: 'Plate Costs - ChefFlow' }

export default async function PlateCostsPage() {
  await requireChef()

  let summary
  let fetchFailed = false

  try {
    summary = await getPlateCostSummary()
  } catch {
    fetchFailed = true
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
              Finance
            </Link>
            <span className="text-stone-600">/</span>
            <span className="text-sm text-stone-300">Plate Costs</span>
          </div>
          <h1 className="text-3xl font-bold text-stone-100">True Plate Cost</h1>
          <p className="text-stone-500 mt-1">
            Cost-per-plate breakdown across events, including ingredients, labor, travel, and
            overhead
          </p>
        </div>
      </div>

      {fetchFailed ? (
        <div className="rounded-xl border border-red-800 bg-red-950 p-6 text-center">
          <p className="text-sm text-red-400">
            Could not load plate cost data. Please refresh the page or try again later.
          </p>
        </div>
      ) : (
        <PlateCostTable summary={summary!} />
      )}
    </div>
  )
}
