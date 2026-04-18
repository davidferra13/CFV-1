// Daily Report Page - view today's report + browse past days

import { requireChef } from '@/lib/auth/get-user'
import {
  getDailyReport,
  generateDailyReport,
  getDailyReportHistory,
} from '@/lib/reports/daily-report-actions'
import { DailyReportView } from '@/components/reports/daily-report-view'

export const metadata = {
  title: 'Daily Report',
}

export default async function DailyReportPage() {
  await requireChef()
  // Try to get today's report, generate if not found
  const _d = new Date()
  const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`
  let report = await getDailyReport(today)

  if (!report) {
    report = await generateDailyReport(today)
  }

  const history = await getDailyReportHistory(30)

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Daily Report</h1>
        <p className="text-sm text-stone-500">
          Your daily business snapshot - emailed every morning at 7 AM
        </p>
      </div>

      <DailyReportView report={report} history={history} />
    </div>
  )
}
