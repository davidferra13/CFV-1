import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { LocationProfitability } from '@/components/food-truck/location-profitability'

export const metadata: Metadata = { title: 'Location Profitability - ChefFlow' }

export default async function LocationProfitabilityPage() {
  await requireChef()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Location Profitability</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Track revenue and performance by location to optimize your route.
        </p>
      </div>
      <LocationProfitability />
    </div>
  )
}
