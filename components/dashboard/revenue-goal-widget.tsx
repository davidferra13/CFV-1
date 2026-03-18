// Revenue Goal Progress Widget - monthly and annual goal tracking
// Shows pace, trend, YoY comparison, smart open dates, and recommendations

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'
import type {
  PaceStatus,
  RevenueGoalSnapshot,
  RevenueGoalTrend,
  YoYComparison,
} from '@/lib/revenue-goals/types'

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

function PaceBadge({ status, ratio }: { status: PaceStatus; ratio: number }) {
  const config = {
    ahead: { label: 'Ahead', className: 'text-green-400 bg-green-950 border-green-800' },
    on_track: {
      label: 'On track',
      className: 'text-emerald-400 bg-emerald-950 border-emerald-800',
    },
    behind: { label: 'Behind', className: 'text-amber-400 bg-amber-950 border-amber-800' },
    critical: { label: 'Off track', className: 'text-red-400 bg-red-950 border-red-800' },
  }
  const { label, className } = config[status]
  const pct = Math.round(Math.abs(ratio - 1) * 100)
  const display = ratio >= 1 ? `+${pct}%` : `-${pct}%`

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xxs font-medium ${className}`}
    >
      {label} ({display})
    </span>
  )
}

function TrendIndicator({ trend }: { trend: RevenueGoalTrend }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const color =
    trend.direction === 'up'
      ? 'text-green-400'
      : trend.direction === 'down'
        ? 'text-red-400'
        : 'text-stone-500'
  const sign = trend.deltaPercent > 0 ? '+' : ''

  return (
    <span className={`text-xs ${color}`}>
      {arrow} {sign}
      {trend.deltaPercent}% vs last month
    </span>
  )
}

function YoYIndicator({ yoy }: { yoy: YoYComparison }) {
  if (yoy.lastYearSamePeriodCents === 0 && yoy.currentPeriodCents === 0) return null
  const arrow = yoy.direction === 'up' ? '↑' : yoy.direction === 'down' ? '↓' : '→'
  const color =
    yoy.direction === 'up'
      ? 'text-green-400'
      : yoy.direction === 'down'
        ? 'text-red-400'
        : 'text-stone-500'
  const sign = yoy.deltaPercent > 0 ? '+' : ''

  return (
    <span className={`text-xs ${color}`}>
      {arrow} {sign}
      {yoy.deltaPercent}% vs last year
    </span>
  )
}

export function RevenueGoalWidget({ snapshot }: Props) {
  if (!snapshot.enabled) return null

  const monthly = snapshot.monthly
  const smartOpenCount = snapshot.smartOpenDatesThisMonth?.length ?? 0
  const allOpenCount = snapshot.openDatesThisMonth?.length ?? 0

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Revenue Goal</CardTitle>
          <Link
            href="/goals"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
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
            <div className="flex items-center gap-2">
              {snapshot.monthlyPaceStatus && (
                <PaceBadge status={snapshot.monthlyPaceStatus} ratio={snapshot.monthlyPaceRatio} />
              )}
              <span className="font-medium text-stone-200">{monthly.progressPercent}%</span>
            </div>
          </div>
          <ProgressBar percent={monthly.progressPercent} />
          <div className="flex items-center justify-between text-xs text-stone-500 mt-1">
            <span>{formatCurrency(monthly.realizedCents)} earned</span>
            <span>Target: {formatCurrency(monthly.targetCents)}</span>
          </div>
          {monthly.gapCents > 0 && (
            <p className="text-xs text-amber-400 mt-1">
              Gap: {formatCurrency(monthly.gapCents)} · ~{snapshot.dinnersNeededThisMonth} dinner
              {snapshot.dinnersNeededThisMonth === 1 ? '' : 's'} needed
            </p>
          )}
        </div>

        {/* Trend + YoY row */}
        {(snapshot.trend || snapshot.yoy) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {snapshot.trend && <TrendIndicator trend={snapshot.trend} />}
            {snapshot.yoy && <YoYIndicator yoy={snapshot.yoy} />}
          </div>
        )}

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
            {snapshot.annualRunRateCents != null && snapshot.annualRunRateCents > 0 && (
              <p className="text-xs text-stone-500 mt-1">
                Run rate: {formatCurrency(snapshot.annualRunRateCents)}/yr at current pace
              </p>
            )}
          </div>
        )}

        {/* Smart open dates */}
        {smartOpenCount > 0 && (
          <div className="border-t border-stone-800 pt-3">
            <p className="text-xs text-stone-500">
              {smartOpenCount} bookable date{smartOpenCount !== 1 ? 's' : ''} left this month
              {allOpenCount > smartOpenCount && (
                <span className="text-stone-600">
                  {' '}
                  ({allOpenCount} total, {smartOpenCount} on your typical days)
                </span>
              )}
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
