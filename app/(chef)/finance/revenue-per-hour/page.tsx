import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRevenuePerHour } from '@/lib/finance/revenue-per-hour-actions'
import { RevenuePerHourAnalysis } from '@/components/finance/revenue-per-hour-analysis'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Revenue Per Hour - ChefFlow' }

async function fetchData(range: '30d' | '90d' | 'year' | 'all') {
  'use server'
  return getRevenuePerHour(range)
}

export default async function RevenuePerHourPage() {
  await requireChef()

  const initialData = await getRevenuePerHour('30d')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-200">
            ← Finance
          </Link>
          <h1 className="text-3xl font-bold text-stone-900 mt-1">Revenue Per Hour</h1>
          <p className="text-stone-500 mt-1">
            Your real effective hourly rate, including all time spent on each event
          </p>
        </div>
      </div>

      <RevenuePerHourAnalysis
        initialData={initialData}
        initialRange="30d"
        fetchAction={fetchData}
      />
    </div>
  )
}
