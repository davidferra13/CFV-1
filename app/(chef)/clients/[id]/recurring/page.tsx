// Recurring Service Management for a Client
// Manage ongoing service arrangements and view served dish history.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  listRecurringServices,
  getServedHistoryForClient,
  getSuggestedMenuItems,
} from '@/lib/recurring/actions'
import { SERVICE_TYPE_LABELS, REACTION_LABELS } from '@/lib/recurring/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { RecurringServiceForm } from './recurring-service-form'

export const metadata: Metadata = { title: 'Recurring Service — ChefFlow' }

export default async function ClientRecurringPage({ params }: { params: { id: string } }) {
  await requireChef()

  const [services, history, suggestions] = await Promise.all([
    listRecurringServices(params.id),
    getServedHistoryForClient(params.id, 12),
    getSuggestedMenuItems(params.id),
  ])

  const activeServices = services.filter((s: any) => s.status === 'active')

  const REACTION_COLORS: Record<string, string> = {
    loved:    'text-green-700',
    liked:    'text-blue-700',
    neutral:  'text-stone-500',
    disliked: 'text-red-600',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Recurring Service</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage ongoing arrangements and track what you&apos;ve served this client.
        </p>
      </div>

      {/* Active services */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">Service Arrangement</h2>
        {activeServices.length === 0 ? (
          <p className="text-sm text-stone-500">No active recurring service for this client.</p>
        ) : (
          activeServices.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-stone-900">{SERVICE_TYPE_LABELS[s.service_type] ?? s.service_type}</p>
                    <p className="text-sm text-stone-600 capitalize">{s.frequency} · ${(s.rate_cents / 100).toFixed(0)}/session</p>
                    {s.typical_guest_count && (
                      <p className="text-xs text-stone-400">{s.typical_guest_count} guests typical</p>
                    )}
                    <p className="text-xs text-stone-400">
                      Started {format(new Date(s.start_date + 'T00:00:00'), 'MMM d, yyyy')}
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

      {/* Menu suggestions */}
      {(suggestions.loved.length > 0 || suggestions.recentlyServed.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Menu Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.loved.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-500 mb-1">LOVED — not served recently</p>
                <ul className="space-y-0.5">
                  {suggestions.loved.map((d: any, i: any) => (
                    <li key={i} className="text-sm text-green-700">{d.dish_name}</li>
                  ))}
                </ul>
              </div>
            )}
            {suggestions.disliked.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-500 mb-1">AVOID — client disliked</p>
                <ul className="space-y-0.5">
                  {suggestions.disliked.map((name: any, i: any) => (
                    <li key={i} className="text-sm text-red-600 line-through">{name}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dish history */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Dish History (12 weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-stone-100">
              {history.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="text-stone-900">{entry.dish_name}</span>
                    <span className="text-stone-400 ml-2 text-xs">
                      {format(new Date(entry.served_date + 'T00:00:00'), 'MMM d')}
                    </span>
                  </div>
                  {entry.client_reaction && (
                    <span className={`text-xs font-medium ${REACTION_COLORS[entry.client_reaction] ?? ''}`}>
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
