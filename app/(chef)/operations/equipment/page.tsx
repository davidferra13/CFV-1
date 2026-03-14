// Equipment Inventory Page
// Owned equipment with maintenance tracking and rental cost logging.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { listEquipment, getEquipmentDueForMaintenance, listRentals } from '@/lib/equipment/actions'
import { EquipmentInventoryClient } from './equipment-inventory-client'

export const metadata: Metadata = { title: 'Equipment — ChefFlow' }

export default async function EquipmentPage() {
  await requireChef()

  const [inventory, overdue, recentRentals] = await Promise.all([
    listEquipment(),
    getEquipmentDueForMaintenance(),
    listRentals(),
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-100">Equipment Inventory</h1>
        <p className="mt-1 text-sm text-stone-500">
          Track your owned kit, maintenance schedules, and rental costs per event.
        </p>
      </div>
      <EquipmentInventoryClient
        inventory={inventory}
        overdueItems={overdue}
        recentRentals={recentRentals}
      />
    </div>
  )
}
