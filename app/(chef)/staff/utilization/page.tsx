import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getStaffUtilizationReport } from '@/lib/staff/utilization-report'
import UtilizationClient from './utilization-client'

export const metadata: Metadata = { title: 'Staff Utilization - ChefFlow' }

interface Props {
  searchParams: Promise<{ start?: string; end?: string }>
}

export default async function StaffUtilizationPage({ searchParams }: Props) {
  await requireChef()
  const params = await searchParams

  // Default: last 90 days
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 90)

  const startDate =
    params.start && /^\d{4}-\d{2}-\d{2}$/.test(params.start)
      ? params.start
      : start.toISOString().slice(0, 10)
  const endDate =
    params.end && /^\d{4}-\d{2}-\d{2}$/.test(params.end)
      ? params.end
      : end.toISOString().slice(0, 10)

  const report = await getStaffUtilizationReport(startDate, endDate)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
          ← Staff
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Staff Utilization</h1>
        <p className="text-stone-500 mt-1">Hours, costs, and utilization rates across your team</p>
      </div>

      <UtilizationClient report={report} currentStart={startDate} currentEnd={endDate} />
    </div>
  )
}
