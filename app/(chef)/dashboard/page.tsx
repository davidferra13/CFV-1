// Chef Dashboard - Layout Compositor
// Each section is a self-contained async server component with its own data fetching.
// This file handles auth, tenant resolution, and Suspense boundaries only.

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
import { HeroZone } from './_sections/hero-zone'
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
  HeroMetricsSkeleton,
  BusinessSkeleton,
  ActivitySkeleton,
  ScheduleSkeleton,
  IntelligenceCardsSkeleton,
} from './_sections/section-skeletons'
import { CilSignalSummary } from './_sections/cil-signal-summary'
import { ActivityFeedSection } from './_sections/activity-feed-section'
import { getWeeklyRetroSummary } from '@/lib/scheduling/weekly-retro-summary-action'
import { WeeklyReflectionWidget } from '@/components/dashboard/weekly-reflection-widget'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function ChefDashboard() {
  const user = await requireChef()
  const queuePromise = getPriorityQueue().catch(() => EMPTY_PRIORITY_QUEUE)
  return (
    <div className="dashboard-page min-h-screen space-y-8 sm:space-y-10">
      <Suspense fallback={<AlertsSkeleton />}>
        <OpenClawLiveAlertsSection />
      </Suspense>

      <Suspense fallback={<HeroMetricsSkeleton />}>
        <HeroZone
          tenantId={user.tenantId!}
          userId={user.id}
          entityId={user.entityId}
          email={user.email ?? ''}
        />
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
