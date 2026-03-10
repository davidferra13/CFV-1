// Business Locations Management Page
// Add, edit, and manage physical business locations.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLocations, getLocationComparison } from '@/lib/locations/location-actions'
import { LocationManager } from '@/components/locations/location-manager'

export const metadata: Metadata = { title: 'Business Locations - ChefFlow' }

export default async function LocationsSettingsPage() {
  await requireChef()

  const [locations, stats] = await Promise.all([
    getLocations().catch(() => []),
    getLocationComparison().catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Settings
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Business Locations</h1>
        <p className="text-stone-500 mt-1">
          Manage your kitchens, storefronts, trucks, and other business locations.
        </p>
      </div>

      <LocationManager initialLocations={locations} initialStats={stats} />
    </div>
  )
}
