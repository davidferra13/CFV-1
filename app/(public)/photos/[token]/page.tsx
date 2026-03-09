import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GuestPhotoGallery } from '@/components/sharing/guest-photo-gallery'
import { getEventShareByToken, getGuestByToken } from '@/lib/sharing/actions'

type Props = {
  params: { token: string }
}

export default async function PhotoUploadPage({ params }: Props) {
  const eventData = await getEventShareByToken(params.token)
  if (!eventData) notFound()

  const cookieStore = cookies()
  const guestTokenCookie = cookieStore.get(`guest_token_${eventData.eventId}`)
  let existingGuest = null

  if (guestTokenCookie?.value) {
    existingGuest = await getGuestByToken(guestTokenCookie.value)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
        <Card className="border-stone-700 bg-stone-900/90">
          <CardHeader>
            <CardTitle className="text-stone-100">Share your event photos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-stone-300">
            <p className="font-medium text-stone-100">{eventData.occasion || 'Private Dinner'}</p>
            {eventData.eventDate && (
              <p>
                {format(new Date(eventData.eventDate), 'EEEE, MMMM d, yyyy')}
                {eventData.serveTime ? ` at ${eventData.serveTime.slice(0, 5)}` : ''}
              </p>
            )}
            <p>
              Upload candid photos from the evening. They will appear in the shared event gallery.
            </p>
            <Link
              href={`/share/${params.token}`}
              className="inline-flex text-sm font-medium text-brand-400 hover:text-brand-300"
            >
              Back to the full event page
            </Link>
          </CardContent>
        </Card>

        <Card className="border-stone-700 bg-stone-900/90">
          <CardContent className="p-4 sm:p-6">
            <GuestPhotoGallery
              shareToken={params.token}
              guestName={(existingGuest as any)?.full_name || undefined}
              guestToken={(existingGuest as any)?.guest_token || undefined}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
