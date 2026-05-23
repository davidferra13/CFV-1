import type { Metadata } from 'next'
import Link from 'next/link'
import { getSustainabilityWasteEthicsLedger } from '@/lib/sustainability/waste-ethics-ledger-actions'

export const metadata: Metadata = {
  title: 'Sustainability Ledger',
  description: 'Waste, leftovers, sourcing claims, and sustainability recommendations',
}

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ')
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail: string
}) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-4">
      <p className="text-xs font-medium uppercase tracking-normal text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-100">{value}</p>
      <p className="mt-1 text-sm text-stone-500">{detail}</p>
    </div>
  )
}

function Section({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-stone-100">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default async function SustainabilityLedgerPage() {
  const readModel = await getSustainabilityWasteEthicsLedger()
  const { ledger, publicClaims, metrics, decisionPrompts } = readModel
  const hasSourceData =
    metrics.wasteEventCount > 0 ||
    metrics.leftoverPlanCount > 0 ||
    metrics.sourcingClaimCount > 0 ||
    metrics.clientPreferenceCount > 0

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-4">
        <Link href="/culinary" className="text-sm text-stone-500 hover:text-stone-300">
          Back to Culinary
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-stone-100">Sustainability Ledger</h1>
            <p className="mt-1 max-w-3xl text-sm text-stone-500">
              Chef-only synthesis of event waste, leftover plans, client values, sourcing evidence,
              public claim review, and safe next actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/events"
              className="rounded-md border border-stone-700 px-3 py-2 text-sm text-stone-200 hover:border-stone-500"
            >
              Event closeout
            </Link>
            <Link
              href="/inventory/waste"
              className="rounded-md border border-stone-700 px-3 py-2 text-sm text-stone-200 hover:border-stone-500"
            >
              Log waste
            </Link>
            <Link
              href="/culinary/sourcing"
              className="rounded-md bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Add sourcing proof
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Waste tracked"
          value={metrics.wasteEventCount}
          detail={`${formatCurrency(metrics.estimatedWasteCostCents)} estimated private cost`}
        />
        <MetricCard
          label="Leftover plans"
          value={metrics.leftoverPlanCount}
          detail={`${metrics.unsafeLeftoverPlanCount} need safety proof`}
        />
        <MetricCard
          label="Client values"
          value={metrics.clientPreferenceCount}
          detail="Preferences inform planning, never safety overrides"
        />
        <MetricCard
          label="Public claims"
          value={metrics.publicClaimCount}
          detail={`${metrics.redactedClaimCount} held for evidence or approval`}
        />
      </div>

      {!hasSourceData && (
        <div className="rounded-lg border border-dashed border-stone-700 bg-stone-900/30 p-6">
          <h2 className="text-lg font-semibold text-stone-100">No ledger signals yet</h2>
          <p className="mt-2 max-w-2xl text-sm text-stone-500">
            Capture waste, leftovers, client sustainability preferences, or sourcing records from
            existing event and culinary workflows. This surface will stay private until evidence and
            approval make a claim safe to publish.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/events"
              className="rounded-md border border-stone-700 px-3 py-2 text-sm text-stone-200 hover:border-stone-500"
            >
              Open events
            </Link>
            <Link
              href="/clients"
              className="rounded-md border border-stone-700 px-3 py-2 text-sm text-stone-200 hover:border-stone-500"
            >
              Review clients
            </Link>
          </div>
        </div>
      )}

      <Section title="Decision Prompts">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {decisionPrompts.map((prompt) => (
            <Link
              key={prompt.id}
              href={prompt.href}
              className="rounded-lg border border-stone-800 bg-stone-900/40 p-4 transition-colors hover:border-stone-600"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-stone-100">{prompt.title}</h3>
                <span
                  className={
                    prompt.severity === 'blocked'
                      ? 'rounded-full bg-red-950/60 px-2 py-1 text-xs text-red-300'
                      : prompt.severity === 'warning'
                        ? 'rounded-full bg-amber-950/60 px-2 py-1 text-xs text-amber-300'
                        : 'rounded-full bg-stone-800 px-2 py-1 text-xs text-stone-300'
                  }
                >
                  {prompt.severity}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-500">{prompt.body}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        title="Waste And Leftovers"
        action={
          <Link href="/inventory/waste" className="text-sm text-stone-400 hover:text-stone-200">
            Open waste tracking
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-4">
            <h3 className="text-sm font-semibold text-stone-100">Recent waste events</h3>
            <div className="mt-3 space-y-3">
              {ledger.wasteEvents.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-md border border-stone-800 p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-medium text-stone-200">{event.itemName}</p>
                    <span className="text-xs text-stone-500">{formatLabel(event.cause)}</span>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    {event.amount ?? 'Amount unknown'} /{' '}
                    {event.estimatedCostCents != null
                      ? formatCurrency(event.estimatedCostCents)
                      : 'cost unknown'}
                  </p>
                </div>
              ))}
              {ledger.wasteEvents.length === 0 && (
                <p className="text-sm text-stone-500">No event waste has been logged yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-4">
            <h3 className="text-sm font-semibold text-stone-100">Leftover plan safety</h3>
            <div className="mt-3 space-y-3">
              {ledger.leftoverPlans.slice(0, 6).map((plan) => (
                <div key={plan.id} className="rounded-md border border-stone-800 p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-medium text-stone-200">{plan.items[0]?.itemName}</p>
                    <span className="text-xs text-stone-500">{formatLabel(plan.safetyState)}</span>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    {plan.clientSafeSummary ??
                      'Held for chef review until labeling, storage, and safety are known.'}
                  </p>
                </div>
              ))}
              {ledger.leftoverPlans.length === 0 && (
                <p className="text-sm text-stone-500">No event leftover plans are captured yet.</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Claims And Evidence"
        action={
          <Link href="/culinary/sourcing" className="text-sm text-stone-400 hover:text-stone-200">
            Open sourcing
          </Link>
        }
      >
        <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {ledger.sourcingClaims.slice(0, 8).map((claim) => (
              <div key={claim.id} className="rounded-md border border-stone-800 p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-medium text-stone-200">{claim.claimText}</p>
                  <span className="text-xs text-stone-500">{formatLabel(claim.state)}</span>
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  {claim.evidenceRefs.length} evidence reference(s). Public output requires
                  approval, evidence, non-empty copy, and public visibility.
                </p>
              </div>
            ))}
            {ledger.sourcingClaims.length === 0 && (
              <p className="text-sm text-stone-500">
                No local, organic, foraged, or seasonal sourcing claims are ready for review.
              </p>
            )}
          </div>
          {publicClaims.approvedClaims.length === 0 && (
            <p className="mt-4 rounded-md border border-amber-900/60 bg-amber-950/20 p-3 text-sm text-amber-200">
              No sustainability claims are being emitted to public profile output yet.
            </p>
          )}
        </div>
      </Section>

      <Section title="Recommendations">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {ledger.recommendations.map((recommendation) => (
            <div
              key={recommendation.id}
              className="rounded-lg border border-stone-800 bg-stone-900/40 p-4"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="text-sm font-semibold text-stone-100">{recommendation.title}</h3>
                <span className="text-xs text-stone-500">{formatLabel(recommendation.state)}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-500">{recommendation.rationale}</p>
              {recommendation.blockedReason && (
                <p className="mt-2 text-sm text-red-300">{recommendation.blockedReason}</p>
              )}
            </div>
          ))}
          {ledger.recommendations.length === 0 && (
            <p className="text-sm text-stone-500">
              Recommendations appear after waste, leftover, sourcing, or client-value signals are
              captured.
            </p>
          )}
        </div>
      </Section>
    </div>
  )
}
