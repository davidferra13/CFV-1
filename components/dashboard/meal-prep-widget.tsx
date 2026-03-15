'use client'

import { useEffect, useState } from 'react'
import { getMealPrepStats, type MealPrepStats } from '@/lib/store/meal-prep-actions'
import Link from 'next/link'

export function MealPrepWidget() {
  const [stats, setStats] = useState<MealPrepStats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMealPrepStats()
        setStats(data)
      } catch {
        setError(true)
      }
    }
    load()
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">Meal Prep Store</h3>
        <p className="mt-1 text-sm text-red-600">Could not load store data</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="animate-pulse rounded-lg border p-4">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="h-12 rounded bg-gray-100" />
          <div className="h-12 rounded bg-gray-100" />
          <div className="h-12 rounded bg-gray-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Meal Prep Store</h3>
        <Link
          href="/store"
          className="text-xs text-amber-600 hover:underline"
        >
          Manage Store
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="rounded-md bg-gray-50 p-2 text-center">
          <div className="text-xl font-semibold">{stats.ordersToday}</div>
          <div className="text-xs text-gray-500">Orders Today</div>
        </div>
        <div className="rounded-md bg-gray-50 p-2 text-center">
          <div className="text-xl font-semibold">{stats.pendingOrders}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </div>
        <div className="rounded-md bg-gray-50 p-2 text-center">
          <div className="text-xl font-semibold">
            ${(stats.revenueThisWeekCents / 100).toFixed(0)}
          </div>
          <div className="text-xs text-gray-500">This Week</div>
        </div>
      </div>
    </div>
  )
}
