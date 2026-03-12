'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type {
  BatchPrepPlan,
  BatchOpportunity,
  UnifiedPrepSchedule,
  UnifiedPrepTask,
} from '@/lib/culinary/batch-prep-engine'

interface Props {
  plan: BatchPrepPlan
  schedule: UnifiedPrepSchedule
  currentStart: string
  currentEnd: string
}

// ── Date Range Controls ──────────────────────────────────────────

function DateRangeControls({
  currentStart,
  currentEnd,
}: {
  currentStart: string
  currentEnd: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [start, setStart] = useState(currentStart)
  const [end, setEnd] = useState(currentEnd)

  function apply() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('start', start)
    params.set('end', end)
    router.push(`?${params.toString()}`)
  }

  function setPreset(days: number) {
    const s = new Date()
    const e = new Date()
    e.setDate(e.getDate() + days)
    const newStart = s.toISOString().slice(0, 10)
    const newEnd = e.toISOString().slice(0, 10)
    setStart(newStart)
    setEnd(newEnd)
    const params = new URLSearchParams()
    params.set('start', newStart)
    params.set('end', newEnd)
    router.push(`?${params.toString()}`)
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-stone-400 block mb-1">From</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="bg-stone-800 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-100"
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 block mb-1">To</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-stone-800 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-100"
          />
        </div>
        <Button variant="primary" size="sm" onClick={apply}>
          Apply
        </Button>
        <div className="flex gap-1.5 ml-auto">
          {[7, 14, 21, 30].map((d) => (
            <button
              key={d}
              onClick={() => setPreset(d)}
              className="text-xs px-2 py-1 rounded bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors"
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}

// ── Summary Cards ────────────────────────────────────────────────

function SummaryCards({ plan }: { plan: BatchPrepPlan }) {
  const hours = Math.floor(plan.totalTimeSavedMinutes / 60)
  const mins = plan.totalTimeSavedMinutes % 60
  const timeSaved = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-stone-100">{plan.eventsAnalyzed}</p>
        <p className="text-xs text-stone-400">Events in range</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-amber-200">{plan.totalBatchableComponents}</p>
        <p className="text-xs text-stone-400">Batch opportunities</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-emerald-400">{timeSaved}</p>
        <p className="text-xs text-stone-400">Estimated time saved</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-stone-100">
          {plan.opportunities.filter((o) => o.isMakeAhead).length}
        </p>
        <p className="text-xs text-stone-400">Make-ahead items</p>
      </Card>
    </div>
  )
}

// ── Opportunity Card ─────────────────────────────────────────────

function OpportunityCard({ opp }: { opp: BatchOpportunity }) {
  const [expanded, setExpanded] = useState(false)
  const hours = Math.floor(opp.estimatedTimeSavedMinutes / 60)
  const mins = opp.estimatedTimeSavedMinutes % 60
  const timeSaved = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

  return (
    <Card className="p-4">
      <button className="w-full text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-stone-100">{opp.componentName}</p>
              {opp.isMakeAhead && (
                <span className="text-xs bg-amber-900 text-amber-200 px-2 py-0.5 rounded-full">
                  Make-ahead
                </span>
              )}
              <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full">
                {opp.totalEvents} events
              </span>
            </div>
            {opp.recipeName !== opp.componentName && (
              <p className="text-sm text-stone-400 mt-0.5">Recipe: {opp.recipeName}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-emerald-400">{timeSaved}</p>
            <p className="text-xs text-stone-500">saved</p>
          </div>
        </div>

        <div className="flex gap-4 mt-2 text-xs text-stone-500">
          <span>Prep: {opp.prepMinutes}m</span>
          <span>Cook: {opp.cookMinutes}m</span>
          <span>Total qty: {opp.totalQuantity}</span>
          {opp.makeAheadWindowHours && <span>Make-ahead: {opp.makeAheadWindowHours}h window</span>}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-stone-800 space-y-2">
          <p className="text-xs font-medium text-stone-400 uppercase">
            Events using this component
          </p>
          {opp.events.map((evt) => (
            <div
              key={evt.eventId}
              className="flex items-center justify-between text-sm bg-stone-900 rounded px-3 py-2"
            >
              <div>
                <span className="text-stone-200 font-medium">{evt.occasion}</span>
                <span className="text-stone-500 ml-2">{evt.eventDate}</span>
              </div>
              <div className="text-right text-stone-400">
                <span>{evt.guestCount} guests</span>
                <span className="ml-3">Qty: {evt.quantity}</span>
              </div>
            </div>
          ))}
          <p className="text-xs text-stone-500 mt-2">
            Batch once for all {opp.totalEvents} events instead of prepping separately.
            {opp.isMakeAhead && opp.makeAheadWindowHours
              ? ` Can be made up to ${opp.makeAheadWindowHours}h ahead.`
              : ''}
          </p>
        </div>
      )}
    </Card>
  )
}

// ── Day Schedule (Gantt-style) ───────────────────────────────────

function TaskRow({ task }: { task: UnifiedPrepTask }) {
  const totalMin = task.prepMinutes + task.cookMinutes

  return (
    <div className="flex items-start gap-3 py-2">
      {/* Time bar */}
      <div className="w-16 shrink-0 text-right">
        <span className="text-sm font-medium text-stone-300">{totalMin}m</span>
      </div>

      {/* Visual bar */}
      <div className="flex-1">
        <div className="flex gap-0.5 h-6 rounded overflow-hidden">
          {task.prepMinutes > 0 && (
            <div
              className="bg-blue-600 flex items-center justify-center text-[10px] text-white"
              style={{
                width: totalMin > 0 ? `${(task.prepMinutes / totalMin) * 100}%` : '50%',
                minWidth: '20px',
              }}
            >
              Prep
            </div>
          )}
          {task.cookMinutes > 0 && (
            <div
              className="bg-orange-600 flex items-center justify-center text-[10px] text-white"
              style={{
                width: totalMin > 0 ? `${(task.cookMinutes / totalMin) * 100}%` : '50%',
                minWidth: '20px',
              }}
            >
              Cook
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm font-medium text-stone-200">{task.componentName}</p>
          {task.isBatched && (
            <span className="text-[10px] bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded">
              BATCHED
            </span>
          )}
          {task.isMakeAhead && (
            <span className="text-[10px] bg-amber-900 text-amber-300 px-1.5 py-0.5 rounded">
              MAKE-AHEAD
            </span>
          )}
        </div>
        {task.dishNames.length > 0 && (
          <p className="text-xs text-stone-500 mt-0.5">For: {task.dishNames.join(', ')}</p>
        )}
        {task.eventLabels.length > 0 && (
          <p className="text-xs text-stone-500">Events: {task.eventLabels.join(' | ')}</p>
        )}
        {task.totalQuantity > 1 && (
          <p className="text-xs text-stone-400">Total quantity: {task.totalQuantity}</p>
        )}
      </div>
    </div>
  )
}

function DaySchedule({
  day,
}: {
  day: {
    date: string
    dayLabel: string
    tasks: UnifiedPrepTask[]
    totalMinutes: number
  }
}) {
  const hours = Math.floor(day.totalMinutes / 60)
  const mins = day.totalMinutes % 60
  const timeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-stone-100">{day.dayLabel}</h3>
          <p className="text-xs text-stone-500">{day.tasks.length} tasks</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-stone-200">{timeLabel}</p>
          <p className="text-xs text-stone-500">total</p>
        </div>
      </div>
      <div className="divide-y divide-stone-800">
        {day.tasks.map((task, i) => (
          <TaskRow key={`${task.componentName}-${i}`} task={task} />
        ))}
      </div>
    </Card>
  )
}

// ── Main Component ───────────────────────────────────────────────

type ViewMode = 'opportunities' | 'schedule'

export default function BatchPlannerClient({ plan, schedule, currentStart, currentEnd }: Props) {
  const [view, setView] = useState<ViewMode>('opportunities')

  return (
    <div className="space-y-4">
      <DateRangeControls currentStart={currentStart} currentEnd={currentEnd} />

      {plan.eventsAnalyzed === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No confirmed events in this date range</p>
          <p className="text-stone-500 text-sm mt-1">
            Adjust the date range or create events with menus and components to find batch
            opportunities.
          </p>
        </Card>
      ) : plan.opportunities.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No batch opportunities found</p>
          <p className="text-stone-500 text-sm mt-1">
            None of the {plan.eventsAnalyzed} events in this range share common components. Batch
            opportunities appear when 2+ events use the same recipe or component.
          </p>
        </Card>
      ) : (
        <>
          <SummaryCards plan={plan} />

          {/* View Toggle */}
          <div className="flex gap-1 bg-stone-900 p-1 rounded-lg w-fit">
            <button
              onClick={() => setView('opportunities')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                view === 'opportunities'
                  ? 'bg-stone-700 text-stone-100 font-medium'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Batch Opportunities ({plan.opportunities.length})
            </button>
            <button
              onClick={() => setView('schedule')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                view === 'schedule'
                  ? 'bg-stone-700 text-stone-100 font-medium'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Prep Schedule ({schedule.days.length} days)
            </button>
          </div>

          {/* Views */}
          {view === 'opportunities' ? (
            <div className="space-y-3">
              {plan.opportunities.map((opp, i) => (
                <OpportunityCard key={`${opp.recipeId || opp.componentName}-${i}`} opp={opp} />
              ))}
            </div>
          ) : schedule.days.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-stone-400">No prep days scheduled yet</p>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-3 bg-stone-900 border-stone-700">
                <div className="flex items-center gap-4 text-xs text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Prep time
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-orange-600 inline-block" /> Cook time
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded">
                      BATCHED
                    </span>{' '}
                    Shared across events
                  </span>
                </div>
              </Card>
              {schedule.days.map((day) => (
                <DaySchedule key={day.date} day={day} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
