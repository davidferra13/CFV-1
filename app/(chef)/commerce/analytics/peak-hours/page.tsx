import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import {
  getHourlyBreakdown,
  getPeakHours,
  getWeeklyHeatmap,
  getStaffingVsVolume,
  getWeeklyHourlyAverage,
} from '@/lib/commerce/peak-hour-actions'
import { PeakHourDashboard } from '@/components/commerce/peak-hour-dashboard'

export const metadata: Metadata = {
  title: 'Peak Hour Analytics - ChefFlow',
}

export default async function PeakHoursPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  await requireChef()
  await requirePro('commerce')

  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const date = params.date || today

  const [hourly, peakHours, heatmap, staffing, weeklyAvg] = await Promise.all([
    getHourlyBreakdown(date),
    getPeakHours(30),
    getWeeklyHeatmap(),
    getStaffingVsVolume(date),
    getWeeklyHourlyAverage(),
  ])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Peak Hour Analytics</h1>
        <p className="text-stone-400 mt-1">
          Identify your busiest hours, optimize staffing, and spot weekly patterns
        </p>
      </div>

      <PeakHourDashboard
        initialDate={date}
        initialHourly={hourly}
        initialPeakHours={peakHours}
        initialHeatmap={heatmap}
        initialStaffing={staffing}
        initialWeeklyAvg={weeklyAvg}
      />
    </div>
  )
}
