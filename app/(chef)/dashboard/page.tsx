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

async function CommandCenterLoader() {
  const data = await getCommandCenterData()
  return <CommandCenterLayout data={data} onRefresh={getCommandCenterData} />
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
      {/* Command Center: the unified daily morning screen */}
      <WidgetErrorBoundary name="Command Center" compact>
        <Suspense fallback={<CommandCenterSkeleton />}>
          <CommandCenterLoader />
        </Suspense>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary name="Pricing Alerts" compact>
        <Suspense fallback={<AlertsSkeleton />}>
          <OpenClawLiveAlertsSection />
        </Suspense>
      </WidgetErrorBoundary>

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

      <WidgetErrorBoundary name="Feature Suggestions" compact>
        <Suspense fallback={null}>
          <FeatureSuggestionSection />
        </Suspense>
      </WidgetErrorBoundary>

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

      <WidgetErrorBoundary name="Tiered Rail" compact>
        <Suspense fallback={<TieredRailSkeleton />}>
          <TieredRailSection queuePromise={queuePromise} />
        </Suspense>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary name="Chef Life Synthesis" compact>
        <Suspense fallback={<ChefLifeSynthesisRailSkeleton />}>
          <ChefLifeSynthesisLoader />
        </Suspense>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary name="Daily Plan" compact>
        <Suspense fallback={null}>
          <DailyPlanBannerLoader />
        </Suspense>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary name="This Week" compact>
        <Suspense fallback={<ScheduleSkeleton />}>
          <ThisWeekSection queuePromise={queuePromise} />
        </Suspense>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary name="Onboarding" compact>
        <Suspense fallback={<ActivitySkeleton />}>
          <OnboardingZone />
        </Suspense>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary name="Ambient Layer" compact>
        <Suspense fallback={<IntelligenceCardsSkeleton />}>
          <AmbientLayer />
        </Suspense>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary name="Intelligence Digest" compact>
        <Suspense fallback={<IntelligenceCardsSkeleton />}>
          <IntelligenceDigestSection />
        </Suspense>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary name="System Pulse" compact>
        <Suspense fallback={<IntelligenceCardsSkeleton />}>
          <CilSignalSummary />
        </Suspense>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary name="Activity Feed" compact>
        <Suspense fallback={<IntelligenceCardsSkeleton />}>
          <ActivityFeedSection />
        </Suspense>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary name="Weekly Reflection" compact>
        <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
          <WeeklyReflectionLoader />
        </Suspense>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary name="Profit at a Glance" compact>
        <Suspense fallback={<ProfitAtAGlanceSkeleton />}>
          <ProfitAtAGlanceLoader />
        </Suspense>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary name="Revenue Goal" compact>
        <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
          <RevenueGoalSection />
        </Suspense>
      </WidgetErrorBoundary>

      {businessHealthLoaded ? (
        <WidgetErrorBoundary name="Business Health" compact>
          <Suspense fallback={<BusinessSkeleton />}>
            <BusinessHealthFullSection />
          </Suspense>
        </WidgetErrorBoundary>
      ) : (
        <LazyBusinessHealthTrigger />
      )}
    </div>
  )
}

async function DailyPlanBannerLoader() {
  const stats = await getDailyPlanStats().catch((err) => {
    console.error('[Dashboard] getDailyPlanStats failed:', err)
    return null
  })
  if (!stats || stats.totalItems <= 0) return null
  return <DailyPlanBanner stats={stats} />
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
