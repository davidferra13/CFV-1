// Prep Board - Real-time prep status for today's service.
// Auto-generated from menu -> recipes -> ingredients.
// Shows: what needs prepping, who is assigned, what's done, deficits.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getServiceDayByDate } from '@/lib/restaurant/service-day-actions'
import { getPrepRequirements, getPrepSummary } from '@/lib/restaurant/prep-generation-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { PrepBoardClient } from './_components/prep-board-client'

export const metadata: Metadata = { title: 'Prep Board' }

export default async function PrepBoardPage() {
  const user = await requireChef()
  const db: any = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  const serviceDay = await getServiceDayByDate(today)

  if (!serviceDay) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-100">Prep Board</h1>
          <Link href="/ops" className="text-sm text-stone-500 hover:text-stone-300">
            Back to Ops
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400">No service day created for today.</p>
            <Link href="/ops" className="text-amber-400 hover:underline text-sm mt-2 inline-block">
              Go to Ops Hub to start a service day
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [prepItems, summary, staffResult, stationResult] = await Promise.all([
    getPrepRequirements(serviceDay.id),
    getPrepSummary(serviceDay.id),
    db
      .from('staff_members')
      .select('id, name, role')
      .eq('chef_id', user.tenantId!)
      .eq('status', 'active'),
    db
      .from('stations')
      .select('id, name')
      .eq('chef_id', user.tenantId!)
      .eq('status', 'active')
      .order('display_order'),
  ])

  const staff = staffResult.data || []
  const stations = stationResult.data || []

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Prep Board</h1>
          <p className="text-sm text-stone-500">
            {new Date(today + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}{' '}
            / {serviceDay.shift_label}
          </p>
        </div>
        <Link href="/ops" className="text-sm text-stone-500 hover:text-stone-300">
          Back to Ops
        </Link>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Total Items" value={summary.total} />
        <SummaryCard label="Pending" value={summary.pending} color="stone" />
        <SummaryCard label="In Progress" value={summary.in_progress} color="amber" />
        <SummaryCard label="Done" value={summary.done + summary.verified} color="emerald" />
        <SummaryCard
          label="Deficits"
          value={summary.deficit_items}
          color={summary.deficit_items > 0 ? 'red' : 'stone'}
        />
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            summary.completion_pct >= 90
              ? 'bg-emerald-500'
              : summary.completion_pct >= 50
                ? 'bg-amber-500'
                : 'bg-red-500'
          }`}
          style={{ width: `${summary.completion_pct}%` }}
        />
      </div>
      <p className="text-sm text-stone-500 -mt-4">{summary.completion_pct}% complete</p>

      {/* Interactive Prep Board */}
      <PrepBoardClient
        serviceDayId={serviceDay.id}
        prepItems={prepItems}
        staff={staff}
        stations={stations}
      />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  color = 'stone',
}: {
  label: string
  value: number
  color?: string
}) {
  const textColor =
    color === 'emerald'
      ? 'text-emerald-400'
      : color === 'amber'
        ? 'text-amber-400'
        : color === 'red'
          ? 'text-red-400'
          : 'text-stone-100'
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-3 text-center">
      <p className="text-xs text-stone-500 uppercase">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${textColor}`}>{value}</p>
    </div>
  )
}
