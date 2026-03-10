// Weekly Shopping Consolidation Page
// Combines shopping lists from multiple events in a date range into one view.
// Chefs can see what they need to buy across all events for the week.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { Button } from '@/components/ui/button'
import { WeeklyConsolidationView } from './weekly-consolidation-client'

export const metadata: Metadata = {
  title: 'Weekly Shopping - ChefFlow',
}

export default async function WeeklyShoppingPage() {
  await requireChef()

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Weekly Shopping</h1>
          <p className="text-sm text-stone-500 mt-1">
            Combine shopping lists from multiple events into one trip.
          </p>
        </div>
        <Link href="/shopping">
          <Button variant="ghost">Back to Lists</Button>
        </Link>
      </div>

      <WeeklyConsolidationView />
    </div>
  )
}
