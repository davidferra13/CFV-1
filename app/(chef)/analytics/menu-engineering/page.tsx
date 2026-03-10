// Menu Engineering Matrix Page
// Classic 4-quadrant analysis: Stars, Plowhorses, Puzzles, Dogs.
// Plots every menu item on a popularity vs profitability grid.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { MenuEngineeringMatrix } from '@/components/analytics/menu-engineering-matrix'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Menu Engineering - ChefFlow',
}

export default async function MenuEngineeringPage() {
  await requireChef()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Menu Engineering</h1>
          <p className="text-sm text-stone-500 mt-1">
            Analyze your menu items by popularity and profitability to make smarter decisions.
          </p>
        </div>
        <Link
          href="/analytics"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-violet-600 hover:text-violet-700"
        >
          All Analytics
        </Link>
      </div>

      <MenuEngineeringMatrix />
    </div>
  )
}
