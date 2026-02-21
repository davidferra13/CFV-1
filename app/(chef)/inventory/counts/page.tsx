// Inventory Counts Page
// Mobile-friendly form for updating on-hand quantities with par-level indicators.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInventoryCounts } from '@/lib/inventory/count-actions'
import { InventoryCountForm } from '@/components/inventory/count-form'

export const metadata: Metadata = { title: 'Inventory Counts - ChefFlow' }

export default async function InventoryCountsPage() {
  await requireChef()

  const counts = await getInventoryCounts().catch(() => [])

  const items = (counts as any[]).map((c: any) => ({
    id: c.id,
    ingredientName: c.ingredientName,
    currentQty: c.currentQty,
    parLevel: c.parLevel ?? 0,
    unit: c.unit,
    lastCountedAt: c.lastCountedAt ?? c.updatedAt ?? null,
    vendorId: c.vendorId ?? undefined,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-700">
          &larr; Inventory
        </Link>
        <h1 className="text-3xl font-bold text-stone-900 mt-1">Inventory Counts</h1>
        <p className="text-stone-500 mt-1">
          Update current quantities for tracked ingredients. Items below par are flagged for reorder.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No inventory items tracked yet. Ingredients will appear here as you add them
            through recipes or vendor invoice matching.
          </p>
        </div>
      ) : (
        <InventoryCountForm items={items} />
      )}
    </div>
  )
}
