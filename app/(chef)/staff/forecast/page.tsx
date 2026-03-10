import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { LaborForecast } from '@/components/staff/labor-forecast'

export const metadata: Metadata = { title: 'Labor Forecast - ChefFlow' }

export default async function StaffForecastPage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Staff Roster
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Labor Hour Forecast</h1>
        <p className="text-stone-500 mt-1">
          Estimate staffing hours and costs for an event based on guest count, menu complexity, and
          service style.
        </p>
      </div>

      <LaborForecast />
    </div>
  )
}
