// Staff Dashboard - Staff home page
// Shows welcome message, today's tasks, upcoming assignments, and station links.

import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/get-user'
import {
  getMyProfile,
  getMyTasks,
  getMyUpcomingAssignments,
  getMyStations,
} from '@/lib/staff/staff-portal-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { StaffTaskCheckbox } from '@/components/staff/staff-task-checkbox'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function StaffDashboardPage({
  searchParams,
}: {
  searchParams: { view?: string }
}) {
  const user = await requireStaff()
  const profile = await getMyProfile()

  const showTomorrow = searchParams.view === 'tomorrow'
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const today = now.toISOString().split('T')[0]
  const tomorrowDate = tomorrow.toISOString().split('T')[0]
  const activeDate = showTomorrow ? tomorrowDate : today

  const todayFormatted = (showTomorrow ? tomorrow : now).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const [todayTasks, assignments, stations] = await Promise.all([
    getMyTasks(activeDate),
    getMyUpcomingAssignments(),
    getMyStations(),
  ])

  const pendingTasks = todayTasks.filter((t) => t.status !== 'done')
  const completedTasks = todayTasks.filter((t) => t.status === 'done')

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-100">
          Welcome, {profile?.name ?? 'Team Member'}
        </h1>
        <p className="text-stone-400 mt-1">{todayFormatted}</p>
        {/* Today / Tomorrow toggle */}
        <div className="flex gap-2 mt-3">
          <Link
            href="/staff-dashboard"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !showTomorrow
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            Today
          </Link>
          <Link
            href="/staff-dashboard?view=tomorrow"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              showTomorrow
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            Tomorrow
          </Link>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-stone-100">{pendingTasks.length}</div>
            <div className="text-xs text-stone-400 mt-1">Tasks Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{completedTasks.length}</div>
            <div className="text-xs text-stone-400 mt-1">Done Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-stone-100">{assignments.length}</div>
            <div className="text-xs text-stone-400 mt-1">Upcoming Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-stone-100">{stations.length}</div>
            <div className="text-xs text-stone-400 mt-1">My Stations</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {showTomorrow ? "Tomorrow's" : "Today's"} Tasks
              </CardTitle>
              <Link href="/staff-tasks" className="text-sm text-brand-500 hover:text-brand-400">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {todayTasks.length === 0 ? (
              <p className="text-sm text-stone-500">No tasks assigned for today.</p>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 py-2 border-b border-stone-800 last:border-0"
                  >
                    <StaffTaskCheckbox taskId={task.id} isCompleted={task.status === 'done'} />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          task.status === 'done' ? 'text-stone-500 line-through' : 'text-stone-200'
                        }`}
                      >
                        {task.title}
                      </div>
                      {task.due_time && (
                        <div className="text-xs text-stone-500">{task.due_time}</div>
                      )}
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Stations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">My Stations</CardTitle>
              <Link href="/staff-station" className="text-sm text-brand-500 hover:text-brand-400">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stations.length === 0 ? (
              <p className="text-sm text-stone-500">No stations assigned.</p>
            ) : (
              <div className="space-y-2">
                {stations.map((station) => (
                  <Link
                    key={station.id}
                    href={`/staff-station?id=${station.id}`}
                    className="block p-3 rounded-lg bg-stone-800/50 hover:bg-stone-700/50 transition-colors"
                  >
                    <div className="font-medium text-stone-200 text-sm">{station.name}</div>
                    {station.description && (
                      <div className="text-xs text-stone-500 mt-1">{station.description}</div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Assignments */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming Event Assignments</CardTitle>
              <Link href="/staff-schedule" className="text-sm text-brand-500 hover:text-brand-400">
                Full schedule
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-sm text-stone-500">No upcoming assignments.</p>
            ) : (
              <div className="space-y-2">
                {assignments.slice(0, 5).map((assignment) => {
                  const event = assignment.event as any
                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                    >
                      <div>
                        <div className="text-sm font-medium text-stone-200">
                          {event?.title ?? 'Unnamed Event'}
                        </div>
                        <div className="text-xs text-stone-500">
                          {event?.date
                            ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Date TBD'}
                          {event?.start_time && ` at ${event.start_time}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {assignment.scheduled_hours && (
                          <span className="text-xs text-stone-400">
                            {assignment.scheduled_hours}h
                          </span>
                        )}
                        <AssignmentStatusBadge status={assignment.status} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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

function AssignmentStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    scheduled: 'info',
    confirmed: 'success',
    completed: 'default',
    no_show: 'error',
  }

  return <Badge variant={variants[status] ?? 'default'}>{status.replace('_', ' ')}</Badge>
}
