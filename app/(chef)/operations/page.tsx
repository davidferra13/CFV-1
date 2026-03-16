// Operations Hub Page
// Landing page for the /operations section - nav tiles to equipment and kitchen rentals.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listEquipment, getEquipmentDueForMaintenance, listRentals } from '@/lib/equipment/actions'
import { listKitchenRentals } from '@/lib/kitchen-rentals/actions'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Operations | ChefFlow' }

export default async function OperationsHubPage() {
  await requireChef()

  const [equipment, overdueEquipment, rentals, kitchenRentals] = await Promise.all([
    listEquipment(),
    getEquipmentDueForMaintenance(),
    listRentals(),
    listKitchenRentals(),
  ])

  const tiles = [
    {
      href: '/operations/equipment',
      label: 'Equipment Inventory',
      description: 'Track your owned kit, maintenance schedules, and rental costs per event',
      icon: '🔧',
      badge:
        overdueEquipment.length > 0
          ? `${overdueEquipment.length} due for maintenance`
          : `${equipment.length} items`,
      badgeColor:
        overdueEquipment.length > 0 ? 'text-amber-700 bg-amber-950' : 'text-stone-500 bg-stone-800',
    },
    {
      href: '/operations/kitchen-rentals',
      label: 'Kitchen Rentals',
      description: 'Log commercial kitchen bookings - hours, costs, and event linkages',
      icon: '🏠',
      badge: `${kitchenRentals.length} booking${kitchenRentals.length !== 1 ? 's' : ''}`,
      badgeColor: 'text-stone-500 bg-stone-800',
    },
  ]

  const totalRentalCostCents = kitchenRentals.reduce((s: any, r: any) => s + r.cost_cents, 0)

  const stats = [
    { label: 'Equipment items', value: equipment.length },
    {
      label: 'Maintenance due',
      value: overdueEquipment.length,
      highlight: overdueEquipment.length > 0,
    },
    { label: 'Kitchen rentals', value: kitchenRentals.length },
    {
      label: 'Kitchen rental spend',
      value: totalRentalCostCents > 0 ? `$${(totalRentalCostCents / 100).toFixed(0)}` : '$0',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Operations</h1>
        <p className="text-stone-500 mt-1">Equipment inventory and kitchen rental tracking</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p
                className={`text-2xl font-bold ${(s as any).highlight ? 'text-amber-700' : 'text-stone-100'}`}
              >
                {s.value}
              </p>
              <p className="text-sm text-stone-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Nav tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tile.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-stone-100 group-hover:text-brand-400 transition-colors">
                        {tile.label}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${tile.badgeColor}`}
                      >
                        {tile.badge}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500 mt-0.5">{tile.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
