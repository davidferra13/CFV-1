// Dashboard Business Health Section - collapsed by default, contains
// health score, portfolio, hero metrics, hours, recipe capture, command center,
// pricing, alerts, intelligence, CIL, automation, business cards, reputation.
// Self-contained server component moved from page.tsx during decomposition.

import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getCachedChefArchetype, getCachedIsPrivileged } from '@/lib/chef/layout-data-cache'
import { getTenantDataPresence } from '@/lib/progressive-disclosure/tenant-data-presence'
import { isBrandNewChef } from '@/lib/progressive-disclosure/nav-visibility'
import { getWorkspaceDensity } from '@/lib/chef/preferences-actions'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { WidgetCardSkeleton } from '@/components/dashboard/widget-cards/widget-card-shell'
import { DashboardSection } from '@/components/dashboard/dashboard-section'
import { HeroMetrics } from './hero-metrics'
import { CommandCenterSection } from './command-center-data'
import { AlertCards } from './alerts-cards'
import { BusinessCards } from './business-cards'
import { HealthNarrativeSection } from './health-narrative'
import { IntelligenceCards } from './intelligence-cards'
import { CilSignalSummary } from './cil-signal-summary'
import { ReputationScoreCard, ReputationScoreSkeleton } from './reputation-score'
import { ClientRiskRadarWidget } from './client-risk-radar'
import { AutomationFeedCard } from './automation-feed'
import {
  BusinessHealthSection as BusinessHealthWidget,
  PortfolioSummarySection,
  HoursLogSection,
  RecipeCaptureSection,
} from './widget-sections'
import {
  WeeklyBriefingSection,
  PriceTrendAlertsSection,
  PieAttentionSection,
  CoverageHealthSection,
  PipelineStatusSection,
} from './pricing-sections'
import { MarginFeedbackCard } from '@/components/dashboard/margin-feedback-card'
import {
  HeroMetricsSkeleton,
  AlertCardsSkeleton,
  BusinessCardsSkeleton,
  IntelligenceCardsSkeleton,
  CommandCenterSkeleton,
} from './section-skeletons'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/BusinessHealth] ${label} failed:`, err)
    return fallback
  }
}

export async function BusinessHealthFullSection() {
  const user = await requireChef()
  const [archetype, presence, userIsPrivileged, workspaceDensity] = await Promise.all([
    safe('archetype', () => getCachedChefArchetype(user.entityId), null),
    safe('presence', () => getTenantDataPresence(user.tenantId!), null),
    safe('privilegedAccess', () => getCachedIsPrivileged(user.id), false),
    safe('workspaceDensity', getWorkspaceDensity, 'standard' as const),
  ])

  const isNewChef = presence ? isBrandNewChef(presence) : false
  const bypassProgressiveDisclosure = userIsPrivileged || process.env.DEMO_MODE_ENABLED === 'true'
  const simplifyForNewChef = isNewChef && !bypassProgressiveDisclosure
  const isMinimalDensity = workspaceDensity === 'minimal'

  if (simplifyForNewChef || isMinimalDensity) return null

  return (
    <DashboardSection
      id="business"
      title="Business Health, Pricing, and Intelligence"
      defaultCollapsed
    >
      <div className="space-y-8">
        <WidgetErrorBoundary name="Business Health Score" compact>
          <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
            <BusinessHealthWidget />
          </Suspense>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary name="Portfolio Summary" compact>
          <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
            <PortfolioSummarySection />
          </Suspense>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary name="Health Narrative" compact>
          <Suspense fallback={<WidgetCardSkeleton size="lg" />}>
            <HealthNarrativeSection />
          </Suspense>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary name="Hero Metrics" compact>
          <Suspense fallback={<HeroMetricsSkeleton />}>
            <HeroMetrics archetype={archetype} />
          </Suspense>
        </WidgetErrorBoundary>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <WidgetErrorBoundary name="Hours Log" compact>
            <Suspense fallback={<WidgetCardSkeleton size="md" />}>
              <HoursLogSection />
            </Suspense>
          </WidgetErrorBoundary>
          <WidgetErrorBoundary name="Recipe Capture" compact>
            <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
              <RecipeCaptureSection />
            </Suspense>
          </WidgetErrorBoundary>
        </div>

        <WidgetErrorBoundary name="Command Center" compact>
          <Suspense fallback={<CommandCenterSkeleton />}>
            <CommandCenterSection />
          </Suspense>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary name="WeeklyBriefing" compact>
          <Suspense fallback={null}>
            <WeeklyBriefingSection />
          </Suspense>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary name="PriceTrendAlerts" compact>
          <Suspense fallback={null}>
            <PriceTrendAlertsSection />
          </Suspense>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary name="MarginFeedback" compact>
          <Suspense fallback={null}>
            <MarginFeedbackCard />
          </Suspense>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary name="PieAttention" compact>
          <Suspense fallback={null}>
            <PieAttentionSection />
          </Suspense>
        </WidgetErrorBoundary>

        <Suspense fallback={null}>
          <CoverageHealthSection />
        </Suspense>
        <Suspense fallback={null}>
          <PipelineStatusSection />
        </Suspense>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <WidgetErrorBoundary name="Alerts" compact>
            <Suspense fallback={<AlertCardsSkeleton />}>
              <AlertCards />
            </Suspense>
          </WidgetErrorBoundary>
          <WidgetErrorBoundary name="Intelligence" compact>
            <Suspense fallback={<IntelligenceCardsSkeleton />}>
              <IntelligenceCards />
            </Suspense>
          </WidgetErrorBoundary>
          <WidgetErrorBoundary name="CIL Signals" compact>
            <Suspense fallback={<WidgetCardSkeleton size="md" />}>
              <CilSignalSummary />
            </Suspense>
          </WidgetErrorBoundary>
          <WidgetErrorBoundary name="Client Risk Radar" compact>
            <Suspense fallback={null}>
              <ClientRiskRadarWidget />
            </Suspense>
          </WidgetErrorBoundary>
          <WidgetErrorBoundary name="Automation Feed" compact>
            <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
              <AutomationFeedCard />
            </Suspense>
          </WidgetErrorBoundary>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <WidgetErrorBoundary name="Business" compact>
            <Suspense fallback={<BusinessCardsSkeleton />}>
              <BusinessCards />
            </Suspense>
          </WidgetErrorBoundary>
          <WidgetErrorBoundary name="Reputation" compact>
            <Suspense fallback={<ReputationScoreSkeleton />}>
              <ReputationScoreCard />
            </Suspense>
          </WidgetErrorBoundary>
        </div>
      </div>
    </DashboardSection>
  )
}
