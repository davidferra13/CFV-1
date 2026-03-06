// Dashboard Alerts Section - streams in independently
// Covers: scheduling gaps, response time, pending follow-ups, holiday outreach, collaboration alerts

import { requireChef } from '@/lib/auth/get-user'
import { getSchedulingGaps } from '@/lib/scheduling/prep-block-actions'
import {
  getResponseTimeSummary,
  type ResponseTimeSummary,
} from '@/lib/analytics/response-time-actions'
import { getStaleInquiries, type PendingFollowUp } from '@/lib/inquiries/follow-up-actions'
import { getHolidayOutreachSuggestions } from '@/lib/holidays/outreach-data'
import { type HolidayOutreachSuggestion } from '@/lib/holidays/outreach-types'
import {
  getCollaboratingOnEvents,
  getPendingCollaborationInvitations,
  getPendingRecipeShares,
} from '@/lib/collaboration/actions'
import { getRecipeDebt } from '@/lib/recipes/actions'
import { getUpcomingCalls } from '@/lib/calls/actions'
import { getOnboardingProgress, type OnboardingProgress } from '@/lib/onboarding/progress-actions'
import { getRecurringCollaborationCommandCenter } from '@/lib/recurring/actions'
import { getStuckEvents } from '@/lib/pipeline/stuck-events'
import { getNextBestActions } from '@/lib/clients/next-best-action'
import { getCoolingClients } from '@/lib/clients/cooling-actions'
import { ResponseTimeWidget } from '@/components/dashboard/response-time-widget'
import { PendingFollowUpsWidget } from '@/components/inquiries/pending-follow-ups-widget'
import { StuckEventsWidget } from '@/components/pipeline/stuck-events-widget'
import { NextBestActionsWidget } from '@/components/clients/next-best-actions-widget'
import { CoolingAlertWidget } from '@/components/clients/cooling-alert-widget'
import {
  getUpcomingPaymentsDue,
  getExpiringQuotes,
  getDietaryAlertSummary,
  getUpcomingBirthdays,
  getUnreadHubMessages,
} from '@/lib/dashboard/widget-actions'
import { PaymentsDueWidget } from '@/components/dashboard/payments-due-widget'
import { ExpiringQuotesWidget } from '@/components/dashboard/expiring-quotes-widget'
import { DietaryAlertsWidget } from '@/components/dashboard/dietary-alerts-widget'
import { ClientBirthdaysWidget } from '@/components/dashboard/client-birthdays-widget'
import { UnreadHubMessagesWidget } from '@/components/dashboard/unread-hub-messages-widget'
import { HolidayOutreachPanel } from '@/components/dashboard/holiday-outreach-panel'
import { RecipeDebtWidget } from '@/components/dashboard/recipe-debt-widget'
import { UpcomingCallsWidget } from '@/components/calls/upcoming-calls-widget'
import { OnboardingChecklistWidget } from '@/components/dashboard/onboarding-checklist-widget'
import {
  CollaborationInvitationCard,
  PendingRecipeShareCard,
} from '@/components/events/event-collaborators-panel'
import { InviteChefCard } from '@/components/marketing/invite-chef-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CollapsibleWidget } from '@/components/dashboard/collapsible-widget'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import type { DashboardWidgetId } from '@/lib/scheduling/types'

// Safe wrapper
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/Alerts] ${label} failed:`, err)
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
const emptyPendingFollowUps: PendingFollowUp[] = []
const emptyRecipeDebt = { last7Days: 0, last30Days: 0, older: 0, total: 0, totalRecipes: 0 }
const emptyOnboardingProgress: OnboardingProgress = {
  profile: false,
  clients: { done: false, count: 0 },
  loyalty: { done: false },
  recipes: { done: false, count: 0 },
  staff: { done: false, count: 0 },
  completedPhases: 0,
  totalPhases: 5,
}
const emptyRecurringCommandCenter = {
  openMealRequestCount: 0,
  pendingRecommendationResponseCount: 0,
  totalOpenItems: 0,
  items: [] as Array<{
    id: string
    type: 'meal_request' | 'recommendation_response'
    client_id: string
    client_name: string
    title: string
    status: string
    priority: 'low' | 'normal' | 'high' | null
    week_start: string | null
    created_at: string
  }>,
}

interface AlertsSectionProps {
  widgetEnabled: Record<string, boolean>
  widgetOrder: Record<string, number>
}

export async function AlertsSection({ widgetEnabled, widgetOrder }: AlertsSectionProps) {
  const isWidgetEnabled = (id: DashboardWidgetId) => widgetEnabled[id] ?? true
  const getWidgetOrder = (id: DashboardWidgetId) => widgetOrder[id] ?? Number.MAX_SAFE_INTEGER

  const user = await requireChef()

  const [
    schedulingGaps,
    responseTimeSummary,
    pendingFollowUps,
    holidayOutreachSuggestions,
    collaboratingOnEvents,
    pendingCollabInvitations,
    pendingRecipeShares,
    recipeDebt,
    upcomingCalls,
    onboardingProgress,
    recurringCommandCenter,
    chefProfile,
    stuckEvents,
    nextBestActions,
    coolingClients,
    paymentsDue,
    expiringQuotes,
    dietaryAlerts,
    upcomingBirthdays,
    unreadHubMessages,
  ] = await Promise.all([
    safe('schedulingGaps', getSchedulingGaps, []),
    safe('responseTimeSummary', getResponseTimeSummary, emptyResponseTimeSummary),
    safe('pendingFollowUps', () => getStaleInquiries(3), emptyPendingFollowUps),
    safe('holidayOutreach', getHolidayOutreachSuggestions, [] as HolidayOutreachSuggestion[]),
    safe('collaboratingOnEvents', getCollaboratingOnEvents, []),
    safe('pendingCollabInvitations', getPendingCollaborationInvitations, []),
    safe('pendingRecipeShares', getPendingRecipeShares, []),
    safe('recipeDebt', getRecipeDebt, emptyRecipeDebt),
    safe('upcomingCalls', () => getUpcomingCalls(5), []),
    safe('onboardingProgress', getOnboardingProgress, emptyOnboardingProgress),
    safe(
      'recurringCommandCenter',
      () => getRecurringCollaborationCommandCenter(12),
      emptyRecurringCommandCenter
    ),
    safe(
      'chefProfile',
      async () => {
        const supabase: any = createServerClient()
        const { data } = await supabase
          .from('chefs')
          .select('slug, display_name')
          .eq('id', user.entityId)
          .single()
        return data as { slug: string | null; display_name: string | null } | null
      },
      null
    ),
    safe('stuckEvents', () => getStuckEvents(5), []),
    safe('nextBestActions', () => getNextBestActions(5), []),
    safe('coolingClients', getCoolingClients, []),
    safe('paymentsDue', () => getUpcomingPaymentsDue(5), []),
    safe('expiringQuotes', () => getExpiringQuotes(7), []),
    safe('dietaryAlerts', () => getDietaryAlertSummary(7), []),
    safe('upcomingBirthdays', () => getUpcomingBirthdays(14), []),
    safe('unreadHubMessages', () => getUnreadHubMessages(5), []),
  ])

  const serializableHolidayOutreachSuggestions = holidayOutreachSuggestions.map((suggestion) => ({
    upcoming: {
      holiday: {
        key: suggestion.upcoming.holiday.key,
        name: suggestion.upcoming.holiday.name,
      },
      date:
        typeof suggestion.upcoming.date === 'string'
          ? suggestion.upcoming.date
          : new Date(suggestion.upcoming.date).toISOString(),
      daysUntil: suggestion.upcoming.daysUntil,
      inOutreachWindow: suggestion.upcoming.inOutreachWindow,
      isUrgent: suggestion.upcoming.isUrgent,
    },
    pastClients: suggestion.pastClients,
    premiumPricing: suggestion.premiumPricing,
    outreachHook: suggestion.outreachHook,
    menuNotes: suggestion.menuNotes,
  }))

  return (
    <>
      {isWidgetEnabled('scheduling_gaps') && schedulingGaps.length > 0 && (
        <section style={{ order: getWidgetOrder('scheduling_gaps') }}>
          <CollapsibleWidget widgetId="scheduling_gaps" title="Scheduling Gaps">
            <div
              className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                schedulingGaps.some((g: any) => g.severity === 'critical')
                  ? 'bg-red-950 border-red-200 text-red-900'
                  : 'bg-amber-950 border-amber-200 text-amber-900'
              }`}
            >
              <div>
                <p className="text-sm font-semibold">
                  {schedulingGaps.length} event{schedulingGaps.length !== 1 ? 's' : ''} missing prep
                  blocks
                </p>
                <p className="text-xs mt-0.5 opacity-80">
                  {schedulingGaps.some((g: any) => g.severity === 'critical')
                    ? 'Some events are less than 48 hours away with no prep scheduled.'
                    : 'Upcoming events need grocery runs, prep sessions, and packing scheduled.'}
                </p>
              </div>
              <Link href="/calendar/week">
                <span className="text-xs font-medium underline">Plan Week</span>
              </Link>
            </div>
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('response_time') &&
        (responseTimeSummary.overdue > 0 ||
          responseTimeSummary.urgent > 0 ||
          responseTimeSummary.ok > 0) && (
          <section style={{ order: getWidgetOrder('response_time') }}>
            <CollapsibleWidget widgetId="response_time" title="Response Time">
              <ResponseTimeWidget summary={responseTimeSummary} />
            </CollapsibleWidget>
          </section>
        )}

      {isWidgetEnabled('pending_followups') && pendingFollowUps.length > 0 && (
        <section style={{ order: getWidgetOrder('pending_followups') }}>
          <CollapsibleWidget widgetId="pending_followups" title="Pending Follow-Ups">
            <PendingFollowUpsWidget followUps={pendingFollowUps} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('inbox_command_center') && recurringCommandCenter.totalOpenItems > 0 && (
        <section style={{ order: getWidgetOrder('inbox_command_center') }}>
          <CollapsibleWidget widgetId="inbox_command_center" title="Recurring Collaboration">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Collaboration Queue ({recurringCommandCenter.totalOpenItems})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-amber-700 bg-amber-950 px-2 py-0.5 text-amber-300">
                    Open requests: {recurringCommandCenter.openMealRequestCount}
                  </span>
                  <span className="rounded-full border border-sky-700 bg-sky-950 px-2 py-0.5 text-sky-300">
                    Pending approvals: {recurringCommandCenter.pendingRecommendationResponseCount}
                  </span>
                </div>

                <div className="space-y-2">
                  {recurringCommandCenter.items.slice(0, 8).map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={`/clients/${item.client_id}/recurring`}
                      className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 hover:bg-stone-700 transition-colors"
                    >
                      <div>
                        <p className="text-sm text-stone-100">
                          {item.client_name} - {item.title}
                        </p>
                        <p className="text-xs text-stone-500">
                          {item.type === 'meal_request' ? 'Meal request' : 'Recommendation'} -{' '}
                          {item.status.replace('_', ' ')}
                          {item.week_start
                            ? ` • week of ${format(
                                new Date(`${item.week_start}T00:00:00`),
                                'MMM d'
                              )}`
                            : ''}
                        </p>
                      </div>
                      <span className="text-xs text-brand-500 font-medium">Open</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('holiday_outreach') && serializableHolidayOutreachSuggestions.length > 0 && (
        <section style={{ order: getWidgetOrder('holiday_outreach') }}>
          <CollapsibleWidget widgetId="holiday_outreach" title="Holiday Outreach">
            <HolidayOutreachPanel suggestions={serializableHolidayOutreachSuggestions} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('onboarding_checklist') &&
        onboardingProgress.completedPhases < onboardingProgress.totalPhases && (
          <section style={{ order: getWidgetOrder('onboarding_checklist') }}>
            <CollapsibleWidget widgetId="onboarding_checklist" title="Onboarding Checklist">
              <OnboardingChecklistWidget progress={onboardingProgress} />
            </CollapsibleWidget>
          </section>
        )}

      {isWidgetEnabled('upcoming_calls') && upcomingCalls.length > 0 && (
        <section style={{ order: getWidgetOrder('upcoming_calls') }}>
          <CollapsibleWidget widgetId="upcoming_calls" title="Upcoming Calls">
            <UpcomingCallsWidget calls={upcomingCalls} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('collaboration_invites') &&
        (pendingCollabInvitations as any[]).length > 0 && (
          <section style={{ order: getWidgetOrder('collaboration_invites') }}>
            <CollapsibleWidget widgetId="collaboration_invites" title="Collaboration Invitations">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Collaboration Invitations ({(pendingCollabInvitations as any[]).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(pendingCollabInvitations as any[]).map((inv: any) => (
                    <CollaborationInvitationCard key={inv.id} collab={inv} />
                  ))}
                </CardContent>
              </Card>
            </CollapsibleWidget>
          </section>
        )}

      {isWidgetEnabled('recipe_shares') && (pendingRecipeShares as any[]).length > 0 && (
        <section style={{ order: getWidgetOrder('recipe_shares') }}>
          <CollapsibleWidget widgetId="recipe_shares" title="Recipe Shares">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Recipe Shares ({(pendingRecipeShares as any[]).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(pendingRecipeShares as any[]).map((share: any) => (
                  <PendingRecipeShareCard key={share.id} share={share} />
                ))}
              </CardContent>
            </Card>
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('collaborating_on') && (collaboratingOnEvents as any[]).length > 0 && (
        <section style={{ order: getWidgetOrder('collaborating_on') }}>
          <CollapsibleWidget widgetId="collaborating_on" title="Collaborating On">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Collaborating On</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(collaboratingOnEvents as any[]).map((item: any) => (
                  <Link
                    key={item.event?.id}
                    href={`/events/${item.event?.id}`}
                    className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 hover:bg-stone-700 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-100">
                        {item.event?.occasion || 'Untitled Event'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {item.event?.event_date
                          ? format(new Date(item.event.event_date), 'MMM d, yyyy')
                          : 'Date TBD'}
                        {item.event?.client ? ` - ${item.event.client.full_name}` : ''}
                      </p>
                    </div>
                    <span className="text-xs rounded-full px-2 py-0.5 bg-brand-900 text-brand-300 font-medium capitalize">
                      {item.role.replace('_', ' ')}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('recipe_debt') && (
        <section style={{ order: getWidgetOrder('recipe_debt') }}>
          <CollapsibleWidget widgetId="recipe_debt" title="Recipe Debt">
            <RecipeDebtWidget debt={recipeDebt} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('invite_chef') && (
        <section style={{ order: getWidgetOrder('invite_chef') }}>
          <CollapsibleWidget widgetId="invite_chef" title="Invite a Chef">
            <InviteChefCard
              chefSlug={chefProfile?.slug}
              chefName={chefProfile?.display_name ?? undefined}
            />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('stuck_events') && stuckEvents.length > 0 && (
        <section style={{ order: getWidgetOrder('stuck_events') }}>
          <CollapsibleWidget widgetId="stuck_events" title="Stuck Events">
            <StuckEventsWidget events={stuckEvents} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('next_best_actions') && nextBestActions.length > 0 && (
        <section style={{ order: getWidgetOrder('next_best_actions') }}>
          <CollapsibleWidget widgetId="next_best_actions" title="Client Actions">
            <NextBestActionsWidget actions={nextBestActions} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('cooling_alerts') && coolingClients.length > 0 && (
        <section style={{ order: getWidgetOrder('cooling_alerts') }}>
          <CollapsibleWidget widgetId="cooling_alerts" title="Cooling Relationships">
            <CoolingAlertWidget coolingClients={coolingClients} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('dietary_allergy_alerts') && dietaryAlerts.length > 0 && (
        <section style={{ order: getWidgetOrder('dietary_allergy_alerts') }}>
          <CollapsibleWidget widgetId="dietary_allergy_alerts" title="Dietary & Allergy Alerts">
            <DietaryAlertsWidget alerts={dietaryAlerts} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('payments_due') && paymentsDue.length > 0 && (
        <section style={{ order: getWidgetOrder('payments_due') }}>
          <CollapsibleWidget widgetId="payments_due" title="Payments Due">
            <PaymentsDueWidget payments={paymentsDue} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('expiring_quotes') && expiringQuotes.length > 0 && (
        <section style={{ order: getWidgetOrder('expiring_quotes') }}>
          <CollapsibleWidget widgetId="expiring_quotes" title="Expiring Quotes">
            <ExpiringQuotesWidget quotes={expiringQuotes} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('client_birthdays') && upcomingBirthdays.length > 0 && (
        <section style={{ order: getWidgetOrder('client_birthdays') }}>
          <CollapsibleWidget widgetId="client_birthdays" title="Client Birthdays">
            <ClientBirthdaysWidget birthdays={upcomingBirthdays} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('unread_hub_messages') && unreadHubMessages.length > 0 && (
        <section style={{ order: getWidgetOrder('unread_hub_messages') }}>
          <CollapsibleWidget widgetId="unread_hub_messages" title="Hub Messages">
            <UnreadHubMessagesWidget groups={unreadHubMessages} />
          </CollapsibleWidget>
        </section>
      )}
    </>
  )
}
