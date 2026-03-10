import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getTemperatureLogs, getCleaningChecklist } from '@/lib/haccp/compliance-log-actions'
import { ComplianceDailyClient } from './client'

export const metadata: Metadata = { title: 'Daily Compliance - ChefFlow' }

export default async function ComplianceDailyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  await requireChef()

  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const date = params.date ?? today

  const [tempLogs, cleaningTasks] = await Promise.all([
    getTemperatureLogs(date),
    getCleaningChecklist(date),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Daily Compliance</h1>
        <p className="text-stone-500 mt-1">
          Temperature readings and cleaning checklists for food safety.
        </p>
      </div>

      <ComplianceDailyClient
        date={date}
        initialTempLogs={tempLogs}
        initialCleaningTasks={cleaningTasks}
      />
    </div>
  )
}
