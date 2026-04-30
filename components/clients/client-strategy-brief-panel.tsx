import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  ClientStrategyBrief,
  ClientStrategyConfidence,
  ClientStrategyPriority,
  ClientStrategyRecommendation,
} from '@/lib/clients/client-strategy-brief'

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

function RecommendationCard({ recommendation }: { recommendation: ClientStrategyRecommendation }) {
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

export function ClientStrategyBriefPanel({ brief }: { brief: ClientStrategyBrief }) {
  const populatedSections = brief.sections.filter((section) => section.recommendations.length > 0)

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

        {populatedSections.map((section) => (
          <section key={section.id} className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-stone-100">{section.title}</h3>
              <p className="mt-1 text-sm text-stone-400">{section.description}</p>
            </div>
            <div className="space-y-3">
              {section.recommendations.map((recommendation) => (
                <RecommendationCard key={recommendation.id} recommendation={recommendation} />
              ))}
            </div>
          </section>
        ))}

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
      </CardContent>
    </Card>
  )
}
