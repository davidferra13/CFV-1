// Site Visit Assessment Page
// Structured venue evaluation for first-time event locations.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getSiteAssessment } from '@/lib/events/site-assessment-actions'
import { SiteAssessmentForm } from '@/components/events/site-assessment-form'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Site Assessment - ChefFlow' }

export default async function SiteAssessmentPage({ params }: { params: { id: string } }) {
  const user = await requireChef()

  const event = await getEventById(params.id)
  if (!event) notFound()

  const existingAssessment = await getSiteAssessment(params.id)

  // Use event location as default venue name if no assessment exists
  const defaultVenueName = [event.location_address, event.location_city].filter(Boolean).join(', ')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Site Assessment</h1>
          <p className="mt-1 text-sm text-stone-500">
            {event.title ?? 'Event'} - Venue evaluation and logistics planning
          </p>
        </div>
        <Link href={`/events/${params.id}`}>
          <Button variant="ghost" size="sm">
            Back to Event
          </Button>
        </Link>
      </div>

      <SiteAssessmentForm
        eventId={params.id}
        existingAssessment={existingAssessment}
        defaultVenueName={defaultVenueName || undefined}
      />
    </div>
  )
}
