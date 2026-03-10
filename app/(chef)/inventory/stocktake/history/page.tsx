// Stocktake History Page
// View past stocktakes and variance trends.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getStocktakeHistory, getVarianceTrend } from '@/lib/inventory/stocktake-actions'
import { StocktakeHistory } from '@/components/inventory/stocktake-history'

export const metadata: Metadata = { title: 'Stocktake History - ChefFlow' }

export default async function StocktakeHistoryPage() {
  await requireChef()

  const [history, trend] = await Promise.all([
    getStocktakeHistory(50).catch(() => []),
    getVarianceTrend(10).catch(() => []),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/inventory/stocktake" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Stocktake
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Stocktake History</h1>
        <p className="text-stone-500 mt-1">
          Past counts and variance trends. Track whether inventory accuracy is improving over time.
        </p>
      </div>

      <StocktakeHistory stocktakes={history} trend={trend} />
    </div>
  )
}
