import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getOvens, getScheduleForDate, getOvenUtilization } from '@/lib/bakery/oven-actions'
import OvenSchedule from '@/components/bakery/oven-schedule'

export const metadata: Metadata = { title: 'Oven Schedule - ChefFlow' }

export default async function OvenSchedulePage() {
  const user = await requireChef()

  const today = new Date().toISOString().slice(0, 10)

  const [ovens, schedule, utilization] = await Promise.all([
    getOvens(),
    getScheduleForDate(today),
    getOvenUtilization(today),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Oven Schedule</h1>
        <p className="text-stone-400 mt-1">
          Manage ovens, schedule bakes, and track utilization across your equipment.
        </p>
      </div>
      <OvenSchedule
        initialOvens={ovens}
        initialSchedule={schedule}
        initialUtilization={utilization}
        initialDate={today}
      />
    </div>
  )
}
