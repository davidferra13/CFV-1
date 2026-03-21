// Recurring Service Management for a Client
// Manage ongoing service arrangements, planning forecast, and served dish history.

import type { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import {
  getRecurringPlanningSnapshot,
  getServedHistoryForClient,
  getSuggestedMenuItems,
  listClientMealRequests,
  listRecurringRecommendationsForClient,
  listRecurringServices,
} from '@/lib/recurring/actions'
import { SERVICE_TYPE_LABELS, REACTION_LABELS } from '@/lib/recurring/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { RecurringServiceForm } from './recurring-service-form'
import { RecommendationDraftCard } from './recommendation-draft-card'
import { ClientMealRequestsPanel } from './client-meal-requests-panel'

export const metadata: Metadata = { title: 'Recurring Service - ChefFlow' }

export default async function ClientRecurringPage({ params }: { params: { id: string } }) {
  await requireChef()

  const [services, history, suggestions, planning, mealRequests, recommendations] =
    await Promise.all([
      listRecurringServices(params.id),
      getServedHistoryForClient(params.id, 12),
      getSuggestedMenuItems(params.id),
      getRecurringPlanningSnapshot(params.id, 8),
      listClientMealRequests(params.id),
      listRecurringRecommendationsForClient(params.id, 12),
    ])

  const activeServices = services.filter((s: any) => s.status === 'active')

  const reactionColors: Record<string, string> = {
    loved: 'text-green-700',
    liked: 'text-brand-700',
    neutral: 'text-stone-500',
    disliked: 'text-red-600',
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-stone-100">Recurring Service Planning</h1>
          <Link href={`/clients/${params.id}`} className="text-sm text-brand-600 hover:underline">
            Back to Client
          </Link>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Run multi-service engagements with forecast visibility and week-ahead menu
          recommendations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Services</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-stone-100">
            {activeServices.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">8-Week Projected Revenue</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-stone-100">
            {formatCurrency(planning.totalProjectedRevenueCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended Dishes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-stone-100">
            {planning.menuSignals.recommended.length}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-stone-100">Service Arrangements</h2>
        {activeServices.length === 0 ? (
          <p className="text-sm text-stone-500">No active recurring service for this client.</p>
        ) : (
          activeServices.map((service: any) => (
            <Card key={service.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-stone-100">
                      {SERVICE_TYPE_LABELS[service.service_type] ?? service.service_type}
                    </p>
                    <p className="text-sm text-stone-400 capitalize">
                      {service.frequency} - ${(service.rate_cents / 100).toFixed(0)}/session
                    </p>
                    {service.typical_guest_count && (
                      <p className="text-xs text-stone-400">
                        {service.typical_guest_count} guests typical
                      </p>
                    )}
                    <p className="text-xs text-stone-400">
                      Started {format(new Date(`${service.start_date}T00:00:00`), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        <RecurringServiceForm clientId={params.id} />
      </div>

      <ClientMealRequestsPanel requests={mealRequests} />

      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommendation Responses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendations.slice(0, 6).map((recommendation) => (
              <div
                key={recommendation.id}
                className="rounded-lg border border-stone-800 bg-stone-900 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-stone-200">
                    Sent {format(new Date(recommendation.sent_at), 'MMM d, yyyy')}
                    {recommendation.week_start
                      ? ` • week of ${format(new Date(`${recommendation.week_start}T00:00:00`), 'MMM d')}`
                      : ''}
                  </p>
                  <Badge
                    variant={
                      recommendation.status === 'approved'
                        ? 'success'
                        : recommendation.status === 'revision_requested'
                          ? 'warning'
                          : 'info'
                    }
                  >
                    {recommendation.status.replace('_', ' ')}
                  </Badge>
                </div>
                {recommendation.client_response_notes && (
                  <p className="mt-1 text-xs text-stone-400">
                    Client note: {recommendation.client_response_notes}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {planning.serviceForecasts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Forecast and Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {planning.serviceForecasts.map((service) => (
              <div
                key={service.serviceId}
                className="rounded-lg border border-stone-800 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-100">{service.serviceLabel}</p>
                    <p className="text-xs text-stone-500 capitalize">
                      {service.frequency} - {service.daysLabel}
                    </p>
                  </div>
                  <Badge variant={service.status === 'active' ? 'success' : 'default'}>
                    {service.status}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3 text-sm">
                  <div>
                    <p className="text-stone-500">Upcoming Sessions (8w)</p>
                    <p className="font-medium text-stone-100">{service.projectedSessionCount}</p>
                  </div>
                  <div>
                    <p className="text-stone-500">Projected Revenue</p>
                    <p className="font-medium text-stone-100">
                      {formatCurrency(service.projectedRevenueCents)}
                    </p>
                  </div>
                  <div>
                    <p className="text-stone-500">Next Service</p>
                    <p className="font-medium text-stone-100">
                      {service.nextServiceDate
                        ? format(new Date(`${service.nextServiceDate}T00:00:00`), 'EEE, MMM d')
                        : 'Not scheduled'}
                    </p>
                  </div>
                </div>

                {service.upcomingDates.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-stone-500 mb-1">Next service dates</p>
                    <div className="flex flex-wrap gap-2">
                      {service.upcomingDates.slice(0, 8).map((date) => (
                        <span
                          key={date}
                          className="rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-xs text-stone-300"
                        >
                          {format(new Date(`${date}T00:00:00`), 'MMM d')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <RecommendationDraftCard
                  clientId={params.id}
                  draft={service.recommendationDraft}
                  sendDate={service.recommendationSendDate}
                  targetWeekStart={service.nextServiceDate}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(suggestions.recommended?.length > 0 ||
        suggestions.loved.length > 0 ||
        suggestions.recentlyServed.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Menu Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.recommended?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-500 mb-1">PRIORITY ROTATION</p>
                <ul className="space-y-0.5">
                  {suggestions.recommended.map((name: string, i: number) => (
                    <li key={i} className="text-sm text-stone-200">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {suggestions.loved.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-500 mb-1">
                  LOVED - not served recently
                </p>
                <ul className="space-y-0.5">
                  {suggestions.loved.map((dish: any, i: number) => (
                    <li key={i} className="text-sm text-green-700">
                      {dish.dish_name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {suggestions.disliked.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-500 mb-1">AVOID - client disliked</p>
                <ul className="space-y-0.5">
                  {suggestions.disliked.map((name: string, i: number) => (
                    <li key={i} className="text-sm text-red-600 line-through">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Dish History (12 weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-stone-800">
              {history.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="text-stone-100">{entry.dish_name}</span>
                    <span className="text-stone-400 ml-2 text-xs">
                      {format(new Date(`${entry.served_date}T00:00:00`), 'MMM d')}
                    </span>
                  </div>
                  {entry.client_reaction && (
                    <span
                      className={`text-xs font-medium ${reactionColors[entry.client_reaction] ?? ''}`}
                    >
                      {REACTION_LABELS[entry.client_reaction]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
