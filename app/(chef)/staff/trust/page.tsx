import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ClipboardCheck, ShieldCheck, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { getStaffTrustDelegationReadModel } from '@/lib/intelligence/staff-trust-delegation'
import type { DelegationAccessState } from '@/lib/intelligence/staff-trust-delegation-contract'

export const metadata: Metadata = { title: 'Staff Trust & Delegation' }

const STATE_BADGE: Record<
  DelegationAccessState,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  trusted: 'success',
  needs_training: 'warning',
  at_risk: 'error',
  blocked: 'error',
  unknown: 'info',
}

const STATE_LABEL: Record<DelegationAccessState, string> = {
  trusted: 'Trusted',
  needs_training: 'Needs training',
  at_risk: 'At risk',
  blocked: 'Blocked',
  unknown: 'Unknown',
}

function formatDate(value: string | null) {
  if (!value) return 'TBD'
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return value
  }
}

export default async function StaffTrustDelegationPage() {
  const model = await getStaffTrustDelegationReadModel()

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
            Back to staff
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-stone-100 sm:text-3xl">
            Staff Trust & Delegation
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-400">
            Role-aware collaborator memory, assignment scope, training readiness, and event staffing
            risk for chef-only decisions.
          </p>
        </div>
        <Button href="/staff" variant="secondary" size="sm" className="shrink-0">
          <Users className="h-4 w-4" />
          Staff roster
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs uppercase text-stone-500">Collaborators</p>
          <p className="mt-1 text-2xl font-semibold text-stone-100">
            {model.summary.totalCollaborators}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-stone-500">Trusted</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-300">
            {model.summary.trustedCount}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-stone-500">Training</p>
          <p className="mt-1 text-2xl font-semibold text-amber-300">
            {model.summary.needsTrainingCount}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-stone-500">At risk</p>
          <p className="mt-1 text-2xl font-semibold text-rose-300">
            {model.summary.atRiskCount + model.summary.blockedCount}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-stone-500">Event gaps</p>
          <p className="mt-1 text-2xl font-semibold text-sky-300">
            {model.summary.upcomingEventsWithGaps}
          </p>
        </Card>
      </section>

      {model.collaborators.length === 0 ? (
        <EmptyState
          remy="idle"
          title="No staff collaborators yet"
          description="Add team members to build assignment scope, training readiness, and trust memory."
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Collaborator Trust Ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {model.collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="rounded-lg border border-stone-800 bg-stone-950/40 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-stone-100">
                          {collaborator.name}
                        </h2>
                        <Badge variant={STATE_BADGE[collaborator.accessState]}>
                          {STATE_LABEL[collaborator.accessState]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-stone-400">
                        {collaborator.roleLabel} | {collaborator.reliabilityLabel}
                      </p>
                    </div>
                    <Link
                      href={`/staff/${collaborator.id}`}
                      className="text-sm font-medium text-amber-300 hover:text-amber-200"
                    >
                      Profile
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase text-stone-500">Assignments</p>
                      <p className="mt-1 font-medium text-stone-200">
                        {collaborator.upcomingAssignmentCount} upcoming /{' '}
                        {collaborator.assignmentCount} total
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-stone-500">Training</p>
                      <p className="mt-1 font-medium text-stone-200">
                        {collaborator.trainingComplete}/{collaborator.trainingTotal || 0} complete
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-stone-500">Open tasks</p>
                      <p className="mt-1 font-medium text-stone-200">
                        {collaborator.activeTaskCount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {collaborator.trustSignals.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-md border border-stone-800 px-2 py-1 text-xs text-stone-300"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 rounded-md bg-stone-900/70 p-3 text-sm text-stone-300">
                    {collaborator.nextAction}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-4 w-4 text-sky-300" />
                  Event Staffing Planner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {model.eventPlanner.length === 0 ? (
                  <p className="text-sm text-stone-500">No upcoming events need staffing review.</p>
                ) : (
                  model.eventPlanner.map((event) => (
                    <div
                      key={event.eventId}
                      className="rounded-lg border border-stone-800 bg-stone-950/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-sm font-semibold text-stone-100">
                            {event.eventName}
                          </h2>
                          <p className="mt-1 text-xs text-stone-500">
                            {formatDate(event.eventDate)} | {event.guestCount || 'TBD'} guests
                          </p>
                        </div>
                        {event.staffingGap > 0 || event.assignmentRiskCount > 0 ? (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-stone-500">Assigned</p>
                          <p className="mt-1 font-semibold text-stone-200">
                            {event.assignedCount}/{event.recommendedMinimumStaff}
                          </p>
                        </div>
                        <div>
                          <p className="text-stone-500">Risk</p>
                          <p className="mt-1 font-semibold text-stone-200">
                            {event.assignmentRiskCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-stone-500">Training</p>
                          <p className="mt-1 font-semibold text-stone-200">
                            {event.needsTrainingCount}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={event.nextActionHref}
                        className="mt-3 inline-flex text-sm font-medium text-amber-300 hover:text-amber-200"
                      >
                        {event.nextAction}
                      </Link>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Privacy Boundary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="font-medium text-stone-200">Chef-only facts</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {model.privacyBoundary.chefOnlyFacts.map((fact) => (
                      <Badge key={fact} variant="error">
                        {fact}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-stone-200">Staff-safe briefing facts</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {model.privacyBoundary.safeBriefingFacts.map((fact) => (
                      <Badge key={fact} variant="info">
                        {fact}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  )
}
