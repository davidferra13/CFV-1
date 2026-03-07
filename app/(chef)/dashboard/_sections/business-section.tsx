// Dashboard Business Section - streams in independently
// Covers: financials, events, inquiries, quotes, analytics, accountability
// This is the heaviest section - streams in last

import { requireChef } from '@/lib/auth/get-user'
import { CollapsibleWidget } from '@/components/dashboard/collapsible-widget'
import { OnboardingAccelerator } from '@/components/dashboard/onboarding-accelerator'
import { BusinessInsightsPanel } from '@/components/ai/business-insights-panel'
import { RevenueProjectionWidget } from '@/components/dashboard/revenue-projection-widget'
import { ComparativePeriodsWidget } from '@/components/dashboard/comparative-periods-widget'
import { QuickExpenseWidget } from '@/components/dashboard/quick-expense-widget'
import { InvoicePulseWidget } from '@/components/dashboard/invoice-pulse-widget'
import SystemNerveCenter from '@/components/dashboard/system-nerve-center'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getRevenueProjection,
  getComparativePeriods,
  getUnloggedEventHours,
  getEventsNeedingAAR,
} from '@/lib/dashboard/actions'
import { InlineAARWidget } from '@/components/dashboard/inline-aar-widget'
import {
  getRecentExpenses,
  getUpcomingEventsForExpense,
  getInvoicePulse,
} from '@/lib/dashboard/widget-actions'
import type { InvoicePulseData } from '@/lib/dashboard/widget-actions'
import Link from 'next/link'
import type { DashboardWidgetId } from '@/lib/scheduling/types'
import { widgetGridClass } from '@/lib/scheduling/types'
import type { RevenueProjection, ComparativePeriods } from '@/lib/dashboard/actions'
import { MONTH_NAMES } from './business-section-defaults'
import { loadBusinessSectionData } from './business-section-loader'
import { buildBusinessSectionMetrics } from './business-section-metrics'
import { BusinessSectionMobileContent } from './business-section-mobile-content'

// Safe wrapper for intelligence fetches
async function safeFetch<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[BusinessSection/Intelligence] ${label} failed:`, err)
    return fallback
  }
}

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

  // Fetch existing data + intelligence data + expense widget data in parallel
  const [
    data,
    revenueProjection,
    comparativePeriods,
    recentExpenses,
    upcomingEventsForExpense,
    invoicePulse,
    unloggedEvents,
    eventsNeedingAAR,
  ] = await Promise.all([
    loadBusinessSectionData({ monthEnd, monthStart, now, userId: user.id }),
    safeFetch('revenueProjection', getRevenueProjection, null as RevenueProjection | null),
    safeFetch('comparativePeriods', getComparativePeriods, null as ComparativePeriods | null),
    safeFetch('recentExpenses', () => getRecentExpenses(3), []),
    safeFetch('upcomingEventsForExpense', getUpcomingEventsForExpense, []),
    safeFetch('invoicePulse', getInvoicePulse, {
      invoices: [],
      monthlyStats: { totalSentCents: 0, totalPaidCents: 0, collectionRate: 0 },
    } as InvoicePulseData),
    safeFetch('unloggedEvents', getUnloggedEventHours, []),
    safeFetch('eventsNeedingAAR', getEventsNeedingAAR, []),
  ])
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
        <section
          className={widgetGridClass('system_nerve_center')}
          style={{ order: getWidgetOrder('system_nerve_center') }}
        >
          <CollapsibleWidget widgetId="system_nerve_center" title="System Nerve Center">
            <SystemNerveCenter />
          </CollapsibleWidget>
        </section>
      )}

      {/* Onboarding Accelerator */}
      {isWidgetEnabled('onboarding_accelerator') && shouldShowOnboardingAccelerator && (
        <section
          className={widgetGridClass('onboarding_accelerator')}
          style={{ order: getWidgetOrder('onboarding_accelerator') }}
        >
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
        <section className="col-span-1 md:col-span-2">
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

      {/* Revenue Projection - intelligence widget */}
      {isWidgetEnabled('pipeline_forecast') && revenueProjection && (
        <section
          className={widgetGridClass('pipeline_forecast')}
          style={{ order: getWidgetOrder('pipeline_forecast') }}
        >
          <CollapsibleWidget widgetId="pipeline_forecast" title="Revenue Projection">
            <RevenueProjectionWidget projection={revenueProjection} />
          </CollapsibleWidget>
        </section>
      )}

      {/* Comparative Periods - intelligence widget */}
      {isWidgetEnabled('revenue_comparison') && comparativePeriods && (
        <section
          className={widgetGridClass('revenue_comparison')}
          style={{ order: getWidgetOrder('revenue_comparison') }}
        >
          <CollapsibleWidget widgetId="revenue_comparison" title="Performance Comparison">
            <ComparativePeriodsWidget periods={comparativePeriods} />
          </CollapsibleWidget>
        </section>
      )}

      {/* Quick Expense Capture */}
      {isWidgetEnabled('quick_expense') && (
        <section
          className={widgetGridClass('quick_expense')}
          style={{ order: getWidgetOrder('quick_expense') }}
        >
          <CollapsibleWidget widgetId="quick_expense" title="Quick Expense">
            <QuickExpenseWidget
              upcomingEvents={upcomingEventsForExpense}
              recentExpenses={recentExpenses}
            />
          </CollapsibleWidget>
        </section>
      )}

      {/* Invoice Pulse */}
      {isWidgetEnabled('invoice_pulse') && (
        <section
          className={widgetGridClass('invoice_pulse')}
          style={{ order: getWidgetOrder('invoice_pulse') }}
        >
          <CollapsibleWidget widgetId="invoice_pulse" title="Invoice Pulse">
            <InvoicePulseWidget
              invoices={invoicePulse.invoices}
              monthlyStats={invoicePulse.monthlyStats}
            />
          </CollapsibleWidget>
        </section>
      )}

      {/* Inline AAR Prompt */}
      {isWidgetEnabled('inline_aar') && eventsNeedingAAR.length > 0 && (
        <section
          className={widgetGridClass('inline_aar')}
          style={{ order: getWidgetOrder('inline_aar') }}
        >
          <InlineAARWidget events={eventsNeedingAAR} />
        </section>
      )}

      {/* Analytics Sections - collapsed on mobile */}
      <BusinessSectionMobileContent {...renderContext} unloggedEvents={unloggedEvents} />

      {/* AI Business Insights */}
      {isWidgetEnabled('business_insights') && (
        <section
          className={widgetGridClass('business_insights')}
          style={{ order: getWidgetOrder('business_insights') }}
        >
          <CollapsibleWidget widgetId="business_insights" title="Business Insights">
            <BusinessInsightsPanel />
          </CollapsibleWidget>
        </section>
      )}
    </>
  )
}
