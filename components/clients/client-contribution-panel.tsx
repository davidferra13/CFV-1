import Link from 'next/link'
import {
  dismissClientContribution,
  markClientContributionReviewed,
  toggleClientContributionPinned,
  updateClientContributionReviewPlan,
} from '@/lib/client-contribution/actions'
import type {
  ClientContributionRecommendedAction,
  ClientContributionSnapshot,
  ClientContributionTimelineMilestone,
  ClientDependencySimulation,
  ClientContributionTier,
} from '@/lib/client-contribution/types'
import { buildClientContributionTimeline } from '@/lib/client-contribution/strategy'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const tierLabel: Record<ClientContributionTier, string> = {
  strategic: 'Strategic',
  growth: 'Growth',
  steady: 'Steady',
  repair: 'Repair',
  unknown: 'Unknown',
}

const actionLabel: Record<ClientContributionRecommendedAction, string> = {
  protect_relationship: 'Protect relationship',
  collect_balance: 'Collect balance',
  review_pricing: 'Review pricing',
  repair_data: 'Repair missing data',
  reengage: 'Re-engage',
  nurture_referrals: 'Nurture referrals',
  build_history: 'Build history',
  maintain: 'Maintain',
}

function money(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function compactDate(value: string | null): string {
  if (!value) return 'No event yet'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/70 p-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-stone-100">{value}</dd>
    </div>
  )
}

function TimelineMilestones({ milestones }: { milestones: ClientContributionTimelineMilestone[] }) {
  const toneClass: Record<ClientContributionTimelineMilestone['tone'], string> = {
    positive: 'border-emerald-700/60 bg-emerald-950/20 text-emerald-200',
    warning: 'border-amber-700/60 bg-amber-950/20 text-amber-200',
    negative: 'border-red-700/60 bg-red-950/20 text-red-200',
    neutral: 'border-stone-700 bg-stone-900/60 text-stone-200',
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
      <p className="text-sm font-semibold text-stone-200">Contribution timeline</p>
      <div className="mt-3 space-y-3">
        {milestones.map((milestone) => (
          <div key={milestone.id} className={`rounded-lg border p-3 ${toneClass[milestone.tone]}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{milestone.label}</p>
                <p className="text-xs opacity-80">{milestone.dateLabel}</p>
              </div>
              {milestone.value && <span className="text-sm font-semibold">{milestone.value}</span>}
            </div>
            <p className="mt-2 text-sm text-stone-300">{milestone.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DependencyImpact({ simulation }: { simulation?: ClientDependencySimulation | null }) {
  if (!simulation || simulation.annualRevenueLossCents <= 0) return null

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-stone-200">Dependency impact</p>
          <p className="mt-1 text-sm text-stone-400">
            Losing this client would create a {money(simulation.monthlyCashFlowGapCents)} monthly
            revenue gap.
          </p>
        </div>
        <Badge variant={simulation.portfolioRevenueSharePercent >= 30 ? 'warning' : 'success'}>
          {simulation.portfolioRevenueSharePercent}% of revenue
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Metric label="Annual loss" value={money(simulation.annualRevenueLossCents)} />
        <Metric label="Profit loss" value={money(simulation.annualProfitLossCents)} />
        <Metric label="Replacements" value={String(simulation.replacementClientCount)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {simulation.mitigationActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-200 hover:bg-stone-800"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function ServiceFormatBreakdown({ snapshot }: { snapshot: ClientContributionSnapshot }) {
  const { formats, bestMarginFormat, worstMarginFormat, primaryFormat, unknownEventCount } =
    snapshot.serviceFormats

  if (formats.length === 0) return null

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-200">Service format profitability</p>
          <p className="mt-1 text-sm text-stone-400">
            Client service mix by event format, revenue, profit, margin, and review path.
          </p>
        </div>
        {primaryFormat && <Badge variant="info">{primaryFormat.label}</Badge>}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Metric
          label="Formats bought"
          value={String(formats.filter((item) => item.key !== 'unknown').length)}
        />
        <Metric
          label="Best margin"
          value={
            bestMarginFormat?.marginPercent == null
              ? 'Unknown'
              : `${bestMarginFormat.label} ${bestMarginFormat.marginPercent}%`
          }
        />
        <Metric
          label="Worst margin"
          value={
            worstMarginFormat?.marginPercent == null
              ? 'Unknown'
              : `${worstMarginFormat.label} ${worstMarginFormat.marginPercent}%`
          }
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {formats.slice(0, 6).map((format) => (
          <div key={format.key} className="rounded-lg border border-stone-800 bg-stone-950/60 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-stone-100">{format.label}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {format.eventCount} event{format.eventCount === 1 ? '' : 's'} ·{' '}
                  {format.confidence} confidence
                </p>
              </div>
              <Badge variant={format.recommendation === 'price_review' ? 'warning' : 'default'}>
                {format.recommendation.replace('_', ' ')}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="uppercase tracking-[0.12em] text-stone-600">Revenue</p>
                <p className="mt-1 font-semibold text-stone-200">{money(format.revenueCents)}</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.12em] text-stone-600">Profit</p>
                <p className="mt-1 font-semibold text-stone-200">{money(format.profitCents)}</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.12em] text-stone-600">Margin</p>
                <p className="mt-1 font-semibold text-stone-200">
                  {format.marginPercent == null ? 'N/A' : `${format.marginPercent}%`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {unknownEventCount > 0 && (
        <p className="mt-3 text-xs text-amber-300">
          {unknownEventCount} event{unknownEventCount === 1 ? '' : 's'} need service style or
          occasion cleanup before format rankings are fully reliable.
        </p>
      )}
    </div>
  )
}

function toneVariant(tone: 'positive' | 'warning' | 'negative' | 'neutral') {
  if (tone === 'positive') return 'success' as const
  if (tone === 'warning') return 'warning' as const
  if (tone === 'negative') return 'error' as const
  return 'default' as const
}

export function ClientContributionPanel({
  snapshot,
  dependencySimulation,
}: {
  snapshot: ClientContributionSnapshot
  dependencySimulation?: ClientDependencySimulation | null
}) {
  const reviewed = snapshot.reviewState.status !== 'needs_review'
  const timeline = buildClientContributionTimeline(snapshot)

  return (
    <section id="contribution" className="scroll-mt-28">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Client Contribution</CardTitle>
              <p className="mt-1 text-sm text-stone-400">
                Business contribution, decision state, and repair paths from the shared portfolio
                engine.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={snapshot.tier === 'repair' ? 'warning' : 'success'}>
                {tierLabel[snapshot.tier]}
              </Badge>
              <Badge variant={reviewed ? 'success' : 'warning'}>
                {snapshot.reviewState.status.replace('_', ' ')}
              </Badge>
              <Badge
                variant={
                  snapshot.fitScore.level === 'poor'
                    ? 'error'
                    : snapshot.fitScore.level === 'mixed'
                      ? 'warning'
                      : snapshot.fitScore.level === 'unknown'
                        ? 'default'
                        : 'success'
                }
              >
                {snapshot.fitScore.label}
              </Badge>
              <Badge variant="info">{snapshot.portfolioCategory.label}</Badge>
              <span className="rounded-full bg-stone-800 px-3 py-1 text-sm font-semibold text-stone-100">
                {snapshot.contributionScore}/100
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Paid revenue" value={money(snapshot.paidRevenueCents)} />
            <Metric label="Net profit" value={money(snapshot.netProfitCents)} />
            <Metric
              label="Margin"
              value={snapshot.marginPercent == null ? 'Unknown' : `${snapshot.marginPercent}%`}
            />
            <Metric
              label="Fit score"
              value={
                snapshot.fitScore.score == null ? 'Needs data' : `${snapshot.fitScore.score}/100`
              }
            />
            <Metric label="Outstanding" value={money(snapshot.outstandingBalanceCents)} />
          </div>

          <ServiceFormatBreakdown snapshot={snapshot} />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Recommendation
              </p>
              <p className="mt-2 text-base font-semibold text-stone-100">
                {actionLabel[snapshot.recommendedAction]}
              </p>
              <p className="mt-1 text-sm text-stone-400">
                {snapshot.completedEventCount} completed events - avg{' '}
                {money(snapshot.averageEventValueCents)}
              </p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Pricing
              </p>
              <p className="mt-2 text-base font-semibold text-stone-100">
                {snapshot.pricingRecommendation.label}
              </p>
              <p className="mt-1 text-sm text-stone-400">
                {snapshot.pricingRecommendation.riskLabel}
              </p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Relationship risk
              </p>
              <p className="mt-2 text-base font-semibold text-stone-100 capitalize">
                {snapshot.churnRisk} churn risk
              </p>
              <p className="mt-1 text-sm text-stone-400">
                Last event: {compactDate(snapshot.lastEventDate)}
              </p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Confidence
              </p>
              <p className="mt-2 text-base font-semibold text-stone-100 capitalize">
                {snapshot.dataConfidence.level} - {snapshot.dataConfidence.score}/100
              </p>
              <p className="mt-1 text-sm text-stone-400">
                {snapshot.dataConfidence.reasons[0] ?? 'Contribution evidence available'}
              </p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Acquisition source
              </p>
              <p className="mt-2 text-base font-semibold text-stone-100">
                {snapshot.acquisitionSource.label}
              </p>
              <p className="mt-1 text-sm text-stone-400">
                {snapshot.acquisitionSource.known
                  ? (snapshot.acquisitionSource.detail ?? 'Attributed source')
                  : 'Repair missing source before trusting ROI.'}
              </p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Capacity fit
              </p>
              <p className="mt-2 text-base font-semibold text-stone-100">
                {snapshot.capacitySignal.label} - {snapshot.capacitySignal.score}/100
              </p>
              <p className="mt-1 text-sm text-stone-400">
                {snapshot.capacitySignal.suggestedAction}
              </p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Communication ROI
              </p>
              <p className="mt-2 text-base font-semibold text-stone-100">
                {snapshot.communicationRoi.label}
              </p>
              <p className="mt-1 text-sm text-stone-400">
                {money(snapshot.communicationRoi.revenueAfterTouchCents)} value,{' '}
                {snapshot.communicationRoi.confidence} confidence.
              </p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Seasonality
              </p>
              <p className="mt-2 text-base font-semibold text-stone-100">
                {snapshot.seasonality.nextLikelyWindow?.label ?? snapshot.seasonality.label}
              </p>
              <p className="mt-1 text-sm text-stone-400">
                {snapshot.seasonality.nextLikelyWindow
                  ? `${snapshot.seasonality.nextLikelyWindow.dueInDays} days out, ${money(snapshot.seasonality.nextLikelyWindow.expectedValueCents)} expected.`
                  : (snapshot.seasonality.evidence[0] ?? 'No confident seasonal pattern yet.')}
              </p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Market
              </p>
              <p className="mt-2 text-base font-semibold text-stone-100">
                {snapshot.geographicContribution.primaryMarket?.label ?? 'Unknown market'}
              </p>
              <p className="mt-1 text-sm text-stone-400">
                {snapshot.geographicContribution.primaryMarket
                  ? `${money(snapshot.geographicContribution.primaryMarket.profitCents)} profit from ${snapshot.geographicContribution.primaryMarket.eventCount} events.`
                  : 'Add event city and state to compare market profitability.'}
              </p>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Expectation risk
              </p>
              <p className="mt-2 text-base font-semibold text-stone-100">
                {snapshot.expectationRisk.label} - {snapshot.expectationRisk.score}/100
              </p>
              <p className="mt-1 text-sm text-stone-400">
                {snapshot.expectationRisk.evidence[0]?.value ?? 'No expectation pressure recorded.'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 lg:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-stone-200">
                    Expectation risk guardrails
                  </p>
                  <p className="mt-1 text-sm text-stone-400">
                    Chef-only signal for late changes, budget mismatch, access constraints, payment
                    delays, and emotional load.
                  </p>
                </div>
                <Badge
                  variant={
                    snapshot.expectationRisk.level === 'high'
                      ? 'error'
                      : snapshot.expectationRisk.level === 'medium'
                        ? 'warning'
                        : 'default'
                  }
                >
                  {snapshot.expectationRisk.level}
                </Badge>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Drivers
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {snapshot.expectationRisk.evidence.length === 0 ? (
                      <span className="text-sm text-stone-500">No expectation drivers yet.</span>
                    ) : (
                      snapshot.expectationRisk.evidence.map((item) => (
                        <Badge key={`${item.label}:${item.value}`} variant={toneVariant(item.tone)}>
                          {item.label}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Mitigations
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {snapshot.expectationRisk.mitigations.map((mitigation) => (
                      <Link
                        key={mitigation.label}
                        href={mitigation.href}
                        className="rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-200 hover:bg-stone-800"
                      >
                        {mitigation.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 lg:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-200">
                    Primary playbook: {snapshot.playbooks.primary.label}
                  </p>
                  <p className="mt-1 text-sm text-stone-400">{snapshot.playbooks.primary.goal}</p>
                </div>
                <Badge
                  variant={snapshot.playbooks.primary.kind === 'maintain' ? 'default' : 'info'}
                >
                  chef-only
                </Badge>
              </div>
              <p className="mt-3 text-sm text-stone-300">{snapshot.playbooks.primary.reason}</p>
              <p className="mt-1 text-sm text-stone-500">{snapshot.playbooks.primary.risk}</p>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Evidence
                  </p>
                  <div className="mt-2 space-y-1">
                    {snapshot.playbooks.primary.evidence.slice(0, 4).map((item) => (
                      <p key={item} className="text-sm text-stone-400">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Actions
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {snapshot.playbooks.primary.actions.map((action) => (
                      <Link
                        key={action.label}
                        href={action.href}
                        className="rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-200 hover:bg-stone-800"
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Success criteria
                  </p>
                  <div className="mt-2 space-y-1">
                    {snapshot.playbooks.primary.successCriteria.map((item) => (
                      <p key={item} className="text-sm text-stone-400">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              {snapshot.playbooks.secondary.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-800 pt-3">
                  {snapshot.playbooks.secondary.map((playbook) => (
                    <Badge key={playbook.kind} variant="default">
                      {playbook.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-sm font-semibold text-stone-200">Fit drivers</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...snapshot.fitScore.positiveDrivers, ...snapshot.fitScore.negativeDrivers]
                  .slice(0, 6)
                  .map((driver) => (
                    <Badge
                      key={`${driver.label}:${driver.value}`}
                      variant={toneVariant(driver.tone)}
                    >
                      {driver.label}: {driver.value}
                    </Badge>
                  ))}
                {snapshot.fitScore.positiveDrivers.length +
                  snapshot.fitScore.negativeDrivers.length ===
                  0 && <span className="text-sm text-stone-500">No fit drivers yet.</span>}
              </div>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-stone-200">Margin leak detector</p>
                <Badge variant={snapshot.marginLeaks.length > 0 ? 'warning' : 'success'}>
                  {snapshot.marginLeaks.length > 0
                    ? `${snapshot.marginLeaks.length} found`
                    : 'Clear'}
                </Badge>
              </div>
              <div className="mt-3 space-y-3">
                {snapshot.marginLeaks.length === 0 ? (
                  <p className="text-sm text-stone-500">No deterministic margin leaks detected.</p>
                ) : (
                  snapshot.marginLeaks.slice(0, 3).map((leak) => (
                    <Link
                      key={`${leak.type}:${leak.label}`}
                      href={leak.actionHref}
                      className="block rounded-lg border border-stone-800 bg-stone-950/60 p-3 hover:border-brand-500/60"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-stone-100">{leak.label}</p>
                        <span className="text-sm font-semibold text-amber-200">
                          {money(leak.estimatedImpactCents)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-stone-400">{leak.evidence}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-stone-200">Referral network value</p>
                <Badge variant={snapshot.referralNetworkValue.score >= 55 ? 'info' : 'default'}>
                  {snapshot.referralNetworkValue.score}/100
                </Badge>
              </div>
              <p className="mt-2 text-base font-semibold text-stone-100">
                {snapshot.referralNetworkValue.impactLabel}
              </p>
              <div className="mt-3 space-y-1">
                {snapshot.referralNetworkValue.evidence.slice(0, 4).map((item) => (
                  <p key={item} className="text-sm text-stone-400">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <TimelineMilestones milestones={timeline} />
            <DependencyImpact simulation={dependencySimulation} />
          </div>

          {snapshot.missingData.length > 0 && (
            <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-4">
              <p className="text-sm font-semibold text-amber-300">Missing data repair</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {snapshot.missingData.map((item) => (
                  <Link
                    key={item.key}
                    href={item.repairHref}
                    className="rounded-lg border border-amber-700/50 px-3 py-2 text-sm text-amber-100 hover:bg-amber-900/40"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <p className="text-sm font-semibold text-stone-200">Decision controls</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={markClientContributionReviewed.bind(null, snapshot.clientId)}>
                  <button className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600">
                    Mark reviewed
                  </button>
                </form>
                <form action={toggleClientContributionPinned.bind(null, snapshot.clientId)}>
                  <button className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-stone-100 hover:bg-stone-700">
                    {snapshot.reviewState.pinned ? 'Unpin' : 'Pin'}
                  </button>
                </form>
              </div>
              <form
                action={dismissClientContribution.bind(null, snapshot.clientId)}
                className="mt-3 flex gap-2"
              >
                <input
                  name="reason"
                  placeholder="Dismiss reason"
                  className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <button className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-stone-100 hover:bg-stone-700">
                  Dismiss
                </button>
              </form>
            </div>

            <form
              action={updateClientContributionReviewPlan.bind(null, snapshot.clientId)}
              className="rounded-lg border border-stone-700 bg-stone-900/60 p-4"
            >
              <p className="text-sm font-semibold text-stone-200">Review plan</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <select
                  name="tierOverride"
                  defaultValue={snapshot.reviewState.tierOverride ?? ''}
                  className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                >
                  <option value="">Computed tier</option>
                  <option value="strategic">Strategic</option>
                  <option value="growth">Growth</option>
                  <option value="steady">Steady</option>
                  <option value="repair">Repair</option>
                </select>
                <input
                  type="date"
                  name="nextReviewDate"
                  defaultValue={snapshot.reviewState.nextReviewDate ?? ''}
                  className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                />
              </div>
              <textarea
                name="note"
                defaultValue={snapshot.reviewState.note ?? ''}
                placeholder="Private contribution note"
                rows={2}
                className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
              />
              <button className="mt-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500">
                Save plan
              </button>
            </form>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-stone-800 pt-4">
            <Link
              href={`/clients/${snapshot.clientId}`}
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              Client profile
            </Link>
            <Link href="/finance/ledger" className="text-sm text-brand-400 hover:text-brand-300">
              Ledger
            </Link>
            <Link
              href={snapshot.pricingRecommendation.href}
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              Pricing action
            </Link>
            {snapshot.marginLeaks[0] && (
              <Link
                href={snapshot.marginLeaks[0].actionHref}
                className="text-sm text-brand-400 hover:text-brand-300"
              >
                {snapshot.marginLeaks[0].actionLabel}
              </Link>
            )}
            <Link
              href={`/inbox?clientId=${snapshot.clientId}`}
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              Outreach
            </Link>
            <Link
              href="/clients/contribution"
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              Portfolio view
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
