// Weekly Ops Summary Page
// Server page that loads the initial week, delegates to client component for navigation.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { WeeklyOpsView } from './weekly-ops-view'

export const metadata: Metadata = { title: 'Weekly Ops Summary' }

export default async function WeeklyOpsPage() {
  await requireChef()

  // Compute current week's Monday
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.getFullYear(), now.getMonth(), diff)
  const initialWeekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold text-stone-100">Weekly Ops Summary</h1>
        <p className="text-stone-400 mt-1">
          Events, revenue, expenses, and reviews for any week
        </p>
      </div>
      <WeeklyOpsView initialWeekStart={initialWeekStart} />
    </div>
  )
}
