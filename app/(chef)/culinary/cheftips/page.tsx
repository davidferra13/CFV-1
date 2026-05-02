import { Suspense } from 'react'
import { Lightbulb } from '@/components/ui/icons'
import { getChefTips, getChefTipStats, getMonthlyTipCounts } from '@/lib/cheftips/actions'
import { CHEFTIP_CATEGORIES } from '@/lib/cheftips/types'
import { ChefTipsArchive } from './cheftips-archive'

export const metadata = {
  title: 'ChefTips - Your Learning Log',
}

export default async function ChefTipsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-6 w-6 text-amber-400" />
        <div>
          <h1 className="text-xl font-semibold text-stone-100">ChefTips</h1>
          <p className="text-sm text-stone-500">Your personal learning log</p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="animate-pulse space-y-3">
            <div className="h-20 rounded-lg bg-stone-800" />
            <div className="h-40 rounded-lg bg-stone-800" />
          </div>
        }
      >
        <ChefTipsContent />
      </Suspense>
    </div>
  )
}

async function ChefTipsContent() {
  const [{ tips, total }, stats, monthlyCounts] = await Promise.all([
    getChefTips({ limit: 50 }),
    getChefTipStats(),
    getMonthlyTipCounts(6),
  ])

  return (
    <>
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Lessons" value={stats.total} />
        <StatCard label="This Week" value={stats.thisWeek} />
        <StatCard label="This Month" value={stats.thisMonth} />
        <StatCard label="Day Streak" value={stats.streak} />
      </div>

      <ChefTipsArchive
        initialTips={tips}
        initialTotal={total}
        categories={CHEFTIP_CATEGORIES}
        monthlyCounts={monthlyCounts}
      />
    </>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-3">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-100">{value}</p>
    </div>
  )
}
