// Send Feedback Requests
// Shows recent events without a feedback request and allows sending survey links.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Send Feedback Requests | ChefFlow' }

export default async function FeedbackRequestsPage() {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: completedEvents } = await supabase
    .from('events')
    .select('id, occasion, event_date, client:clients(id, full_name, email)')
    .eq('tenant_id', chef.tenantId!)
    .eq('status', 'completed')
    .gte('event_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('event_date', { ascending: false })

  const events = completedEvents ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Send Feedback Requests</h1>
        <p className="mt-1 text-sm text-stone-500">
          Recent completed events. Clients receive a feedback survey link via their portal and
          email.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 bg-stone-800 rounded-xl border border-dashed border-stone-600">
          <h3 className="text-lg font-semibold text-stone-200 mb-1">No recent completed events</h3>
          <p className="text-sm text-stone-500 max-w-sm mx-auto">
            Completed events from the past 30 days will appear here so you can send feedback
            requests.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event: any) => (
            <div
              key={event.id}
              className="bg-stone-800 rounded-xl p-4 border border-stone-700 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium text-stone-100">{event.occasion ?? 'Event'}</p>
                <p className="text-sm text-stone-500">
                  {event.client?.full_name ?? 'Unknown client'}
                  {event.event_date ? ` - ${new Date(event.event_date).toLocaleDateString()}` : ''}
                </p>
              </div>
              <Link
                href={`/events/${event.id}`}
                className="shrink-0 text-sm text-amber-400 hover:text-amber-300 font-medium"
              >
                View Event
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
