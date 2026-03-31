import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { requireChef } from '@/lib/auth/get-user'

const CustomReportBuilder = dynamic(
  () => import('@/components/analytics/report-builder').then((m) => m.CustomReportBuilder),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    ),
  }
)

export const metadata: Metadata = { title: 'Custom Reports' }

export default async function ReportsPage() {
  await requireChef()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Custom Reports</h1>
        <p className="text-stone-400 mt-1">Build your own reports and visualizations</p>
      </div>
      <CustomReportBuilder />
    </div>
  )
}
