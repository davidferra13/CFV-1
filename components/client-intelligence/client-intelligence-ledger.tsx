import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  ClientIntelligenceAction,
  ClientIntelligenceFact,
  ClientIntelligencePrediction,
  ClientIntelligenceProjection,
} from '@/lib/client-intelligence/projection'

type Props = {
  projections: ClientIntelligenceProjection[]
  sourceWarnings: string[]
}

export function ClientIntelligenceLedger({ projections, sourceWarnings }: Props) {
  const predictionCount = projections.reduce(
    (sum, projection) => sum + projection.predictions.length,
    0
  )
  const actionCount = projections.reduce((sum, projection) => sum + projection.actions.length, 0)
  const contradictionCount = projections.reduce(
    (sum, projection) => sum + projection.contradictions.length,
    0
  )
  const reviewCount = projections.reduce(
    (sum, projection) =>
      sum + projection.predictions.filter((prediction) => prediction.reviewRequired).length,
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/clients" className="text-sm text-stone-500 hover:text-stone-300">
            Back to clients
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-stone-100">Client Intelligence Ledger</h1>
          <p className="mt-1 max-w-3xl text-sm text-stone-400">
            Tenant-scoped facts, evidence labels, reviewable predictions, and suggested actions
            projected from existing client data.
          </p>
        </div>
        <Badge variant={reviewCount > 0 ? 'warning' : 'success'}>
          {reviewCount > 0 ? `${reviewCount} need review` : 'No prediction review required'}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Clients projected" value={projections.length} />
        <Metric label="Predictions" value={predictionCount} />
        <Metric label="Action suggestions" value={actionCount} />
        <Metric
          label="Contradictions"
          value={contradictionCount}
          tone={contradictionCount > 0 ? 'risk' : 'normal'}
        />
      </div>

      {sourceWarnings.length > 0 ? (
        <Card className="border-amber-600/40">
          <CardContent className="space-y-2">
            <p className="text-sm font-medium text-amber-300">
              Some intelligence sources were unavailable.
            </p>
            <ul className="space-y-1 text-sm text-stone-300">
              {sourceWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {projections.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-stone-300">
              No client records are available for this chef tenant yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projections.map((projection) => (
            <ClientLedgerCard key={projection.client.id} projection={projection} />
          ))}
        </div>
      )}
    </div>
  )
}

function ClientLedgerCard({ projection }: { projection: ClientIntelligenceProjection }) {
  const firstPrediction = projection.predictions[0]
  const warningFacts = projection.facts
    .filter((fact) => fact.actionability === 'warning')
    .slice(0, 3)

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle as="h2" className="text-xl">
            {projection.client.name}
          </CardTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            {projection.client.status ? <Badge>{projection.client.status}</Badge> : null}
            {projection.client.lastEventDate ? (
              <Badge variant="info">Last event {projection.client.lastEventDate}</Badge>
            ) : (
              <Badge variant="warning">No event history</Badge>
            )}
            <Badge variant={projection.contradictions.length > 0 ? 'error' : 'success'}>
              {projection.contradictions.length} conflicts
            </Badge>
          </div>
        </div>
        <Link
          href={`/clients/${projection.client.id}`}
          className="text-sm font-medium text-brand-400 hover:text-brand-300"
        >
          Open profile
        </Link>
      </CardHeader>
      <CardContent className="space-y-5">
        {warningFacts.length > 0 ? (
          <section>
            <h3 className="text-sm font-semibold text-stone-200">High-priority warnings</h3>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {warningFacts.map((fact) => (
                <FactPill key={fact.id} fact={fact} />
              ))}
            </div>
          </section>
        ) : null}

        {firstPrediction ? (
          <PredictionBlock prediction={firstPrediction} />
        ) : (
          <p className="rounded-lg border border-stone-700 p-3 text-sm text-stone-400">
            No prediction generated for this client yet.
          </p>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          <details className="rounded-lg border border-stone-700 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-stone-200">
              Evidence ledger ({projection.facts.length})
            </summary>
            <div className="mt-3 space-y-2">
              {projection.topFacts.map((fact) => (
                <FactRow key={fact.id} fact={fact} />
              ))}
            </div>
          </details>
          <details className="rounded-lg border border-stone-700 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-stone-200">
              Action inbox ({projection.actions.length})
            </summary>
            <div className="mt-3 space-y-2">
              {projection.actions.length > 0 ? (
                projection.actions
                  .slice(0, 6)
                  .map((action) => <ActionRow key={action.id} action={action} />)
              ) : (
                <p className="text-sm text-stone-400">
                  No suggested actions from current evidence.
                </p>
              )}
            </div>
          </details>
        </div>

        {projection.emptyStates.length > 0 ? (
          <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Missing evidence</p>
            <ul className="mt-2 space-y-1 text-sm text-stone-400">
              {projection.emptyStates.map((state) => (
                <li key={state}>{state}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Metric({
  label,
  value,
  tone = 'normal',
}: {
  label: string
  value: number
  tone?: 'normal' | 'risk'
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs font-medium uppercase text-stone-500">{label}</p>
        <p
          className={
            tone === 'risk'
              ? 'mt-1 text-2xl font-bold text-red-400'
              : 'mt-1 text-2xl font-bold text-stone-100'
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function PredictionBlock({ prediction }: { prediction: ClientIntelligencePrediction }) {
  return (
    <section className="rounded-lg border border-stone-700 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-200">{prediction.title}</h3>
          <p className="mt-1 text-sm text-stone-400">{prediction.suggestedAction}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={
              prediction.status === 'suggestion'
                ? 'success'
                : prediction.status === 'blocked_by_contradiction'
                  ? 'error'
                  : 'warning'
            }
          >
            {prediction.status.replaceAll('_', ' ')}
          </Badge>
          <Badge
            variant={
              prediction.confidenceLabel === 'high'
                ? 'success'
                : prediction.confidenceLabel === 'medium'
                  ? 'info'
                  : 'warning'
            }
          >
            {prediction.confidenceLabel} confidence
          </Badge>
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-stone-300">
        {prediction.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  )
}

function FactPill({ fact }: { fact: ClientIntelligenceFact }) {
  return (
    <div className="rounded-lg border border-stone-700 p-3">
      <p className="text-xs text-stone-500">{fact.label}</p>
      <p className="mt-1 text-sm font-medium text-stone-100">{fact.value}</p>
      <p className="mt-1 text-xs text-stone-500">{fact.sourceLabel}</p>
    </div>
  )
}

function FactRow({ fact }: { fact: ClientIntelligenceFact }) {
  return (
    <div className="rounded-md bg-stone-900/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-stone-200">{fact.label}</p>
        <Badge
          variant={
            fact.lifecycle === 'confirmed'
              ? 'success'
              : fact.lifecycle === 'contradicted'
                ? 'error'
                : 'warning'
          }
        >
          {fact.lifecycle.replaceAll('_', ' ')}
        </Badge>
        <Badge variant="info">{fact.confidenceLabel}</Badge>
      </div>
      <p className="mt-1 text-sm text-stone-300">{fact.value}</p>
      <p className="mt-1 text-xs text-stone-500">
        {fact.sourceLabel} · {fact.disclosure.replaceAll('_', ' ')}
      </p>
    </div>
  )
}

function ActionRow({ action }: { action: ClientIntelligenceAction }) {
  return (
    <div className="rounded-md bg-stone-900/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-stone-200">{action.title}</p>
        <Badge
          variant={
            action.status === 'blocked'
              ? 'error'
              : action.status === 'needs_review'
                ? 'warning'
                : 'info'
          }
        >
          {action.status.replaceAll('_', ' ')}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-stone-500">
        {action.priority} priority{action.dueDate ? ` · due ${action.dueDate.slice(0, 10)}` : ''}
      </p>
    </div>
  )
}
