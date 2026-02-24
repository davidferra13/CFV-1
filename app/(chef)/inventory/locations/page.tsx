// Storage Locations Page
// Manage storage locations and view per-location stock levels.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getStorageLocations } from '@/lib/inventory/location-actions'
import { getStockByLocation } from '@/lib/inventory/transaction-actions'
import { LocationsClient } from './locations-client'

export const metadata: Metadata = { title: 'Storage Locations - ChefFlow' }

export default async function LocationsPage() {
  await requireChef()

  const [locations, stockByLocation] = await Promise.all([
    getStorageLocations().catch(() => []),
    getStockByLocation().catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Storage Locations</h1>
        <p className="text-stone-500 mt-1">
          Manage your storage locations and see what&apos;s at each one.
        </p>
      </div>

      <LocationsClient
        initialLocations={locations as any[]}
        initialStock={stockByLocation as any[]}
      />
    </div>
  )
}
