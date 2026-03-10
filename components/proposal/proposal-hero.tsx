'use client'

import { Calendar, MapPin, Users } from 'lucide-react'

type ProposalHeroProps = {
  coverPhotoUrl: string | null
  chefBusinessName: string | null
  chefLogoUrl: string | null
  eventOccasion: string | null
  eventDate: string | null
  guestCount: number | null
  locationCity: string | null
  locationState: string | null
  clientName: string
  chefMessage: string | null
}

export function ProposalHero({
  coverPhotoUrl,
  chefBusinessName,
  chefLogoUrl,
  eventOccasion,
  eventDate,
  guestCount,
  locationCity,
  locationState,
  clientName,
  chefMessage,
}: ProposalHeroProps) {
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const location = [locationCity, locationState].filter(Boolean).join(', ')
  const firstName = clientName.split(' ')[0] || clientName

  // If there's a cover photo, render the full visual hero
  if (coverPhotoUrl) {
    return (
      <header className="relative">
        {/* Cover image */}
        <div className="relative h-[300px] sm:h-[400px] md:h-[480px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverPhotoUrl}
            alt={eventOccasion || 'Event'}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
            <div className="mx-auto max-w-2xl">
              {/* Chef branding */}
              <div className="flex items-center gap-2 mb-4">
                {chefLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={chefLogoUrl}
                    alt={chefBusinessName || 'Chef'}
                    className="h-8 w-8 rounded-full object-cover border border-white/30"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-white font-semibold text-xs">
                      {(chefBusinessName || 'C').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {chefBusinessName && (
                  <span className="text-xs font-medium text-white/90 tracking-wide uppercase">
                    {chefBusinessName}
                  </span>
                )}
              </div>

              {/* Greeting */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
                Hi {firstName}, here&apos;s your proposal
              </h1>

              {eventOccasion && (
                <p className="text-lg sm:text-xl text-white/80 mb-4">{eventOccasion}</p>
              )}

              {/* Event details */}
              {(formattedDate || guestCount || location) && (
                <div className="flex flex-wrap gap-4">
                  {formattedDate && (
                    <div className="flex items-center gap-1.5 text-sm text-white/70">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formattedDate}</span>
                    </div>
                  )}
                  {guestCount && (
                    <div className="flex items-center gap-1.5 text-sm text-white/70">
                      <Users className="h-3.5 w-3.5" />
                      <span>{guestCount} guests</span>
                    </div>
                  )}
                  {location && (
                    <div className="flex items-center gap-1.5 text-sm text-white/70">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{location}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chef's personal message */}
        {chefMessage && (
          <div className="mx-auto max-w-2xl px-4 sm:px-6 -mt-4 relative z-10">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm text-gray-500 mb-1 font-medium">
                A note from {chefBusinessName || 'your chef'}
              </p>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                {chefMessage}
              </p>
            </div>
          </div>
        )}
      </header>
    )
  }

  // No cover photo: fall back to the existing gradient header style
  // but include the chef message if provided
  return (
    <header className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Chef branding */}
        <div className="flex items-center gap-3 mb-8">
          {chefLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={chefLogoUrl}
              alt={chefBusinessName || 'Chef'}
              className="h-10 w-10 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-amber-700 font-semibold text-sm">
                {(chefBusinessName || 'C').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {chefBusinessName && (
            <span className="text-sm font-medium text-gray-600 tracking-wide uppercase">
              {chefBusinessName}
            </span>
          )}
        </div>

        {/* Greeting */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Hi {firstName}, here&apos;s your proposal
        </h1>

        {eventOccasion && <p className="text-lg text-gray-600 mb-6">{eventOccasion}</p>}

        {/* Event details */}
        {(formattedDate || guestCount || location) && (
          <div className="flex flex-wrap gap-4 sm:gap-6">
            {formattedDate && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{formattedDate}</span>
              </div>
            )}
            {guestCount && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="h-4 w-4 text-gray-400" />
                <span>{guestCount} guests</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{location}</span>
              </div>
            )}
          </div>
        )}

        {/* Chef message */}
        {chefMessage && (
          <div className="mt-8 bg-amber-50/50 rounded-xl border border-amber-100 p-5">
            <p className="text-sm text-amber-800/60 mb-1 font-medium">
              A note from {chefBusinessName || 'your chef'}
            </p>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
              {chefMessage}
            </p>
          </div>
        )}
      </div>
    </header>
  )
}
