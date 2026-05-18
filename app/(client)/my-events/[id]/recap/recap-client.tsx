'use client'

import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Users, Camera, UtensilsCrossed } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { EventRecap } from '@/lib/events/client-recap-actions'
import { RecapVideoSection } from '@/components/events/recap-video-section'

const COURSE_ORDER = ['appetizer', 'starter', 'soup', 'salad', 'main', 'dessert', 'other']

function sortByCourse(a: { course: string | null }, b: { course: string | null }) {
  const ai = COURSE_ORDER.indexOf(a.course || 'other')
  const bi = COURSE_ORDER.indexOf(b.course || 'other')
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
}

export function RecapClient({ recap }: { recap: EventRecap }) {
  const { event, photos, menu, chefNotes } = recap
  const sortedMenu = [...menu].sort(sortByCourse)

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/my-events/${event.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to event
      </Link>

      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold text-stone-100">{event.occasion}</h1>
        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-stone-400">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
          </span>
          {event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {event.location}
            </span>
          )}
          {event.guest_count && (
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {event.guest_count} guests
            </span>
          )}
        </div>
      </div>

      {/* Photo gallery */}
      {photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-brand-500" />
              Photos ({photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-stone-800">
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={photo.caption || 'Event photo'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-8 h-8 text-stone-600" />
                      </div>
                    )}
                  </div>
                  {photo.caption && (
                    <p className="text-xs text-stone-500 mt-1 line-clamp-1">{photo.caption}</p>
                  )}
                  {photo.photo_type && (
                    <Badge
                      variant="info"
                      className="absolute top-2 left-2 text-xxs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {photo.photo_type}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu recap */}
      {sortedMenu.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-brand-500" />
              Menu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedMenu.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2 border-b border-stone-800 last:border-b-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-100">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-stone-500 mt-0.5">{item.description}</p>
                    )}
                  </div>
                  {item.course && (
                    <Badge variant="default" className="text-xxs flex-shrink-0">
                      {item.course}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chef notes */}
      {chefNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Chef's Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-300 whitespace-pre-wrap">{chefNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* No content state */}
      {photos.length === 0 && sortedMenu.length === 0 && !chefNotes && (
        <Card>
          <CardContent className="p-12 text-center">
            <Camera className="w-12 h-12 text-stone-600 mx-auto mb-3" />
            <p className="text-stone-400">
              Your chef has not shared a recap for this event yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recap video download */}
      {event.status === 'completed' && <RecapVideoSection eventId={event.id} mode="client" />}

      {/* Rebook CTA */}
      {event.status === 'completed' && (
        <div className="text-center py-4">
          <Link
            href="/book-now"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors"
          >
            Book Another Event
          </Link>
        </div>
      )}
    </div>
  )
}
