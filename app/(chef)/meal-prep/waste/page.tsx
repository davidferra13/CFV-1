import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getBatchHistory, getWasteSummary } from '@/lib/meal-prep/waste-tracking-actions'
import { WasteTracker } from '@/components/meal-prep/waste-tracker'
import { format, subDays } from 'date-fns'
import Link from 'next/link'
import { ChevronLeft } from '@/components/ui/icons'

export const metadata: Metadata = {
  title: 'Waste & Yield Tracking - ChefFlow',
}

type Props = {
  searchParams: { start?: string; end?: string }
}

export default async function WastePage({ searchParams }: Props) {
  await requireChef()
  await requirePro('operations')

  const endDate = searchParams.end || format(new Date(), 'yyyy-MM-dd')
  const startDate = searchParams.start || format(subDays(new Date(), 30), 'yyyy-MM-dd')

  const [entries, summary] = await Promise.all([
    getBatchHistory(startDate, endDate),
    getWasteSummary(startDate, endDate),
  ])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/meal-prep" className="text-stone-500 hover:text-stone-700 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">Waste & Yield Tracking</h1>
        </div>
      </div>

      {/* Date range filter */}
      <form className="flex items-end gap-3" method="get">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Start Date</label>
          <input
            name="start"
            type="date"
            defaultValue={startDate}
            className="rounded border border-stone-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">End Date</label>
          <input
            name="end"
            type="date"
            defaultValue={endDate}
            className="rounded border border-stone-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-stone-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-800"
        >
          Filter
        </button>
      </form>

      <WasteTracker
        initialEntries={entries}
        initialSummary={summary}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  )
}
