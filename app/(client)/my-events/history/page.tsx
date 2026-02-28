// All Past Events - Complete history view for clients with many completed events

import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getClientEvents } from '@/lib/events/client-actions'
import { createServerClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Past Events History - ChefFlow' }

export default async function MyEventsHistoryPage() {
  await requireClient()

  const { past, pastTotalCount } = await getClientEvents({ pastLimit: Infinity })

  // Outstanding balance check for all past events
  const supabase: any = createServerClient()
  let pastWithBalance: Set<string> = new Set()

  if (past.length > 0) {
    const pastIds = past.map((e) => e.id)
    const { data: balanceRows } = await supabase
      .from('event_financial_summary')
      .select('event_id, outstanding_balance_cents')
      .in('event_id', pastIds)
      .gt('outstanding_balance_cents', 0)

    pastWithBalance = new Set(
      (balanceRows ?? [])
        .filter((r) => (r.outstanding_balance_cents ?? 0) > 0 && r.event_id !== null)
        .map((r) => r.event_id as string)
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/my-events">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Past Events</h1>
          <p className="text-stone-400 mt-1">
            {pastTotalCount} completed event{pastTotalCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {past.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-stone-500">No past events yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {past.map((event) => {
            const hasBalance = pastWithBalance.has(event.id)
            const location = [event.location_address, event.location_city]
              .filter(Boolean)
              .join(', ')
            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default">Completed</Badge>
                        {hasBalance && <Badge variant="error">Balance Due</Badge>}
                      </div>
                      <h3 className="text-lg font-semibold text-stone-100 mb-1">
                        {event.occasion || 'Untitled Event'}
                      </h3>
                      <p className="text-sm text-stone-500">
                        {format(new Date(event.event_date), 'PPP')}
                        {location ? ` · ${location}` : ''}
                        {event.guest_count ? ` · ${event.guest_count} guests` : ''}
                      </p>
                      {(event.quoted_price_cents ?? 0) > 0 && (
                        <p className="text-sm text-stone-400 mt-1">
                          {formatCurrency(event.quoted_price_cents ?? 0)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {hasBalance && (
                        <Link href={`/my-events/${event.id}/pay`}>
                          <Button variant="primary" size="sm">
                            Pay Balance
                          </Button>
                        </Link>
                      )}
                      <Link href={`/my-events/${event.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                      <Link href={`/my-events/${event.id}#review`}>
                        <Button variant="secondary" size="sm">
                          Review
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
