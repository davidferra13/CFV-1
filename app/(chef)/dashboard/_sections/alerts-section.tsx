// Dashboard Alerts Section — streams in independently
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
import { ResponseTimeWidget } from '@/components/dashboard/response-time-widget'
import { PendingFollowUpsWidget } from '@/components/inquiries/pending-follow-ups-widget'
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
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'

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

export async function AlertsSection() {
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
    chefProfile,
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
      {/* Scheduling Gaps */}
      {schedulingGaps.length > 0 && (
        <section>
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
              <span className="text-xs font-medium underline">Plan Week →</span>
            </Link>
          </div>
        </section>
      )}

      {/* Response Time SLA */}
      {(responseTimeSummary.overdue > 0 ||
        responseTimeSummary.urgent > 0 ||
        responseTimeSummary.ok > 0) && (
        <section>
          <ResponseTimeWidget summary={responseTimeSummary} />
        </section>
      )}

      {/* Pending Follow-Ups */}
      {pendingFollowUps.length > 0 && (
        <section>
          <PendingFollowUpsWidget followUps={pendingFollowUps} />
        </section>
      )}

      {/* Holiday Outreach */}
      {serializableHolidayOutreachSuggestions.length > 0 && (
        <section>
          <HolidayOutreachPanel suggestions={serializableHolidayOutreachSuggestions} />
        </section>
      )}

      {/* Onboarding Checklist */}
      {onboardingProgress.completedPhases < onboardingProgress.totalPhases && (
        <section>
          <OnboardingChecklistWidget progress={onboardingProgress} />
        </section>
      )}

      {/* Upcoming Calls */}
      {upcomingCalls.length > 0 && (
        <section>
          <UpcomingCallsWidget calls={upcomingCalls} />
        </section>
      )}

      {/* Pending Collaboration Invitations */}
      {(pendingCollabInvitations as any[]).length > 0 && (
        <section>
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
        </section>
      )}

      {/* Pending Recipe Shares */}
      {(pendingRecipeShares as any[]).length > 0 && (
        <section>
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
        </section>
      )}

      {/* Collaborating On */}
      {(collaboratingOnEvents as any[]).length > 0 && (
        <section>
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
                      {item.event?.client ? ` · ${item.event.client.full_name}` : ''}
                    </p>
                  </div>
                  <span className="text-xs rounded-full px-2 py-0.5 bg-brand-900 text-brand-300 font-medium capitalize">
                    {item.role.replace('_', ' ')}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Recipe Debt */}
      <RecipeDebtWidget debt={recipeDebt} />

      {/* Invite a Chef */}
      <InviteChefCard
        chefSlug={chefProfile?.slug}
        chefName={chefProfile?.display_name ?? undefined}
      />
    </>
  )
}
