// Feedback Dashboard
// Shows all received client feedback and survey responses.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Feedback Dashboard' }

export default async function FeedbackDashboardPage() {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: surveys } = await db
    .from('surveys')
    .select('*, event:events(occasion, event_date), client:clients(full_name)')
    .eq('chef_id', chef.entityId)
    .eq('completed', true)
    .order('completed_at', { ascending: false })
    .limit(50)

  const responses = surveys ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Feedback Dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">
            All client feedback received across your events.
          </p>
        </div>
        <Link href="/feedback/requests">
          <Button variant="primary" size="sm">
            Send Request
          </Button>
        </Link>
      </div>

      {responses.length === 0 ? (
        <div className="text-center py-20 bg-stone-800 rounded-xl border border-dashed border-stone-600">
          <h3 className="text-lg font-semibold text-stone-200 mb-1">No feedback yet</h3>
          <p className="text-sm text-stone-500 mb-4 max-w-sm mx-auto">
            Send a feedback request to your clients after an event to start collecting responses.
          </p>
          <Link href="/feedback/requests">
            <Button variant="primary">Send First Request</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {responses.map((survey: any) => (
            <div key={survey.id} className="bg-stone-800 rounded-xl p-4 border border-stone-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-stone-100">
                    {survey.client?.full_name ?? 'Client'}
                  </p>
                  <p className="text-sm text-stone-500">
                    {survey.event?.occasion ?? 'Event'}
                    {survey.event?.event_date
                      ? ` on ${new Date(survey.event.event_date).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                {survey.overall_rating && (
                  <span className="text-lg font-bold text-amber-400">
                    {survey.overall_rating}/5
                  </span>
                )}
              </div>
              {survey.comments && (
                <p className="mt-2 text-sm text-stone-300 italic">"{survey.comments}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
