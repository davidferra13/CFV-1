// Event Recap Page - Shareable keepsake for guests after event completion
// Shows highlights: menu served, guest messages, photos, chef info
// Public — no auth required

import { getEventShareByToken } from '@/lib/sharing/actions'
import { getEventMessages } from '@/lib/guest-messages/actions'
import { getEventGuestPhotos } from '@/lib/guest-photos/actions'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { RecapPhotoGrid } from '@/components/sharing/recap-photo-grid'
import { TestimonialForm } from '@/components/sharing/testimonial-form'
import { cookies } from 'next/headers'

export async function generateMetadata({ params }: { params: { token: string } }) {
  const eventData = await getEventShareByToken(params.token)
  if (!eventData) return { title: 'Event Recap' }

  return {
    title: `${eventData.occasion || 'Private Dinner'} — Event Recap`,
    description: `A look back at ${eventData.occasion || 'our private dinner'}${eventData.chefName ? ` with ${eventData.chefName}` : ''}.`,
    openGraph: {
      title: `${eventData.occasion || 'Private Dinner'} — Event Recap`,
      description: `A look back at ${eventData.occasion || 'our private dinner'}${eventData.chefName ? ` with ${eventData.chefName}` : ''}.`,
    },
  }
}

export default async function RecapPage({ params }: { params: { token: string } }) {
  const eventData = await getEventShareByToken(params.token)

  if (!eventData) {
    notFound()
  }

  // Check for returning guest
  const cookieStore = cookies()
  const guestTokenCookie = cookieStore.get(`guest_token_${eventData.eventId}`)

  // Load messages and photos in parallel
  const [messages, photos] = await Promise.all([
    getEventMessages(params.token),
    getEventGuestPhotos(params.token),
  ])

  const pinnedMessages = messages.filter((m: any) => m.is_pinned)
  const recentMessages = messages.filter((m: any) => !m.is_pinned).slice(0, 10)
  const allDisplayMessages = [...pinnedMessages, ...recentMessages]

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-brand-600 mb-2 uppercase tracking-wider">
            Event Recap
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-100 mb-3">
            {eventData.occasion || 'Private Dinner'}
          </h1>
          {eventData.eventDate && (
            <p className="text-lg text-stone-400">
              {format(new Date(eventData.eventDate), 'EEEE, MMMM do, yyyy')}
            </p>
          )}
          {eventData.chefName && (
            <p className="text-stone-500 mt-2">Curated by {eventData.chefName}</p>
          )}
        </div>

        {/* Menu highlights */}
        {eventData.menus.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-stone-100 mb-4 text-center">The Menu</h2>
              <div className="space-y-3">
                {eventData.menus.map((menu: any) => (
                  <div key={menu.id} className="text-center">
                    <h3 className="font-medium text-stone-100">{menu.name}</h3>
                    {menu.description && (
                      <p className="text-stone-400 text-sm mt-1">{menu.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-stone-100 mb-4 text-center">Moments</h2>
            <RecapPhotoGrid photos={photos} />
          </div>
        )}

        {/* Guest messages */}
        {allDisplayMessages.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-stone-100 mb-4 text-center">
              What Guests Said
            </h2>
            <div className="space-y-3">
              {allDisplayMessages.map((msg: any) => (
                <div
                  key={msg.id}
                  className="bg-surface rounded-xl border border-stone-700 p-4 text-center"
                >
                  <p className="text-stone-300 italic">
                    {msg.emoji && <span className="mr-1 not-italic">{msg.emoji}</span>}
                    &ldquo;{msg.message}&rdquo;
                  </p>
                  <p className="text-sm text-stone-500 mt-2">— {msg.guest_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leave a Review */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-stone-100 mb-4 text-center">
              Leave a Review
            </h2>
            <TestimonialForm
              shareToken={params.token}
              guestName={guestTokenCookie ? undefined : undefined}
              guestToken={guestTokenCookie?.value}
              chefName={eventData.chefName}
            />
          </CardContent>
        </Card>

        {/* Chef CTA */}
        {eventData.chefProfileUrl && (
          <div className="text-center py-8 border-t border-stone-700">
            <p className="text-stone-400 mb-4">Want to host your own private dining experience?</p>
            <a
              href={eventData.chefProfileUrl}
              className="inline-block px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition"
            >
              Book {eventData.chefName || 'Your Chef'}
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-stone-400">Powered by ChefFlow</p>
        </div>
      </div>
    </div>
  )
}
