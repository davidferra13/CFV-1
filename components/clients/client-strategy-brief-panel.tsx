import Link from 'next/link'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientStrategyActionControls } from '@/components/clients/client-strategy-action-controls'
import type {
  ClientStrategyBrief,
  ClientStrategyConfidence,
  ClientStrategyPriority,
  ClientStrategyRecommendation,
} from '@/lib/clients/client-strategy-brief'
import type {
  ClientStrategyActionStatusRecord,
  ClientStrategyOperationalState,
} from '@/lib/clients/client-strategy-ops'

function priorityVariant(
  priority: ClientStrategyPriority
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (priority === 'critical' || priority === 'high') return 'error'
  if (priority === 'medium') return 'warning'
  return 'default'
}

function confidenceVariant(
  confidence: ClientStrategyConfidence
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (confidence === 'high') return 'success'
  if (confidence === 'medium') return 'warning'
  return 'error'
}

function RecommendationCard({
  brief,
  recommendation,
  status,
}: {
  brief: ClientStrategyBrief
  recommendation: ClientStrategyRecommendation
  status?: ClientStrategyActionStatusRecord
}) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/35 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-stone-100">{recommendation.title}</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={priorityVariant(recommendation.priority)}>
              {recommendation.priority} priority
            </Badge>
            <Badge variant={confidenceVariant(recommendation.confidence)}>
              {recommendation.confidence} confidence
            </Badge>
          </div>
        </div>
        {recommendation.href ? (
          <Link
            href={recommendation.href}
            className="text-sm font-medium text-brand-300 hover:text-brand-100"
          >
            Open
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Data used
          </p>
          <ul className="mt-2 space-y-1 text-sm text-stone-300">
            {recommendation.dataUsed.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Why it matters
          </p>
          <p className="mt-2 text-sm text-stone-300">{recommendation.whyItMatters}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Next step
          </p>
          <p className="mt-2 text-sm text-stone-300">{recommendation.nextStep}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {recommendation.sourceLabels.map((label) => (
          <span
            key={label}
            className="rounded-full border border-stone-800 px-2.5 py-1 text-xs text-stone-400"
          >
            {label}
          </span>
        ))}
      </div>

      <details className="mt-4 rounded-lg border border-stone-800 bg-stone-950/50 p-3">
        <summary className="cursor-pointer text-sm font-medium text-stone-200">
          Evidence and boundaries
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Evidence
            </p>
            <ul className="mt-2 space-y-1 text-sm text-stone-300">
              {recommendation.dataUsed.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Guardrails
            </p>
            <ul className="mt-2 space-y-1 text-sm text-stone-300">
              <li>Confidence: {recommendation.confidence}</li>
              <li>Do not send anything without chef approval.</li>
              <li>Do not generate recipes or menu ideas from this recommendation.</li>
            </ul>
          </div>
        </div>
      </details>

      <ClientStrategyActionControls
        clientId={brief.clientId}
        clientName={brief.clientName}
        recommendation={recommendation}
        initialStatus={status}
      />
    </div>
  )
}

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/25 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-100">{value}</p>
      <p className="mt-1 text-xs text-stone-400">{detail}</p>
    </div>
  )
}

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/25 p-4">
      <h3 className="text-sm font-semibold text-stone-100">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  )
}

export function ClientStrategyBriefPanel({
  brief,
  operationalState,
}: {
  brief: ClientStrategyBrief
  operationalState?: ClientStrategyOperationalState
}) {
  const populatedSections = brief.sections.filter((section) => section.recommendations.length > 0)
  const recommendations = brief.sections.flatMap((section) => section.recommendations)
  const statuses = new Map(
    (operationalState?.statuses ?? []).map((status) => [status.recommendationId, status])
  )
  const newRecommendationIds = recommendations
    .filter((recommendation) => !statuses.has(recommendation.id))
    .map((recommendation) => recommendation.id)
  const recommendationTitles = new Map(
    recommendations.map((recommendation) => [recommendation.id, recommendation.title])
  )
  const diff = operationalState?.diff

  return (
    <Card className="overflow-hidden border-brand-900/60">
      <CardHeader className="bg-stone-950/30">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Client Strategy Brief</CardTitle>
            <CardDescription className="mt-1">
              Evidence-backed actions from profile facts, relationship history, signals, and known
              feedback.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={confidenceVariant(brief.summary.confidence)}>
              {brief.summary.confidence} data confidence
            </Badge>
            <Badge variant={brief.readiness.score >= 65 ? 'success' : 'warning'}>
              {brief.readiness.score}/100 readiness
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Immediate"
            value={String(brief.summary.immediateActionCount)}
            detail="Actions ready now"
          />
          <StatTile
            label="Revenue"
            value={String(brief.summary.revenueOpportunityCount)}
            detail="Ethical fit opportunities"
          />
          <StatTile
            label="Risk"
            value={String(brief.summary.riskFlagCount)}
            detail="Items to resolve"
          />
          <StatTile
            label="Known preferences"
            value={String(brief.summary.knownPreferenceCount)}
            detail={`${brief.summary.missingDataCount} missing fields`}
          />
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-950/25 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-100">{brief.readiness.label}</p>
              <p className="mt-1 text-sm text-stone-400">{brief.callPrep.openingContext}</p>
            </div>
            {brief.readiness.blockers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {brief.readiness.blockers.map((blocker) => (
                  <Badge key={blocker} variant="warning">
                    {blocker}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBlock title="Strategy Brief Diff">
            <div className="grid grid-cols-2 gap-2 text-center md:grid-cols-3">
              <StatTile
                label="New"
                value={String(newRecommendationIds.length)}
                detail="Not yet acted on"
              />
              <StatTile
                label="Active"
                value={String(diff?.activeRecommendationIds.length ?? 0)}
                detail="Reminder or draft exists"
              />
              <StatTile
                label="Reply"
                value={String(diff?.replyReviewRecommendationIds.length ?? 0)}
                detail="Needs review"
              />
              <StatTile
                label="Done"
                value={String(diff?.completedRecommendationIds.length ?? 0)}
                detail="Outcome recorded"
              />
              <StatTile
                label="Dismissed"
                value={String(diff?.dismissedRecommendationIds.length ?? 0)}
                detail="Chef dismissed"
              />
              <StatTile
                label="Wrong"
                value={String(diff?.wrongRecommendationIds.length ?? 0)}
                detail="Marked wrong"
              />
            </div>
            <ul className="mt-3 space-y-1 text-sm text-stone-300">
              {newRecommendationIds.slice(0, 4).map((id) => (
                <li key={id}>{recommendationTitles.get(id) ?? id}</li>
              ))}
              {newRecommendationIds.length === 0 ? (
                <li className="text-stone-500">No new recommendations without an action trail.</li>
              ) : null}
            </ul>
          </SectionBlock>

          <SectionBlock title="Strategy Workbench Timeline">
            {operationalState?.timeline.length ? (
              <ol className="space-y-2 text-sm text-stone-300">
                {operationalState.timeline.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <span className="font-medium text-stone-100">{item.label}</span>
                    <span className="block text-xs text-stone-500">
                      {item.kind.replace(/_/g, ' ')} |{' '}
                      {recommendationTitles.get(item.recommendationId) ?? item.recommendationId}
                      {item.occurredAt ? ` | ${item.occurredAt}` : ''}
                    </span>
                    <span className="block text-xs text-stone-400">{item.detail}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-stone-400">
                No strategy reminders, messages, replies, or outcomes have been recorded yet.
              </p>
            )}
          </SectionBlock>
        </div>

        {populatedSections.map((section) => (
          <section key={section.id} className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-stone-100">{section.title}</h3>
              <p className="mt-1 text-sm text-stone-400">{section.description}</p>
            </div>
            <div className="space-y-3">
              {section.recommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  brief={brief}
                  recommendation={recommendation}
                  status={statuses.get(recommendation.id)}
                />
              ))}
            </div>
          </section>
        ))}

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBlock title="Client Confirmation Request">
            {brief.confirmationRequest ? (
              <div className="space-y-3">
                <p className="text-sm text-stone-300">
                  Missing fields: {brief.confirmationRequest.missingFields.join(', ')}
                </p>
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-md border border-stone-800 bg-stone-950 p-3 text-xs text-stone-300">
                  {brief.confirmationRequest.body}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-stone-400">
                No missing profile fields require a confirmation request right now.
              </p>
            )}
          </SectionBlock>

          <SectionBlock title="Brief Change Markers">
            {brief.changeHistory.length > 0 ? (
              <ul className="space-y-2 text-sm text-stone-300">
                {brief.changeHistory.map((change) => (
                  <li key={change.id}>
                    <span className="font-medium text-stone-100">{change.label}</span>:{' '}
                    {change.detail}
                    <span className="block text-xs text-stone-500">
                      {change.source}
                      {change.occurredAt ? ` | ${change.occurredAt}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-400">
                No recent profile, outreach, feedback, or timeline changes were available.
              </p>
            )}
          </SectionBlock>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBlock title="Preference Conflict Review">
            {brief.preferenceConflicts.length > 0 ? (
              <ul className="space-y-2 text-sm text-stone-300">
                {brief.preferenceConflicts.map((conflict) => (
                  <li key={conflict.id}>
                    <span className="font-medium text-stone-100">{conflict.field}</span>: profile
                    says {conflict.profileValue}, learned pattern says {conflict.learnedValue}.
                    <span className="block text-xs text-stone-500">{conflict.resolution}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-400">
                No profile-versus-learned preference conflicts were detected.
              </p>
            )}
          </SectionBlock>

          <SectionBlock title="Event Prep Handoff">
            <ul className="space-y-2 text-sm text-stone-300">
              {brief.eventPrepHandoff.map((item) => (
                <li key={item.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
                    <span className="font-medium text-stone-100">{item.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{item.detail}</p>
                </li>
              ))}
            </ul>
          </SectionBlock>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-stone-800 bg-stone-950/25 p-4">
            <h3 className="text-sm font-semibold text-stone-100">Call Prep</h3>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Agenda
            </p>
            <ul className="mt-2 space-y-1 text-sm text-stone-300">
              {brief.callPrep.agenda.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Questions
            </p>
            <ul className="mt-2 space-y-1 text-sm text-stone-300">
              {brief.callPrep.questions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-stone-800 bg-stone-950/25 p-4">
            <h3 className="text-sm font-semibold text-stone-100">Data Quality</h3>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-stone-900/80 p-2">
                <p className="text-lg font-semibold text-stone-100">
                  {brief.dataQuality.canonicalFacts}
                </p>
                <p className="text-xs text-stone-500">Profile</p>
              </div>
              <div className="rounded-md bg-stone-900/80 p-2">
                <p className="text-lg font-semibold text-stone-100">
                  {brief.dataQuality.learnedFacts}
                </p>
                <p className="text-xs text-stone-500">Learned</p>
              </div>
              <div className="rounded-md bg-stone-900/80 p-2">
                <p className="text-lg font-semibold text-stone-100">
                  {brief.dataQuality.operationalSignals}
                </p>
                <p className="text-xs text-stone-500">Ops</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-stone-300">
              {[...brief.dataQuality.notes, ...brief.dataQuality.staleSignals].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-stone-800 bg-stone-950/25 p-4">
            <h3 className="text-sm font-semibold text-stone-100">Repeatable Workflow</h3>
            <ol className="mt-3 space-y-2 text-sm text-stone-300">
              {brief.outcomeLoop.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Do not assume
            </p>
            <ul className="mt-2 space-y-1 text-sm text-stone-300">
              {brief.callPrep.doNotAssume.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <SectionBlock title="Post-Event Learning Loop">
          <ul className="grid gap-2 text-sm text-stone-300 md:grid-cols-2">
            {brief.postEventLearning.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionBlock>
      </CardContent>
    </Card>
  )
}
