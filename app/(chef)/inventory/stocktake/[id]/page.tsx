// Stocktake Counting Page
// Full counting interface for an active stocktake.

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getStocktake } from '@/lib/inventory/stocktake-actions'
import { StocktakeCounter } from '@/components/inventory/stocktake-counter'

export const metadata: Metadata = { title: 'Count Inventory - ChefFlow' }

type Props = {
  params: Promise<{ id: string }>
}

export default async function StocktakeCountPage({ params }: Props) {
  await requireChef()
  const { id } = await params

  let stocktake
  try {
    stocktake = await getStocktake(id)
  } catch {
    redirect('/inventory/stocktake')
  }

  if (stocktake.status !== 'in_progress') {
    redirect(`/inventory/stocktake/${id}/reconcile`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <Link href="/inventory/stocktake" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Stocktake
        </Link>
        <h1 className="text-2xl font-bold text-stone-100 mt-1">Count Inventory</h1>
      </div>

      {stocktake.items.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No inventory items to count. Add items to your inventory first via the Inventory Counts
            page, then start a new stocktake.
          </p>
          <Link
            href="/inventory/counts"
            className="inline-block mt-3 text-sm text-brand-400 hover:text-brand-300"
          >
            Go to Inventory Counts
          </Link>
        </div>
      ) : (
        <StocktakeCounter
          stocktakeId={stocktake.id}
          stocktakeName={stocktake.name}
          items={stocktake.items}
        />
      )}
    </div>
  )
}
