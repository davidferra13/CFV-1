// Staff Tasks View - Tasks assigned to this staff member, grouped by date
// Allows checking off tasks as done using the completeMyTask action.

import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/get-user'
import { getMyTasksGroupedByDate } from '@/lib/staff/staff-portal-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StaffTaskCheckbox } from '@/components/staff/staff-task-checkbox'

export const metadata: Metadata = { title: 'Tasks' }

export default async function StaffTasksPage() {
  const user = await requireStaff()
  const groupedTasks = await getMyTasksGroupedByDate()
  const _stk = new Date()
  const today = `${_stk.getFullYear()}-${String(_stk.getMonth() + 1).padStart(2, '0')}-${String(_stk.getDate()).padStart(2, '0')}`

  const dateKeys = Object.keys(groupedTasks).sort()

  return (
    <div className="space-y-6" data-tour="staff-check-tasks">
      <h1 className="text-2xl font-bold text-stone-100">My Tasks</h1>

      {dateKeys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400">No tasks assigned to you.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dateKeys.map((dateKey) => {
            const tasks = groupedTasks[dateKey]
            const isToday = dateKey === today
            const isPast = dateKey < today
            const dateFormatted = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })

            const pendingCount = tasks.filter((t) => t.status !== 'done').length
            const doneCount = tasks.filter((t) => t.status === 'done').length

            return (
              <Card key={dateKey}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">
                        {isToday ? 'Today' : dateFormatted}
                      </CardTitle>
                      {isToday && <Badge variant="info">Today</Badge>}
                      {isPast && !isToday && <Badge variant="warning">Overdue</Badge>}
                    </div>
                    <div className="text-xs text-stone-500">
                      {doneCount}/{tasks.length} complete
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {tasks.map((task) => {
                      const isDone = task.status === 'done'

                      return (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 py-2 border-b border-stone-800 last:border-0"
                        >
                          <div className="pt-0.5">
                            <StaffTaskCheckbox taskId={task.id} isCompleted={isDone} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm font-medium ${
                                isDone ? 'text-stone-500 line-through' : 'text-stone-200'
                              }`}
                            >
                              {task.title}
                            </div>
                            {task.event_name && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-xs bg-brand-500/15 text-brand-400 border border-brand-500/25 rounded px-1.5 py-0.5">
                                  {task.event_name}
                                  {task.event_date
                                    ? ` \u00b7 ${new Date(task.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                                    : ''}
                                  {task.event_guest_count
                                    ? `, ${task.event_guest_count} guests`
                                    : ''}
                                </span>
                              </div>
                            )}
                            {task.description && (
                              <div className="text-xs text-stone-500 mt-0.5 line-clamp-2">
                                {task.description}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {task.due_time && (
                                <span className="text-xs text-stone-500">{task.due_time}</span>
                              )}
                              {task.notes && (
                                <span className="text-xs text-stone-500 italic truncate max-w-[200px]">
                                  {task.notes}
                                </span>
                              )}
                            </div>
                          </div>
                          <PriorityBadge priority={task.priority} />
                        </div>
                      )
                    })}
                  </div>

                  {/* Progress bar */}
                  {tasks.length > 0 && (
                    <div className="mt-3">
                      <div className="h-1.5 w-full bg-stone-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${(doneCount / tasks.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    low: 'default',
    medium: 'info',
    high: 'warning',
    urgent: 'error',
  }

  return <Badge variant={variants[priority] ?? 'default'}>{priority}</Badge>
}
