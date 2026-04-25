'use client'

interface MomentumData {
  completedEventCount: number
  totalEarnedCents: number
  avgPerEventCents: number
  firstEventDate: string | null
  monthsActive: number
  eventsThisMonth: number
  eventsLastMonth: number
}

function formatCents(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString()
}

export function CirclesMomentumStrip({ data }: { data: MomentumData }) {
  // Don't render if no completed events yet
  if (data.completedEventCount === 0) return null

  // Growth indicator: compare this month to last month
  const growth =
    data.eventsLastMonth > 0
      ? Math.round(((data.eventsThisMonth - data.eventsLastMonth) / data.eventsLastMonth) * 100)
      : data.eventsThisMonth > 0
        ? 100
        : 0

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/60 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          Your Growth
        </span>
        {growth > 0 && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            +{growth}% this month
          </span>
        )}
      </div>
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-lg font-bold text-stone-100">{data.completedEventCount}</span>
          <span className="text-[11px] text-stone-500">
            event{data.completedEventCount !== 1 ? 's' : ''} completed
          </span>
        </div>
        <div className="h-8 w-px bg-stone-700" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-emerald-400">
            {formatCents(data.totalEarnedCents)}
          </span>
          <span className="text-[11px] text-stone-500">total earned</span>
        </div>
        <div className="h-8 w-px bg-stone-700" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-stone-200">
            {formatCents(data.avgPerEventCents)}
          </span>
          <span className="text-[11px] text-stone-500">avg per event</span>
        </div>
        <div className="h-8 w-px bg-stone-700" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-stone-200">{data.monthsActive}</span>
          <span className="text-[11px] text-stone-500">
            month{data.monthsActive !== 1 ? 's' : ''} active
          </span>
        </div>
      </div>
    </div>
  )
}
