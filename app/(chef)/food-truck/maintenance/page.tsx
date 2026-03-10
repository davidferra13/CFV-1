import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getMaintenanceHistory,
  getUpcomingMaintenance,
  getOverdueMaintenance,
  getMaintenanceCostSummary,
  getCurrentOdometer,
} from '@/lib/food-truck/vehicle-maintenance-actions'
import VehicleMaintenance from '@/components/food-truck/vehicle-maintenance'

export const metadata: Metadata = { title: 'Vehicle Maintenance - ChefFlow' }

export default async function MaintenancePage() {
  const user = await requireChef()

  const [history, upcoming, overdue, costSummary, currentOdometer] = await Promise.all([
    getMaintenanceHistory(),
    getUpcomingMaintenance(),
    getOverdueMaintenance(),
    getMaintenanceCostSummary(),
    getCurrentOdometer(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Vehicle Maintenance</h1>
        <p className="text-stone-400 mt-1">
          Track oil changes, inspections, tire rotations, and repairs. Stay ahead of maintenance
          schedules.
        </p>
      </div>
      <VehicleMaintenance
        initialHistory={history}
        initialUpcoming={upcoming}
        initialOverdue={overdue}
        costSummary={costSummary}
        currentOdometer={currentOdometer}
      />
    </div>
  )
}
