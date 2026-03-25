// Ingredient Price Detail Page
// Shows price history chart and multi-vendor price comparison for a single ingredient.

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

const PriceHistoryChart = dynamic(
  () => import('@/components/inventory/price-history-chart').then((m) => m.PriceHistoryChart),
  {
    loading: () => <div className="h-64 rounded-lg bg-stone-800 animate-pulse" />,
    ssr: false,
  }
)
import { VendorComparisonPanel } from '@/components/inventory/vendor-comparison-panel'

export const metadata: Metadata = { title: 'Ingredient Price Detail - ChefFlow' }

export default async function IngredientPriceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireChef()
  const { id } = await params
  const db: any = createServerClient()

  // Fetch ingredient info
  const { data: ingredient } = await db
    .from('ingredients')
    .select('id, name, category, unit, last_price_cents')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!ingredient) {
    return (
      <div className="space-y-6">
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-400">Ingredient not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/recipes/ingredients" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Ingredient Library
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">{ingredient.name}</h1>
        <div className="flex items-center gap-4 mt-1 text-sm text-stone-500">
          {ingredient.category && <span>Category: {ingredient.category}</span>}
          {ingredient.unit && <span>Unit: {ingredient.unit}</span>}
          {ingredient.last_price_cents != null && (
            <span>Last price: ${(ingredient.last_price_cents / 100).toFixed(2)}</span>
          )}
        </div>
      </div>

      {/* Price history chart */}
      <PriceHistoryChart
        ingredientId={ingredient.id}
        ingredientName={ingredient.name}
        months={12}
      />

      {/* Vendor price comparison */}
      <VendorComparisonPanel ingredientName={ingredient.name} ingredientId={ingredient.id} />
    </div>
  )
}
