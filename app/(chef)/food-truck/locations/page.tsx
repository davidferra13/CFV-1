// Food Truck - Location Roster and Rotation Calendar
// Manage spots the truck visits regularly and schedule weekly rotations.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getLocations, getWeeklySchedule } from '@/lib/food-truck/location-actions'
import { LocationRoster } from '@/components/food-truck/location-roster'

export const metadata: Metadata = { title: 'Truck Locations - ChefFlow' }

function getMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export default async function TruckLocationsPage() {
  await requireChef()

  const weekStart = getMonday()

  const [locations, schedule] = await Promise.all([getLocations(), getWeeklySchedule(weekStart)])

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Truck Locations</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your regular spots and schedule your weekly rotation.
        </p>
      </div>

      <LocationRoster
        initialLocations={locations}
        initialSchedule={schedule}
        initialWeekStart={weekStart}
      />
    </div>
  )
}
