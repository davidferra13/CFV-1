// Post-Event Follow-Up Guided Workflow
// Consolidates all post-event steps into a single checklist:
// AAR, thank-you, review request, rebook, circle update.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEventFollowUpState } from '@/lib/events/follow-up-actions'
import { FollowUpChecklist } from '@/components/events/follow-up-checklist'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Post-Event Follow-Up' }

export default async function FollowUpPage({ params }: { params: { id: string } }) {
  await requireChef()

  const state = await getEventFollowUpState(params.id)
  if (!state) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1">
            <Link href={`/events/${params.id}?tab=wrap`}>
              <Button variant="ghost" size="sm">
                &larr; Back to Event
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-stone-100">Post-Event Follow-Up</h1>
          <p className="mt-1 text-stone-400">
            {state.occasion || 'Event'}
            {state.eventDate ? ` \u00b7 ${format(new Date(state.eventDate), 'MMMM d, yyyy')}` : ''}
            {state.clientName ? ` \u00b7 ${state.clientName}` : ''}
          </p>
        </div>
      </div>

      {/* Intro blurb */}
      <div className="text-sm text-stone-400 bg-stone-800 border border-stone-700 rounded-lg px-4 py-3">
        Walk through each step to close the loop on this event. Send your thank-you, capture
        feedback, request a review, and set up the next booking.
      </div>

      {/* Guided checklist */}
      <FollowUpChecklist state={state} />
    </div>
  )
}
