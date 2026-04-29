// Clientele Intelligence - Client Wrapper
// Manages tab state and renders the four insight panels
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  DinnerTimeChart,
  OccasionChart,
  ServiceStylePieChart,
  GuestCountHistogram,
  DietaryFrequencyChart,
  MonthlyVolumeChart,
  DayOfWeekChart,
  RevenueTrendChart,
  AcquisitionSourcePieChart,
  ClientStatusChart,
  LoyaltyTierPieChart,
  EventsPerClientHistogram,
  LTVDistributionChart,
  PhaseTimeChart,
  AARRatingTrendChart,
  ForgottenItemsChart,
  RevenueByOccasionChart,
  StyleValueChart,
} from '@/components/analytics/insights-charts'
import type {
  DinnerTimeSlot,
  OccasionStat,
  ServiceStyleStat,
  GuestCountBucket,
  DietaryFrequency,
  MonthlyVolume,
  DayOfWeekStat,
  RevenueTrendPoint,
  ClientAcquisitionStats,
  RetentionStats,
  LTVBucket,
  PhaseTimeStats,
  AARTrends,
  FinancialIntelligence,
  TakeAChefROI,
} from '@/lib/analytics/insights-actions'
import type {
  CulinaryUsageRanking,
  CulinaryUsageStats,
  CulinaryUsageTrendPoint,
} from '@/lib/analytics/culinary-usage-types'
import type {
  MetricCoverageSummary,
  MetricDefinition,
  MetricDomain,
  MetricRollupCadence,
} from '@/lib/analytics/metric-registry'

// ─── Types ────────────────────────────────────────────

interface InsightsClientProps {
  initialTab?: string
  dinnerTime: DinnerTimeSlot[]
  occasions: OccasionStat[]
  serviceStyles: ServiceStyleStat[]
  guestCounts: GuestCountBucket[]
  dietary: DietaryFrequency[]
  monthlyVolume: MonthlyVolume[]
  dayOfWeek: DayOfWeekStat[]
  revenueTrend: RevenueTrendPoint[]
  acquisitionStats: ClientAcquisitionStats
  retention: RetentionStats
  ltvDistribution: LTVBucket[]
  phaseStats: PhaseTimeStats
  aarTrends: AARTrends
  financialStats: FinancialIntelligence
  culinaryUsage: CulinaryUsageStats
  tacROI: TakeAChefROI
  metricDefinitions: readonly MetricDefinition[]
  metricCoverage: MetricCoverageSummary
}

// ─── Tab Config ───────────────────────────────────────

const TABS = [
  { id: 'clientele', label: 'Clientele' },
  { id: 'seasons', label: 'Seasons & Trends' },
  { id: 'client-base', label: 'Client Base' },
  { id: 'operations', label: 'Operations' },
  { id: 'culinary-usage', label: 'Culinary Usage' },
  { id: 'metric-registry', label: 'Metric Registry' },
  { id: 'take-a-chef', label: 'Take a Chef ROI' },
] as const

type TabId = (typeof TABS)[number]['id']

const DEFAULT_TAB: TabId = 'clientele'
const DEEP_LINK_TAB_IDS = new Set<TabId>([
  'clientele',
  'seasons',
  'client-base',
  'operations',
  'culinary-usage',
  'metric-registry',
  'take-a-chef',
])

function isDeepLinkTabId(value: string | undefined): value is TabId {
  return DEEP_LINK_TAB_IDS.has(value as TabId)
}

function validateTabId(value: string | undefined): TabId {
  return isDeepLinkTabId(value) ? value : DEFAULT_TAB
}

// ─── Helpers ──────────────────────────────────────────

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatMinutes(minutes: number): string {
  if (minutes === 0) return '-'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function formatLabel(value: string | null | undefined): string {
  if (!value) return 'Uncategorized'
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatRegistryToken(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatFreshness(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 1440)}d`
}

// ─── Stat Card ────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-stone-800 rounded-xl p-4 border border-stone-800">
      <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-stone-100 mt-1">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Chart Card ───────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-stone-100">{title}</h3>
        {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </Card>
  )
}

// ─── Tab 1: Clientele ─────────────────────────────────

function ClienteleTab({
  dinnerTime,
  occasions,
  serviceStyles,
  guestCounts,
  dietary,
}: Pick<
  InsightsClientProps,
  'dinnerTime' | 'occasions' | 'serviceStyles' | 'guestCounts' | 'dietary'
>) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Preferred Dinner Time"
          subtitle="When your clients like to eat - hour of first service"
        >
          <DinnerTimeChart data={dinnerTime} />
        </ChartCard>

        <ChartCard
          title="Guest Count Distribution"
          subtitle="Party sizes across completed and confirmed events"
        >
          <GuestCountHistogram data={guestCounts} />
        </ChartCard>

        <ChartCard title="Most Common Occasions" subtitle="What your clients are celebrating">
          <OccasionChart data={occasions} />
        </ChartCard>

        <ChartCard
          title="Service Style Breakdown"
          subtitle="How your events are typically formatted"
        >
          <ServiceStylePieChart data={serviceStyles} />
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard
            title="Dietary Restrictions Across Clientele"
            subtitle="Frequency across client profiles and event bookings - top 15"
          >
            <DietaryFrequencyChart data={dietary} />
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 2: Seasons & Trends ──────────────────────────

function SeasonsTab({
  monthlyVolume,
  dayOfWeek,
  revenueTrend,
}: Pick<InsightsClientProps, 'monthlyVolume' | 'dayOfWeek' | 'revenueTrend'>) {
  const busiestMonth = monthlyVolume.reduce(
    (max, m) => (m.events > max.events ? m : max),
    monthlyVolume[0] ?? { month: '-', events: 0, revenue_cents: 0, completed: 0 }
  )
  const slowestMonth = monthlyVolume.reduce(
    (min, m) => (m.events < min.events ? m : min),
    monthlyVolume[0] ?? { month: '-', events: 0, revenue_cents: 0, completed: 0 }
  )
  const busiestDay = dayOfWeek.reduce(
    (max, d) => (d.count > max.count ? d : max),
    dayOfWeek[0] ?? { day: '-', count: 0 }
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Busiest Month"
          value={busiestMonth.month}
          sub={`${busiestMonth.events} events historically`}
        />
        <StatCard
          label="Slowest Month"
          value={slowestMonth.month}
          sub={`${slowestMonth.events} events historically`}
        />
        <StatCard
          label="Most Popular Day"
          value={busiestDay.day}
          sub={`${busiestDay.count} events`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Monthly Event Volume"
          subtitle="Events (bars) and revenue (line) by calendar month - all years combined"
        >
          <MonthlyVolumeChart data={monthlyVolume} />
        </ChartCard>

        <ChartCard
          title="Day of Week"
          subtitle="Which days clients prefer to book - completed and confirmed events"
        >
          <DayOfWeekChart data={dayOfWeek} />
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard
            title="18-Month Revenue Trend"
            subtitle="Net revenue received per month - rolling 18 months"
          >
            <RevenueTrendChart data={revenueTrend} />
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 3: Client Base ───────────────────────────────

function ClientBaseTab({
  acquisitionStats,
  retention,
  ltvDistribution,
}: Pick<InsightsClientProps, 'acquisitionStats' | 'retention' | 'ltvDistribution'>) {
  return (
    <div className="space-y-6">
      {/* Retention KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={retention.total} />
        <StatCard
          label="Repeat Rate"
          value={`${retention.repeatRate}%`}
          sub="clients with 2+ events"
        />
        <StatCard label="Avg Events / Client" value={retention.avgEventsPerClient} />
        <StatCard label="Dormant Clients" value={retention.dormant} sub="no booking in 6+ months" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="How Clients Found You"
          subtitle="Referral source at time of first booking"
        >
          <AcquisitionSourcePieChart data={acquisitionStats.bySource} />
        </ChartCard>

        <ChartCard title="Client Status Breakdown" subtitle="Active · Repeat Ready · VIP · Dormant">
          <ClientStatusChart data={acquisitionStats.byStatus} />
        </ChartCard>

        <ChartCard title="Events per Client" subtitle="How many times has each client booked?">
          <EventsPerClientHistogram data={retention.eventsPerClientHistogram} />
        </ChartCard>

        <ChartCard
          title="Loyalty Tier Distribution"
          subtitle="Which loyalty tiers your clients are in"
        >
          <LoyaltyTierPieChart data={acquisitionStats.byLoyaltyTier} />
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard
            title="Lifetime Value Distribution"
            subtitle="Revenue tiers across your entire client base"
          >
            <LTVDistributionChart data={ltvDistribution} />
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 4: Operations ────────────────────────────────

function OperationsTab({
  phaseStats,
  aarTrends,
  financialStats,
}: Pick<InsightsClientProps, 'phaseStats' | 'aarTrends' | 'financialStats'>) {
  return (
    <div className="space-y-6">
      {/* Operational KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Avg Total Time / Event"
          value={formatMinutes(phaseStats.avgTotalMinutes)}
          sub={`across ${phaseStats.eventCount} completed events`}
        />
        <StatCard
          label="Service Min / Guest"
          value={
            phaseStats.avgServiceMinPerGuest > 0 ? `${phaseStats.avgServiceMinPerGuest}m` : '-'
          }
          sub="avg service time per guest"
        />
        <StatCard
          label="Avg Event Value"
          value={
            financialStats.avgEventValue > 0 ? formatCurrency(financialStats.avgEventValue) : '-'
          }
          sub="completed events only"
        />
        <StatCard
          label="Tip Rate"
          value={`${financialStats.avgTipRate}%`}
          sub={`${financialStats.tipParticipationRate}% of events tipped`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Time per Phase"
          subtitle="Average minutes spent in each operational phase"
        >
          <PhaseTimeChart data={phaseStats.phaseAverages} />
        </ChartCard>

        <ChartCard
          title="Revenue by Occasion"
          subtitle="Total and average revenue - completed events by occasion type"
        >
          <RevenueByOccasionChart data={financialStats.revenueByOccasion} />
        </ChartCard>

        <ChartCard
          title="Avg Event Value by Service Style"
          subtitle="Which service formats command the highest rates"
        >
          <StyleValueChart data={financialStats.avgValueByStyle} />
        </ChartCard>

        <ChartCard
          title="Top Forgotten Items"
          subtitle="Items most often noted as forgotten across all after-action reviews"
        >
          <ForgottenItemsChart data={aarTrends.topForgotten} />
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard
            title="Quality Ratings Over Time"
            subtitle="Calm, Preparation, and Execution scores from after-action reviews - 12 months"
          >
            <AARRatingTrendChart data={aarTrends.trend} />
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 5: Take a Chef ROI ───────────────────────────

function RankingTable({
  title,
  rows,
  countLabel,
}: {
  title: string
  rows: CulinaryUsageRanking[]
  countLabel: string
}) {
  if (rows.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="font-semibold text-stone-100">{title}</h3>
        <p className="text-sm text-stone-500 mt-4">No linked usage data yet.</p>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-stone-100 mb-4">{title}</h3>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-lg border border-stone-800 bg-stone-900/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-stone-500">#{index + 1}</p>
                <p className="font-medium text-stone-200 break-words">{row.name}</p>
                <p className="text-xs text-stone-500">{formatLabel(row.category)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xl font-bold text-stone-100">{row.useCount}</p>
                <p className="text-xs text-stone-500">{countLabel}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-stone-500">Events</p>
                <p className="font-medium text-stone-300">{row.eventCount}</p>
              </div>
              <div>
                <p className="text-stone-500">Revenue</p>
                <p className="font-medium text-stone-300">
                  {row.revenueCents > 0 ? formatCurrency(row.revenueCents) : '-'}
                </p>
              </div>
              <div>
                <p className="text-stone-500">Last used</p>
                <p className="font-medium text-stone-300">{formatDate(row.lastUsedAt)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function UsageTrend({ data }: { data: CulinaryUsageTrendPoint[] }) {
  const maxValue = Math.max(
    1,
    ...data.map((point) => Math.max(point.menuUses, point.recipeUses, point.ingredientUses))
  )
  const barWidth = (value: number) =>
    value > 0 ? `${Math.max(4, (value / maxValue) * 100)}%` : '0%'

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-stone-100 mb-4">12-Month Usage Signal</h3>
      <div className="space-y-3">
        {data.map((point) => (
          <div key={point.period} className="grid grid-cols-[64px_1fr] items-center gap-3">
            <p className="text-xs text-stone-500">{point.period}</p>
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-500"
                  style={{ width: barWidth(point.menuUses) }}
                />
              </div>
              <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: barWidth(point.recipeUses) }}
                />
              </div>
              <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: barWidth(point.ingredientUses) }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-cyan-500" /> Menus
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-violet-500" /> Recipes
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ingredients
        </span>
      </div>
    </Card>
  )
}

function CulinaryUsageTab({ culinaryUsage }: Pick<InsightsClientProps, 'culinaryUsage'>) {
  const coverage = culinaryUsage.coverage
  const menuCoverage =
    coverage.trackedEvents > 0
      ? Math.round((coverage.eventsWithMenus / coverage.trackedEvents) * 100)
      : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tracked Events"
          value={coverage.trackedEvents}
          sub={`${coverage.eventsWithMenus} have menus linked`}
        />
        <StatCard
          label="Menu Coverage"
          value={coverage.trackedEvents > 0 ? `${menuCoverage}%` : '-'}
          sub="accepted through completed events"
        />
        <StatCard
          label="Recipes Observed"
          value={coverage.linkedRecipes}
          sub="from linked event menus"
        />
        <StatCard
          label="Ingredients Observed"
          value={coverage.ingredientsInActiveRecipes}
          sub={`${coverage.activeMenus} active menus total`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <RankingTable
          title="Most-Used Ingredients"
          rows={culinaryUsage.topIngredients}
          countLabel="Uses"
        />
        <RankingTable title="Most-Used Recipes" rows={culinaryUsage.topRecipes} countLabel="Uses" />
        <RankingTable
          title="Most-Picked Menus"
          rows={culinaryUsage.topMenus}
          countLabel="Bookings"
        />
      </div>

      <UsageTrend data={culinaryUsage.recentTrend} />

      <Card className="p-5">
        <h3 className="font-semibold text-stone-100">Coverage Notes</h3>
        <p className="text-sm text-stone-400 mt-2">
          These numbers are derived from real linked event menus, dishes, recipe components, and
          recipe ingredients. Events without a linked menu are counted in coverage, but are not used
          for ingredient or recipe rankings.
        </p>
      </Card>
    </div>
  )
}

function TakeAChefROITab({ roi }: { roi: TakeAChefROI }) {
  const hasData = roi.tacClientCount > 0

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-stone-700 p-10 text-center">
        <p className="text-3xl mb-3">🍽️</p>
        <p className="font-semibold text-stone-300 text-lg">No Take a Chef clients yet</p>
        <p className="text-stone-500 text-sm mt-2 max-w-md mx-auto">
          When you capture a Take a Chef booking via Smart Import, the ROI analytics will appear
          here - showing how many platform clients have converted to direct bookings and how much
          commission you&apos;ve saved.
        </p>
        <a
          href="/import?mode=take-a-chef"
          className="inline-block mt-4 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
        >
          Import a Take a Chef Booking
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="TAC Clients" value={roi.tacClientCount} sub="acquired via platform" />
        <StatCard
          label="Platform Bookings"
          value={roi.platformBookingsCount}
          sub="with commission paid"
        />
        <StatCard
          label="Direct Repeat Bookings"
          value={roi.directBookingsCount}
          sub="commission-free"
        />
        <StatCard
          label="Conversion Rate"
          value={`${roi.conversionRate}%`}
          sub="TAC clients who went direct"
        />
      </div>

      {/* Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Commission Logged"
          value={
            roi.estimatedCommissionPaidCents > 0
              ? formatCurrency(roi.estimatedCommissionPaidCents)
              : '-'
          }
          sub="tracked as business expenses"
        />
        <StatCard
          label="Est. Commission Saved"
          value={
            roi.estimatedCommissionSavedCents > 0
              ? formatCurrency(roi.estimatedCommissionSavedCents)
              : '-'
          }
          sub={`on direct repeat bookings (${roi.defaultCommissionPercent}% est.)`}
        />
        <StatCard
          label="Avg Event Value"
          value={roi.avgEventValueCents > 0 ? formatCurrency(roi.avgEventValueCents) : '-'}
          sub="across all TAC client events"
        />
      </div>

      {/* Top Clients Table */}
      {roi.topTacClients.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-stone-100 mb-4">Top Take a Chef Clients</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800">
                  <th className="text-left py-2 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                    Client
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                    Total Events
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                    Direct Events
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                    Direct Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {roi.topTacClients.map((client) => {
                  const directRate =
                    client.totalEvents > 0
                      ? Math.round((client.directEvents / client.totalEvents) * 100)
                      : 0
                  return (
                    <tr
                      key={client.clientId}
                      className="border-b border-stone-50 hover:bg-stone-800"
                    >
                      <td className="py-2.5">
                        <a
                          href={`/clients/${client.clientId}`}
                          className="font-medium text-stone-200 hover:text-brand-600"
                        >
                          {client.name}
                        </a>
                      </td>
                      <td className="py-2.5 text-right text-stone-400">{client.totalEvents}</td>
                      <td className="py-2.5 text-right text-stone-400">{client.directEvents}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            directRate >= 50
                              ? 'bg-green-900 text-green-800'
                              : directRate > 0
                                ? 'bg-amber-900 text-amber-800'
                                : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {directRate}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Explainer */}
      <div className="rounded-lg bg-stone-800 border border-stone-800 p-4 text-sm text-stone-400">
        <p className="font-medium text-stone-200 mb-1">How this works</p>
        <p>
          Take a Chef finds your clients. ChefFlow builds the direct relationship. Every time a
          client who first found you on Take a Chef books you directly, you save the platform
          commission. This panel estimates saved commission using your current Take a Chef default
          rate of {roi.defaultCommissionPercent}% and tracks the actual commission expenses you log.
        </p>
      </div>
    </div>
  )
}

const DOMAIN_LABELS: Record<MetricDomain, string> = {
  sales: 'Sales',
  planning: 'Planning',
  culinary: 'Culinary',
  inventory: 'Inventory',
  money: 'Money',
  growth: 'Growth',
  operations: 'Operations',
  quality: 'Quality',
}

const ROLLUP_LABELS: Record<MetricRollupCadence, string> = {
  live: 'Live',
  hourly: 'Hourly',
  daily: 'Daily',
  monthly: 'Monthly',
}

function MetricRegistryTab({
  metricDefinitions,
  metricCoverage,
}: Pick<InsightsClientProps, 'metricDefinitions' | 'metricCoverage'>) {
  const sortedDefinitions = [...metricDefinitions].sort((a, b) => {
    const domainSort = DOMAIN_LABELS[a.domain].localeCompare(DOMAIN_LABELS[b.domain])
    return domainSort === 0 ? a.label.localeCompare(b.label) : domainSort
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tracked Metrics" value={metricCoverage.total} sub="canonical registry" />
        <StatCard label="Domains" value={metricCoverage.domains} sub="business areas covered" />
        <StatCard
          label="Live or Hourly"
          value={metricCoverage.rollupCounts.live + metricCoverage.rollupCounts.hourly}
          sub="fresh operational signals"
        />
        <StatCard
          label="Max SLA"
          value={formatFreshness(metricCoverage.maxFreshnessSlaMinutes)}
          sub="slowest allowed freshness"
        />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-stone-100">Metric Truth Registry</h3>
            <p className="text-sm text-stone-500 mt-1">
              Canonical definitions for every analytics number exposed to the chef portal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-stone-400">
            {Object.entries(metricCoverage.rollupCounts).map(([cadence, count]) => (
              <span
                key={cadence}
                className="rounded-full border border-stone-800 bg-stone-900 px-2.5 py-1"
              >
                {ROLLUP_LABELS[cadence as MetricRollupCadence]}: {count}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {sortedDefinitions.map((metric) => (
          <Card key={metric.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  {DOMAIN_LABELS[metric.domain]}
                </p>
                <h4 className="mt-1 font-semibold text-stone-100 break-words">{metric.label}</h4>
                <p className="mt-1 text-xs text-stone-500 break-all">{metric.id}</p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2 text-xs">
                <span className="rounded-full bg-stone-800 px-2.5 py-1 text-stone-300">
                  {ROLLUP_LABELS[metric.rollupCadence]}
                </span>
                <span className="rounded-full bg-stone-800 px-2.5 py-1 text-stone-300">
                  SLA {formatFreshness(metric.freshnessSlaMinutes)}
                </span>
              </div>
            </div>

            <p className="mt-3 text-sm text-stone-400">{metric.description}</p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-stone-500">Value</p>
                <p className="mt-1 font-medium text-stone-300">
                  {formatRegistryToken(metric.valueKind)}
                </p>
              </div>
              <div>
                <p className="text-stone-500">Scope</p>
                <p className="mt-1 font-medium text-stone-300">
                  {formatRegistryToken(metric.tenantScope)}
                </p>
              </div>
              <div>
                <p className="text-stone-500">Owner</p>
                <p className="mt-1 font-medium text-stone-300">
                  {formatRegistryToken(metric.owner)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div>
                <p className="text-stone-500">Source action</p>
                <p className="mt-1 font-mono text-stone-300 break-all">{metric.sourceAction}</p>
              </div>
              <div>
                <p className="text-stone-500">Tables</p>
                <p className="mt-1 text-stone-300 break-words">{metric.sourceTables.join(', ')}</p>
              </div>
              <div>
                <p className="text-stone-500">Surfaces</p>
                <p className="mt-1 text-stone-300 break-words">{metric.surfaces.join(', ')}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Main Client Component ────────────────────────────

export function InsightsClient({
  initialTab,
  dinnerTime,
  occasions,
  serviceStyles,
  guestCounts,
  dietary,
  monthlyVolume,
  dayOfWeek,
  revenueTrend,
  acquisitionStats,
  retention,
  ltvDistribution,
  phaseStats,
  aarTrends,
  financialStats,
  culinaryUsage,
  tacROI,
  metricDefinitions,
  metricCoverage,
}: InsightsClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>(() => validateTabId(initialTab))

  useEffect(() => {
    setActiveTab(validateTabId(initialTab))
  }, [initialTab])

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0.5 border-b border-stone-700 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors rounded-t-lg ${
              activeTab === tab.id
                ? 'text-violet-700 border-b-2 border-violet-600 bg-violet-950/50'
                : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === 'clientele' && (
        <ClienteleTab
          dinnerTime={dinnerTime}
          occasions={occasions}
          serviceStyles={serviceStyles}
          guestCounts={guestCounts}
          dietary={dietary}
        />
      )}
      {activeTab === 'seasons' && (
        <SeasonsTab
          monthlyVolume={monthlyVolume}
          dayOfWeek={dayOfWeek}
          revenueTrend={revenueTrend}
        />
      )}
      {activeTab === 'client-base' && (
        <ClientBaseTab
          acquisitionStats={acquisitionStats}
          retention={retention}
          ltvDistribution={ltvDistribution}
        />
      )}
      {activeTab === 'operations' && (
        <OperationsTab
          phaseStats={phaseStats}
          aarTrends={aarTrends}
          financialStats={financialStats}
        />
      )}
      {activeTab === 'culinary-usage' && <CulinaryUsageTab culinaryUsage={culinaryUsage} />}
      {activeTab === 'metric-registry' && (
        <MetricRegistryTab metricDefinitions={metricDefinitions} metricCoverage={metricCoverage} />
      )}
      {activeTab === 'take-a-chef' && <TakeAChefROITab roi={tacROI} />}
    </div>
  )
}
