import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { getEventPhotosForChef } from '@/lib/events/photo-actions'
import { getEventSocialPosts } from '@/lib/social/event-social-actions'
import { EventPostComposer } from '@/components/social/event-post-composer'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft } from '@/components/ui/icons'
import { format, parseISO } from 'date-fns'
import type { Metadata } from 'next'

type PageProps = {
  params: { eventId: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Create Social Post - ChefFlow`,
  }
}

export default async function SocialComposePage({ params }: PageProps) {
  const user = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  // Fetch event details
  const { data: event } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, service_style,
      location_city, course_count, status,
      clients!inner(full_name)
    `
    )
    .eq('id', params.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) notFound()

  // Fetch photos and existing posts in parallel
  const [photos, existingPosts] = await Promise.all([
    getEventPhotosForChef(params.eventId),
    getEventSocialPosts(params.eventId),
  ])

  const clientName = event.clients?.full_name ?? ''

  const eventTitle = [
    event.occasion ?? 'Event',
    clientName ? `for ${clientName}` : null,
    event.event_date ? format(parseISO(event.event_date), 'MMM d, yyyy') : null,
  ]
    .filter(Boolean)
    .join(' - ')

  return (
    <div className="space-y-4">
      {/* Back nav */}
      <div className="flex items-center justify-between">
        <Link href={`/events/${params.eventId}`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Event
          </Button>
        </Link>
        <div className="text-sm text-stone-500">
          {event.status === 'completed' ? '(Completed)' : `Status: ${event.status}`}
          {' · '}
          {event.guest_count} guests
          {event.location_city ? ` · ${event.location_city}` : ''}
        </div>
      </div>

      <EventPostComposer
        eventId={params.eventId}
        photos={photos}
        existingPosts={existingPosts}
        eventTitle={eventTitle}
      />
    </div>
  )
}
