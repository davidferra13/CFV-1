'use client'

import { useState, useTransition } from 'react'
import type { ConsolidationOpportunity, WeeklyPrepPlan } from '@/lib/intelligence/prep-consolidation'
import { getConsolidationOpportunities, fetchWeeklyPrepPlan } from '@/lib/intelligence/prep-consolidation-actions'
import { ConsolidationOpportunityCard } from '@/components/intelligence/consolidation-opportunity-card'
import { ConsolidatedPrepSchedule } from '@/components/intelligence/consolidated-prep-schedule'
import { TimeSavingsBanner } from '@/components/intelligence/time-savings-banner'

interface Props {
  initialOpportunities: ConsolidationOpportunity[]
  initialPlan: WeeklyPrepPlan
  initialWeekStart: string
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftWeek(weekStart: string, direction: number): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 7 * direction)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`
}

export function PrepConsolidationClient({ initialOpportunities, initialPlan, initialWeekStart }: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [opportunities, setOpportunities] = useState(initialOpportunities)
  const [plan, setPlan] = useState(initialPlan)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'opportunities' | 'schedule'>('opportunities')

  function loadWeek(newWeekStart: string) {
    setWeekStart(newWeekStart)
    setError(null)
    const weekEnd = getWeekEnd(newWeekStart)

    startTransition(async () => {
      try {
        const [oppResult, planResult] = await Promise.all([
          getConsolidationOpportunities(newWeekStart, weekEnd),
          fetchWeeklyPrepPlan(newWeekStart),
        ])

        if (oppResult.error) {
          setError(oppResult.error)
        } else {
          setOpportunities(oppResult.opportunities)
        }

        if (planResult.plan) {
          setPlan(planResult.plan)
        }
      } catch (err: any) {
        setError('Failed to load consolidation data')
      }
    })
  }

  const totalTimeSaved = opportunities.reduce((sum, o) => sum + o.timeSavedMinutes, 0)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Prep Consolidation</h1>
        <p className="text-stone-400 mt-1 text-sm">
          Batch prep shared ingredients across events to save time
        </p>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => loadWeek(shiftWeek(weekStart, -1))}
          disabled={isPending}
          className="px-3 py-2 rounded-lg border border-stone-700 bg-stone-800/60 text-stone-300 hover:bg-stone-700/60 text-sm disabled:opacity-50"
        >
          Previous Week
        </button>
        <span className="text-sm font-medium text-stone-200">
          {formatWeekLabel(weekStart)}
        </span>
        <button
          onClick={() => loadWeek(shiftWeek(weekStart, 1))}
          disabled={isPending}
          className="px-3 py-2 rounded-lg border border-stone-700 bg-stone-800/60 text-stone-300 hover:bg-stone-700/60 text-sm disabled:opacity-50"
        >
          Next Week
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {isPending && (
        <div className="text-center py-8">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
          <p className="text-stone-400 text-sm mt-2">Loading consolidation data...</p>
        </div>
      )}

      {!isPending && (
        <>
          {/* Time savings banner */}
          {totalTimeSaved > 0 && (
            <TimeSavingsBanner
              totalSavedMinutes={totalTimeSaved}
              eventsCovered={plan.eventsCovered}
              totalPrepMinutes={plan.totalPrepMinutes}
            />
          )}

          {/* Tab selector */}
          <div className="flex gap-1 rounded-lg bg-stone-800/40 p-1">
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'opportunities'
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Opportunities ({opportunities.length})
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'schedule'
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Prep Schedule ({plan.days.length} days)
            </button>
          </div>

          {/* Content */}
          {activeTab === 'opportunities' && (
            <div>
              {opportunities.length === 0 ? (
                <div className="rounded-lg border border-stone-700/40 bg-stone-900/40 p-8 text-center">
                  <p className="text-stone-400 text-sm">
                    No consolidation opportunities this week.
                  </p>
                  <p className="text-stone-500 text-xs mt-1">
                    Opportunities appear when 2 or more events in the same week share ingredients. Make sure events have menus with linked recipes.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {opportunities.map((opp, i) => (
                    <ConsolidationOpportunityCard key={i} opportunity={opp} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <ConsolidatedPrepSchedule plan={plan} />
          )}
        </>
      )}
    </div>
  )
}
