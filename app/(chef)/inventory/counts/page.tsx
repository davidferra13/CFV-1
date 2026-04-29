// Inventory Counts Page
// Mobile-friendly form for updating on-hand quantities with par-level indicators.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInventoryCounts } from '@/lib/inventory/count-actions'
import { InventoryCountForm } from '@/components/inventory/count-form'
import { AddInventoryItemForm } from '@/components/inventory/add-inventory-item-form'

export const metadata: Metadata = { title: 'Inventory Counts' }

export default async function InventoryCountsPage() {
  await requireChef()

  let counts: Awaited<ReturnType<typeof getInventoryCounts>> = []
  let countsError = false

  try {
    counts = await getInventoryCounts()
  } catch (error) {
    countsError = true
    console.error('[inventory-counts] Failed to load counts', error)
  }

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
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Inventory Counts</h1>
          <AddInventoryItemForm />
        </div>
        <p className="text-stone-500 mt-1">
          Count stock on hand. Saves append opening balance or correction movements so ChefFlow can
          explain where each quantity came from.
        </p>
      </div>

      {countsError ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/20 p-8 text-center">
          <p className="text-red-100 text-sm">
            Inventory counts could not be loaded. Do not rely on pantry status until this page
            refreshes successfully.
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No inventory items counted yet. Use the &quot;+ Count Item&quot; button above to create
            a confirmed opening balance.
          </p>
        </div>
      ) : (
        <InventoryCountForm items={items} />
      )}
    </div>
  )
}
