// Location Comparison Analytics Page
// Side-by-side metrics across business locations.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLocationComparison } from '@/lib/locations/location-actions'
import { LocationComparison } from '@/components/locations/location-comparison'

export const metadata: Metadata = { title: 'Location Analytics - ChefFlow' }

export default async function LocationAnalyticsPage() {
  await requireChef()

  const stats = await getLocationComparison().catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Analytics
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Location Comparison</h1>
        <p className="text-stone-500 mt-1">
          Compare performance metrics across your business locations.
        </p>
      </div>

      <LocationComparison stats={stats} />
    </div>
  )
}
