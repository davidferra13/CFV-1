// Daily Report Page — view today's report + browse past days

import {
  getDailyReport,
  generateDailyReport,
  getDailyReportHistory,
} from '@/lib/reports/daily-report-actions'
import { DailyReportView } from '@/components/reports/daily-report-view'

export const metadata = {
  title: 'Daily Report | ChefFlow',
}

export default async function DailyReportPage() {
  // Try to get today's report, generate if not found
  const today = new Date().toISOString().split('T')[0]
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
          Your daily business snapshot — emailed every morning at 7 AM
        </p>
      </div>

      <DailyReportView report={report} history={history} />
    </div>
  )
}
