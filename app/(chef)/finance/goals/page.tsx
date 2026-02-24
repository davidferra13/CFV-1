// Revenue Goals Dashboard — Finance sub-page
// Shows current goal status, YTD KPIs, progress, and gap-closing strategies

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRevenueGoalSnapshot } from '@/lib/revenue-goals/actions'
import {
  computeDashboardKPIs,
  solveRevenueClosure,
  yearRange,
} from '@/lib/analytics/revenue-engine'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent } from '@/components/ui/card'
import { GoalSetter } from '@/components/finance/goal-setter'

export const metadata: Metadata = { title: 'Revenue Goals - Finance - ChefFlow' }

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent))
  const color =
    clamped >= 100
      ? 'bg-green-9500'
      : clamped >= 70
        ? 'bg-brand-9500'
        : clamped >= 40
          ? 'bg-yellow-9500'
          : 'bg-red-400'

  return (
    <div className="w-full bg-stone-700 rounded-full h-3 overflow-hidden">
      <div
        className={`${color} h-3 rounded-full transition-all`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export default async function FinanceGoalsPage() {
  await requireChef()

  const [snapshot, kpis] = await Promise.all([
    getRevenueGoalSnapshot(),
    computeDashboardKPIs(await yearRange()),
  ])

  // Annual goal is the primary target; fall back to monthly * 12 if not set
  const annualTargetCents = snapshot.annual?.targetCents ?? snapshot.monthly.targetCents * 12
  const annualBookedCents = snapshot.annual?.realizedCents ?? kpis.totalRevenue.value
  const annualProgressPercent =
    annualTargetCents > 0 ? Math.round((annualBookedCents / annualTargetCents) * 100) : 0

  // Remaining days in year
  const now = new Date()
  const yearEnd = new Date(now.getFullYear(), 11, 31)
  const remainingDays = Math.max(
    0,
    Math.ceil((yearEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  )

  // Gap-closing strategies
  const closureResult = await solveRevenueClosure(
    annualTargetCents,
    annualBookedCents,
    remainingDays
  )

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link href="/finance" className="hover:text-stone-300">
          Finance
        </Link>
        <span>/</span>
        <span className="text-stone-100">Revenue Goals</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Revenue Goals</h1>
          <p className="text-stone-500 mt-1">
            Track your annual target, see year-to-date progress, and get strategies to close any
            gap.
          </p>
        </div>
        <Link
          href="/goals"
          className="inline-flex items-center gap-2 rounded-md border border-stone-600 bg-surface px-4 py-2 text-sm font-medium text-stone-300 shadow-sm hover:bg-stone-800 transition-colors whitespace-nowrap"
        >
          Manage Goals
        </Link>
      </div>

      {/* Goal Setter */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-stone-100 mb-4">Set Annual Revenue Target</h2>
          <GoalSetter currentTargetCents={annualTargetCents} />
        </CardContent>
      </Card>

      {/* Annual Progress */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-lg font-semibold text-stone-100">Annual Progress</h2>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-stone-100">
                {formatCurrency(annualBookedCents)}
              </p>
              <p className="text-sm text-stone-500 mt-0.5">
                of {formatCurrency(annualTargetCents)} target
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-stone-300">{annualProgressPercent}%</p>
              <p className="text-sm text-stone-500">complete</p>
            </div>
          </div>

          <ProgressBar percent={annualProgressPercent} />

          <div className="flex gap-6 text-sm text-stone-400 pt-1">
            <span>
              <span className="font-medium">
                {formatCurrency(Math.max(0, annualTargetCents - annualBookedCents))}
              </span>{' '}
              remaining gap
            </span>
            <span>
              <span className="font-medium">{remainingDays}</span> days left in year
            </span>
            <span>
              Avg booking:{' '}
              <span className="font-medium">{formatCurrency(snapshot.avgBookingValueCents)}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Progress */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <h2 className="text-lg font-semibold text-stone-100">This Month</h2>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-stone-100">
                {formatCurrency(snapshot.monthly.realizedCents)}
              </p>
              <p className="text-sm text-stone-500">
                of {formatCurrency(snapshot.monthly.targetCents)} monthly target
              </p>
            </div>
            <p className="text-xl font-bold text-stone-300">
              {Math.round(snapshot.monthly.progressPercent)}%
            </p>
          </div>
          <ProgressBar percent={snapshot.monthly.progressPercent} />
          {snapshot.dinnersNeededThisMonth > 0 && (
            <p className="text-sm text-stone-400">
              Need <span className="font-medium">{snapshot.dinnersNeededThisMonth}</span> more{' '}
              {snapshot.dinnersNeededThisMonth === 1 ? 'booking' : 'bookings'} this month to hit
              target.
            </p>
          )}
        </CardContent>
      </Card>

      {/* YTD KPIs */}
      <div>
        <h2 className="text-lg font-semibold text-stone-100 mb-3">Year-to-Date KPIs</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">
              {formatCurrency(kpis.totalRevenue.value)}
            </p>
            <p className="text-xs text-stone-500 mt-1">Revenue collected</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">
              {formatCurrency(kpis.totalBookedValue.value)}
            </p>
            <p className="text-xs text-stone-500 mt-1">Total booked value</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">
              {formatCurrency(kpis.averageEventValue.value)}
            </p>
            <p className="text-xs text-stone-500 mt-1">Avg event value</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{kpis.eventsCompleted.value}</p>
            <p className="text-xs text-stone-500 mt-1">Events completed</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{kpis.inquiriesCount.value}</p>
            <p className="text-xs text-stone-500 mt-1">Inquiries received</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{kpis.conversionRate.value}%</p>
            <p className="text-xs text-stone-500 mt-1">Conversion rate</p>
          </Card>
        </div>
      </div>

      {/* Gap-Closing Strategies */}
      {closureResult.gap > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-1">Close the Gap</h2>
          <p className="text-sm text-stone-500 mb-3">
            You need {formatCurrency(closureResult.gap)} more to hit your annual target. Here are
            ways to get there:
          </p>
          <div className="space-y-3">
            {closureResult.strategies.map((s, i) => (
              <Card
                key={i}
                className={`p-4 ${s.achievable ? 'border-green-200 bg-green-950' : 'border-stone-700'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-stone-100">{s.strategy}</p>
                    <p className="text-sm text-stone-500 mt-0.5">
                      Average value: {formatCurrency(s.targetValue)} per booking
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                      s.achievable ? 'bg-green-900 text-green-700' : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {s.achievable ? 'Feasible' : 'Tight timeline'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {closureResult.gap <= 0 && (
        <Card className="p-6 border-green-200 bg-green-950">
          <p className="text-lg font-semibold text-green-800">Goal achieved!</p>
          <p className="text-sm text-green-700 mt-1">
            You have met or exceeded your annual revenue target. Excellent work.
          </p>
        </Card>
      )}

      {/* Recommendations from revenue-goals engine */}
      {snapshot.recommendations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Recommendations</h2>
          <div className="space-y-2">
            {snapshot.recommendations.slice(0, 5).map((rec) => (
              <Card key={rec.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                      rec.severity === 'high'
                        ? 'bg-red-9500'
                        : rec.severity === 'normal'
                          ? 'bg-yellow-400'
                          : 'bg-stone-400'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-stone-100 text-sm">{rec.title}</p>
                    <p className="text-sm text-stone-500 mt-0.5">{rec.description}</p>
                    {rec.href && rec.href !== '#' && (
                      <Link
                        href={rec.href}
                        className="text-xs text-brand-600 hover:underline mt-1 inline-block"
                      >
                        Take action
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-stone-400 text-right">
        Snapshot computed at{' '}
        {new Date(snapshot.computedAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </p>
    </div>
  )
}
