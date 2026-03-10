// Morning Briefing Page (Phase 3)
// The ONE page the owner reads in 60 seconds to know everything about today.
// Mobile-first, single scroll, no clicks needed to get the picture.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getMorningBriefing } from '@/lib/briefing/get-morning-briefing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShiftNotesSection } from '@/components/briefing/shift-notes-section'
import { PrepTimersSection } from '@/components/briefing/prep-timers-section'

export const metadata: Metadata = { title: 'Morning Briefing - ChefFlow' }

// ============================================
// HELPERS
// ============================================

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function severityColor(severity: string): string {
  if (severity === 'critical') return 'bg-red-950/40 border-red-900/50'
  if (severity === 'high') return 'bg-amber-950/30 border-amber-900/40'
  return 'bg-stone-800/50 border-stone-700'
}

function severityBadge(severity: string): 'error' | 'warning' | 'default' {
  if (severity === 'critical') return 'error'
  if (severity === 'high') return 'warning'
  return 'default'
}

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Asst.',
  service_staff: 'Service',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Staff',
}

// ============================================
// PAGE
// ============================================

export default async function BriefingPage() {
  await requireChef()
  const briefing = await getMorningBriefing()

  const totalTodayTasks = briefing.todayTasks.length
  const doneTodayTasks = briefing.todayTasks.filter((t) => t.status === 'done').length
  const pendingTodayTasks = briefing.todayTasks.filter((t) => t.status !== 'done').length

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Morning Briefing</h1>
        <p className="mt-1 text-sm text-stone-400">
          {formatDisplayDate(briefing.today)} &middot; {briefing.shiftLabel} shift
        </p>
      </div>

      {/* ============================================ */}
      {/* ALERTS (top of page, can't miss them) */}
      {/* ============================================ */}
      {briefing.alerts.length > 0 && (
        <section className="space-y-2">
          {briefing.alerts.map((alert, idx) => (
            <Link key={idx} href={alert.href}>
              <div
                className={`rounded-lg border px-4 py-3 flex items-center justify-between transition-colors hover:brightness-110 ${severityColor(alert.severity)}`}
              >
                <div className="flex items-center gap-3">
                  <Badge variant={severityBadge(alert.severity)} className="text-[10px] uppercase">
                    {alert.severity}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-stone-100">{alert.title}</p>
                    <p className="text-xs text-stone-400">{alert.detail}</p>
                  </div>
                </div>
                <span className="text-xs text-stone-500">View</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {briefing.alerts.length === 0 && (
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-4 py-3 text-center">
          <p className="text-sm text-emerald-400 font-medium">
            All clear. No urgent items this morning.
          </p>
        </div>
      )}

      {/* ============================================ */}
      {/* SECTION A: YESTERDAY'S RECAP */}
      {/* ============================================ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-stone-300">Yesterday's Recap</CardTitle>
        </CardHeader>
        <CardContent>
          {briefing.yesterdayRecap.eventsCompleted === 0 &&
          briefing.yesterdayRecap.tasksCompleted === 0 &&
          briefing.yesterdayRecap.inquiriesReceived === 0 ? (
            <p className="text-sm text-stone-500">Quiet day yesterday. Nothing to report.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {briefing.yesterdayRecap.eventsCompleted > 0 && (
                <div className="rounded-lg bg-stone-800/50 px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-stone-100">
                    {briefing.yesterdayRecap.eventsCompleted}
                  </p>
                  <p className="text-[11px] text-stone-400">Events done</p>
                </div>
              )}
              <div className="rounded-lg bg-stone-800/50 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-emerald-400">
                  {briefing.yesterdayRecap.tasksCompleted}
                </p>
                <p className="text-[11px] text-stone-400">Tasks done</p>
              </div>
              {briefing.yesterdayRecap.tasksMissed > 0 && (
                <div className="rounded-lg bg-red-950/30 border border-red-900/30 px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-red-400">
                    {briefing.yesterdayRecap.tasksMissed}
                  </p>
                  <p className="text-[11px] text-stone-400">Tasks missed</p>
                </div>
              )}
              {briefing.yesterdayRecap.inquiriesReceived > 0 && (
                <div className="rounded-lg bg-stone-800/50 px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-brand-400">
                    {briefing.yesterdayRecap.inquiriesReceived}
                  </p>
                  <p className="text-[11px] text-stone-400">New inquiries</p>
                </div>
              )}
              {briefing.yesterdayRecap.expensesLogged > 0 && (
                <div className="rounded-lg bg-stone-800/50 px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-stone-100">
                    {briefing.yesterdayRecap.expensesLogged}
                  </p>
                  <p className="text-[11px] text-stone-400">Expenses logged</p>
                </div>
              )}
            </div>
          )}
          {briefing.yesterdayRecap.eventNames.length > 0 && (
            <p className="mt-2 text-xs text-stone-500">
              Events: {briefing.yesterdayRecap.eventNames.join(', ')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* SECTION B: SHIFT HANDOFF NOTES */}
      {/* ============================================ */}
      <ShiftNotesSection
        todayNotes={briefing.shiftNotes.todayNotes}
        pinnedNotes={briefing.shiftNotes.pinnedNotes}
        yesterdayClosingNotes={briefing.shiftNotes.yesterdayClosingNotes}
      />

      {/* ============================================ */}
      {/* SECTION C: TODAY'S EVENTS */}
      {/* ============================================ */}
      <section>
        <h2 className="text-base font-semibold text-stone-200 mb-3">
          Today's Events
          {briefing.todayEvents.length > 0 && (
            <Badge variant="info" className="ml-2">
              {briefing.todayEvents.length}
            </Badge>
          )}
        </h2>
        {briefing.todayEvents.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-stone-500">No events scheduled for today.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {briefing.todayEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card interactive className="mb-3">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-stone-100">{event.title}</span>
                          <Badge
                            variant={event.status === 'confirmed' ? 'success' : 'info'}
                            className="text-[10px]"
                          >
                            {event.status}
                          </Badge>
                        </div>
                        {event.client_name && (
                          <p className="text-sm text-stone-400 mt-0.5">{event.client_name}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-stone-500 flex-wrap">
                          {event.start_time && (
                            <span>
                              {formatTime(event.start_time)}
                              {event.end_time ? ` - ${formatTime(event.end_time)}` : ''}
                            </span>
                          )}
                          {event.guest_count && <span>{event.guest_count} guests</span>}
                          {event.venue && <span>{event.venue}</span>}
                          {event.staff_count > 0 && <span>{event.staff_count} staff</span>}
                        </div>
                      </div>
                    </div>

                    {/* Dietary warnings */}
                    {event.dietary_notes && (
                      <div className="mt-3 rounded-md bg-amber-950/30 border border-amber-900/30 px-3 py-2">
                        <p className="text-xs font-medium text-amber-400">Dietary Notes</p>
                        <p className="text-xs text-stone-300 mt-0.5">{event.dietary_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ============================================ */}
      {/* PREP TIMERS COMPLETING TODAY (Phase 5) */}
      {/* ============================================ */}
      {briefing.prepTimersToday.length > 0 && (
        <PrepTimersSection timers={briefing.prepTimersToday} />
      )}

      {/* ============================================ */}
      {/* SECTION D: TODAY'S TASKS + CARRIED OVER */}
      {/* ============================================ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-stone-200">
            Today's Tasks
            {totalTodayTasks > 0 && (
              <span className="ml-2 text-sm font-normal text-stone-400">
                {doneTodayTasks}/{totalTodayTasks} done
              </span>
            )}
          </h2>
          <Link href="/tasks" className="text-xs text-brand-400 hover:text-brand-300">
            Task Board
          </Link>
        </div>

        {/* Carried-over tasks */}
        {briefing.carriedOverTasks.length > 0 && (
          <Card className="mb-3 border-amber-900/40">
            <CardHeader className="py-2.5">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm text-amber-400">
                  Carried Over ({briefing.carriedOverTasks.length})
                </CardTitle>
                <Badge variant="warning" className="text-[10px]">
                  Overdue
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-3 space-y-2">
              {briefing.carriedOverTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg bg-amber-950/20 border border-amber-900/30 px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-200">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.staff_member && (
                        <span className="text-xs text-stone-500">
                          {(task.staff_member as any).name}
                        </span>
                      )}
                      <span className="text-xs text-amber-500">{task.daysOverdue}d overdue</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      task.priority === 'urgent'
                        ? 'error'
                        : task.priority === 'high'
                          ? 'warning'
                          : 'default'
                    }
                    className="text-[10px]"
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Today's tasks grouped by status */}
        {totalTodayTasks === 0 && briefing.carriedOverTasks.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-stone-500">
                No tasks for today. Create some on the task board.
              </p>
            </CardContent>
          </Card>
        ) : pendingTodayTasks > 0 ? (
          <Card>
            <CardContent className="pt-3 pb-3 space-y-2">
              {briefing.todayTasks
                .filter((t) => t.status !== 'done')
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg bg-stone-800/50 px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-200">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.staff_name && (
                          <span className="text-xs text-stone-500">{task.staff_name}</span>
                        )}
                        {task.due_time && (
                          <span className="text-xs text-stone-500">
                            {formatTime(task.due_time)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          task.status === 'in_progress'
                            ? 'info'
                            : task.priority === 'urgent'
                              ? 'error'
                              : task.priority === 'high'
                                ? 'warning'
                                : 'default'
                        }
                        className="text-[10px]"
                      >
                        {task.status === 'in_progress' ? 'In Progress' : task.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              {doneTodayTasks > 0 && (
                <p className="text-xs text-stone-500 text-center pt-1">
                  + {doneTodayTasks} completed task{doneTodayTasks !== 1 ? 's' : ''}
                </p>
              )}
            </CardContent>
          </Card>
        ) : totalTodayTasks > 0 ? (
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-sm text-emerald-400 font-medium">
                All {totalTodayTasks} tasks completed for today!
              </p>
            </CardContent>
          </Card>
        ) : null}
      </section>

      {/* ============================================ */}
      {/* SECTION E: STAFF ON DUTY */}
      {/* ============================================ */}
      {briefing.staffOnDuty.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-stone-200 mb-3">Staff on Duty</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {briefing.staffOnDuty.map((staff) => (
              <Card key={staff.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-stone-100">{staff.name}</p>
                      <p className="text-xs text-stone-500">
                        {ROLE_LABELS[staff.role] ?? staff.role}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-stone-300">
                        {staff.tasks_done}/{staff.tasks_assigned}
                      </p>
                      <p className="text-[11px] text-stone-500">tasks done</p>
                    </div>
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-2 h-1 rounded-full bg-stone-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width:
                          staff.tasks_assigned > 0
                            ? `${(staff.tasks_done / staff.tasks_assigned) * 100}%`
                            : '0%',
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION F: ACTION NEEDED */}
      {/* ============================================ */}
      {(briefing.overduePayments.length > 0 ||
        briefing.pendingInquiries.length > 0 ||
        briefing.unsignedProposals.length > 0) && (
        <section>
          <h2 className="text-base font-semibold text-stone-200 mb-3">Action Needed</h2>
          <div className="space-y-3">
            {briefing.overduePayments.length > 0 && (
              <Card className="border-red-900/40">
                <CardContent className="pt-4 pb-3">
                  <h4 className="text-sm font-medium text-red-400 mb-2">
                    Overdue Payments ({briefing.overduePayments.length})
                  </h4>
                  <div className="space-y-2">
                    {briefing.overduePayments.map((p) => (
                      <Link key={p.event_id} href={`/events/${p.event_id}`}>
                        <div className="flex items-center justify-between rounded-lg bg-red-950/20 border border-red-900/20 px-3 py-2 hover:brightness-110 transition">
                          <div>
                            <p className="text-sm text-stone-200">{p.client_name}</p>
                            <p className="text-xs text-stone-500">{p.occasion}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-red-400">
                              ${(p.amount_cents / 100).toFixed(0)}
                            </p>
                            <p className="text-[11px] text-stone-500">{p.days_past_due}d overdue</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {briefing.pendingInquiries.length > 0 && (
              <Card>
                <CardContent className="pt-4 pb-3">
                  <h4 className="text-sm font-medium text-brand-400 mb-2">
                    Pending Inquiries ({briefing.pendingInquiries.length})
                  </h4>
                  <div className="space-y-2">
                    {briefing.pendingInquiries.map((i) => (
                      <Link key={i.id} href={`/inquiries/${i.id}`}>
                        <div className="flex items-center justify-between rounded-lg bg-stone-800/50 px-3 py-2 hover:brightness-110 transition">
                          <div>
                            <p className="text-sm text-stone-200">{i.client_name}</p>
                            {i.occasion && <p className="text-xs text-stone-500">{i.occasion}</p>}
                          </div>
                          <div className="text-right flex items-center gap-2">
                            {i.lead_score !== null && (
                              <Badge
                                variant={
                                  i.lead_score >= 70
                                    ? 'success'
                                    : i.lead_score >= 40
                                      ? 'warning'
                                      : 'default'
                                }
                                className="text-[10px]"
                              >
                                {i.lead_score}%
                              </Badge>
                            )}
                            <p className="text-xs text-stone-500">{i.days_waiting}d</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {briefing.unsignedProposals.length > 0 && (
              <Card>
                <CardContent className="pt-4 pb-3">
                  <h4 className="text-sm font-medium text-amber-400 mb-2">
                    Unsigned Proposals ({briefing.unsignedProposals.length})
                  </h4>
                  <div className="space-y-2">
                    {briefing.unsignedProposals.map((p) => (
                      <Link key={p.event_id} href={`/events/${p.event_id}`}>
                        <div className="flex items-center justify-between rounded-lg bg-stone-800/50 px-3 py-2 hover:brightness-110 transition">
                          <div>
                            <p className="text-sm text-stone-200">{p.client_name}</p>
                            {p.occasion && <p className="text-xs text-stone-500">{p.occasion}</p>}
                          </div>
                          <p className="text-xs text-stone-500">{p.days_since_sent}d since sent</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION G: UPCOMING MILESTONES */}
      {/* ============================================ */}
      {briefing.upcomingMilestones.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-stone-200 mb-3">
            Upcoming Milestones
            <Badge variant="info" className="ml-2">
              {briefing.upcomingMilestones.length}
            </Badge>
          </h2>
          <Card>
            <CardContent className="pt-3 pb-3 space-y-2">
              {briefing.upcomingMilestones.map((m, idx) => (
                <div
                  key={`${m.client_id}-${m.type}-${idx}`}
                  className="flex items-center justify-between rounded-lg bg-stone-800/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {m.type === 'birthday' ? '\uD83C\uDF82' : '\uD83C\uDF89'}
                    </span>
                    <div>
                      <p className="text-sm text-stone-200">{m.client_name}</p>
                      <p className="text-xs text-stone-500 capitalize">{m.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-stone-300">
                      {m.days_away === 0 ? 'Today!' : `${m.days_away}d`}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION H: WEEK AHEAD */}
      {/* ============================================ */}
      <section>
        <h2 className="text-base font-semibold text-stone-200 mb-3">This Week</h2>
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="grid grid-cols-7 gap-1">
              {briefing.weekAhead.map((day) => (
                <div
                  key={day.date}
                  className={`text-center rounded-lg px-1 py-2.5 ${
                    day.date === briefing.today
                      ? 'bg-brand-950/40 border border-brand-700/50'
                      : 'bg-stone-800/50'
                  }`}
                >
                  <p
                    className={`text-[11px] font-medium ${
                      day.date === briefing.today ? 'text-brand-400' : 'text-stone-500'
                    }`}
                  >
                    {day.day_label}
                  </p>
                  <p
                    className={`text-lg font-bold mt-0.5 ${
                      day.event_count > 0 ? 'text-stone-100' : 'text-stone-600'
                    }`}
                  >
                    {day.event_count}
                  </p>
                  <p className="text-[10px] text-stone-600">
                    {day.event_count === 1 ? 'event' : 'events'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ============================================ */}
      {/* QUICK LINKS */}
      {/* ============================================ */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Link
          href="/tasks"
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
        >
          Task Board
        </Link>
        <Link
          href="/stations/daily-ops"
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
        >
          Station Ops
        </Link>
        <Link
          href="/queue"
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
        >
          Priority Queue
        </Link>
        <Link
          href="/calendar"
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
        >
          Calendar
        </Link>
        <Link
          href="/inquiries"
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
        >
          Inquiries
        </Link>
      </div>
    </div>
  )
}
