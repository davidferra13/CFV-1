// Stocktake Reconciliation Page
// Review variances, set reasons, and complete the stocktake.

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getStocktake } from '@/lib/inventory/stocktake-actions'
import { StocktakeReconciliation } from '@/components/inventory/stocktake-reconciliation'

export const metadata: Metadata = { title: 'Reconcile Stocktake - ChefFlow' }

type Props = {
  params: Promise<{ id: string }>
}

export default async function StocktakeReconcilePage({ params }: Props) {
  await requireChef()
  const { id } = await params

  let stocktake
  try {
    stocktake = await getStocktake(id)
  } catch {
    redirect('/inventory/stocktake')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <Link href="/inventory/stocktake" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Stocktake
        </Link>
        <h1 className="text-2xl font-bold text-stone-100 mt-1">Reconcile: {stocktake.name}</h1>
        <p className="text-stone-500 text-sm mt-1">
          Review variances between expected and counted quantities. Set reasons and choose which
          items to adjust in the system.
        </p>
      </div>

      <StocktakeReconciliation
        stocktakeId={stocktake.id}
        stocktakeName={stocktake.name}
        items={stocktake.items}
      />
    </div>
  )
}
