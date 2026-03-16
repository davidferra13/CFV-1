// DOPTaskPanel - Dashboard widget showing all outstanding DOP tasks across upcoming events.
// Grouped by event, overdue in red, due-today in amber, upcoming neutral.
// Chef can check tasks directly from the dashboard via DOPTaskCheckbox.

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DOPTaskCheckbox } from '@/components/scheduling/dop-task-checkbox'
import type { DOPTaskDigest, DigestTask } from '@/lib/scheduling/task-digest'
import type { InlineWeather } from '@/lib/weather/open-meteo'
import { ArrowRight, ClipboardList } from '@/components/ui/icons'

// ============================================
// CATEGORY ICONS
// ============================================

const CATEGORY_ICONS: Record<string, string> = {
  documents: '📄',
  shopping: '🛒',
  prep: '🔪',
  packing: '📦',
  admin: '✉️',
  reset: '🧹',
}

// ============================================
// HELPERS
// ============================================

function groupByEvent(tasks: DigestTask[]): Map<string, DigestTask[]> {
  const groups = new Map<string, DigestTask[]>()
  for (const task of tasks) {
    if (!groups.has(task.eventId)) groups.set(task.eventId, [])
    groups.get(task.eventId)!.push(task)
  }
  return groups
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${Math.abs(diff)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDeadlineTime(deadline: string): string {
  if (!deadline.includes('T')) return ''
  return new Date(deadline).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ============================================
// COMPONENT
// ============================================

type Props = {
  digest: DOPTaskDigest
  weatherByEventId?: Record<string, InlineWeather>
}

export function DOPTaskPanel({ digest, weatherByEventId }: Props) {
  // All caught up state
  if (digest.totalIncomplete === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-800">
            <ClipboardList className="h-4 w-4" />
            DOP Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-2">
            <p className="text-sm font-medium text-emerald-700">All caught up</p>
            <p className="text-xs text-emerald-600 mt-1">
              No outstanding tasks across your upcoming events
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const groups = groupByEvent(digest.tasks)

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-stone-400" />
            DOP Tasks
            {digest.overdueCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-900 text-red-700">
                {digest.overdueCount} overdue
              </span>
            )}
          </CardTitle>
          <span className="text-sm text-stone-400">{digest.totalIncomplete} outstanding</span>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 mt-1">
          {digest.overdueCount > 0 && (
            <span className="text-xs font-medium text-red-600 bg-red-950 px-2 py-0.5 rounded-full border border-red-200">
              {digest.overdueCount} overdue
            </span>
          )}
          {digest.dueTodayCount > 0 && (
            <span className="text-xs font-medium text-amber-700 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-200">
              {digest.dueTodayCount} due today
            </span>
          )}
          {digest.upcomingCount > 0 && (
            <span className="text-xs text-stone-500 bg-stone-800 px-2 py-0.5 rounded-full border border-stone-700">
              {digest.upcomingCount} upcoming
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {Array.from(groups.entries()).map(([eventId, tasks]) => {
          const first = tasks[0]
          const hasOverdue = tasks.some((t) => t.isOverdue)
          const displayDate = formatEventDate(first.eventDate)

          return (
            <div key={eventId}>
              {/* Event header row */}
              <Link href={first.eventHref} className="flex items-center justify-between mb-2 group">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-200 group-hover:text-brand-600 truncate">
                    {first.eventOccasion ?? 'Private Event'} - {first.clientName}
                  </p>
                  <p
                    className={`text-xs mt-0.5 flex items-center gap-1.5 flex-wrap ${hasOverdue ? 'text-red-500 font-medium' : 'text-stone-400'}`}
                  >
                    <span>
                      {displayDate}
                      {hasOverdue
                        ? ` · ${tasks.filter((t) => t.isOverdue).length} task${tasks.filter((t) => t.isOverdue).length !== 1 ? 's' : ''} overdue`
                        : ` · ${tasks.length} task${tasks.length !== 1 ? 's' : ''} pending`}
                    </span>
                    {/* Inline weather indicator */}
                    {weatherByEventId?.[eventId] &&
                      (() => {
                        const w = weatherByEventId[eventId]
                        return (
                          <span
                            className="inline-flex items-center gap-0.5 text-sky-400 font-normal"
                            title={w.description}
                          >
                            <span>{w.emoji}</span>
                            <span>
                              {w.tempMinF}–{w.tempMaxF}°F
                            </span>
                            {w.precipitationMm > 0.5 && (
                              <span
                                className="text-amber-400"
                                title={`${(w.precipitationMm / 25.4).toFixed(1)}" precipitation expected`}
                              >
                                rain
                              </span>
                            )}
                          </span>
                        )
                      })()}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-brand-500 shrink-0 ml-2" />
              </Link>

              {/* Task rows, grouped under this event */}
              <div className="space-y-1 pl-2 border-l-2 border-stone-800">
                {tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.taskId}
                    className={`flex items-start gap-2.5 rounded-md px-2 py-1.5 ${
                      task.isOverdue ? 'bg-red-950 border border-red-100' : ''
                    }`}
                  >
                    {/* Checkbox - optimistic, calls toggleDOPTaskCompletion */}
                    <div className="mt-0.5 shrink-0">
                      <DOPTaskCheckbox
                        eventId={task.eventId}
                        taskKey={task.taskId}
                        initialChecked={false}
                      />
                    </div>

                    {/* Task content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm shrink-0" aria-hidden="true">
                          {CATEGORY_ICONS[task.taskCategory] ?? '•'}
                        </span>
                        <span
                          className={`text-sm font-medium truncate ${
                            task.isOverdue ? 'text-red-700' : 'text-stone-300'
                          }`}
                        >
                          {task.taskLabel}
                        </span>
                      </div>
                      {task.isOverdue && task.deadline && (
                        <p className="text-xs text-red-500 mt-0.5 pl-5">
                          Was due{' '}
                          {formatDeadlineTime(task.deadline) ||
                            new Date(task.deadline + 'T00:00:00').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                        </p>
                      )}
                      {!task.isOverdue && task.deadline?.includes('T') && (
                        <p className="text-xs text-stone-400 mt-0.5 pl-5">
                          Due by {formatDeadlineTime(task.deadline)}
                        </p>
                      )}
                    </div>

                    {/* Phase badge */}
                    <span
                      className={`text-xs shrink-0 px-1.5 py-0.5 rounded whitespace-nowrap ${
                        task.isOverdue ? 'bg-red-900 text-red-600' : 'bg-stone-800 text-stone-500'
                      }`}
                    >
                      {task.phase}
                    </span>
                  </div>
                ))}

                {/* "More" link if event has > 5 tasks */}
                {tasks.length > 5 && (
                  <Link
                    href={first.scheduleHref}
                    className="text-xs text-brand-600 hover:text-brand-400 pl-2 block pt-1"
                  >
                    +{tasks.length - 5} more → Full schedule
                  </Link>
                )}
              </div>
            </div>
          )
        })}

        {/* Footer link if many events */}
        {groups.size > 3 && (
          <Link
            href="/calendar"
            className="block text-center text-sm text-brand-600 hover:text-brand-400 pt-2 border-t border-stone-800"
          >
            View all events →
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
