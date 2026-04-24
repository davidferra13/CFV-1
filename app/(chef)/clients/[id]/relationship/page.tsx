import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { DirectOutreachPanel } from '@/components/marketing/direct-outreach-panel'
import { ScheduleMessageDialog } from '@/components/communication/schedule-message-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { requireChef } from '@/lib/auth/get-user'
import { getRelationshipRouteCopy } from '@/lib/clients/action-vocabulary'
import { getClientRelationshipSnapshot } from '@/lib/clients/relationship-snapshot'
import { getClientInteractionSignalShortLabel } from '@/lib/clients/interaction-signals'
import type { NextBestActionPrimarySignal } from '@/lib/clients/next-best-action'
import type { ClientRelationshipSignal } from '@/lib/clients/relationship-signals'
import { formatCurrency } from '@/lib/utils/currency'

function getPrimarySignalLabel(signal: NextBestActionPrimarySignal): string {
  switch (signal) {
    case 'booking_blocker_active':
      return 'Booking blocker active'
    case 'quote_revision_ready':
      return 'Quote revision ready'
    default:
      return getClientInteractionSignalShortLabel(signal)
  }
}

export default async function ClientRelationshipPage({ params }: { params: { id: string } }) {
  await requireChef()
  let snapshot: Awaited<ReturnType<typeof getClientRelationshipSnapshot>> | null = null
  try {
    snapshot = await getClientRelationshipSnapshot(params.id)
  } catch (err) {
    console.error('[relationship-page] snapshot load failed:', err)
  }
  if (!snapshot) notFound()

  const { client, nextAction, outreachHistory } = snapshot
  const heading = getRelationshipRouteCopy(nextAction?.actionType)
  const completedEvents = snapshot.completedEvents
  const daysSinceLastEvent =
    snapshot.repeat?.daysSinceLastEvent ?? snapshot.relationshipHealth?.churnRisk.daysSinceLastEvent
  const averageSpendCents = snapshot.repeat?.averageSpendCents ?? null
  const predictedNextBooking =
    snapshot.relationshipHealth?.rebookingPrediction.predictedNextBookingDays
  const churnLevel = snapshot.relationshipHealth?.churnRisk.level ?? null
  const lastFeedback = snapshot.repeat?.lastFeedback ?? null
  const lastVenueNotes = snapshot.repeat?.lastVenueNotes ?? null
  const milestones = snapshot.repeat?.upcomingMilestones ?? []
  const interventionLabel =
    nextAction && 'interventionLabel' in nextAction ? nextAction.interventionLabel : null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/clients/${params.id}`}
            className="text-sm text-stone-500 hover:text-stone-300"
          >
            Back to client
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-stone-100">{heading.title}</h1>
          <p className="mt-1 text-sm text-stone-400">{client.full_name}</p>
          <p className="mt-2 max-w-2xl text-sm text-stone-400">{heading.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ScheduleMessageDialog clientId={client.id} clientName={client.full_name} />
          <Link href={`/events/new?client_id=${client.id}`}>
            <Button>{completedEvents > 0 ? 'Rebook Client' : 'Create First Event'}</Button>
          </Link>
        </div>
      </div>

      <Card className="border-brand-800/50 bg-brand-950/30 p-6">
        <h2 className="text-lg font-semibold text-brand-200">
          {nextAction?.label ?? 'No active relationship move'}
        </h2>
        <p className="mt-2 text-sm text-brand-300">{nextAction?.description ?? heading.summary}</p>
        {nextAction ? (
          <div className="mt-3 space-y-3">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-400">
              Current portfolio signal: {nextAction.urgency} | {nextAction.tier.replace(/_/g, ' ')}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-brand-800/70 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-brand-200">
                Primary signal: {getPrimarySignalLabel(nextAction.primarySignal)}
              </span>
              {interventionLabel ? (
                <span className="rounded-full border border-brand-800/70 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-brand-200">
                  {interventionLabel}
                </span>
              ) : null}
            </div>
            <div className="space-y-2 border-t border-brand-900/60 pt-3">
              {nextAction.reasons.map((reason) => (
                <div
                  key={`${reason.sourceType}:${reason.sourceId}:${reason.code}`}
                  className="rounded-xl border border-brand-900/60 bg-brand-950/20 px-3 py-2"
                >
                  <p className="text-sm text-brand-100">{reason.message}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-brand-300">
                    Source: {reason.sourceType.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Completed events"
          value={completedEvents.toString()}
          detail={
            snapshot.repeat?.eventCount
              ? `${snapshot.repeat.eventCount} total relationship touchpoint${snapshot.repeat.eventCount === 1 ? '' : 's'}`
              : 'No completed history yet'
          }
        />
        <MetricCard
          label="Days since last event"
          value={daysSinceLastEvent !== null ? `${daysSinceLastEvent}` : '-'}
          detail={
            churnLevel
              ? `Current churn signal: ${churnLevel.replace(/_/g, ' ')}`
              : 'Need more event history for risk scoring'
          }
        />
        <MetricCard
          label="Avg completed event"
          value={averageSpendCents !== null ? formatCurrency(averageSpendCents) : '-'}
          detail={
            snapshot.repeat?.totalSpentCents
              ? `${formatCurrency(snapshot.repeat.totalSpentCents)} completed revenue`
              : 'No completed spend history yet'
          }
        />
        <MetricCard
          label="Next booking forecast"
          value={predictedNextBooking !== null ? `~${predictedNextBooking}d` : '-'}
          detail={
            snapshot.relationshipHealth?.rebookingPrediction.seasonalPattern ??
            'Forecast appears after repeat-booking patterns emerge'
          }
        />
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-100">Canonical Relationship Snapshot</h2>
          <p className="text-sm text-stone-400">
            Profile-entered facts stay authoritative. Learned signals only fill gaps and never
            overwrite the profile view.
          </p>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Canonical now
            </p>
            <SignalList
              signals={snapshot.signals.canonical}
              emptyLabel="No relationship signals are recorded yet."
            />
          </div>

          {snapshot.signals.secondaryLearned.length > 0 ? (
            <div className="border-t border-stone-800 pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Secondary learned signals
              </p>
              <p className="mt-1 text-sm text-stone-400">
                These patterns were learned from history, but a profile-owned fact already exists
                for the same concept.
              </p>
              <SignalList
                signals={snapshot.signals.secondaryLearned}
                emptyLabel="No secondary learned signals."
                compact
              />
            </div>
          ) : null}

          {(lastFeedback || lastVenueNotes) && (
            <div className="grid gap-4 border-t border-stone-800 pt-5 md:grid-cols-2">
              {lastFeedback ? (
                <div className="rounded-xl border border-stone-800 bg-stone-950/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Last feedback
                  </p>
                  <p className="mt-2 text-lg font-semibold text-stone-100">
                    {lastFeedback.overall ? `${lastFeedback.overall}/5` : 'Feedback submitted'}
                  </p>
                  {lastFeedback.whatTheyLoved ? (
                    <p className="mt-2 text-sm text-stone-300">
                      Loved: {lastFeedback.whatTheyLoved}
                    </p>
                  ) : null}
                  {lastFeedback.whatCouldImprove ? (
                    <p className="mt-1 text-sm text-stone-400">
                      Improve: {lastFeedback.whatCouldImprove}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {lastVenueNotes ? (
                <div className="rounded-xl border border-stone-800 bg-stone-950/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Last venue memory
                  </p>
                  {lastVenueNotes.location ? (
                    <p className="mt-2 text-sm font-medium text-stone-100">
                      {lastVenueNotes.location}
                    </p>
                  ) : null}
                  {lastVenueNotes.kitchen_notes ? (
                    <p className="mt-2 text-sm text-stone-300">
                      Kitchen: {lastVenueNotes.kitchen_notes}
                    </p>
                  ) : null}
                  {lastVenueNotes.site_notes ? (
                    <p className="mt-1 text-sm text-stone-400">Site: {lastVenueNotes.site_notes}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100">Recent Relationship History</h2>
        <p className="mt-2 text-sm text-stone-400">
          Timeline and note activity are merged here so follow-through starts from the latest truth.
        </p>
        <div className="mt-4 space-y-3">
          {snapshot.history.length === 0 ? (
            <p className="text-sm text-stone-500">No relationship history has been recorded yet.</p>
          ) : (
            snapshot.history.map((item) => (
              <div key={item.id} className="rounded-xl border border-stone-800 bg-stone-950/40 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-stone-100">{item.title}</p>
                    {item.description ? (
                      <p className="text-sm text-stone-400">{item.description}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="rounded-full border border-stone-700 px-2 py-0.5 uppercase tracking-[0.12em]">
                      {item.source}
                    </span>
                    <span>{formatDateLabel(item.timestamp)}</span>
                  </div>
                </div>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="mt-3 inline-flex text-sm font-medium text-brand-400 hover:text-brand-300"
                  >
                    Open linked record
                  </Link>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100">Direct Outreach</h2>
        <p className="mt-2 text-sm text-stone-400">
          Send the actual message from here, or schedule it if you want the touchpoint to land at a
          better time.
        </p>
        <div className="mt-4">
          <DirectOutreachPanel
            clientId={client.id}
            clientEmail={client.email ?? null}
            clientPhone={(client as any).phone ?? null}
            preferredContactMethod={(client as any).preferred_contact_method ?? null}
            history={outreachHistory as any}
          />
        </div>
      </Card>

      {(client.birthday || client.anniversary) && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-stone-100">Key Dates</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
              <p className="text-sm text-stone-500">Birthday</p>
              <p className="mt-1 font-medium text-stone-100">{client.birthday || 'Not recorded'}</p>
            </div>
            <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
              <p className="text-sm text-stone-500">Anniversary</p>
              <p className="mt-1 font-medium text-stone-100">
                {client.anniversary || 'Not recorded'}
              </p>
            </div>
          </div>
          {milestones.length > 0 ? (
            <div className="mt-4 border-t border-stone-800 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Upcoming milestones
              </p>
              <div className="mt-3 space-y-2">
                {milestones.map((milestone, index) => (
                  <div
                    key={`${milestone.type}-${milestone.date}-${index}`}
                    className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3"
                  >
                    <p className="text-sm font-medium text-amber-200">
                      {milestone.type} · {milestone.date}
                    </p>
                    {milestone.description ? (
                      <p className="mt-1 text-sm text-stone-400">{milestone.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-100">{value}</p>
      <p className="mt-2 text-sm text-stone-400">{detail}</p>
    </Card>
  )
}

function SignalList({
  signals,
  emptyLabel,
  compact = false,
}: {
  signals: ClientRelationshipSignal[]
  emptyLabel: string
  compact?: boolean
}) {
  if (signals.length === 0) {
    return <p className="mt-3 text-sm text-stone-500">{emptyLabel}</p>
  }

  return (
    <div
      className={`mt-3 grid gap-3 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}
    >
      {signals.map((signal) => (
        <div key={signal.id} className="rounded-xl border border-stone-800 bg-stone-950/50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {signal.label}
              </p>
              <p className="mt-1 text-sm font-medium text-stone-100">{signal.value}</p>
            </div>
            <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-stone-400">
              {signal.sourceLabel}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
            {signal.confidence !== null ? <span>Confidence {signal.confidence}</span> : null}
            {signal.occurrences !== null ? <span>{signal.occurrences} seen</span> : null}
            {signal.freshness ? <span>As of {formatDateLabel(signal.freshness)}</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return 'Unknown'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return format(parsed, 'MMM d, yyyy')
}
