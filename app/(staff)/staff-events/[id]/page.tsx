// Staff Portal - Event Detail
// Shows a single event's details for the assigned staff member.
// Includes role, timeline, team, menu, dietary alerts, and tasks.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/auth/get-user'
import { getMyEventDetail } from '@/lib/staff/my-events-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { StaffTaskCheckbox } from '@/components/staff/staff-task-checkbox'

export const metadata: Metadata = { title: 'Event Detail' }

export default async function StaffEventDetailPage({ params }: { params: { id: string } }) {
  await requireStaff()
  const detail = await getMyEventDetail(params.id)

  if (!detail) {
    notFound()
  }

  const eventDateFormatted = formatDate(detail.event_date)
  const hasDietaryAlerts =
    (detail.dietary_restrictions && detail.dietary_restrictions.length > 0) ||
    (detail.allergies && detail.allergies.length > 0)

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href="/staff-events"
          className="text-sm text-brand-400 hover:text-brand-300 mb-2 inline-block"
        >
          &larr; Back to My Events
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">{detail.event_title}</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-stone-400 text-sm">{eventDateFormatted}</span>
          {detail.occasion && <Badge variant="default">{detail.occasion}</Badge>}
          <Badge variant="info">{detail.event_status}</Badge>
        </div>
      </div>

      {/* My Role */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-stone-500">Role</div>
              <div className="text-sm font-medium text-stone-200">{detail.role}</div>
            </div>
            {detail.station_name && (
              <div>
                <div className="text-xs text-stone-500">Station</div>
                <div className="text-sm font-medium text-stone-200">{detail.station_name}</div>
              </div>
            )}
            {detail.scheduled_hours && (
              <div>
                <div className="text-xs text-stone-500">Scheduled Hours</div>
                <div className="text-sm font-medium text-stone-200">{detail.scheduled_hours}h</div>
              </div>
            )}
            {detail.actual_hours && (
              <div>
                <div className="text-xs text-stone-500">Actual Hours</div>
                <div className="text-sm font-medium text-stone-200">{detail.actual_hours}h</div>
              </div>
            )}
          </div>
          {detail.assignment_notes && (
            <p className="text-sm text-stone-400 mt-3 border-t border-stone-700 pt-3">
              {detail.assignment_notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Event Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {detail.serve_time && (
              <div>
                <div className="text-xs text-stone-500">Serve Time</div>
                <div className="text-sm font-medium text-stone-200">{detail.serve_time}</div>
              </div>
            )}
            {detail.start_time && (
              <div>
                <div className="text-xs text-stone-500">Start Time</div>
                <div className="text-sm font-medium text-stone-200">{detail.start_time}</div>
              </div>
            )}
            {detail.end_time && (
              <div>
                <div className="text-xs text-stone-500">End Time</div>
                <div className="text-sm font-medium text-stone-200">{detail.end_time}</div>
              </div>
            )}
            {detail.guest_count && (
              <div>
                <div className="text-xs text-stone-500">Guest Count</div>
                <div className="text-sm font-medium text-stone-200">{detail.guest_count}</div>
              </div>
            )}
            {detail.location_address && (
              <div className="col-span-2">
                <div className="text-xs text-stone-500">Location</div>
                <div className="text-sm font-medium text-stone-200">
                  {detail.location_address}
                  {detail.location_city && `, ${detail.location_city}`}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <TimelineItem
              label="Arrival / Start"
              time={detail.start_time}
              status={detail.timeline.prep_started_at ? 'done' : 'upcoming'}
            />
            <TimelineItem
              label="Service Begins"
              time={detail.serve_time}
              status={
                detail.timeline.service_started_at
                  ? 'done'
                  : detail.timeline.prep_started_at
                    ? 'active'
                    : 'upcoming'
              }
            />
            <TimelineItem
              label="Service Complete"
              time={detail.end_time}
              status={
                detail.timeline.service_completed_at
                  ? 'done'
                  : detail.timeline.service_started_at
                    ? 'active'
                    : 'upcoming'
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      {detail.team.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team ({detail.team.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {detail.team.map((member, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 border-b border-stone-800 last:border-0"
                >
                  <span className="text-sm text-stone-200">{member.name}</span>
                  <span className="text-xs text-stone-400">{member.role}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu */}
      {detail.beo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Menu{detail.beo.menuName ? `: ${detail.beo.menuName}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detail.beo.isSimpleMenu && detail.beo.simpleMenuContent ? (
              <p className="text-sm text-stone-300 whitespace-pre-wrap">
                {detail.beo.simpleMenuContent}
              </p>
            ) : detail.beo.courses.length > 0 ? (
              <div className="space-y-4">
                {detail.beo.courses.map((course, ci) => (
                  <div key={ci}>
                    <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">
                      {course.name}
                    </h4>
                    <div className="space-y-1">
                      {course.dishes.map((dish, di) => (
                        <div key={di} className="flex items-center gap-2">
                          <span className="text-sm text-stone-200">{dish.name}</span>
                          {dish.dietaryTags.map((tag) => (
                            <Badge key={tag} variant="default">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">No menu details available.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Special Notes / Dietary Alerts */}
      {(hasDietaryAlerts || detail.special_requests || detail.kitchen_notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Special Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.allergies && detail.allergies.length > 0 && (
              <div>
                <div className="text-xs text-red-400 font-medium mb-1">Allergies</div>
                <div className="flex flex-wrap gap-1">
                  {detail.allergies.map((a) => (
                    <Badge key={a} variant="error">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {detail.dietary_restrictions && detail.dietary_restrictions.length > 0 && (
              <div>
                <div className="text-xs text-yellow-400 font-medium mb-1">Dietary Restrictions</div>
                <div className="flex flex-wrap gap-1">
                  {detail.dietary_restrictions.map((d) => (
                    <Badge key={d} variant="warning">
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {detail.special_requests && (
              <div>
                <div className="text-xs text-stone-500 mb-1">Special Requests</div>
                <p className="text-sm text-stone-300">{detail.special_requests}</p>
              </div>
            )}
            {detail.kitchen_notes && (
              <div>
                <div className="text-xs text-stone-500 mb-1">Kitchen Notes</div>
                <p className="text-sm text-stone-300">{detail.kitchen_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* My Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">My Tasks</CardTitle>
            <Link href="/staff-tasks" className="text-sm text-brand-500 hover:text-brand-400">
              All Tasks
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {detail.tasks.length === 0 ? (
            <p className="text-sm text-stone-500">No tasks assigned for this event.</p>
          ) : (
            <div className="space-y-2">
              {detail.tasks.map((task) => (
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
                    {task.due_time && <div className="text-xs text-stone-500">{task.due_time}</div>}
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TimelineItem({
  label,
  time,
  status,
}: {
  label: string
  time: string | null
  status: 'done' | 'active' | 'upcoming'
}) {
  const dotColors = {
    done: 'bg-emerald-400',
    active: 'bg-blue-400 animate-pulse',
    upcoming: 'bg-stone-600',
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`h-3 w-3 rounded-full ${dotColors[status]}`} />
      <div className="flex-1">
        <span className="text-sm text-stone-200">{label}</span>
      </div>
      {time && <span className="text-xs text-stone-400">{time}</span>}
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

function formatDate(date: string): string {
  try {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return date
  }
}
