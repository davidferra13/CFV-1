// Dashboard Alert Cards - renders stat/list cards instead of accordions

import { requireChef } from '@/lib/auth/get-user'
import { getSchedulingGaps } from '@/lib/scheduling/prep-block-actions'
import {
  getResponseTimeSummary,
  type ResponseTimeSummary,
} from '@/lib/analytics/response-time-actions'
import { getStaleInquiries, type PendingFollowUp } from '@/lib/inquiries/follow-up-actions'
import { getStuckEvents } from '@/lib/pipeline/stuck-events'
import { getCoolingClients } from '@/lib/clients/cooling-actions'
import { getUpcomingPaymentsDue, getExpiringQuotes } from '@/lib/dashboard/widget-actions'
import { getOnboardingProgress, type OnboardingProgress } from '@/lib/onboarding/progress-actions'
import { getPriceDropAlerts, getPriceFreshness } from '@/lib/openclaw/price-intelligence-actions'
import { StatCard } from '@/components/dashboard/widget-cards/stat-card'
import { ListCard, type ListCardItem } from '@/components/dashboard/widget-cards/list-card'
import { formatCurrency } from '@/lib/utils/currency'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/AlertCards] ${label} failed:`, err)
    return fallback
  }
}

const emptyResponseTimeSummary: ResponseTimeSummary = {
  overdue: 0,
  urgent: 0,
  ok: 0,
  responded: 0,
  avgResponseTimeHours: null,
}
const emptyOnboardingProgress: OnboardingProgress = {
  profile: false,
  clients: { done: false, count: 0 },
  loyalty: { done: false },
  recipes: { done: false, count: 0 },
  staff: { done: false, count: 0 },
  completedPhases: 0,
  totalPhases: 5,
}

export async function AlertCards() {
  const user = await requireChef()

  const [
    responseTimeSummary,
    pendingFollowUps,
    stuckEvents,
    coolingClients,
    paymentsDue,
    expiringQuotes,
    schedulingGaps,
    onboardingProgress,
    priceDrops,
    priceFreshness,
  ] = await Promise.all([
    safe('responseTimeSummary', getResponseTimeSummary, emptyResponseTimeSummary),
    safe('pendingFollowUps', () => getStaleInquiries(5), []),
    safe('stuckEvents', () => getStuckEvents(5), []),
    safe('coolingClients', getCoolingClients, []),
    safe('paymentsDue', () => getUpcomingPaymentsDue(5), []),
    safe('expiringQuotes', () => getExpiringQuotes(7), []),
    safe('schedulingGaps', getSchedulingGaps, []),
    safe('onboardingProgress', getOnboardingProgress, emptyOnboardingProgress),
    safe('priceDrops', () => getPriceDropAlerts(5), []),
    safe('priceFreshness', getPriceFreshness, {
      total: 0,
      current: 0,
      stale: 0,
      expired: 0,
      currentPct: 0,
    }),
  ])

  // Response Time stat card
  const totalPending =
    responseTimeSummary.overdue + responseTimeSummary.urgent + responseTimeSummary.ok
  const avgHours = responseTimeSummary.avgResponseTimeHours
  const responseStatus: 'up' | 'down' | 'flat' =
    responseTimeSummary.overdue > 0 ? 'down' : responseTimeSummary.urgent > 0 ? 'down' : 'up'
  const responseLabel =
    responseTimeSummary.overdue > 0
      ? `${responseTimeSummary.overdue} overdue (>24h)`
      : responseTimeSummary.urgent > 0
        ? `${responseTimeSummary.urgent} urgent (4-24h)`
        : 'All responded'

  // Payments Due stat card
  const totalDueCents = paymentsDue.reduce(
    (sum: number, p: any) => sum + (p.outstandingCents || 0),
    0
  )

  // Stuck Events list
  const stuckItems: ListCardItem[] = stuckEvents.map((e: any) => ({
    id: e.id,
    label: `${e.occasion || 'Event'} - ${e.clientName || 'Client'}`,
    sublabel: `Stuck in ${e.status} for ${e.daysSinceTransition}d`,
    href: `/events/${e.id}`,
    status: e.daysSinceTransition > 7 ? ('red' as const) : ('amber' as const),
  }))

  // Follow-ups list
  const followUpItems: ListCardItem[] = pendingFollowUps.map((f: PendingFollowUp) => ({
    id: f.inquiryId,
    label: f.clientName || 'Unknown Client',
    sublabel: `${f.daysSinceLastOutbound}d since last outreach`,
    href: `/inquiries/${f.inquiryId}`,
    status: f.daysSinceLastOutbound > 3 ? ('red' as const) : ('amber' as const),
  }))

  // Onboarding progress
  const onboardingDone = onboardingProgress.completedPhases >= onboardingProgress.totalPhases

  return (
    <>
      {/* Response Time - stat card */}
      {totalPending > 0 && (
        <StatCard
          widgetId="response_time"
          title="Response Time"
          value={avgHours != null ? `${avgHours.toFixed(1)}h` : `${totalPending}`}
          subtitle={avgHours != null ? 'avg response time' : 'inquiries awaiting response'}
          trend={responseLabel}
          trendDirection={responseStatus}
          href="/inquiries"
        />
      )}

      {/* Payments Due - stat card */}
      {paymentsDue.length > 0 && (
        <StatCard
          widgetId="payments_due"
          title="Payments Due"
          value={formatCurrency(totalDueCents)}
          subtitle={`${paymentsDue.length} outstanding invoice${paymentsDue.length !== 1 ? 's' : ''}`}
          trend={paymentsDue.some((p: any) => p.isOverdue) ? 'Overdue items' : 'All current'}
          trendDirection={paymentsDue.some((p: any) => p.isOverdue) ? 'down' : 'flat'}
          href="/finance/reporting"
        />
      )}

      {/* Scheduling Gaps - stat card */}
      {schedulingGaps.length > 0 && (
        <StatCard
          widgetId="scheduling_gaps"
          title="Scheduling Gaps"
          value={String(schedulingGaps.length)}
          subtitle="events missing prep blocks"
          trend={
            schedulingGaps.some((g: any) => g.severity === 'critical')
              ? 'Critical: <48h away'
              : 'Upcoming events'
          }
          trendDirection="down"
          href="/calendar/week"
        />
      )}

      {/* Expiring Quotes - stat card */}
      {expiringQuotes.length > 0 && (
        <StatCard
          widgetId="expiring_quotes"
          title="Expiring Quotes"
          value={String(expiringQuotes.length)}
          subtitle="quotes expiring within 7 days"
          trendDirection="down"
          trend="Action needed"
          href="/quotes"
        />
      )}

      {/* Stuck Events - list card */}
      {stuckItems.length > 0 && (
        <ListCard
          widgetId="stuck_events"
          title="Stuck Events"
          count={stuckItems.length}
          items={stuckItems}
          href="/events"
        />
      )}

      {/* Pending Follow-Ups - list card */}
      {followUpItems.length > 0 && (
        <ListCard
          widgetId="pending_followups"
          title="Pending Follow-Ups"
          count={followUpItems.length}
          items={followUpItems}
          href="/inquiries"
        />
      )}

      {/* Cooling Clients - stat card */}
      {coolingClients.length > 0 && (
        <StatCard
          widgetId="cooling_alerts"
          title="Cooling Clients"
          value={String(coolingClients.length)}
          subtitle="relationships need attention"
          trendDirection="down"
          trend="Reach out soon"
          href="/clients"
        />
      )}

      {/* Onboarding - stat card (only if incomplete) */}
      {!onboardingDone && (
        <StatCard
          widgetId="onboarding_checklist"
          title="Setup Progress"
          value={`${onboardingProgress.completedPhases}/${onboardingProgress.totalPhases}`}
          subtitle="onboarding phases complete"
          trendDirection={onboardingProgress.completedPhases > 0 ? 'up' : 'flat'}
          trend={`${Math.round((onboardingProgress.completedPhases / onboardingProgress.totalPhases) * 100)}% done`}
          href="/settings"
        />
      )}

      {/* Price Drop Alerts - stat card (from OpenClaw Pi) */}
      {priceDrops.length > 0 && (
        <StatCard
          widgetId="price_drops"
          title="Price Drops"
          value={String(priceDrops.length)}
          subtitle={`${priceDrops[0].ingredientName} down ${priceDrops[0].dropPct.toFixed(0)}%`}
          trendDirection="up"
          trend={`${formatCurrency(priceDrops[0].currentPriceCents)}/${priceDrops[0].unit} at ${priceDrops[0].store}`}
          href="/culinary/ingredients"
        />
      )}

      {/* Price Freshness - stat card (from OpenClaw Pi) */}
      {priceFreshness.total > 0 && (
        <StatCard
          widgetId="price_freshness"
          title="Price Data"
          value={`${priceFreshness.currentPct}%`}
          subtitle={`${priceFreshness.current.toLocaleString()} of ${priceFreshness.total.toLocaleString()} prices current`}
          trendDirection={
            priceFreshness.currentPct >= 80
              ? 'up'
              : priceFreshness.currentPct >= 50
                ? 'flat'
                : 'down'
          }
          trend={priceFreshness.stale > 0 ? `${priceFreshness.stale} stale` : 'All fresh'}
          href="/admin/price-catalog"
        />
      )}
    </>
  )
}
