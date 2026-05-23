import type { Metadata } from 'next'
import Link from 'next/link'
import { getClientContributionPortfolio } from '@/lib/client-contribution/actions'
import {
  buildAcquisitionSourceRoi,
  buildCapacityAllocationPlan,
  buildClientBusinessGoalAlignment,
  buildClientContributionBusinessBriefing,
  buildClientDependencySimulation,
  buildClientSeasonalityForecastPlan,
  buildClientSegmentBuilder,
  buildCommunicationRoiSummary,
  buildContributionOpportunityPlan,
  buildGeographicProfitabilityMap,
  buildRevenueConcentrationWarning,
  buildServiceFormatProfitabilityMap,
  businessGoalLabels,
} from '@/lib/client-contribution/strategy'
import type {
  ClientAcquisitionSourceRoi,
  ClientBusinessGoalAlignment,
  ClientBusinessGoalKey,
  ClientCapacityAllocationPlan,
  ClientCommunicationRoiSummary,
  ClientContributionBusinessBriefing,
  ClientContributionOpportunity,
  ClientContributionRecommendedAction,
  ClientContributionSegment,
  ClientGeographicProfitabilityGroup,
  ClientContributionSnapshot,
  ClientContributionTier,
  ClientDependencySimulation,
  ClientRevenueConcentration,
  ClientSeasonalityPortfolioForecast,
  ClientServiceFormatProfitabilityGroup,
} from '@/lib/client-contribution/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Client Contribution | ChefFlow' }

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
  repair_data: 'Repair data',
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

function dateLabel(value: string | null): string {
  if (!value) return 'No event'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-stone-100">{value}</p>
        {sub && <p className="mt-1 text-sm text-stone-400">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function OpportunityPlan({ opportunities }: { opportunities: ClientContributionOpportunity[] }) {
  const windows = ['30', '60', '90'] as const

  if (opportunities.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-stone-100">30/60/90 opportunity plan</p>
          <p className="mt-1 text-sm text-stone-400">
            No contribution opportunities need action under the current thresholds.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>30/60/90 opportunity plan</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-3">
        {windows.map((window) => {
          const items = opportunities.filter((item) => item.window === window)
          return (
            <div key={window} className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-stone-100">{window} days</p>
                <Badge variant={items.length > 0 ? 'warning' : 'success'}>{items.length}</Badge>
              </div>
              <div className="mt-3 space-y-3">
                {items.length === 0 ? (
                  <p className="text-sm text-stone-500">No planned contribution actions.</p>
                ) : (
                  items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="block rounded-lg border border-stone-800 bg-stone-950/70 p-3 hover:border-brand-500/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-100">
                            {item.clientName}
                          </p>
                          <p className="mt-1 text-xs font-medium text-brand-300">
                            {item.actionLabel}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-stone-300">
                          {money(item.expectedValueCents)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-stone-400">{item.reason}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function DependencySimulator({ simulations }: { simulations: ClientDependencySimulation[] }) {
  if (simulations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client dependency simulator</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-sm text-stone-400">
            Paid client history is required before dependency impact can be calculated.
          </p>
        </CardContent>
      </Card>
    )
  }

  const top = simulations.slice(0, 3)
  const combinedLoss = top.reduce((sum, item) => sum + item.annualRevenueLossCents, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client dependency simulator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Top-client loss" value={money(top[0].annualRevenueLossCents)} />
          <MetricCard label="Top 3 loss" value={money(combinedLoss)} />
          <MetricCard
            label="Replacement clients"
            value={String(top.reduce((sum, item) => sum + item.replacementClientCount, 0))}
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {top.map((item) => (
            <Link
              key={item.clientId}
              href={`/clients/${item.clientId}#contribution`}
              className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-brand-500/60"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-stone-100">{item.clientName}</p>
                <Badge variant={item.portfolioRevenueSharePercent >= 30 ? 'warning' : 'success'}>
                  {item.portfolioRevenueSharePercent}%
                </Badge>
              </div>
              <p className="mt-2 text-sm text-stone-400">
                Losing this client creates a {money(item.monthlyCashFlowGapCents)} monthly gap and
                requires about {item.replacementClientCount} replacement client
                {item.replacementClientCount === 1 ? '' : 's'}.
              </p>
              <p className="mt-2 text-xs text-stone-500">{item.confidence} confidence</p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function RevenueConcentrationWarning({
  concentration,
}: {
  concentration: ClientRevenueConcentration
}) {
  const variant =
    concentration.riskLevel === 'high'
      ? 'warning'
      : concentration.riskLevel === 'watch'
        ? 'info'
        : concentration.riskLevel === 'unknown'
          ? 'default'
          : 'success'

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Revenue concentration</CardTitle>
            <p className="mt-1 text-sm text-stone-400">{concentration.recommendedResponse}</p>
          </div>
          <Badge variant={variant}>{concentration.riskLevel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Top client share"
            value={`${concentration.topOneSharePercent}%`}
            sub={`${money(concentration.revenueAtRiskCents)} at risk`}
          />
          <MetricCard
            label="Top 3 share"
            value={`${concentration.topThreeSharePercent}%`}
            sub="Paid revenue concentration"
          />
          <MetricCard
            label="Profit exposure"
            value={`${concentration.topOneProfitSharePercent}%`}
            sub={money(concentration.profitAtRiskCents)}
          />
          <MetricCard
            label="Replacement need"
            value={String(concentration.replacementClientCount)}
            sub={`${money(concentration.monthlyRevenueGapCents)} monthly gap`}
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-5">
          {concentration.topClients.map((client) => (
            <Link
              key={client.clientId}
              href={client.href}
              className="rounded-lg border border-stone-700 bg-stone-900/60 p-3 hover:border-brand-500/60"
            >
              <p className="truncate text-sm font-semibold text-stone-100">{client.clientName}</p>
              <p className="mt-1 text-xs text-stone-500">{client.revenueSharePercent}% share</p>
              <p className="mt-2 text-sm text-stone-300">{money(client.revenueCents)}</p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function RemyBusinessBriefing({
  briefing,
  active,
}: {
  briefing: ClientContributionBusinessBriefing
  active: boolean
}) {
  if (!active) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-100">Remy client business briefing</p>
            <p className="mt-1 text-sm text-stone-400">
              Structured snapshot briefing over risks, opportunities, pricing, and client drag.
            </p>
          </div>
          <Link
            href="/clients/contribution?brief=remy"
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Brief me
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Remy client business briefing</CardTitle>
            <p className="mt-1 text-sm text-stone-400">
              Deterministic briefing from contribution snapshots. Nothing is sent or changed.
            </p>
          </div>
          <Badge variant="info">chef reviewed</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-3">
        <BriefingList
          title="Top risks"
          items={briefing.topRisks.map((item) => ({
            label: item.label,
            detail: item.evidence,
            href: item.href,
          }))}
        />
        <BriefingList
          title="Contact today"
          items={briefing.contactToday.map((item) => ({
            label: item.clientName,
            detail: item.reason,
            href: item.href,
          }))}
        />
        <BriefingList
          title="Pricing"
          items={briefing.pricingConsiderations.map((item) => ({
            label: item.clientName,
            detail: item.recommendation,
            href: item.href,
          }))}
        />
        <BriefingList
          title="Opportunities"
          items={briefing.opportunities.map((item) => ({
            label: item.label,
            detail: item.evidence,
            href: item.href,
          }))}
        />
        <BriefingList
          title="Protect"
          items={briefing.protectedClients.map((item) => ({
            label: item.clientName,
            detail: item.reason,
            href: item.href,
          }))}
        />
        <BriefingList
          title="Business drag"
          items={briefing.businessDrags.map((item) => ({
            label: item.clientName,
            detail: item.reason,
            href: item.href,
          }))}
        />
        <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 lg:col-span-3">
          <p className="text-sm font-semibold text-stone-200">Uncertainty</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {briefing.uncertainty.map((item) => (
              <Badge key={item} variant="default">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BriefingList({
  title,
  items,
}: {
  title: string
  items: Array<{ label: string; detail: string; href: string }>
}) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
      <p className="text-sm font-semibold text-stone-200">{title}</p>
      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-stone-500">No current briefing item.</p>
        ) : (
          items.slice(0, 4).map((item, index) => (
            <Link
              key={`${title}:${item.label}:${item.href}:${index}`}
              href={item.href}
              className="block rounded-lg border border-stone-800 bg-stone-950/60 p-3 hover:border-brand-500/60"
            >
              <p className="truncate text-sm font-semibold text-stone-100">{item.label}</p>
              <p className="mt-1 line-clamp-2 text-xs text-stone-400">{item.detail}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

function PortfolioRiskMap({
  snapshots,
  params,
}: {
  snapshots: ClientContributionSnapshot[]
  params: Record<string, string | string[] | undefined>
}) {
  const categories = [
    'high_value_healthy',
    'high_value_at_risk',
    'low_value_high_effort',
    'new_promising',
    'sparse_data',
  ] as const

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio risk map</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-5">
        {categories.map((category) => {
          const clients = snapshots.filter(
            (snapshot) => snapshot.portfolioCategory.key === category
          )
          const top = clients.slice(0, 3)
          const label =
            top[0]?.portfolioCategory.label ??
            category
              .split('_')
              .map((part) => part[0].toUpperCase() + part.slice(1))
              .join(' ')
          return (
            <Link
              key={category}
              href={buildHref(params, 'view', category)}
              className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-brand-500/60"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-stone-100">{label}</p>
                <Badge variant={clients.length > 0 ? 'info' : 'default'}>{clients.length}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {top.length === 0 ? (
                  <p className="text-xs text-stone-500">No clients in this quadrant.</p>
                ) : (
                  top.map((snapshot) => (
                    <div key={snapshot.clientId} className="min-w-0">
                      <p className="truncate text-xs font-semibold text-stone-200">
                        {snapshot.clientName}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {snapshot.portfolioCategory.evidence}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}

function GoalAlignmentLens({ alignment }: { alignment: ClientBusinessGoalAlignment }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Business goal alignment</CardTitle>
            <p className="mt-1 text-sm text-stone-400">{alignment.description}</p>
          </div>
          <Badge variant="info">{alignment.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-3">
        <BriefingList
          title="Top aligned"
          items={alignment.rankedClients.slice(0, 4).map((item) => ({
            label: `${item.clientName} (${item.score})`,
            detail: `${item.explanation} Base score ${item.contributionScore}.`,
            href: item.href,
          }))}
        />
        <BriefingList
          title="Working against goal"
          items={alignment.conflicts.slice(0, 4).map((item) => ({
            label: `${item.clientName} (${item.score})`,
            detail: item.reason,
            href: item.href,
          }))}
        />
        <BriefingList
          title="Suggested actions"
          items={alignment.suggestedActions.map((item) => ({
            label: item.label,
            detail: item.evidence,
            href: item.href,
          }))}
        />
      </CardContent>
    </Card>
  )
}

function AcquisitionSourceRoiSection({ sources }: { sources: ClientAcquisitionSourceRoi[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acquisition source ROI</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-3">
        {sources.slice(0, 6).map((source) => (
          <Link
            key={source.sourceKey}
            href={source.repairHref}
            className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-brand-500/60"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-100">
                  {source.sourceLabel}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {source.clientCount} clients - {source.confidence} confidence
                </p>
              </div>
              <Badge variant={source.known ? 'success' : 'warning'}>
                {source.known ? 'Known' : 'Repair'}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-stone-500">Revenue</p>
                <p className="font-semibold text-stone-100">{money(source.paidRevenueCents)}</p>
              </div>
              <div>
                <p className="text-stone-500">Profit</p>
                <p className="font-semibold text-stone-100">{money(source.netProfitCents)}</p>
              </div>
              <div>
                <p className="text-stone-500">Retention</p>
                <p className="font-semibold text-stone-100">{source.retentionRatePercent}%</p>
              </div>
              <div>
                <p className="text-stone-500">At risk</p>
                <p className="font-semibold text-stone-100">{source.atRiskRatePercent}%</p>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function SeasonalityForecastSection({
  forecast,
}: {
  forecast: ClientSeasonalityPortfolioForecast
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Seasonality forecast</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        <BriefingList
          title="Due soon"
          items={forecast.upcoming.slice(0, 6).map((item) => ({
            label: `${item.clientName} - ${item.monthLabel}`,
            detail: `${money(item.expectedValueCents)} expected value, ${item.dueInDays} days out, ${item.confidence} confidence. ${item.evidence}`,
            href: item.href,
          }))}
        />
        <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
          <p className="text-sm font-semibold text-stone-200">Weak upcoming months</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {forecast.weakMonths.length === 0 ? (
              <p className="text-sm text-stone-500">
                No weak seasonal months in the current window.
              </p>
            ) : (
              forecast.weakMonths.map((month) => (
                <div
                  key={month.month}
                  className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-100">{month.label}</p>
                    <Badge variant={month.dueClientCount > 0 ? 'info' : 'warning'}>
                      {month.dueClientCount} due
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">{month.reason}</p>
                  <p className="mt-2 text-xs text-stone-500">
                    {month.historicalEventCount} historical events -{' '}
                    {money(month.expectedValueCents)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SegmentBuilderSection({ segments }: { segments: ClientContributionSegment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client segment builder</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-4">
        {segments.slice(0, 8).map((segment) => (
          <Link
            key={segment.key}
            href={segment.href}
            className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-brand-500/60"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-stone-100">{segment.label}</p>
              <Badge variant={segment.clientCount > 0 ? 'info' : 'default'}>
                {segment.clientCount}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-stone-500">{segment.description}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-stone-500">Profit</p>
                <p className="font-semibold text-stone-100">{money(segment.netProfitCents)}</p>
              </div>
              <div>
                <p className="text-stone-500">Avg score</p>
                <p className="font-semibold text-stone-100">{segment.averageScore ?? 'n/a'}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {segment.clients.slice(0, 2).map((client) => (
                <p key={client.clientId} className="truncate text-xs text-stone-400">
                  {client.clientName}: {client.reason}
                </p>
              ))}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function GeographicProfitabilitySection({
  groups,
}: {
  groups: ClientGeographicProfitabilityGroup[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Geographic profitability map</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-3">
        {groups.length === 0 ? (
          <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 text-sm text-stone-400 lg:col-span-3">
            Add event city and state to reveal market-level contribution.
          </div>
        ) : (
          groups.slice(0, 6).map((group) => (
            <Link
              key={group.key}
              href={group.href}
              className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-brand-500/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-100">{group.label}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {group.eventCount} events - {group.clientCount} clients - {group.confidence}{' '}
                    confidence
                  </p>
                </div>
                <Badge variant={(group.averageMarginPercent ?? 0) >= 35 ? 'success' : 'warning'}>
                  {group.averageMarginPercent == null ? 'n/a' : `${group.averageMarginPercent}%`}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-stone-500">Revenue</p>
                  <p className="font-semibold text-stone-100">{money(group.paidRevenueCents)}</p>
                </div>
                <div>
                  <p className="text-stone-500">Profit</p>
                  <p className="font-semibold text-stone-100">{money(group.netProfitCents)}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {group.topClients.slice(0, 2).map((client) => (
                  <p key={client.clientId} className="truncate text-xs text-stone-400">
                    {client.clientName}: {money(client.paidRevenueCents)}
                  </p>
                ))}
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function ServiceFormatProfitabilitySection({
  groups,
}: {
  groups: ClientServiceFormatProfitabilityGroup[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Service format profitability</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-3">
        {groups.length === 0 ? (
          <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 text-sm text-stone-400 lg:col-span-3">
            Add event service style or occasion data to compare private dinners, meal prep,
            corporate events, classes, tastings, holidays, and drop-off formats.
          </div>
        ) : (
          groups.slice(0, 6).map((group) => (
            <Link
              key={group.key}
              href={group.href}
              className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-brand-500/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-100">{group.label}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {group.eventCount} events - {group.clientCount} clients - {group.confidence}{' '}
                    confidence
                  </p>
                </div>
                <Badge variant={group.recommendation === 'price_review' ? 'warning' : 'info'}>
                  {group.recommendation.replace('_', ' ')}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-stone-500">Profit</p>
                  <p className="font-semibold text-stone-100">{money(group.netProfitCents)}</p>
                </div>
                <div>
                  <p className="text-stone-500">Margin</p>
                  <p className="font-semibold text-stone-100">
                    {group.averageMarginPercent == null ? 'n/a' : `${group.averageMarginPercent}%`}
                  </p>
                </div>
                <div>
                  <p className="text-stone-500">Revenue</p>
                  <p className="font-semibold text-stone-100">{money(group.paidRevenueCents)}</p>
                </div>
                <div>
                  <p className="text-stone-500">Repeat rate</p>
                  <p className="font-semibold text-stone-100">{group.repeatClientRatePercent}%</p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {group.topClients.slice(0, 2).map((client) => (
                  <p key={client.clientId} className="truncate text-xs text-stone-400">
                    {client.clientName}: {money(client.paidRevenueCents)}
                  </p>
                ))}
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function CapacityAllocationPlanner({ plan }: { plan: ClientCapacityAllocationPlan }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacity allocation planner</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-4">
        <BriefingList
          title="Premium slots"
          items={plan.premiumCandidates.map((item) => ({
            label: `${item.clientName} (${item.capacitySignal.score})`,
            detail: item.capacitySignal.evidence.slice(0, 2).join('; '),
            href: `/clients/${item.clientId}#contribution`,
          }))}
        />
        <BriefingList
          title="Price first"
          items={plan.priceBeforePremium.map((item) => ({
            label: `${item.clientName} (${item.capacitySignal.score})`,
            detail: item.capacitySignal.suggestedAction,
            href: item.capacitySignal.href,
          }))}
        />
        <BriefingList
          title="Avoid premium"
          items={plan.avoidPremium.map((item) => ({
            label: `${item.clientName} (${item.capacitySignal.score})`,
            detail: item.capacitySignal.evidence.slice(0, 2).join('; '),
            href: `/clients/${item.clientId}#contribution`,
          }))}
        />
        <BriefingList
          title="Open risks"
          items={plan.openCapacityRisks.map((item) => ({
            label: item.label,
            detail: item.evidence,
            href: item.href,
          }))}
        />
      </CardContent>
    </Card>
  )
}

function CommunicationRoiSection({ summary }: { summary: ClientCommunicationRoiSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication ROI</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-4">
        {summary.slice(0, 4).map((item) => (
          <Link
            key={item.touchType}
            href={item.href}
            className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-brand-500/60"
          >
            <p className="text-sm font-semibold text-stone-100">{item.label}</p>
            <p className="mt-1 text-xs text-stone-500">
              {item.clientCount} clients - {item.confidence} confidence
            </p>
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-stone-300">
                {money(item.revenueAfterTouchCents)} revenue after touch
              </p>
              <p className="text-stone-400">{item.conversionCount} tracked conversions</p>
              <p className="line-clamp-2 text-xs text-stone-500">{item.evidence[0]}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function PlaybookOverview({ snapshots }: { snapshots: ClientContributionSnapshot[] }) {
  const counts = new Map<
    string,
    { label: string; count: number; clients: ClientContributionSnapshot[] }
  >()
  for (const snapshot of snapshots) {
    const key = snapshot.playbooks.primary.kind
    const current = counts.get(key) ?? {
      label: snapshot.playbooks.primary.label,
      count: 0,
      clients: [],
    }
    current.count += 1
    current.clients.push(snapshot)
    counts.set(key, current)
  }
  const groups = [...counts.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client playbooks</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-3">
        {groups.map((group) => (
          <Link
            key={group.key}
            href={`/clients/contribution?view=playbook:${group.key}`}
            className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-brand-500/60"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-stone-100">{group.label}</p>
              <Badge variant={group.count > 0 ? 'info' : 'default'}>{group.count}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {group.clients.slice(0, 3).map((snapshot) => (
                <p key={snapshot.clientId} className="truncate text-xs text-stone-400">
                  {snapshot.clientName}: {snapshot.playbooks.primary.reason}
                </p>
              ))}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function parseGoal(value: string | string[] | undefined): ClientBusinessGoalKey {
  const raw = typeof value === 'string' ? value : ''
  return raw in businessGoalLabels ? (raw as ClientBusinessGoalKey) : 'maximize_profit'
}

function filterSnapshots(
  snapshots: ClientContributionSnapshot[],
  params: Record<string, string | string[] | undefined>
) {
  const q = typeof params.q === 'string' ? params.q.toLowerCase().trim() : ''
  const view = typeof params.view === 'string' ? params.view : 'all'
  const sort = typeof params.sort === 'string' ? params.sort : 'score'
  const source = typeof params.source === 'string' ? params.source : ''
  const market = typeof params.market === 'string' ? params.market : ''
  const format = typeof params.format === 'string' ? params.format : ''

  let filtered = snapshots.filter((snapshot) => {
    if (q && !`${snapshot.clientName} ${snapshot.email ?? ''}`.toLowerCase().includes(q)) {
      return false
    }
    if (source && snapshot.acquisitionSource.key !== source) return false
    if (market && !snapshot.geographicContribution.markets.some((item) => item.key === market)) {
      return false
    }
    if (format && !snapshot.serviceFormats.formats.some((item) => item.key === format)) {
      return false
    }
    if (view === 'top') return ['strategic', 'growth'].includes(snapshot.tier)
    if (view === 'risk') return snapshot.churnRisk === 'high' && snapshot.paidRevenueCents > 0
    if (view === 'margin') return snapshot.marginPercent != null && snapshot.marginPercent < 25
    if (view === 'collections') return snapshot.outstandingBalanceCents > 0
    if (view === 'referrals') return snapshot.referralPotential === 'high'
    if (view === 'referral-value') return snapshot.referralNetworkValue.score >= 55
    if (view === 'fit-risk') return ['poor', 'mixed'].includes(snapshot.fitScore.level)
    if (view === 'pricing') return snapshot.pricingRecommendation.kind !== 'hold_price'
    if (view === 'leaks') return snapshot.marginLeaks.length > 0
    if (view === 'missing-source') return !snapshot.acquisitionSource.known
    if (view === 'premium-capacity') return snapshot.capacitySignal.status === 'premium_candidate'
    if (view === 'capacity-price-first')
      return snapshot.capacitySignal.status === 'price_before_premium'
    if (view === 'communication-roi')
      return snapshot.communicationRoi.touchType !== 'insufficient_data'
    if (view === 'seasonality') return Boolean(snapshot.seasonality.nextLikelyWindow)
    if (view === 'seasonal-risk') return snapshot.seasonality.dormantSeasonalRisk
    if (view === 'geography') return snapshot.geographicContribution.primaryMarket != null
    if (view === 'service-formats')
      return snapshot.serviceFormats.formats.some((item) => item.key !== 'unknown')
    if (view === 'service-format-risk')
      return snapshot.serviceFormats.formats.some((item) =>
        ['price_review', 'repair_data'].includes(item.recommendation)
      )
    if (view === 'expectation-risk') return snapshot.expectationRisk.level === 'high'
    if (view === 'playbooks') return snapshot.playbooks.primary.kind !== 'maintain'
    if (view.startsWith('segment:')) {
      const segment = view.replace('segment:', '')
      if (segment === 'seasonal_due') return Boolean(snapshot.seasonality.nextLikelyWindow)
      if (segment === 'geographic_profit')
        return (snapshot.geographicContribution.primaryMarket?.profitCents ?? 0) > 0
      if (segment === 'high_value_at_risk')
        return snapshot.portfolioCategory.key === 'high_value_at_risk'
      if (segment === 'collections') return snapshot.outstandingBalanceCents > 0
      if (segment === 'pricing') return snapshot.pricingRecommendation.kind !== 'hold_price'
      if (segment === 'referral') return snapshot.referralNetworkValue.score >= 55
      if (segment === 'premium_capacity')
        return snapshot.capacitySignal.status === 'premium_candidate'
      if (segment === 'repair') return snapshot.missingData.length > 0
    }
    if (view.startsWith('playbook:')) {
      const kind = view.replace('playbook:', '')
      return (
        snapshot.playbooks.primary.kind === kind ||
        snapshot.playbooks.secondary.some((playbook) => playbook.kind === kind)
      )
    }
    if (view === snapshot.portfolioCategory.key) return true
    if (view === 'missing') return snapshot.missingData.length > 0
    if (view === 'review') return snapshot.reviewState.status === 'needs_review'
    return true
  })

  filtered = [...filtered].sort((a, b) => {
    if (a.reviewState.pinned !== b.reviewState.pinned) return a.reviewState.pinned ? -1 : 1
    if (sort === 'revenue') return b.paidRevenueCents - a.paidRevenueCents
    if (sort === 'profit') return b.netProfitCents - a.netProfitCents
    if (sort === 'margin') return (b.marginPercent ?? -999) - (a.marginPercent ?? -999)
    if (sort === 'outstanding') return b.outstandingBalanceCents - a.outstandingBalanceCents
    if (sort === 'fit') return (b.fitScore.score ?? -1) - (a.fitScore.score ?? -1)
    if (sort === 'referral') return b.referralNetworkValue.score - a.referralNetworkValue.score
    if (sort === 'capacity') return b.capacitySignal.score - a.capacitySignal.score
    if (sort === 'communication')
      return b.communicationRoi.revenueAfterTouchCents - a.communicationRoi.revenueAfterTouchCents
    if (sort === 'seasonality')
      return (
        (a.seasonality.nextLikelyWindow?.dueInDays ?? 9999) -
        (b.seasonality.nextLikelyWindow?.dueInDays ?? 9999)
      )
    if (sort === 'geography')
      return (
        (b.geographicContribution.primaryMarket?.profitCents ?? -1) -
        (a.geographicContribution.primaryMarket?.profitCents ?? -1)
      )
    if (sort === 'format')
      return (
        (b.serviceFormats.primaryFormat?.profitCents ?? -1) -
        (a.serviceFormats.primaryFormat?.profitCents ?? -1)
      )
    if (sort === 'expectation-risk') return b.expectationRisk.score - a.expectationRisk.score
    if (sort === 'playbook')
      return a.playbooks.primary.label.localeCompare(b.playbooks.primary.label)
    if (sort === 'leak')
      return (
        b.marginLeaks.reduce((sum, item) => sum + item.estimatedImpactCents, 0) -
        a.marginLeaks.reduce((sum, item) => sum + item.estimatedImpactCents, 0)
      )
    if (sort === 'last-event')
      return (b.daysSinceLastEvent ?? 9999) - (a.daysSinceLastEvent ?? 9999)
    if (sort === 'missing') return b.missingData.length - a.missingData.length
    return b.contributionScore - a.contributionScore
  })

  return filtered
}

function buildHref(
  params: Record<string, string | string[] | undefined>,
  key: string,
  value: string
) {
  const next = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && k !== key) next.set(k, v)
  }
  if (value) next.set(key, value)
  const qs = next.toString()
  return `/clients/contribution${qs ? `?${qs}` : ''}`
}

function ClientContributionCards({ snapshots }: { snapshots: ClientContributionSnapshot[] }) {
  return (
    <div className="grid gap-3 lg:hidden">
      {snapshots.map((snapshot) => (
        <Card key={snapshot.clientId}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/clients/${snapshot.clientId}#contribution`}
                  className="block truncate font-semibold text-stone-100 hover:text-brand-300"
                >
                  {snapshot.clientName}
                </Link>
                <p className="truncate text-sm text-stone-500">{snapshot.email ?? 'No email'}</p>
              </div>
              <Badge variant={snapshot.tier === 'repair' ? 'warning' : 'success'}>
                {tierLabel[snapshot.tier]}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-stone-500">Score</p>
                <p className="font-semibold text-stone-100">{snapshot.contributionScore}/100</p>
              </div>
              <div>
                <p className="text-stone-500">Paid</p>
                <p className="font-semibold text-stone-100">{money(snapshot.paidRevenueCents)}</p>
              </div>
              <div>
                <p className="text-stone-500">Profit</p>
                <p className="font-semibold text-stone-100">{money(snapshot.netProfitCents)}</p>
              </div>
              <div>
                <p className="text-stone-500">Playbook</p>
                <p className="font-semibold text-stone-100">{snapshot.playbooks.primary.label}</p>
              </div>
              <div>
                <p className="text-stone-500">Action</p>
                <p className="font-semibold text-stone-100">
                  {actionLabel[snapshot.recommendedAction]}
                </p>
              </div>
              <div>
                <p className="text-stone-500">Fit</p>
                <p className="font-semibold text-stone-100">
                  {snapshot.fitScore.score == null
                    ? 'Needs data'
                    : `${snapshot.fitScore.score}/100`}
                </p>
              </div>
              <div>
                <p className="text-stone-500">Pricing</p>
                <p className="font-semibold text-stone-100">
                  {snapshot.pricingRecommendation.label}
                </p>
              </div>
              <div>
                <p className="text-stone-500">Capacity</p>
                <p className="font-semibold text-stone-100">{snapshot.capacitySignal.label}</p>
              </div>
              <div>
                <p className="text-stone-500">Source</p>
                <p className="font-semibold text-stone-100">{snapshot.acquisitionSource.label}</p>
              </div>
              <div>
                <p className="text-stone-500">Season</p>
                <p className="font-semibold text-stone-100">{snapshot.seasonality.label}</p>
              </div>
              <div>
                <p className="text-stone-500">Market</p>
                <p className="font-semibold text-stone-100">
                  {snapshot.geographicContribution.primaryMarket?.label ?? 'Unknown'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={snapshot.marginLeaks.length > 0 ? 'warning' : 'success'}>
                {snapshot.marginLeaks.length > 0
                  ? `${snapshot.marginLeaks.length} leak${snapshot.marginLeaks.length === 1 ? '' : 's'}`
                  : 'No leaks'}
              </Badge>
              <Badge variant={snapshot.referralNetworkValue.score >= 55 ? 'info' : 'default'}>
                Referral {snapshot.referralNetworkValue.score}
              </Badge>
              <Badge variant="default">{snapshot.portfolioCategory.label}</Badge>
              <Badge variant={snapshot.communicationRoi.confidence === 'low' ? 'default' : 'info'}>
                {snapshot.communicationRoi.label}
              </Badge>
              <Badge
                variant={
                  snapshot.expectationRisk.level === 'high'
                    ? 'error'
                    : snapshot.expectationRisk.level === 'medium'
                      ? 'warning'
                      : 'default'
                }
              >
                {snapshot.expectationRisk.label}
              </Badge>
              <Badge variant={snapshot.playbooks.primary.kind === 'maintain' ? 'default' : 'info'}>
                {snapshot.playbooks.primary.label}
              </Badge>
              {snapshot.seasonality.nextLikelyWindow && (
                <Badge variant={snapshot.seasonality.dormantSeasonalRisk ? 'warning' : 'info'}>
                  {snapshot.seasonality.nextLikelyWindow.label} due
                </Badge>
              )}
            </div>
            <p className="mt-3 text-sm text-stone-400">{snapshot.playbooks.primary.reason}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {snapshot.playbooks.primary.actions.slice(0, 2).map((action) => (
                <Link
                  key={`${snapshot.clientId}:${action.label}`}
                  href={action.href}
                  className="rounded-md border border-stone-700 px-2 py-1 text-xs text-stone-200 hover:bg-stone-800"
                >
                  {action.label}
                </Link>
              ))}
            </div>
            {snapshot.missingData.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {snapshot.missingData.slice(0, 3).map((item) => (
                  <Link
                    key={item.key}
                    href={item.repairHref}
                    className="rounded-md bg-amber-950 px-2 py-1 text-xs text-amber-200"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default async function ClientContributionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const portfolio = await getClientContributionPortfolio()
  const goal = parseGoal(params.goal)
  const snapshots = filterSnapshots(portfolio.snapshots, params)
  const opportunities = buildContributionOpportunityPlan(portfolio)
  const concentration = buildRevenueConcentrationWarning(portfolio)
  const briefing = buildClientContributionBusinessBriefing(portfolio)
  const alignment = buildClientBusinessGoalAlignment(portfolio, goal)
  const acquisitionSources = buildAcquisitionSourceRoi(portfolio)
  const capacityPlan = buildCapacityAllocationPlan(portfolio)
  const communicationSummary = buildCommunicationRoiSummary(portfolio)
  const seasonalityForecast = buildClientSeasonalityForecastPlan(portfolio)
  const segments = buildClientSegmentBuilder(portfolio)
  const geographicProfitability = buildGeographicProfitabilityMap(portfolio)
  const serviceFormatProfitability = buildServiceFormatProfitabilityMap(portfolio)
  const showBriefing = params.brief === 'remy'
  const simulations = portfolio.snapshots
    .filter((snapshot) => snapshot.paidRevenueCents > 0)
    .sort((a, b) => b.paidRevenueCents - a.paidRevenueCents)
    .slice(0, 5)
    .map((snapshot) => buildClientDependencySimulation(portfolio, snapshot))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Client Contribution</h1>
          <p className="mt-1 text-stone-400">
            Portfolio-level contribution scoring, review state, and missing-data repair paths.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/clients/contribution/export"
            className="rounded-lg border border-stone-600 px-3 py-2 text-sm font-medium text-stone-200 hover:bg-stone-800"
          >
            Export CSV
          </Link>
          <Link
            href="/clients"
            className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-stone-100 hover:bg-stone-700"
          >
            Directory
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Paid revenue" value={money(portfolio.summary.totalPaidRevenueCents)} />
        <MetricCard label="Net profit" value={money(portfolio.summary.totalNetProfitCents)} />
        <MetricCard
          label="Revenue at risk"
          value={money(portfolio.summary.revenueAtRiskCents)}
          sub="High churn risk clients"
        />
        <MetricCard
          label="Expectation risk"
          value={String(portfolio.summary.expectationRiskCount)}
          sub={`${money(portfolio.summary.expectationRiskRevenueCents)} chef-only exposure`}
        />
        <MetricCard
          label="Missing data"
          value={String(portfolio.summary.missingDataCount)}
          sub={`${portfolio.summary.topClientConcentrationPercent}% top-five concentration`}
        />
        <MetricCard
          label="Seasonal due"
          value={String(portfolio.summary.seasonalOpportunityCount)}
          sub={`${portfolio.summary.geographicMarketCount} markets, ${portfolio.summary.serviceFormatCount} formats`}
        />
      </div>

      <RevenueConcentrationWarning concentration={concentration} />

      <GoalAlignmentLens alignment={alignment} />

      <AcquisitionSourceRoiSection sources={acquisitionSources} />

      <SeasonalityForecastSection forecast={seasonalityForecast} />

      <SegmentBuilderSection segments={segments} />

      <GeographicProfitabilitySection groups={geographicProfitability} />

      <ServiceFormatProfitabilitySection groups={serviceFormatProfitability} />

      <RemyBusinessBriefing briefing={briefing} active={showBriefing} />

      <OpportunityPlan opportunities={opportunities} />

      <CapacityAllocationPlanner plan={capacityPlan} />

      <CommunicationRoiSection summary={communicationSummary} />

      <PlaybookOverview snapshots={portfolio.snapshots} />

      <DependencySimulator simulations={simulations} />

      <PortfolioRiskMap snapshots={portfolio.snapshots} params={params} />

      <Card>
        <CardHeader>
          <CardTitle>Portfolio controls</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action="/clients/contribution"
            className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto_auto]"
          >
            <input
              type="search"
              name="q"
              defaultValue={typeof params.q === 'string' ? params.q : ''}
              placeholder="Search clients"
              className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
            />
            <select
              name="goal"
              defaultValue={goal}
              className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            >
              {(Object.entries(businessGoalLabels) as Array<[ClientBusinessGoalKey, string]>).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
            <select
              name="view"
              defaultValue={typeof params.view === 'string' ? params.view : 'all'}
              className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            >
              <option value="all">All clients</option>
              <option value="top">Top contributors</option>
              <option value="risk">High-value at risk</option>
              <option value="margin">High revenue low margin</option>
              <option value="collections">Collection risk</option>
              <option value="referrals">Referral candidates</option>
              <option value="referral-value">Referral value</option>
              <option value="fit-risk">Fit risk</option>
              <option value="pricing">Pricing review</option>
              <option value="leaks">Margin leaks</option>
              <option value="missing-source">Missing source</option>
              <option value="premium-capacity">Premium capacity</option>
              <option value="capacity-price-first">Price before capacity</option>
              <option value="communication-roi">Communication ROI</option>
              <option value="seasonality">Seasonality forecast</option>
              <option value="seasonal-risk">Dormant seasonal risk</option>
              <option value="geography">Geographic profitability</option>
              <option value="service-formats">Service formats</option>
              <option value="service-format-risk">Service format risk</option>
              <option value="expectation-risk">Expectation risk</option>
              <option value="playbooks">Playbooks</option>
              <option value="high_value_healthy">High value / healthy</option>
              <option value="high_value_at_risk">High value / at risk</option>
              <option value="low_value_high_effort">Low value / high effort</option>
              <option value="new_promising">New or promising</option>
              <option value="missing">Missing data</option>
              <option value="review">Needs review</option>
            </select>
            <select
              name="source"
              defaultValue={typeof params.source === 'string' ? params.source : ''}
              className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            >
              <option value="">All sources</option>
              {acquisitionSources.map((source) => (
                <option key={source.sourceKey} value={source.sourceKey}>
                  {source.sourceLabel}
                </option>
              ))}
            </select>
            <select
              name="format"
              defaultValue={typeof params.format === 'string' ? params.format : ''}
              className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            >
              <option value="">All formats</option>
              {serviceFormatProfitability.map((format) => (
                <option key={format.key} value={format.key}>
                  {format.label}
                </option>
              ))}
            </select>
            <select
              name="sort"
              defaultValue={typeof params.sort === 'string' ? params.sort : 'score'}
              className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            >
              <option value="score">Score</option>
              <option value="revenue">Revenue</option>
              <option value="profit">Profit</option>
              <option value="margin">Margin</option>
              <option value="outstanding">Outstanding</option>
              <option value="fit">Fit</option>
              <option value="referral">Referral</option>
              <option value="capacity">Capacity</option>
              <option value="communication">Communication ROI</option>
              <option value="seasonality">Seasonality</option>
              <option value="geography">Geography</option>
              <option value="format">Service format</option>
              <option value="expectation-risk">Expectation risk</option>
              <option value="playbook">Playbook</option>
              <option value="leak">Leak impact</option>
              <option value="last-event">Last event age</option>
              <option value="missing">Missing data</option>
            </select>
            <button className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500">
              Apply
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {[
              ['all', 'All'],
              ['top', 'Top'],
              ['risk', 'At risk'],
              ['collections', 'Collections'],
              ['leaks', 'Leaks'],
              ['pricing', 'Pricing'],
              ['premium-capacity', 'Premium capacity'],
              ['communication-roi', 'Communication ROI'],
              ['seasonality', 'Seasonality'],
              ['geography', 'Geography'],
              ['service-formats', 'Formats'],
              ['service-format-risk', 'Format risk'],
              ['expectation-risk', 'Expectation risk'],
              ['playbooks', 'Playbooks'],
              ['fit-risk', 'Fit risk'],
              ['referral-value', 'Referral value'],
              ['missing', 'Missing data'],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={buildHref(params, 'view', value)}
                className="rounded-full bg-stone-800 px-3 py-1 text-stone-300 hover:bg-stone-700"
              >
                {label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {portfolio.snapshots.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold text-stone-100">No client contribution data yet</p>
            <p className="mt-2 text-sm text-stone-400">
              Add clients, import business history, complete events, and reconcile the ledger to
              build contribution intelligence.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                href="/clients/new"
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm text-white"
              >
                Add client
              </Link>
              <Link
                href="/import"
                className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100"
              >
                Import history
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : snapshots.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-stone-400">
            No clients match the current contribution filters.
          </CardContent>
        </Card>
      ) : (
        <>
          <ClientContributionCards snapshots={snapshots} />
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-stone-800 text-left text-xs uppercase tracking-[0.16em] text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Fit</th>
                      <th className="px-4 py-3">Paid</th>
                      <th className="px-4 py-3">Profit</th>
                      <th className="px-4 py-3">Margin</th>
                      <th className="px-4 py-3">Leaks</th>
                      <th className="px-4 py-3">Referral</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Capacity</th>
                      <th className="px-4 py-3">Comms ROI</th>
                      <th className="px-4 py-3">Season</th>
                      <th className="px-4 py-3">Market</th>
                      <th className="px-4 py-3">Expectation Risk</th>
                      <th className="px-4 py-3">Playbook</th>
                      <th className="px-4 py-3">Pricing</th>
                      <th className="px-4 py-3">Outstanding</th>
                      <th className="px-4 py-3">Last event</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Repair</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {snapshots.map((snapshot) => (
                      <tr key={snapshot.clientId} className="hover:bg-stone-900/50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/clients/${snapshot.clientId}#contribution`}
                            className="font-semibold text-stone-100 hover:text-brand-300"
                          >
                            {snapshot.reviewState.pinned ? 'Pinned - ' : ''}
                            {snapshot.clientName}
                          </Link>
                          <p className="text-xs text-stone-500">{snapshot.email ?? 'No email'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-stone-100">
                            {snapshot.contributionScore}
                          </div>
                          <div className="text-xs text-stone-500">{tierLabel[snapshot.tier]}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-stone-100">
                            {snapshot.fitScore.score == null
                              ? 'Needs data'
                              : snapshot.fitScore.score}
                          </div>
                          <div className="text-xs text-stone-500">{snapshot.fitScore.label}</div>
                        </td>
                        <td className="px-4 py-3 text-stone-200">
                          {money(snapshot.paidRevenueCents)}
                        </td>
                        <td className="px-4 py-3 text-stone-200">
                          {money(snapshot.netProfitCents)}
                        </td>
                        <td className="px-4 py-3 text-stone-200">
                          {snapshot.marginPercent == null
                            ? 'Unknown'
                            : `${snapshot.marginPercent}%`}
                        </td>
                        <td className="px-4 py-3">
                          {snapshot.marginLeaks.length > 0 ? (
                            <Link
                              href={buildHref(params, 'view', 'leaks')}
                              className="text-amber-300 hover:text-amber-200"
                            >
                              {snapshot.marginLeaks.length} leak
                              {snapshot.marginLeaks.length === 1 ? '' : 's'}
                            </Link>
                          ) : (
                            <span className="text-stone-500">Clear</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-stone-100">
                            {snapshot.referralNetworkValue.score}
                          </div>
                          <div className="text-xs text-stone-500">
                            {snapshot.referralNetworkValue.impactLabel}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-stone-100">
                            {snapshot.acquisitionSource.label}
                          </div>
                          <div className="text-xs text-stone-500">
                            {snapshot.acquisitionSource.known ? 'Attributed' : 'Needs repair'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-stone-100">
                            {snapshot.capacitySignal.score}
                          </div>
                          <div className="text-xs text-stone-500">
                            {snapshot.capacitySignal.label}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-stone-100">
                            {money(snapshot.communicationRoi.revenueAfterTouchCents)}
                          </div>
                          <div className="text-xs text-stone-500">
                            {snapshot.communicationRoi.label}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-stone-100">
                            {snapshot.seasonality.nextLikelyWindow?.label ??
                              snapshot.seasonality.label}
                          </div>
                          <div className="text-xs text-stone-500">
                            {snapshot.seasonality.nextLikelyWindow
                              ? `${snapshot.seasonality.nextLikelyWindow.dueInDays} days out`
                              : `${snapshot.seasonality.monthsObserved} dated events`}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-stone-100">
                            {snapshot.geographicContribution.primaryMarket?.label ?? 'Unknown'}
                          </div>
                          <div className="text-xs text-stone-500">
                            {snapshot.geographicContribution.primaryMarket
                              ? `${money(snapshot.geographicContribution.primaryMarket.profitCents)} profit`
                              : `${snapshot.geographicContribution.unknownEventCount} unknown events`}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              snapshot.expectationRisk.level === 'high'
                                ? 'error'
                                : snapshot.expectationRisk.level === 'medium'
                                  ? 'warning'
                                  : 'default'
                            }
                          >
                            {snapshot.expectationRisk.score}/100
                          </Badge>
                          <div className="mt-1 max-w-48 text-xs text-stone-500">
                            {snapshot.expectationRisk.evidence[0]?.label ?? 'No pressure'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-stone-100">
                            {snapshot.playbooks.primary.label}
                          </div>
                          <div className="max-w-56 text-xs text-stone-500">
                            {snapshot.playbooks.primary.reason}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {snapshot.playbooks.primary.actions.slice(0, 2).map((action) => (
                              <Link
                                key={`${snapshot.clientId}:${action.label}`}
                                href={action.href}
                                className="rounded-md bg-stone-800 px-2 py-1 text-xs text-stone-300 hover:bg-stone-700"
                              >
                                {action.label}
                              </Link>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              snapshot.pricingRecommendation.riskLevel === 'high'
                                ? 'error'
                                : snapshot.pricingRecommendation.riskLevel === 'medium'
                                  ? 'warning'
                                  : 'success'
                            }
                          >
                            {snapshot.pricingRecommendation.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-stone-200">
                          {money(snapshot.outstandingBalanceCents)}
                        </td>
                        <td className="px-4 py-3 text-stone-300">
                          {dateLabel(snapshot.lastEventDate)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              snapshot.reviewState.status === 'needs_review' ? 'warning' : 'success'
                            }
                          >
                            {actionLabel[snapshot.recommendedAction]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {snapshot.missingData.length > 0 ? (
                            <Link
                              href={buildHref(params, 'view', 'missing')}
                              className="text-amber-300 hover:text-amber-200"
                            >
                              {snapshot.missingData.length} gaps
                            </Link>
                          ) : (
                            <span className="text-stone-500">Clear</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
