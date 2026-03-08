// Capacity Planning Page
// Strategic planning tool: "Can I take on more work?"
// Analyzes workload, utilization, burnout risk, and remaining capacity.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getCapacityAnalysis, getCapacityTrend } from '@/lib/analytics/capacity-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  UtilizationGauge,
  TimeBreakdownChart,
  WeeklyTrendChart,
  DayHeatmap,
  ScenarioPlanner,
  BurnoutBadge,
  CommitmentsChart,
} from '@/components/analytics/capacity-charts'
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Calendar,
  BarChart3,
  Sliders,
} from 'lucide-react'
import Link from 'next/link'
import { StaticCSVDownloadButton } from '@/components/exports/static-csv-download-button'

export const metadata: Metadata = {
  title: 'Capacity Planning - ChefFlow',
}

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Capacity] ${label} failed:`, err)
    return fallback
  }
}

export default async function CapacityPlanningPage() {
  await requireChef()

  const [capacityData, trend] = await Promise.all([
    safe('analysis', () => getCapacityAnalysis(90), null),
    safe('trend', () => getCapacityTrend(12), []),
  ])

  if (!capacityData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-4">Capacity Planning</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-10 h-10 text-stone-400 mx-auto mb-3" />
            <p className="text-stone-500">Could not load capacity data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { analysis, timeBreakdown, heatmap } = capacityData
  const exportRows: Array<Array<string | number>> = [
    ['summary', 'utilization_percent', analysis.utilizationPercent],
    ['summary', 'weekly_hours_used', analysis.weeklyHoursUsed],
    ['summary', 'weekly_hours_available', analysis.weeklyHoursAvailable],
    ['summary', 'weekly_hours_remaining', analysis.weeklyHoursRemaining],
    ['summary', 'burnout_risk', analysis.burnoutRisk],
    ['summary', 'additional_events_per_week', analysis.additionalEventsPerWeek],
    ...timeBreakdown.map((entry) => [
      'time_breakdown',
      entry.category,
      Math.round((entry.minutes / 60) * 10) / 10,
    ]),
    ...trend.map((entry) => [
      'weekly_trend',
      `${entry.weekStart} to ${entry.weekEnd}`,
      entry.hoursUsed,
    ]),
    ...heatmap.map((entry) => [
      'heatmap',
      entry.date,
      Math.round((entry.totalMinutes / 60) * 10) / 10,
    ]),
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Capacity Planning</h1>
          <p className="text-sm text-stone-500 mt-1">Based on your last 90 days of activity</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StaticCSVDownloadButton
            headers={['section', 'label', 'value']}
            rows={exportRows}
            filename="capacity-planning.csv"
          />
          <Link
            href="/insights"
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            All Intelligence
          </Link>
        </div>
      </div>

      {/* Top Row: Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Utilization Gauge */}
        <Card>
          <CardContent className="py-6 flex flex-col items-center">
            <UtilizationGauge percent={analysis.utilizationPercent} />
            <p className="text-sm text-stone-500 mt-2">
              {analysis.weeklyHoursUsed}h used of {analysis.weeklyHoursAvailable}h available
            </p>
          </CardContent>
        </Card>

        {/* Weekly Hours */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-500" />
              <CardTitle className="text-base">Weekly Hours</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Used</span>
                <span className="font-semibold text-stone-900">{analysis.weeklyHoursUsed}h</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, analysis.utilizationPercent)}%`,
                    backgroundColor:
                      analysis.utilizationPercent >= 80
                        ? '#ef4444'
                        : analysis.utilizationPercent >= 60
                          ? '#f59e0b'
                          : '#10b981',
                  }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Remaining</span>
                <span className="font-semibold text-green-600">
                  {analysis.weeklyHoursRemaining}h
                </span>
              </div>
              {analysis.canTakeMore && (
                <p className="text-xs text-stone-400">
                  Room for ~{analysis.additionalEventsPerWeek} more event
                  {analysis.additionalEventsPerWeek !== 1 ? 's' : ''}/week
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Burnout Risk */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-base">Burnout Risk</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <BurnoutBadge risk={analysis.burnoutRisk} />
              {analysis.burnoutFactors.length > 0 ? (
                <ul className="space-y-1">
                  {analysis.burnoutFactors.map((factor, i) => (
                    <li key={i} className="text-sm text-stone-600 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">&#x2022;</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-stone-500">
                  No burnout signals detected. Your schedule looks healthy.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Time Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-500" />
              <CardTitle className="text-base">How Your Time is Split</CardTitle>
            </div>
            <p className="text-xs text-stone-400 mt-1">Average weekly hours by category</p>
          </CardHeader>
          <CardContent>
            <TimeBreakdownChart data={timeBreakdown} />
          </CardContent>
        </Card>

        {/* Commitments */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              <CardTitle className="text-base">Commitments Breakdown</CardTitle>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              {analysis.commitments.recurringWeekly} recurring,{' '}
              {analysis.commitments.averageOneOffPerWeek} avg one-off/week
            </p>
          </CardHeader>
          <CardContent>
            <CommitmentsChart commitments={analysis.commitments} />
          </CardContent>
        </Card>
      </div>

      {/* Trend + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              <CardTitle className="text-base">Utilization Trend</CardTitle>
            </div>
            <p className="text-xs text-stone-400 mt-1">Weekly hours over the last 12 weeks</p>
          </CardHeader>
          <CardContent>
            <WeeklyTrendChart data={trend} />
          </CardContent>
        </Card>

        {/* Calendar Heatmap */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-500" />
              <CardTitle className="text-base">Activity Heatmap</CardTitle>
            </div>
            <p className="text-xs text-stone-400 mt-1">Last 90 days</p>
          </CardHeader>
          <CardContent>
            <DayHeatmap data={heatmap} />
          </CardContent>
        </Card>
      </div>

      {/* Scenario Planner */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-500" />
            <CardTitle className="text-base">Scenario Planner</CardTitle>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            See how taking on more work would affect your capacity and burnout risk
          </p>
        </CardHeader>
        <CardContent>
          <ScenarioPlanner baseAnalysis={analysis} />
        </CardContent>
      </Card>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-base">Recommendations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-stone-700">{rec}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
