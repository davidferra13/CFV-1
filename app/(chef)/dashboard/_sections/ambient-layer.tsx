// Dashboard Ambient Layer - today's schedule, alert grid, staff, prep pressure,
// remy alerts, current feed, restaurant metrics, multi-location, network, circles.
// Self-contained server component moved from page.tsx during decomposition.

import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getCachedChefArchetype, getCachedIsPrivileged } from '@/lib/chef/layout-data-cache'
import { getTenantDataPresence } from '@/lib/progressive-disclosure/tenant-data-presence'
import { isBrandNewChef } from '@/lib/progressive-disclosure/nav-visibility'
import { getWorkspaceDensity } from '@/lib/chef/preferences-actions'
import { getActiveAlerts } from '@/lib/ai/remy-proactive-alerts'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { WidgetCardSkeleton } from '@/components/dashboard/widget-cards/widget-card-shell'
import { RemyAlertsWidget } from '@/components/dashboard/remy-alerts-widget'
import { CurrentFeed } from '@/components/current/current-feed'
import { PrepPressureCard } from './prep-pressure-card'
import { RestaurantMetricsSection, RestaurantMetricsSkeleton } from './restaurant-metrics'
import { MultiLocationSummary, MultiLocationSummarySkeleton } from './multi-location-summary'
import { NetworkActivitySection } from './network-activity'
import { DinnerCirclesSection } from './dinner-circles-cards'
import {
  TodaysScheduleSection,
  StaffTodaySection,
  UnreadMessagesSection,
  ExpiringQuotesSection,
  OverduePaymentsSection,
  ShoppingWindowSection,
} from './widget-sections'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/AmbientLayer] ${label} failed:`, err)
    return fallback
  }
}

export async function AmbientLayer() {
  const user = await requireChef()
  const [archetype, presence, userIsPrivileged, workspaceDensity, remyAlerts] = await Promise.all([
    safe('archetype', () => getCachedChefArchetype(user.entityId), null),
    safe('presence', () => getTenantDataPresence(user.tenantId!), null),
    safe('privilegedAccess', () => getCachedIsPrivileged(user.id), false),
    safe('workspaceDensity', getWorkspaceDensity, 'standard' as const),
    safe('remyAlerts', () => getActiveAlerts(10), []),
  ])

  const isMinimalDensity = workspaceDensity === 'minimal'
  const bypassProgressiveDisclosure = userIsPrivileged || process.env.DEMO_MODE_ENABLED === 'true'

  return (
    <>
      {/* 2. Today's Schedule */}
      <WidgetErrorBoundary name="Today's Schedule" compact>
        <Suspense fallback={<WidgetCardSkeleton size="md" />}>
          <TodaysScheduleSection />
        </Suspense>
      </WidgetErrorBoundary>

      {/* 3. Alert Grid (messages, quotes, payments, shopping) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <WidgetErrorBoundary name="Unread Messages" compact>
          <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
            <UnreadMessagesSection />
          </Suspense>
        </WidgetErrorBoundary>
        <WidgetErrorBoundary name="Expiring Quotes" compact>
          <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
            <ExpiringQuotesSection />
          </Suspense>
        </WidgetErrorBoundary>
        <WidgetErrorBoundary name="Overdue Payments" compact>
          <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
            <OverduePaymentsSection />
          </Suspense>
        </WidgetErrorBoundary>
        <WidgetErrorBoundary name="Shopping Window" compact>
          <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
            <ShoppingWindowSection />
          </Suspense>
        </WidgetErrorBoundary>
      </div>

      {/* Remy Alerts (contextual, shown when present) */}
      {!isMinimalDensity && remyAlerts.length > 0 && (
        <div>
          <div className="section-label mb-3">Alerts</div>
          <RemyAlertsWidget alerts={remyAlerts} />
        </div>
      )}

      {/* 4. Staff Today */}
      <WidgetErrorBoundary name="Staff Today" compact>
        <Suspense fallback={<WidgetCardSkeleton size="sm" />}>
          <StaffTodaySection />
        </Suspense>
      </WidgetErrorBoundary>

      {/* 5. Prep Pressure */}
      <Suspense fallback={null}>
        <WidgetErrorBoundary name="Prep Pressure">
          <PrepPressureCard />
        </WidgetErrorBoundary>
      </Suspense>

      {/* The Current (operational feed) */}
      <WidgetErrorBoundary name="The Current" compact>
        <Suspense fallback={<div className="h-40 rounded-lg loading-bone loading-bone-muted" />}>
          <CurrentFeed />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Restaurant/Multi-Location (archetype-specific) */}
      {!isMinimalDensity &&
        archetype &&
        ['restaurant', 'food-truck', 'bakery'].includes(archetype) && (
          <WidgetErrorBoundary name="Restaurant Metrics" compact>
            <Suspense fallback={<RestaurantMetricsSkeleton />}>
              <RestaurantMetricsSection />
            </Suspense>
          </WidgetErrorBoundary>
        )}
      {!isMinimalDensity && (
        <WidgetErrorBoundary name="Multi-Location Summary" compact>
          <Suspense fallback={<MultiLocationSummarySkeleton />}>
            <MultiLocationSummary />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {/* Network + Dinner Circles (progressive disclosure) */}
      {!isMinimalDensity && (bypassProgressiveDisclosure || !presence || presence.hasNetwork) && (
        <WidgetErrorBoundary name="Network Activity" compact>
          <Suspense fallback={null}>
            <NetworkActivitySection />
          </Suspense>
        </WidgetErrorBoundary>
      )}
      {!isMinimalDensity && (bypassProgressiveDisclosure || !presence || presence.hasCircles) && (
        <WidgetErrorBoundary name="Dinner Circles" compact>
          <Suspense fallback={null}>
            <DinnerCirclesSection />
          </Suspense>
        </WidgetErrorBoundary>
      )}
    </>
  )
}
