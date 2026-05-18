// Chef Event Photos Management Page
// Full-page view for uploading and managing event photos with tagging,
// visibility controls, and portfolio integration.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEventPhotosForChef } from '@/lib/events/photo-actions'
import { EventPhotoGallery } from '@/components/events/event-photo-gallery'
import { createServerClient } from '@/lib/db/server'

type PageProps = {
  params: { id: string }
}

export async function generateMetadata() {
  return { title: 'Event Photos | ChefFlow' }
}

export default async function EventPhotosPage({ params }: PageProps) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id, occasion, event_date, status')
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) notFound()

  const photos = await getEventPhotosForChef(params.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/events/${params.id}`}
          className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          &larr; Back to event
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-display tracking-tight text-stone-100">
          Photos: {event.occasion || 'Event'}
        </h1>
        <p className="mt-2 text-sm text-stone-400">
          Upload photos from this event. Tag them, set visibility, and mark your best work for your
          portfolio. Photos marked client-visible will appear in the client portal.
        </p>
      </div>

      <EventPhotoGallery eventId={params.id} initialPhotos={photos} />
    </div>
  )
}
