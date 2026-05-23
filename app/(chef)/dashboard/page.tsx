// Chef Dashboard - Unified Daily Command Center
// The command center is the primary morning screen. Existing sections are preserved
// below it as secondary context. Auth + Suspense boundaries managed here.

import { Suspense } from 'react'
import type { Metadata } from 'next'
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
} from './_sections/section-skeletons'
import { CilSignalSummary } from './_sections/cil-signal-summary'
import { ActivityFeedSection } from './_sections/activity-feed-section'
import { getWeeklyRetroSummary } from '@/lib/scheduling/weekly-retro-summary-action'
import { WeeklyReflectionWidget } from '@/components/dashboard/weekly-reflection-widget'
import {
  ChefLifeSynthesisRail,
  ChefLifeSynthesisRailSkeleton,
} from '@/components/dashboard/chef-life-synthesis-rail'
import { getChefLifeDashboardSynthesis } from '@/lib/dashboard/chef-life-synthesis-actions'

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
  const queuePromise = getPriorityQueue().catch(() => EMPTY_PRIORITY_QUEUE)
  return (
    <div className="dashboard-page min-h-screen space-y-8 sm:space-y-10">
      {/* Command Center: the unified daily morning screen */}
      <WidgetErrorBoundary name="Command Center" compact>
        <Suspense fallback={<CommandCenterSkeleton />}>
          <CommandCenterLoader />
        </Suspense>
      </WidgetErrorBoundary>

      <Suspense fallback={<AlertsSkeleton />}>
        <OpenClawLiveAlertsSection />
      </Suspense>

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

      <Suspense fallback={null}>
        <DailyPlanBannerLoader />
      </Suspense>

      <Suspense fallback={<ScheduleSkeleton />}>
        <ThisWeekSection queuePromise={queuePromise} />
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <OnboardingZone />
      </Suspense>

      <Suspense fallback={<IntelligenceCardsSkeleton />}>
        <AmbientLayer />
      </Suspense>

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

      <WidgetErrorBoundary name="Revenue Goal" compact>
        <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
          <RevenueGoalSection />
        </Suspense>
      </WidgetErrorBoundary>

      <Suspense fallback={<BusinessSkeleton />}>
        <BusinessHealthFullSection />
      </Suspense>
    </div>
  )
}

async function DailyPlanBannerLoader() {
  const stats = await getDailyPlanStats().catch(() => null)
  if (!stats || stats.totalItems <= 0) return null
  return <DailyPlanBanner stats={stats} />
}

async function WeeklyReflectionLoader() {
  const summary = await getWeeklyRetroSummary().catch(() => null)
  if (!summary || !summary.hasActivity) return null
  return <WeeklyReflectionWidget summary={summary} />
}

async function ChefLifeSynthesisLoader() {
  const data = await getChefLifeDashboardSynthesis()
  return <ChefLifeSynthesisRail data={data} />
}
