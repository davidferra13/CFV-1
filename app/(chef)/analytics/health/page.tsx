// Business Health Score - Full breakdown page
// Single number (0-100) with four quadrants, trend chart, strengths, and risks.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { fetchBusinessHealthScore } from '@/lib/intelligence/business-health-actions'
import { HealthScoreDial } from '@/components/intelligence/health-score-dial'
import { HealthQuadrant } from '@/components/intelligence/health-quadrant'
import { HealthTrendChart } from '@/components/intelligence/health-trend-chart'
import {
  ArrowLeft, TrendUp, TrendDown, WarningCircle, CheckCircle, Lightbulb,
} from '@/components/ui/icons'

export const metadata: Metadata = {
  title: 'Business Health Score',
}

export default async function BusinessHealthPage() {
  await requireChef()

  let healthData
  try {
    healthData = await fetchBusinessHealthScore()
  } catch (err) {
    console.error('[BusinessHealthPage] Failed to load:', err)
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="text-center py-16">
          <WarningCircle className="h-8 w-8 text-stone-600 mx-auto mb-3" />
          <p className="text-stone-500">Failed to load business health data. Please try again.</p>
        </div>
      </div>
    )
  }

  const { summary, trend, strengths, risks, history, quadrants } = healthData
  const score = summary.scores.overall

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <BackLink />
        <h1 className="text-xl font-semibold text-stone-200 mt-3">
          Business Health Score
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Composite view of your business across four dimensions.
        </p>
      </div>

      {/* Score + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Dial */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-6 flex flex-col items-center justify-center">
          <HealthScoreDial score={score} trend={trend} />
          <p className="text-xs text-stone-600 mt-4 text-center">
            Updated {new Date(summary.generatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Trend Chart */}
        <div className="lg:col-span-2 rounded-xl border border-stone-800 bg-stone-900/50 p-5">
          <h2 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-4">
            Score Trend (6 Months)
          </h2>
          <HealthTrendChart data={history} height={160} />
        </div>
      </div>

      {/* Four Quadrants */}
      <div>
        <h2 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-4">
          Score Breakdown
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <HealthQuadrant quadrant={quadrants.revenue} />
          <HealthQuadrant quadrant={quadrants.clients} />
          <HealthQuadrant quadrant={quadrants.operations} />
          <HealthQuadrant quadrant={quadrants.growth} />
        </div>
      </div>

      {/* Strengths and Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {strengths.length > 0 && (
          <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <h2 className="text-sm font-medium text-emerald-300 uppercase tracking-wide">
                Strengths
              </h2>
            </div>
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-300">
                  <TrendUp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {risks.length > 0 && (
          <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <WarningCircle className="h-5 w-5 text-red-400" />
              <h2 className="text-sm font-medium text-red-300 uppercase tracking-wide">
                Risks
              </h2>
            </div>
            <ul className="space-y-2">
              {risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-300">
                  <TrendDown className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Top Insights */}
      {summary.topInsights.length > 0 && (
        <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-medium text-stone-300 uppercase tracking-wide">
              Key Insights
            </h2>
          </div>
          <ul className="space-y-2">
            {summary.topInsights.map((insight, i) => (
              <li key={i} className="text-sm text-stone-400 flex items-start gap-2">
                <span className="text-stone-600 shrink-0">{i + 1}.</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alerts */}
      {summary.alerts.length > 0 && (
        <div>
          <h2 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-4">
            Active Alerts ({summary.alerts.length})
          </h2>
          <div className="space-y-3">
            {summary.alerts.slice(0, 8).map((alert, i) => {
              const severityConfig = {
                critical: { border: 'border-red-800/40', bg: 'bg-red-950/20', dot: 'bg-red-500' },
                warning: { border: 'border-amber-800/40', bg: 'bg-amber-950/20', dot: 'bg-amber-500' },
                opportunity: { border: 'border-emerald-800/40', bg: 'bg-emerald-950/20', dot: 'bg-emerald-500' },
                info: { border: 'border-stone-800', bg: 'bg-stone-900/50', dot: 'bg-stone-500' },
              }[alert.severity]

              return (
                <div
                  key={i}
                  className={`rounded-xl border ${severityConfig.border} ${severityConfig.bg} p-4`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full ${severityConfig.dot} shrink-0 mt-1.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-200">{alert.title}</span>
                        <span className="text-xs text-stone-600">{alert.category}</span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">{alert.detail}</p>
                      <p className="text-xs text-stone-400 mt-1 italic">{alert.action}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/analytics"
      className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to Analytics
    </Link>
  )
}
