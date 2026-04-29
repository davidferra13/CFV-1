'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type {
  DesirePathCount,
  DesirePathLoop,
  DesirePathTransition,
} from '@/lib/activity/desire-paths'
import { analyzeDesirePaths } from '@/lib/activity/desire-paths'
import type { BreadcrumbSession } from '@/lib/activity/breadcrumb-types'

type DesirePathInsightsProps = {
  sessions: BreadcrumbSession[]
  loading?: boolean
}

export function DesirePathInsights({ sessions, loading }: DesirePathInsightsProps) {
  const insights = useMemo(() => analyzeDesirePaths(sessions), [sessions])

  if (loading) {
    return <div className="text-xs text-stone-300 px-1 py-4">Loading desire paths...</div>
  }

  if (!insights.hasEnoughData) {
    return (
      <div className="text-center py-8 text-stone-300 text-sm">
        Not enough navigation history yet. Keep working and ChefFlow will show observed paths here.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric label="Sessions" value={insights.sessionCount} />
        <Metric label="Page views" value={insights.pageViewCount} />
        <Metric label="Interactions" value={insights.interactionCount} />
        <Metric label="Breadcrumbs" value={insights.breadcrumbCount} />
      </div>

      <section className="border border-stone-700 rounded-lg bg-stone-900 p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-200">Natural Paths</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Routes that are repeatedly used together.
            </p>
          </div>
          <span className="text-xxs text-stone-500 uppercase tracking-wider">Observed</span>
        </div>
        <TransitionList
          transitions={insights.topTransitions}
          empty="No repeated route pairs yet."
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-stone-700 rounded-lg bg-stone-900 p-4">
          <h2 className="text-sm font-semibold text-stone-200">Friction Signals</h2>
          <p className="text-xs text-stone-500 mt-0.5 mb-3">
            Repeated revisits and backtracks inside the same session.
          </p>
          <LoopList loops={insights.loops} />
          {insights.backtracks.length > 0 && (
            <div className="mt-4 border-t border-stone-800 pt-3">
              <p className="text-xs font-medium text-stone-400 mb-2">Backtracks</p>
              <TransitionList transitions={insights.backtracks} empty="" />
            </div>
          )}
        </section>

        <section className="border border-stone-700 rounded-lg bg-stone-900 p-4">
          <h2 className="text-sm font-semibold text-stone-200">Action Hotspots</h2>
          <p className="text-xs text-stone-500 mt-0.5 mb-3">
            Pages where clicks, searches, forms, or tabs are being recorded.
          </p>
          <CountList items={insights.interactionHotspots} empty="No interaction hotspots yet." />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-stone-700 rounded-lg bg-stone-900 p-4">
          <h2 className="text-sm font-semibold text-stone-200">Most Used Pages</h2>
          <CountList items={insights.topPages} empty="No page history yet." />
        </section>

        <section className="border border-stone-700 rounded-lg bg-stone-900 p-4">
          <h2 className="text-sm font-semibold text-stone-200">Common Stop Points</h2>
          <p className="text-xs text-stone-500 mt-0.5 mb-3">
            Last observed page in each session. Treat this as a prompt, not a failure.
          </p>
          <CountList items={insights.exitPages} empty="No stop points yet." />
        </section>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-stone-700 rounded-lg bg-stone-900 px-3 py-2">
      <p className="text-xxs text-stone-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-stone-200 tabular-nums">{value}</p>
    </div>
  )
}

function CountList({ items, empty }: { items: DesirePathCount[]; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-stone-500">{empty}</p>

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-stone-800"
        >
          <span className="text-xs font-medium text-stone-300 truncate">{item.label}</span>
          <span className="text-xs text-stone-500 tabular-nums">{item.count}</span>
        </Link>
      ))}
    </div>
  )
}

function TransitionList({
  transitions,
  empty,
}: {
  transitions: DesirePathTransition[]
  empty: string
}) {
  if (transitions.length === 0) {
    return empty ? <p className="text-xs text-stone-500">{empty}</p> : null
  }

  return (
    <div className="space-y-2">
      {transitions.map((transition) => (
        <div
          key={`${transition.fromPath}:${transition.toPath}`}
          className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 rounded-md px-2 py-1.5 hover:bg-stone-800"
        >
          <Link href={transition.fromPath} className="text-xs font-medium text-stone-300 truncate">
            {transition.fromLabel}
          </Link>
          <span className="text-xs text-stone-600">to</span>
          <Link href={transition.toPath} className="text-xs font-medium text-stone-300 truncate">
            {transition.toLabel}
          </Link>
          <span className="text-xs text-stone-500 tabular-nums">{transition.count}</span>
        </div>
      ))}
    </div>
  )
}

function LoopList({ loops }: { loops: DesirePathLoop[] }) {
  if (loops.length === 0) {
    return <p className="text-xs text-stone-500">No repeated same-page loops yet.</p>
  }

  return (
    <div className="space-y-2">
      {loops.map((loop) => (
        <Link
          key={loop.path}
          href={loop.path}
          className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-stone-800"
        >
          <span className="text-xs font-medium text-stone-300 truncate">{loop.label}</span>
          <span className="text-xs text-stone-500 tabular-nums">
            {loop.sessions} session{loop.sessions === 1 ? '' : 's'}, {loop.visits} visits
          </span>
        </Link>
      ))}
    </div>
  )
}
