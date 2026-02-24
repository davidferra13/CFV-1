// Staff Detail Page — Full profile for a single staff member
// Shows: contact info, assignment history, onboarding, agreements, performance

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getStaffMember } from '@/lib/staff/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StaffMemberForm } from '@/components/staff/staff-member-form'

export const metadata: Metadata = { title: 'Staff Profile — ChefFlow' }

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Assistant',
  service_staff: 'Service Staff',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Other',
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  scheduled: 'default',
  confirmed: 'info' as any,
  completed: 'success',
  no_show: 'error',
}

export default async function StaffDetailPage({ params }: { params: { id: string } }) {
  await requireChef()
  const member = await getStaffMember(params.id)

  const onboardingComplete = member.onboarding.filter((i: any) => i.status === 'complete').length
  const onboardingTotal = member.onboarding.length

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Back link */}
      <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
        &larr; Back to Staff Roster
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">{member.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="default">{ROLE_LABELS[member.role] ?? member.role}</Badge>
            <Badge variant={member.status === 'active' ? 'success' : 'error'}>
              {member.status}
            </Badge>
            {member.hourly_rate_cents > 0 && (
              <span className="text-sm text-stone-400">
                ${(member.hourly_rate_cents / 100).toFixed(2)}/hr
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {member.phone && (
            <div className="flex justify-between">
              <span className="text-stone-500">Phone</span>
              <span className="text-stone-200">{member.phone}</span>
            </div>
          )}
          {member.email && (
            <div className="flex justify-between">
              <span className="text-stone-500">Email</span>
              <span className="text-stone-200">{member.email}</span>
            </div>
          )}
          {member.notes && (
            <div className="flex justify-between">
              <span className="text-stone-500">Notes</span>
              <span className="text-stone-200">{member.notes}</span>
            </div>
          )}
          {!member.phone && !member.email && !member.notes && (
            <p className="text-stone-500">No contact information on file.</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffMemberForm member={member} />
        </CardContent>
      </Card>

      {/* Performance */}
      {member.performance && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-stone-500">On-Time Rate</p>
                <p className="text-lg font-semibold text-stone-100">
                  {member.performance.on_time_rate != null
                    ? `${Math.round(member.performance.on_time_rate * 100)}%`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-stone-500">Cancellations</p>
                <p className="text-lg font-semibold text-stone-100">
                  {member.performance.cancellation_count ?? 0}
                </p>
              </div>
              <div>
                <p className="text-stone-500">Avg Rating</p>
                <p className="text-lg font-semibold text-stone-100">
                  {member.performance.avg_rating != null
                    ? `${Number(member.performance.avg_rating).toFixed(1)} / 5`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-stone-500">Total Events</p>
                <p className="text-lg font-semibold text-stone-100">
                  {member.performance.total_events ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Status */}
      {onboardingTotal > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Onboarding
              <Badge
                variant={onboardingComplete === onboardingTotal ? 'success' : 'warning'}
                className="ml-2"
              >
                {onboardingComplete}/{onboardingTotal}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {member.onboarding.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">
                    {item.item_key
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                  <Badge
                    variant={
                      item.status === 'complete'
                        ? 'success'
                        : item.status === 'not_applicable'
                          ? 'default'
                          : 'warning'
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contractor Agreements */}
      {member.agreements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Agreements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {member.agreements.map((agreement: any) => (
                <div
                  key={agreement.id}
                  className="flex items-center justify-between text-sm border-b border-stone-800 pb-2"
                >
                  <div>
                    <span className="text-stone-200">
                      {agreement.scope_of_work
                        ? agreement.scope_of_work.substring(0, 80) +
                          (agreement.scope_of_work.length > 80 ? '...' : '')
                        : 'No scope defined'}
                    </span>
                    {agreement.effective_date && (
                      <span className="text-stone-500 ml-2">
                        from {new Date(agreement.effective_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={
                      agreement.status === 'active'
                        ? 'success'
                        : agreement.status === 'expired'
                          ? 'error'
                          : 'warning'
                    }
                  >
                    {agreement.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Assignment History
            <span className="ml-2 text-sm font-normal text-stone-500">(last 20)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {member.assignments.length === 0 ? (
            <p className="text-sm text-stone-500">No event assignments yet.</p>
          ) : (
            <div className="space-y-2">
              {member.assignments.map((assignment: any) => {
                const event = assignment.events
                return (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between text-sm border-b border-stone-800 pb-2"
                  >
                    <div>
                      {event ? (
                        <Link
                          href={`/events/${event.id}`}
                          className="text-amber-600 hover:text-amber-500"
                        >
                          {event.title || 'Untitled Event'}
                        </Link>
                      ) : (
                        <span className="text-stone-400">Unknown event</span>
                      )}
                      {event?.event_date && (
                        <span className="text-stone-500 ml-2">
                          {new Date(event.event_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {assignment.actual_hours != null && (
                        <span className="text-stone-400">
                          {Number(assignment.actual_hours).toFixed(1)}h
                        </span>
                      )}
                      {assignment.pay_amount_cents != null && (
                        <span className="text-stone-400">
                          ${(assignment.pay_amount_cents / 100).toFixed(2)}
                        </span>
                      )}
                      <Badge variant={STATUS_BADGE[assignment.status] ?? 'default'}>
                        {assignment.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
