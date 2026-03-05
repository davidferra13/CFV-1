// Dashboard Business Section - streams in independently
// Covers: financials, events, inquiries, quotes, analytics, accountability
// This is the heaviest section - streams in last

import { requireChef } from '@/lib/auth/get-user'
import { CollapsibleWidget } from '@/components/dashboard/collapsible-widget'
import { OnboardingAccelerator } from '@/components/dashboard/onboarding-accelerator'
import { BusinessInsightsPanel } from '@/components/ai/business-insights-panel'
import SystemNerveCenter from '@/components/dashboard/system-nerve-center'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import type { DashboardWidgetId } from '@/lib/scheduling/types'
import { MONTH_NAMES } from './business-section-defaults'
import { loadBusinessSectionData } from './business-section-loader'
import { buildBusinessSectionMetrics } from './business-section-metrics'
import { BusinessSectionMobileContent } from './business-section-mobile-content'

interface BusinessSectionProps {
  widgetEnabled: Record<string, boolean>
  widgetOrder: Record<string, number>
}

export async function BusinessSection({ widgetEnabled, widgetOrder }: BusinessSectionProps) {
  const user = await requireChef()
  const now = new Date()
  const currentMonthName = MONTH_NAMES[now.getMonth()]
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

  const isWidgetEnabled = (id: DashboardWidgetId) => widgetEnabled[id] ?? true
  const getWidgetOrder = (id: DashboardWidgetId) => widgetOrder[id] ?? Number.MAX_SAFE_INTEGER

  const data = await loadBusinessSectionData({
    monthEnd,
    monthStart,
    now,
    userId: user.id,
  })
  const metrics = buildBusinessSectionMetrics({ data, now })
  const { clients, eventCounts, overdueFollowUps, quoteStats } = data
  const { shouldShowOnboardingAccelerator, totalInquiryCount } = metrics
  const renderContext = {
    ...data,
    ...metrics,
    currentMonthName,
    isWidgetEnabled,
    getWidgetOrder,
    userTenantId: user.tenantId!,
  }

  return (
    <>
      {/* System Nerve Center - admin-only */}
      {isWidgetEnabled('system_nerve_center') && (
        <section style={{ order: getWidgetOrder('system_nerve_center') }}>
          <CollapsibleWidget widgetId="system_nerve_center" title="System Nerve Center">
            <SystemNerveCenter />
          </CollapsibleWidget>
        </section>
      )}

      {/* Onboarding Accelerator */}
      {isWidgetEnabled('onboarding_accelerator') && shouldShowOnboardingAccelerator && (
        <section style={{ order: getWidgetOrder('onboarding_accelerator') }}>
          <CollapsibleWidget widgetId="onboarding_accelerator" title="Getting Started">
            <OnboardingAccelerator
              clientCount={clients.length}
              inquiryCount={totalInquiryCount}
              quoteCount={quoteStats.total}
              eventCount={eventCounts.ytd}
            />
          </CollapsibleWidget>
        </section>
      )}

      {/* Overdue Follow-Ups */}
      {overdueFollowUps.length > 0 && (
        <section>
          <Card className="border-amber-200">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-amber-900">
                  Follow-Ups Overdue ({overdueFollowUps.length})
                </CardTitle>
                <Link
                  href="/events?status=completed"
                  className="text-sm text-amber-700 hover:text-amber-900 font-medium"
                >
                  All Events
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {overdueFollowUps.map((e) => (
                <div key={e.eventId} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <Link
                      href={`/events/${e.eventId}`}
                      className="text-sm font-medium text-stone-100 hover:text-brand-600 truncate block"
                    >
                      {e.occasion || 'Event'} - {e.clientName}
                    </Link>
                    <p className="text-xs text-amber-600">{e.hoursOverdue}h overdue</p>
                  </div>
                  <Link
                    href={`/clients/${e.clientId}#messages`}
                    className="text-xs text-brand-600 hover:underline shrink-0 ml-3"
                  >
                    Send message -&gt;
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Analytics Sections - collapsed on mobile */}
      <BusinessSectionMobileContent {...renderContext} />

      {/* AI Business Insights */}
      {isWidgetEnabled('business_insights') && (
        <section style={{ order: getWidgetOrder('business_insights') }}>
          <CollapsibleWidget widgetId="business_insights" title="Business Insights">
            <BusinessInsightsPanel />
          </CollapsibleWidget>
        </section>
      )}
    </>
  )
}
