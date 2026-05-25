// Chef Dashboard - Unified Daily Command Center
// The command center is the primary morning screen. Existing sections are preserved
// below it as secondary context. Auth + Suspense boundaries managed here.

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { requireChef } from '@/lib/auth/get-user'
import { getPriorityQueue } from '@/lib/queue/actions'
import { EMPTY_PRIORITY_QUEUE, type PriorityQueue } from '@/lib/queue/types'
import { mergeChips, filterActiveChips } from '@/lib/dashboard/chip-providers'
import type { AttentionChip } from '@/lib/dashboard/section-types'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { WidgetCardSkeleton } from '@/components/dashboard/widget-cards/widget-card-shell'
import { TieredRailSkeleton } from '@/components/rail/tiered-rail'
import { getDailyPlanStats } from '@/lib/daily-ops/actions'
import { DailyPlanBanner } from '@/components/daily-ops/daily-plan-banner'
import {
  getCommandCenterData,
  type CommandCenterPayload,
} from '@/lib/command-center/attention-actions'
import { getSignalsForDisplay } from '@/lib/cil/signal-actions'
import type { ProactiveSignal } from '@/lib/cil/types'
import type { AttentionUrgency } from '@/lib/command-center/attention-aggregator'
import { CommandCenterLayout } from '@/components/command-center/command-center-layout'
import { AttentionRail } from '@/components/dashboard/attention-rail'
import { SectionShell } from '@/components/dashboard/section-shell'
import { OnboardingZone } from './_sections/onboarding-zone'
import { AmbientLayer } from './_sections/ambient-layer'
import { ThisWeekSection } from './_sections/this-week-section'
import { BusinessHealthFullSection } from './_sections/business-health-section'
import { OpenClawLiveAlertsSection } from './_sections/pricing-sections'
import {
  TieredRailSection,
  QuickNotesLoader,
  RevenueGoalSection,
  ChefTipsSection,
} from './_sections/widget-sections'
import {
  AlertsSkeleton,
  BusinessSkeleton,
  ActivitySkeleton,
  ScheduleSkeleton,
  IntelligenceCardsSkeleton,
  HeroMetricsSkeleton,
} from './_sections/section-skeletons'
import { HeroZone } from './_sections/hero-zone'
import { FeatureSuggestionSection } from './_sections/feature-suggestion-section'
import { CilSignalSummary } from './_sections/cil-signal-summary'
import { ActivityFeedSection } from './_sections/activity-feed-section'
import { getWeeklyRetroSummary } from '@/lib/scheduling/weekly-retro-summary-action'
import { WeeklyReflectionWidget } from '@/components/dashboard/weekly-reflection-widget'
import {
  ChefLifeSynthesisRail,
  ChefLifeSynthesisRailSkeleton,
} from '@/components/dashboard/chef-life-synthesis-rail'
import { getChefLifeDashboardSynthesis } from '@/lib/dashboard/chef-life-synthesis-actions'
import { ProfitAtAGlance, ProfitAtAGlanceSkeleton } from '@/components/finance/profit-at-a-glance'
import { getProfitAtAGlance } from '@/lib/finance/profit-actions'
import { IntelligenceDigestSection } from './_sections/intelligence-digest-section'
import { LazyBusinessHealthTrigger } from './_sections/lazy-business-health'

export const metadata: Metadata = { title: 'Dashboard' }

// ---- Chip extraction (module-level, not exported) ----

const URGENCY_SCORE_MAP: Record<AttentionUrgency, number> = {
  critical: 95,
  high: 80,
  medium: 60,
  low: 40,
}

const EMPTY_CC_DATA: CommandCenterPayload = {
  attentionItems: [],
  todayEvents: [],
  todayRevenueCents: 0,
  weekDays: [],
  metrics: { activeEvents: 0, openInquiries: 0, outstandingCents: 0 },
  chefFirstName: '',
  greeting: '',
}

function commandCenterChips(data: CommandCenterPayload): AttentionChip[] {
  const chips: AttentionChip[] = []

  // Group attention items by type for aggregation
  const byType = new Map<string, typeof data.attentionItems>()
  for (const item of data.attentionItems) {
    const list = byType.get(item.type) ?? []
    list.push(item)
    byType.set(item.type, list)
  }

  // Unanswered inquiries
  const inquiries = byType.get('unanswered_inquiry') ?? []
  if (inquiries.length > 0) {
    const topUrgency = inquiries[0].urgency
    chips.push({
      id: 'cc-unanswered-inquiries',
      icon: 'mail-question',
      label: `${inquiries.length} unanswered inquir${inquiries.length > 1 ? 'ies' : 'y'}`,
      urgencyScore: URGENCY_SCORE_MAP[topUrgency],
      action: { label: 'View', href: '/inquiries' },
      sectionId: 'command-center',
      dismissable: true,
    })
  }

  // Unread messages
  const messages = byType.get('unread_message') ?? []
  if (messages.length > 0) {
    chips.push({
      id: 'cc-unread-messages',
      icon: 'mail',
      label: `${messages.length} unread message${messages.length > 1 ? 's' : ''}`,
      urgencyScore: Math.min(50 + messages.length * 10, 90),
      action: { label: 'View', href: '/inbox' },
      sectionId: 'command-center',
      dismissable: true,
    })
  }

  // Events today
  const todayEvents = byType.get('event_today') ?? []
  if (todayEvents.length > 0) {
    chips.push({
      id: 'cc-events-today',
      icon: 'calendar',
      label: `${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} today`,
      urgencyScore: 95,
      action: { label: 'View', href: '/events' },
      sectionId: 'command-center',
      dismissable: false,
    })
  }

  // Unsigned contracts
  const contracts = byType.get('unsigned_contract') ?? []
  if (contracts.length > 0) {
    chips.push({
      id: 'cc-unsigned-contracts',
      icon: 'file-signature',
      label: `${contracts.length} unsigned contract${contracts.length > 1 ? 's' : ''}`,
      urgencyScore: URGENCY_SCORE_MAP[contracts[0].urgency],
      action: { label: 'View', href: contracts[0].action },
      sectionId: 'command-center',
      dismissable: true,
    })
  }

  // Unpaid invoices
  const invoices = byType.get('unpaid_invoice') ?? []
  if (invoices.length > 0) {
    chips.push({
      id: 'cc-unpaid-invoices',
      icon: 'dollar-sign',
      label: `${invoices.length} unpaid invoice${invoices.length > 1 ? 's' : ''}`,
      urgencyScore: URGENCY_SCORE_MAP[invoices[0].urgency],
      action: { label: 'View', href: invoices[0].action },
      sectionId: 'command-center',
      dismissable: true,
    })
  }

  // Expiring quotes
  const quotes = byType.get('expiring_quote') ?? []
  if (quotes.length > 0) {
    chips.push({
      id: 'cc-expiring-quotes',
      icon: 'clock',
      label: `${quotes.length} expiring quote${quotes.length > 1 ? 's' : ''}`,
      urgencyScore: 80,
      action: { label: 'View', href: quotes[0].action },
      sectionId: 'command-center',
      dismissable: true,
    })
  }

  // Open inquiries from metrics (if no attention items cover them)
  if (inquiries.length === 0 && data.metrics.openInquiries > 0) {
    chips.push({
      id: 'cc-open-inquiries',
      icon: 'inbox',
      label: `${data.metrics.openInquiries} open inquir${data.metrics.openInquiries > 1 ? 'ies' : 'y'}`,
      urgencyScore: 55,
      action: { label: 'View', href: '/inquiries' },
      sectionId: 'command-center',
      dismissable: true,
    })
  }

  return chips
}

function queueChips(queue: PriorityQueue): AttentionChip[] {
  if (!queue.nextAction) return []
  const item = queue.nextAction
  const scoreMap = { critical: 95, high: 80, normal: 60, low: 40 } as const
  const score = scoreMap[item.urgency as keyof typeof scoreMap] ?? 50
  if (score < 50) return []
  return [
    {
      id: `queue-${item.id}`,
      icon: item.icon || 'alert-triangle',
      label: item.title,
      urgencyScore: score,
      action: { label: 'Resolve', href: item.href },
      sectionId: 'tiered-rail',
      dismissable: true,
    },
  ]
}

const CIL_DOMAIN_ICON: Record<string, string> = {
  finance: 'dollar-sign',
  clients: 'users',
  calendar: 'calendar',
  inventory: 'package',
  reputation: 'star',
  pipeline: 'git-branch',
  commitment: 'shield-check',
  network: 'globe',
}

function cilChips(signals: ProactiveSignal[]): AttentionChip[] {
  return signals
    .filter((s) => s.urgency >= 3 && !s.dismissedAt)
    .slice(0, 3)
    .map((s) => ({
      id: `cil-${s.id}`,
      icon: CIL_DOMAIN_ICON[s.domain] || 'brain',
      label: s.title,
      urgencyScore: Math.min(s.urgency * 20 + Math.round(s.confidence * 10), 100),
      action: {
        label: 'Review',
        href: '/dashboard#cil-signal-summary',
      },
      sectionId: 'cil-signal-summary',
      dismissable: true,
    }))
}

// ---- Command Center (receives data from page-level fetch) ----

function CommandCenterWithWeight({ data }: { data: CommandCenterPayload }) {
  const totalItems =
    data.attentionItems.length + data.todayEvents.length + data.metrics.openInquiries
  const mode = totalItems > 0 ? 'expanded' : 'whisper'
  const whisperText = totalItems === 0 ? 'Command Center: all clear' : undefined

  return (
    <SectionShell
      sectionId="command-center"
      mode={mode}
      label="Command Center"
      whisperText={whisperText}
    >
      <WidgetErrorBoundary name="Command Center" compact>
        <CommandCenterLayout data={data} onRefresh={getCommandCenterData} />
      </WidgetErrorBoundary>
    </SectionShell>
  )
}

export default async function ChefDashboard() {
  const user = await requireChef()
  const businessHealthLoaded = cookies().get('cf-dash-bh-loaded')?.value === '1'

  const [queueResult, ccData, cilSignals] = await Promise.all([
    getPriorityQueue().catch((err) => {
      console.error('[Dashboard] getPriorityQueue failed:', err)
      return EMPTY_PRIORITY_QUEUE
    }),
    getCommandCenterData().catch((err) => {
      console.error('[Dashboard] getCommandCenterData failed:', err)
      return EMPTY_CC_DATA
    }),
    getSignalsForDisplay().catch((err) => {
      console.error('[Dashboard] getSignalsForDisplay failed:', err)
      return [] as ProactiveSignal[]
    }),
  ])

  const queuePromise = Promise.resolve(queueResult)

  const allChips = filterActiveChips(
    mergeChips(commandCenterChips(ccData), queueChips(queueResult), cilChips(cilSignals))
  )

  return (
    <div className="dashboard-page min-h-screen space-y-8 sm:space-y-10">
      <AttentionRail chips={allChips} />

      {/* 1. Command Center (smart mode: expands when items need attention, whispers when clear) */}
      <CommandCenterWithWeight data={ccData} />

      {/* 2. Daily Plan Banner (smart mode: whisper when empty, compact when done, expanded when tasks remain) */}
      <WidgetErrorBoundary name="Daily Plan" compact>
        <Suspense fallback={null}>
          <DailyPlanWithWeight />
        </Suspense>
      </WidgetErrorBoundary>

      {/* 3. This Week */}
      <SectionShell sectionId="this-week" mode="expanded" label="This Week">
        <WidgetErrorBoundary name="This Week" compact>
          <Suspense fallback={<ScheduleSkeleton />}>
            <ThisWeekSection queuePromise={queuePromise} />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>

      {/* 5. Tiered Rail */}
      <SectionShell sectionId="tiered-rail" mode="expanded" label="Tiered Rail">
        <WidgetErrorBoundary name="Tiered Rail" compact>
          <Suspense fallback={<TieredRailSkeleton />}>
            <TieredRailSection queuePromise={queuePromise} />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>

      {/* 6. Pricing Alerts */}
      <SectionShell sectionId="pricing-alerts" mode="expanded" label="Pricing Alerts">
        <WidgetErrorBoundary name="Pricing Alerts" compact>
          <Suspense fallback={<AlertsSkeleton />}>
            <OpenClawLiveAlertsSection />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>

      {/* 7. Onboarding */}
      <SectionShell sectionId="onboarding" mode="expanded" label="Onboarding">
        <WidgetErrorBoundary name="Onboarding" compact>
          <Suspense fallback={<ActivitySkeleton />}>
            <OnboardingZone />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>

      {/* 8. Hero Zone */}
      <SectionShell sectionId="hero-zone" mode="expanded" label="Hero Zone">
        <WidgetErrorBoundary name="Hero Zone" compact>
          <Suspense fallback={<HeroMetricsSkeleton />}>
            <HeroZone
              tenantId={user.tenantId!}
              userId={user.id}
              entityId={user.entityId}
              email={user.email ?? ''}
            />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>

      {/* 9. Profit at a Glance */}
      <SectionShell sectionId="profit-at-a-glance" mode="expanded" label="Profit at a Glance">
        <WidgetErrorBoundary name="Profit at a Glance" compact>
          <Suspense fallback={<ProfitAtAGlanceSkeleton />}>
            <ProfitAtAGlanceLoader />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>

      {/* 10. Revenue Goal */}
      <SectionShell sectionId="revenue-goal" mode="expanded" label="Revenue Goal">
        <WidgetErrorBoundary name="Revenue Goal" compact>
          <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
            <RevenueGoalSection />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>

      {/* 11. Business Health */}
      <SectionShell sectionId="business-health" mode="expanded" label="Business Health">
        {businessHealthLoaded ? (
          <WidgetErrorBoundary name="Business Health" compact>
            <Suspense fallback={<BusinessSkeleton />}>
              <BusinessHealthFullSection />
            </Suspense>
          </WidgetErrorBoundary>
        ) : (
          <LazyBusinessHealthTrigger />
        )}
      </SectionShell>

      {/* 12. Chef Life Synthesis */}
      <SectionShell sectionId="chef-life-synthesis" mode="expanded" label="Chef Life Synthesis">
        <WidgetErrorBoundary name="Chef Life Synthesis" compact>
          <Suspense fallback={<ChefLifeSynthesisRailSkeleton />}>
            <ChefLifeSynthesisLoader />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>

      {/* 13. Intelligence Digest */}
      <SectionShell sectionId="intelligence-digest" mode="expanded" label="Intelligence Digest">
        <WidgetErrorBoundary name="Intelligence Digest" compact>
          <Suspense fallback={<IntelligenceCardsSkeleton />}>
            <IntelligenceDigestSection />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>

      {/* 14. CIL Signal Summary (System Pulse) */}
      <SectionShell sectionId="cil-signal-summary" mode="expanded" label="System Pulse">
        <WidgetErrorBoundary name="System Pulse" compact>
          <Suspense fallback={<IntelligenceCardsSkeleton />}>
            <CilSignalSummary />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>

      {/* 15. Ambient Layer */}
      <SectionShell sectionId="ambient-layer" mode="expanded" label="Ambient Layer">
        <WidgetErrorBoundary name="Ambient Layer" compact>
          <Suspense fallback={<IntelligenceCardsSkeleton />}>
            <AmbientLayer />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>

      {/* 16. Activity Feed */}
      <SectionShell sectionId="activity-feed" mode="expanded" label="Activity Feed">
        <WidgetErrorBoundary name="Activity Feed" compact>
          <Suspense fallback={<IntelligenceCardsSkeleton />}>
            <ActivityFeedSection />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>

      {/* 17. Weekly Reflection */}
      <SectionShell sectionId="weekly-reflection" mode="expanded" label="Weekly Reflection">
        <WidgetErrorBoundary name="Weekly Reflection" compact>
          <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
            <WeeklyReflectionLoader />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>

      {/* 18. Quick Notes + Chef Tips */}
      <SectionShell sectionId="quick-notes-tips" mode="expanded" label="Quick Notes & Tips">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <WidgetErrorBoundary name="Quick Notes" compact>
            <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
              <QuickNotesLoader />
            </Suspense>
          </WidgetErrorBoundary>

          <WidgetErrorBoundary name="ChefTips" compact>
            <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
              <ChefTipsSection />
            </Suspense>
          </WidgetErrorBoundary>
        </div>
      </SectionShell>

      {/* 19. Feature Suggestions */}
      <SectionShell sectionId="feature-suggestions" mode="expanded" label="Feature Suggestions">
        <WidgetErrorBoundary name="Feature Suggestions" compact>
          <Suspense fallback={null}>
            <FeatureSuggestionSection />
          </Suspense>
        </WidgetErrorBoundary>
      </SectionShell>
    </div>
  )
}

async function DailyPlanWithWeight() {
  const stats = await getDailyPlanStats().catch((err) => {
    console.error('[Dashboard] getDailyPlanStats failed:', err)
    return null
  })

  if (!stats || stats.totalItems <= 0) {
    return (
      <SectionShell
        sectionId="daily-plan"
        mode="whisper"
        label="Daily Plan"
        whisperText="Daily Plan: nothing scheduled"
      >
        <span />
      </SectionShell>
    )
  }

  const completed = stats.completedItems ?? 0
  const total = stats.totalItems
  const mode = total - completed > 0 ? 'expanded' : 'compact'
  const compactSummary = `${completed}/${total} complete`

  return (
    <SectionShell
      sectionId="daily-plan"
      mode={mode}
      label="Daily Plan"
      compactSummary={compactSummary}
    >
      <DailyPlanBanner stats={stats} />
    </SectionShell>
  )
}

async function WeeklyReflectionLoader() {
  const summary = await getWeeklyRetroSummary().catch((err) => {
    console.error('[Dashboard] getWeeklyRetroSummary failed:', err)
    return null
  })
  if (!summary || !summary.hasActivity) return null
  return <WeeklyReflectionWidget summary={summary} />
}

async function ProfitAtAGlanceLoader() {
  const data = await getProfitAtAGlance().catch((err) => {
    console.error('[Dashboard] getProfitAtAGlance failed:', err)
    return {
      monthlyProfitCents: 0,
      monthlyRevenueCents: 0,
      monthlyCostCents: 0,
      eventCount: 0,
      avgProfitPerEventCents: 0,
      trend: {
        currentMonthProfitCents: 0,
        lastMonthProfitCents: 0,
        changePercent: null,
        direction: 'flat' as const,
      },
      ytdProfitCents: 0,
      ytdRevenueCents: 0,
      ytdCostCents: 0,
      ytdEventCount: 0,
      hasData: false,
    }
  })
  return <ProfitAtAGlance data={data} />
}

async function ChefLifeSynthesisLoader() {
  const data = await getChefLifeDashboardSynthesis()
  return <ChefLifeSynthesisRail data={data} />
}
