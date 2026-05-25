// Chef Dashboard - Unified Daily Command Center
// The command center is the primary morning screen. Existing sections are preserved
// below it as secondary context. Auth + Suspense boundaries managed here.

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { requireChef } from '@/lib/auth/get-user'
import { getPriorityQueue } from '@/lib/queue/actions'
import { EMPTY_PRIORITY_QUEUE } from '@/lib/queue/types'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { WidgetCardSkeleton } from '@/components/dashboard/widget-cards/widget-card-shell'
import { TieredRailSkeleton } from '@/components/rail/tiered-rail'
import { getDailyPlanStats } from '@/lib/daily-ops/actions'
import { DailyPlanBanner } from '@/components/daily-ops/daily-plan-banner'
import { getCommandCenterData } from '@/lib/command-center/attention-actions'
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

// ---- Command Center loader (primary morning screen) ----

function CommandCenterSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-stone-800 rounded" />
      <div className="flex gap-2">
        <div className="h-8 w-32 bg-stone-800 rounded-full" />
        <div className="h-8 w-32 bg-stone-800 rounded-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          <div className="h-32 bg-stone-900/50 rounded-xl" />
          <div className="h-24 bg-stone-900/50 rounded-xl" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="h-40 bg-stone-900/50 rounded-xl" />
          <div className="h-28 bg-stone-900/50 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

async function CommandCenterWithWeight() {
  const data = await getCommandCenterData()
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
  const queuePromise = getPriorityQueue().catch((err) => {
    console.error('[Dashboard] getPriorityQueue failed:', err)
    return EMPTY_PRIORITY_QUEUE
  })
  return (
    <div className="dashboard-page min-h-screen space-y-8 sm:space-y-10">
      <AttentionRail chips={[]} />

      {/* 1. Command Center (smart mode: expands when items need attention, whispers when clear) */}
      <Suspense fallback={<CommandCenterSkeleton />}>
        <CommandCenterWithWeight />
      </Suspense>

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
