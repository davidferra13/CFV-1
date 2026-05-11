import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requireFocusAccess } from '@/lib/billing/require-focus-access'
import { TravelOptimizationClient } from './travel-optimization-client'

export const metadata: Metadata = { title: 'Travel Optimization' }

export default async function TravelOptimizationPage() {
  await requireChef()
  await requireFocusAccess()

  // Default: current week Monday
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/calendar" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Calendar
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Travel Optimization</h1>
          <p className="text-stone-500 mt-1">
            Group nearby events, cluster shopping trips, and save mileage by planning routes together.
          </p>
        </div>
        <Link
          href="/travel"
          className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
        >
          Travel Plans
        </Link>
      </div>

      <TravelOptimizationClient defaultWeekStart={fmt(monday)} />
    </div>
  )
}
