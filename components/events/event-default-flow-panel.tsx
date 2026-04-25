import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { EventDefaultFlowSnapshot } from '@/lib/events/default-event-flow'

type Props = {
  eventId: string
  snapshot: EventDefaultFlowSnapshot | null
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ready' || status === 'active') return 'success'
  if (status === 'not_ready') return 'error'
  return 'warning'
}

function moneyRange(low: number | null, high: number | null) {
  if (low == null || high == null) return 'Pending'
  return `${formatCurrency(low)}-${formatCurrency(high)}`
}

function Signal({
  label,
  value,
  sub,
  status,
}: {
  label: string
  value: string
  sub?: string
  status: string
}) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/40 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wide text-stone-500">{label}</p>
        <Badge variant={statusVariant(status)}>{status.replace('_', ' ')}</Badge>
      </div>
      <p className="mt-1 text-sm font-semibold text-stone-100">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-stone-500">{sub}</p> : null}
    </div>
  )
}

export function EventDefaultFlowPanel({ eventId, snapshot }: Props) {
  if (!snapshot) return null

  const topIssues = snapshot.publishReadiness.issues.slice(0, 4)

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-stone-100">Event defaults layer</h2>
            <Badge variant={snapshot.publishReadiness.status === 'ready' ? 'success' : 'error'}>
              {snapshot.publishReadiness.label}
            </Badge>
            <Badge variant="info">Score {snapshot.publishReadiness.score}</Badge>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Quiet checks for publishing, pricing, capacity, check-in, reminders, feedback, and
            repeat flow.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href={`/events/${eventId}?tab=tickets`} className="text-brand-400 hover:underline">
            Check-in
          </Link>
          <Link href={`/events/${eventId}?tab=money`} className="text-brand-400 hover:underline">
            Pricing
          </Link>
          <Link href={`/events/${eventId}?tab=ops`} className="text-brand-400 hover:underline">
            Live ops
          </Link>
        </div>
      </div>

      {topIssues.length > 0 ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {topIssues.map((issue) => (
            <Link
              key={issue.id}
              href={issue.actionHref}
              className={`rounded-lg border px-3 py-2 transition hover:bg-stone-900 ${
                issue.severity === 'blocker'
                  ? 'border-red-800/70 bg-red-950/20'
                  : 'border-amber-800/70 bg-amber-950/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-stone-100">{issue.label}</p>
                <Badge variant={issue.severity === 'blocker' ? 'error' : 'warning'}>
                  {issue.severity}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-stone-400">{issue.reason}</p>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Signal
          label="Pricing"
          value={moneyRange(snapshot.pricingGuidance.lowCents, snapshot.pricingGuidance.highCents)}
          sub={`${snapshot.pricingGuidance.label}; ${snapshot.pricingGuidance.basis}`}
          status={snapshot.pricingGuidance.risk === 'low' ? 'ready' : 'watch'}
        />
        <Signal
          label="Capacity"
          value={snapshot.capacity.label}
          sub={
            snapshot.capacity.currentGuestCount != null
              ? `${snapshot.capacity.currentGuestCount} planned guests`
              : undefined
          }
          status={snapshot.capacity.status}
        />
        <Signal
          label="Arrival"
          value={`${snapshot.arrival.arrived}/${snapshot.arrival.expected} arrived`}
          sub={`${snapshot.arrival.missing} not checked in`}
          status={snapshot.arrival.status}
        />
        <Signal
          label="Timing"
          value={snapshot.timeBuffer.label}
          status={snapshot.timeBuffer.status}
        />
        <Signal
          label="Communication"
          value={snapshot.communication.label}
          status={snapshot.communication.status}
        />
        <Signal
          label="Waitlist"
          value={snapshot.waitlist.label}
          status={snapshot.waitlist.soldOut ? 'watch' : 'ready'}
        />
        <Signal
          label="Feedback"
          value={snapshot.feedback.label}
          status={snapshot.feedback.status}
        />
        <Signal
          label="Trust"
          value={snapshot.trust.label}
          sub={
            snapshot.trust.attendanceConsistencyPercent != null
              ? `${snapshot.trust.attendanceConsistencyPercent}% attendance consistency`
              : undefined
          }
          status="ready"
        />
      </div>

      <div className="mt-4 grid gap-3 text-xs text-stone-500 md:grid-cols-4">
        <p>
          Tickets: {snapshot.analytics.ticketsSold} sold,{' '}
          {formatCurrency(snapshot.analytics.revenueCents)} revenue.
        </p>
        <p>Source: {snapshot.analytics.sourceLabel}.</p>
        <p>Repeat guests: {snapshot.repeatGuests.count}.</p>
        <p>{snapshot.cancellation.policyLabel}.</p>
      </div>
    </Card>
  )
}
