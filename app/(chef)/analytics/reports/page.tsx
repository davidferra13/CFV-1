import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { CustomReportBuilder } from '@/components/analytics/report-builder'

export const metadata: Metadata = { title: 'Custom Reports - ChefFlow' }

export default async function ReportsPage() {
  await requireChef()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Custom Reports</h1>
        <p className="text-stone-600 mt-1">Build your own reports and visualizations</p>
      </div>
      <CustomReportBuilder />
    </div>
  )
}
