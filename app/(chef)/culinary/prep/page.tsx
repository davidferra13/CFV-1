import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAllComponents } from '@/lib/menus/actions'
import { getAllPrepTasks, type AggregatePrepTask } from '@/lib/shared/cross-cutting-queries'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Prep Overview' }

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default async function PrepPage() {
  await requireChef()

  // Fetch both the existing make-ahead components AND the cross-event prep timeline
  const [makeAheadComponents, crossEventPrep] = await Promise.all([
    getAllComponents({ is_make_ahead: true }),
    getAllPrepTasks().catch((): AggregatePrepTask[] => []),
  ])

  // Group cross-event prep by date, then by event within each date
  const prepByDate = new Map<
    string,
    Map<
      string,
      {
        eventId: string
        occasion: string | null
        clientName: string | null
        eventDate: string
        tasks: AggregatePrepTask[]
      }
    >
  >()

  for (const task of crossEventPrep) {
    if (!prepByDate.has(task.prepDate)) {
      prepByDate.set(task.prepDate, new Map())
    }
    const dayMap = prepByDate.get(task.prepDate)!
    if (!dayMap.has(task.eventId)) {
      dayMap.set(task.eventId, {
        eventId: task.eventId,
        occasion: task.occasion,
        clientName: task.clientName,
        eventDate: task.eventDate,
        tasks: [],
      })
    }
    dayMap.get(task.eventId)!.tasks.push(task)
  }

  const prepDays = Array.from(prepByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, eventsMap]) => ({
      date,
      events: Array.from(eventsMap.values()),
      totalActive: Array.from(eventsMap.values()).reduce(
        (s, ev) => s + ev.tasks.reduce((t, task) => t + task.activeMinutes, 0),
        0
      ),
      totalTasks: Array.from(eventsMap.values()).reduce((s, ev) => s + ev.tasks.length, 0),
    }))

  // Group make-ahead by menu for display (existing logic)
  const byMenu = new Map<
    string,
    {
      menuId: string
      menuName: string
      items: typeof makeAheadComponents
    }
  >()

  for (const comp of makeAheadComponents) {
    const key = comp.menu_id ?? 'standalone'
    if (!byMenu.has(key)) {
      byMenu.set(key, {
        menuId: comp.menu_id ?? '',
        menuName: comp.menu_name ?? 'Standalone Components',
        items: [],
      })
    }
    byMenu.get(key)!.items.push(comp)
  }

  const groups = Array.from(byMenu.values())

  // Sort each group by make_ahead_window_hours descending (longest lead time first)
  for (const group of groups) {
    group.items.sort((a, b) => (b.make_ahead_window_hours ?? 0) - (a.make_ahead_window_hours ?? 0))
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary" className="text-sm text-stone-500 hover:text-stone-300">
          ← Culinary
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Prep Overview</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {crossEventPrep.length} tasks this week
          </span>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {makeAheadComponents.length} make-ahead
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-stone-500">
            Prep tasks across all upcoming events, plus make-ahead components by menu
          </p>
          <div className="flex gap-2">
            <Link href="/culinary/prep/shopping">
              <Button variant="secondary" size="sm">
                Shopping List
              </Button>
            </Link>
            <Link href="/prep/consolidation">
              <Button variant="secondary" size="sm">
                Consolidation
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Cross-event prep timeline */}
      {prepDays.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-200 mb-3">Upcoming Prep by Day</h2>
          <div className="space-y-4">
            {prepDays.map((day) => {
              const isHeavy = day.totalActive >= 240
              return (
                <Card key={day.date} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-stone-100">{formatDate(day.date)}</h3>
                      {isHeavy && <Badge variant="warning">Heavy day</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-stone-400">
                      <span>{day.totalTasks} tasks</span>
                      <span>{formatMinutes(day.totalActive)} active</span>
                      <span>
                        {day.events.length} event{day.events.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {day.events.map((ev) => {
                      const evActive = ev.tasks.reduce((s, t) => s + t.activeMinutes, 0)
                      return (
                        <div key={ev.eventId} className="pl-3 border-l-2 border-stone-700">
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              href={`/events/${ev.eventId}/prep-plan`}
                              className="text-sm font-medium text-brand-500 hover:text-brand-400"
                            >
                              {ev.occasion || 'Event'}
                            </Link>
                            <span className="text-xs text-stone-500">
                              {ev.clientName ? `for ${ev.clientName}` : ''}
                            </span>
                            <span className="text-xs text-stone-600">
                              {formatMinutes(evActive)} active
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {ev.tasks.map((task, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-xs bg-stone-800 text-stone-300 px-2 py-0.5 rounded"
                              >
                                {task.componentName}
                                {task.freezable && (
                                  <span className="text-blue-400" title="Freezable">
                                    *
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Divider between sections */}
      {prepDays.length > 0 && makeAheadComponents.length > 0 && (
        <div className="border-t border-stone-700 pt-2">
          <h2 className="text-lg font-semibold text-stone-200 mb-1">Make-Ahead Components</h2>
          <p className="text-sm text-stone-500 mb-3">
            All make-ahead components by menu, sorted by lead time
          </p>
        </div>
      )}

      {makeAheadComponents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No make-ahead components</p>
          <p className="text-stone-400 text-sm mb-4">
            Mark components as make-ahead inside a menu&apos;s dishes to track them here
          </p>
          <Link href="/culinary/menus">
            <Button variant="secondary" size="sm">
              Go to Menus
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.menuId}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-semibold text-stone-200">{group.menuName}</h2>
                {group.menuId && (
                  <Link
                    href={`/culinary/menus/${group.menuId}`}
                    className="text-xs text-brand-600 hover:text-brand-300"
                  >
                    View menu →
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                {group.items.map((comp) => (
                  <Card key={comp.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-stone-100">{comp.name}</p>
                          <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full capitalize">
                            {comp.category}
                          </span>
                          {comp.dish_name && (
                            <span className="text-xs text-stone-400">{comp.dish_name}</span>
                          )}
                        </div>
                        {comp.storage_notes && (
                          <p className="text-sm text-stone-500 mt-1">
                            <span className="font-medium">Storage:</span> {comp.storage_notes}
                          </p>
                        )}
                        {comp.execution_notes && (
                          <p className="text-sm text-stone-500 mt-0.5">
                            <span className="font-medium">Execution:</span> {comp.execution_notes}
                          </p>
                        )}
                        {comp.recipe_id && (
                          <Link
                            href={`/culinary/recipes/${comp.recipe_id}`}
                            className="text-xs text-brand-600 hover:underline mt-1 inline-block"
                          >
                            View recipe →
                          </Link>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {comp.make_ahead_window_hours ? (
                          <div className="text-center">
                            <p className="text-xl font-bold text-amber-700">
                              {comp.make_ahead_window_hours}h
                            </p>
                            <p className="text-xs text-stone-400">lead time</p>
                          </div>
                        ) : (
                          <span className="text-xs bg-amber-900 text-amber-700 px-2 py-0.5 rounded-full">
                            Make ahead
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
