// Public Event Share Page - Guest-facing, no auth required
// Shows event details based on chef-controlled visibility settings
// Includes RSVP form for guests to respond

import { getEventShareByToken, getGuestByToken } from '@/lib/sharing/actions'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RSVPForm } from '@/components/sharing/rsvp-form'
import { ExcitementWall } from '@/components/sharing/excitement-wall'
import { GuestPhotoGallery } from '@/components/sharing/guest-photo-gallery'
import { EventCountdown } from '@/components/sharing/event-countdown'
import { GuestNetworkShare } from '@/components/sharing/guest-network-share'
import { JoinHubCTA } from '@/components/hub/join-hub-cta'
import { cookies } from 'next/headers'

export default async function SharePage({ params }: { params: { token: string } }) {
  const eventData = await getEventShareByToken(params.token)

  if (!eventData) {
    notFound()
  }

  // Check if guest has already RSVPed (stored in cookie)
  const cookieStore = cookies()
  const guestTokenCookie = cookieStore.get(`guest_token_${eventData.eventId}`)
  let existingGuest = null

  if (guestTokenCookie?.value) {
    existingGuest = await getGuestByToken(guestTokenCookie.value)
  }

  const statusLabel =
    eventData.status === 'confirmed' || eventData.status === 'paid'
      ? 'Confirmed'
      : eventData.status === 'completed'
        ? 'Completed'
        : 'Upcoming'
  const rsvpClosed =
    !!eventData.settings?.rsvp_deadline_at &&
    new Date(eventData.settings.rsvp_deadline_at) < new Date()

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Event Header */}
        <div className="text-center mb-8">
          {eventData.chefName && (
            <p className="text-sm font-medium text-brand-600 mb-2">
              Hosted by {eventData.chefName}
            </p>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-100 mb-3">
            {eventData.occasion || 'Private Dinner'}
          </h1>
          <Badge variant="success">{statusLabel}</Badge>
        </div>

        {/* Countdown — only for upcoming events */}
        {eventData.status !== 'completed' && eventData.eventDate && (
          <EventCountdown eventDate={eventData.eventDate} serveTime={eventData.serveTime} />
        )}

        {/* Event Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date & Time */}
              {eventData.eventDate && (
                <div>
                  <div className="text-sm text-stone-500 mb-1">Date</div>
                  <div className="font-medium text-stone-100">
                    {format(new Date(eventData.eventDate), 'EEEE, MMMM do, yyyy')}
                  </div>
                </div>
              )}

              {eventData.serveTime && (
                <div>
                  <div className="text-sm text-stone-500 mb-1">Dinner Time</div>
                  <div className="font-medium text-stone-100">
                    {eventData.serveTime.slice(0, 5)}
                  </div>
                </div>
              )}

              {eventData.arrivalTime && (
                <div>
                  <div className="text-sm text-stone-500 mb-1">Arrival Time</div>
                  <div className="font-medium text-stone-100">
                    {eventData.arrivalTime.slice(0, 5)}
                  </div>
                </div>
              )}

              {/* Guest Count */}
              {eventData.guestCount && (
                <div>
                  <div className="text-sm text-stone-500 mb-1">Expected Guests</div>
                  <div className="font-medium text-stone-100">{eventData.guestCount} guests</div>
                </div>
              )}

              {/* Service Style */}
              {eventData.serviceStyle && (
                <div>
                  <div className="text-sm text-stone-500 mb-1">Service Style</div>
                  <div className="font-medium text-stone-100 capitalize">
                    {eventData.serviceStyle.replace('_', ' ')}
                  </div>
                </div>
              )}
            </div>

            {/* Location */}
            {eventData.location && (
              <div className="pt-3 border-t border-stone-800">
                <div className="text-sm text-stone-500 mb-1">Location</div>
                <div className="font-medium text-stone-100">
                  {[
                    eventData.location.address,
                    eventData.location.city,
                    eventData.location.state,
                    eventData.location.zip,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </div>
                {eventData.location.notes && (
                  <p className="text-sm text-stone-300 mt-1">{eventData.location.notes}</p>
                )}
              </div>
            )}

            {/* Special Requests */}
            {eventData.specialRequests && (
              <div className="pt-3 border-t border-stone-800">
                <div className="text-sm text-stone-500 mb-1">Special Requests</div>
                <div className="text-stone-100">{eventData.specialRequests}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Menu Card */}
        {eventData.menus.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventData.menus.map((menu) => (
                  <div key={menu.id}>
                    <h4 className="font-semibold text-stone-100">{menu.name}</h4>
                    {menu.description && (
                      <p className="text-stone-300 text-sm mt-1">{menu.description}</p>
                    )}
                    {menu.service_style && (
                      <span className="inline-block mt-1 text-xs text-stone-500 capitalize">
                        {menu.service_style.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dietary Info Card */}
        {eventData.dietaryInfo && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Dietary Information</CardTitle>
            </CardHeader>
            <CardContent>
              {eventData.dietaryInfo.restrictions &&
                eventData.dietaryInfo.restrictions.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm text-stone-500 mb-1">Dietary Restrictions</div>
                    <div className="flex flex-wrap gap-2">
                      {eventData.dietaryInfo.restrictions.map((r: string) => (
                        <span
                          key={r}
                          className="px-2.5 py-1 bg-amber-950 text-amber-700 rounded-full text-xs font-medium"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              {eventData.dietaryInfo.allergies && eventData.dietaryInfo.allergies.length > 0 && (
                <div>
                  <div className="text-sm text-stone-500 mb-1">Allergies</div>
                  <div className="flex flex-wrap gap-2">
                    {eventData.dietaryInfo.allergies.map((a: string) => (
                      <span
                        key={a}
                        className="px-2.5 py-1 bg-red-950 text-red-700 rounded-full text-xs font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Guest List Card */}
        {eventData.guestList.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Guest List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {eventData.guestList.map((guest, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-stone-100">{guest.full_name}</span>
                    <Badge
                      variant={
                        guest.rsvp_status === 'attending'
                          ? 'success'
                          : guest.rsvp_status === 'declined'
                            ? 'error'
                            : guest.rsvp_status === 'maybe'
                              ? 'warning'
                              : 'default'
                      }
                    >
                      {guest.rsvp_status === 'attending'
                        ? 'Attending'
                        : guest.rsvp_status === 'declined'
                          ? 'Declined'
                          : guest.rsvp_status === 'maybe'
                            ? 'Maybe'
                            : 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* RSVP Form Card */}
        {eventData.status !== 'completed' && !rsvpClosed && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{existingGuest ? 'Update Your RSVP' : 'RSVP'}</CardTitle>
            </CardHeader>
            <CardContent>
              <RSVPForm
                shareToken={params.token}
                eventId={eventData.eventId}
                chefProfileUrl={eventData.chefProfileUrl}
                chefName={eventData.chefName}
                existingGuest={existingGuest as any}
              />
            </CardContent>
          </Card>
        )}

        {rsvpClosed && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>RSVP Closed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-400">The RSVP deadline has passed for this event.</p>
            </CardContent>
          </Card>
        )}

        {/* Join the Hub CTA — shown after guest has RSVPed */}
        {existingGuest?.guest_token && eventData.status !== 'completed' && (
          <div className="mb-6">
            <JoinHubCTA
              eventId={eventData.eventId}
              tenantId={eventData.tenantId}
              eventTitle={eventData.occasion ?? 'Dinner'}
            />
          </div>
        )}

        {/* Invite Others: viewer or guest (available once the current guest has a token) */}
        {existingGuest?.guest_token && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Invite Someone Else</CardTitle>
            </CardHeader>
            <CardContent>
              <GuestNetworkShare
                shareToken={params.token}
                eventId={eventData.eventId}
                guestToken={existingGuest.guest_token}
              />
            </CardContent>
          </Card>
        )}

        {/* Excitement Wall */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What guests are saying</CardTitle>
          </CardHeader>
          <CardContent>
            <ExcitementWall
              shareToken={params.token}
              guestName={existingGuest?.full_name}
              guestToken={existingGuest?.guest_token}
            />
          </CardContent>
        </Card>

        {/* Guest Photo Gallery */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <GuestPhotoGallery
              shareToken={params.token}
              guestName={existingGuest?.full_name}
              guestToken={existingGuest?.guest_token}
            />
          </CardContent>
        </Card>

        {/* Create Account CTA */}
        <div className="text-center py-6 border-t border-stone-700">
          <p className="text-sm text-stone-500 mb-2">
            Want to save your profile for future events?
          </p>
          <a
            href={`/auth/client-signup${existingGuest ? `?guest_token=${existingGuest.guest_token}` : ''}`}
            className="text-brand-600 hover:text-brand-400 font-medium text-sm"
          >
            Create a free account
          </a>
        </div>

        {/* Powered by ChefFlow */}
        <div className="text-center py-4">
          <a
            href="https://cheflowhq.com"
            target="_blank"
            rel="noopener"
            className="text-xs text-stone-500 hover:text-brand-400 transition-colors"
          >
            Powered by <span className="font-semibold">ChefFlow</span>
          </a>
        </div>
      </div>
    </div>
  )
}
