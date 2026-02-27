import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getFinancialAnalytics } from '@/lib/reports/analytics-service'
import { FinancialDashboard } from '@/components/reports/financial-dashboard'

export const metadata: Metadata = { title: 'Reports - ChefFlow' }

type ReportsPageProps = {
  searchParams?: {
    start?: string
    end?: string
  }
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requireChef()

  const snapshot = await getFinancialAnalytics({
    start: searchParams?.start || undefined,
    end: searchParams?.end || undefined,
  })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Finance reporting
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-stone-100">Advanced Reports</h1>
        <p className="mt-1 text-stone-400">
          Revenue, profitability, pipeline, and top-client analytics across your tenant.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-700 bg-stone-900 p-4"
      >
        <label className="text-sm text-stone-300">
          Start date
          <input
            type="date"
            name="start"
            defaultValue={snapshot.range.start}
            className="mt-1 h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
          />
        </label>
        <label className="text-sm text-stone-300">
          End date
          <input
            type="date"
            name="end"
            defaultValue={snapshot.range.end}
            className="mt-1 h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-md bg-amber-500 px-4 text-sm font-medium text-stone-950 hover:bg-amber-400"
        >
          Apply range
        </button>
      </form>

      <FinancialDashboard snapshot={snapshot} />
    </div>
  )
}
