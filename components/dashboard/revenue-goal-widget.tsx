// Revenue Goal Progress Widget - monthly and annual goal tracking

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'

interface RangeProgress {
  start: string
  end: string
  targetCents: number
  realizedCents: number
  projectedCents: number
  gapCents: number
  progressPercent: number
}

interface RevenueGoalSnapshot {
  enabled: boolean
  nudgeLevel: string
  monthly: RangeProgress
  annual: RangeProgress | null
  custom: Array<{ id: string; label: string; enabled: boolean; range: RangeProgress }>
  avgBookingValueCents: number
  dinnersNeededThisMonth: number
  openDatesThisMonth: string[]
  recommendations: Array<{
    id: string
    title: string
    description: string
    href: string
    severity: string
  }>
  computedAt: string
}

interface Props {
  snapshot: RevenueGoalSnapshot
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent))
  const color = clamped >= 80 ? 'bg-green-500' : clamped >= 50 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="w-full bg-stone-800 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full transition-all ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export function RevenueGoalWidget({ snapshot }: Props) {
  if (!snapshot.enabled) return null

  const monthly = snapshot.monthly

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Revenue Goal</CardTitle>
          <Link
            href="/goals"
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
          >
            Goals <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monthly goal */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-stone-400">Monthly</span>
            <span className="font-medium text-stone-200">{monthly.progressPercent}%</span>
          </div>
          <ProgressBar percent={monthly.progressPercent} />
          <div className="flex items-center justify-between text-xs text-stone-500 mt-1">
            <span>{formatCurrency(monthly.realizedCents)} earned</span>
            <span>Target: {formatCurrency(monthly.targetCents)}</span>
          </div>
          {monthly.gapCents > 0 && (
            <p className="text-xs text-amber-400 mt-1">
              Gap: {formatCurrency(monthly.gapCents)} · ~{snapshot.dinnersNeededThisMonth} dinners
              needed
            </p>
          )}
        </div>

        {/* Annual goal */}
        {snapshot.annual && (
          <div className="border-t border-stone-800 pt-3">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-stone-400">Annual</span>
              <span className="font-medium text-stone-200">{snapshot.annual.progressPercent}%</span>
            </div>
            <ProgressBar percent={snapshot.annual.progressPercent} />
            <div className="flex items-center justify-between text-xs text-stone-500 mt-1">
              <span>{formatCurrency(snapshot.annual.realizedCents)} earned</span>
              <span>Target: {formatCurrency(snapshot.annual.targetCents)}</span>
            </div>
          </div>
        )}

        {/* Open dates this month */}
        {snapshot.openDatesThisMonth.length > 0 && (
          <div className="border-t border-stone-800 pt-3">
            <p className="text-xs text-stone-500">
              {snapshot.openDatesThisMonth.length} open date
              {snapshot.openDatesThisMonth.length !== 1 ? 's' : ''} this month
            </p>
          </div>
        )}

        {/* Top recommendation */}
        {snapshot.recommendations.length > 0 && (
          <div className="border-t border-stone-800 pt-3">
            <Link
              href={snapshot.recommendations[0].href}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              {snapshot.recommendations[0].title}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
