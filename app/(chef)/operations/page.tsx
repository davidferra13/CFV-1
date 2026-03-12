import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { requireChef } from '@/lib/auth/get-user'
import { getEquipmentAssetSummary, listRentals } from '@/lib/equipment/actions'
import { listKitchenRentals } from '@/lib/kitchen-rentals/actions'

export const metadata: Metadata = { title: 'Operations - ChefFlow' }

export default async function OperationsHubPage() {
  await requireChef()

  const [equipmentSummary, rentals, kitchenRentals] = await Promise.all([
    getEquipmentAssetSummary(),
    listRentals(),
    listKitchenRentals(),
  ])

  const tiles = [
    {
      href: '/operations/equipment',
      label: 'Equipment Assets',
      description:
        'Manage owned kit, wishlist gear, reference products, sourcing links, and rentals',
      icon: '🔧',
      badge:
        equipmentSummary.maintenanceDueCount > 0
          ? `${equipmentSummary.maintenanceDueCount} due for maintenance`
          : `${equipmentSummary.totalActive} active assets`,
      badgeColor:
        equipmentSummary.maintenanceDueCount > 0
          ? 'text-amber-200 bg-amber-950'
          : 'text-stone-500 bg-stone-800',
    },
    {
      href: '/operations/kitchen-rentals',
      label: 'Kitchen Rentals',
      description: 'Log commercial kitchen bookings, hours, costs, and event linkages',
      icon: '🏠',
      badge: `${kitchenRentals.length} booking${kitchenRentals.length !== 1 ? 's' : ''}`,
      badgeColor: 'text-stone-500 bg-stone-800',
    },
  ]

  const totalKitchenRentalCostCents = kitchenRentals.reduce(
    (sum: number, rental: { cost_cents?: number | null }) => sum + (rental.cost_cents ?? 0),
    0
  )

  const stats = [
    { label: 'Active assets', value: equipmentSummary.totalActive },
    { label: 'Source links', value: equipmentSummary.sourcedCount },
    {
      label: 'Maintenance due',
      value: equipmentSummary.maintenanceDueCount,
      highlight: equipmentSummary.maintenanceDueCount > 0,
    },
    { label: 'Equipment rentals', value: rentals.length },
    { label: 'Kitchen rentals', value: kitchenRentals.length },
    {
      label: 'Kitchen rental spend',
      value:
        totalKitchenRentalCostCents > 0
          ? `$${(totalKitchenRentalCostCents / 100).toFixed(0)}`
          : '$0',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Operations</h1>
        <p className="mt-1 text-stone-500">
          Equipment assets, sourcing, rentals, and kitchen bookings in one workspace
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pb-4 pt-4">
              <p
                className={`text-2xl font-bold ${'highlight' in stat && stat.highlight ? 'text-amber-200' : 'text-stone-100'}`}
              >
                {stat.value}
              </p>
              <p className="mt-0.5 text-sm text-stone-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href}>
            <Card className="group h-full cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="pb-5 pt-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tile.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-stone-100 transition-colors group-hover:text-brand-400">
                        {tile.label}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${tile.badgeColor}`}
                      >
                        {tile.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-stone-500">{tile.description}</p>
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
