import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getEquipmentAssetSummary,
  getEquipmentDueForMaintenance,
  listEquipmentAssets,
  listRentals,
} from '@/lib/equipment/actions'
import { EquipmentInventoryClient } from './equipment-inventory-client'

export const metadata: Metadata = { title: 'Equipment Assets - ChefFlow' }

export default async function EquipmentPage() {
  await requireChef()

  const [inventory, overdue, recentRentals, summary] = await Promise.all([
    listEquipmentAssets(),
    getEquipmentDueForMaintenance(),
    listRentals(),
    getEquipmentAssetSummary(),
  ])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-100">Equipment Asset Library</h1>
        <p className="mt-1 text-sm text-stone-500">
          Keep every tool in one place: owned kit, wishlist gear, reference products, rentals, and
          canonical buy links.
        </p>
      </div>
      <EquipmentInventoryClient
        inventory={inventory}
        overdueItems={overdue}
        recentRentals={recentRentals}
        summary={summary}
      />
    </div>
  )
}
