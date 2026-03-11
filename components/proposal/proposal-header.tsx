'use client'

import { Calendar, MapPin, Users } from 'lucide-react'

type ProposalHeaderProps = {
  chefBusinessName: string | null
  chefLogoUrl: string | null
  clientName: string
  eventOccasion: string | null
  eventDate: string | null
  guestCount: number | null
  locationCity: string | null
  locationState: string | null
}

export function ProposalHeader({
  chefBusinessName,
  chefLogoUrl,
  clientName,
  eventOccasion,
  eventDate,
  guestCount,
  locationCity,
  locationState,
}: ProposalHeaderProps) {
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const location = [locationCity, locationState].filter(Boolean).join(', ')

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
              <span className="text-amber-200 font-semibold text-sm">
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
          Hi {clientName}, here&apos;s your proposal
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
      </div>
    </header>
  )
}
