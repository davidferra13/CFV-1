'use client'

import Image from 'next/image'

interface DirectoryListing {
  id: string
  business_name: string
  tagline?: string | null
  cuisines?: string[]
  city?: string | null
  state?: string | null
  min_price_cents?: number | null
  max_price_cents?: number | null
  profile_photo_url?: string | null
  rating_avg?: number | null
  review_count?: number | null
  service_types?: string[]
  featured?: boolean
}

function formatPrice(cents: number): string {
  return `$${Math.round(cents / 100)}`
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.5
  const stars: string[] = []

  for (let i = 0; i < full; i++) stars.push('filled')
  if (hasHalf) stars.push('half')
  while (stars.length < 5) stars.push('empty')

  return (
    <span
      className="inline-flex items-center gap-0.5 text-amber-500"
      aria-label={`${rating} out of 5 stars`}
    >
      {stars.map((type, i) => (
        <svg
          key={i}
          className="h-4 w-4"
          fill={type === 'empty' ? 'none' : 'currentColor'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ))}
    </span>
  )
}

export function DirectoryListingCard({ listing }: { listing: DirectoryListing }) {
  const priceRange =
    listing.min_price_cents != null && listing.max_price_cents != null
      ? `${formatPrice(listing.min_price_cents)} - ${formatPrice(listing.max_price_cents)}`
      : listing.min_price_cents != null
        ? `From ${formatPrice(listing.min_price_cents)}`
        : null

  const location = [listing.city, listing.state].filter(Boolean).join(', ')

  return (
    <div className="group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
      {listing.featured && (
        <span className="absolute -top-2 right-3 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          Featured
        </span>
      )}

      <div className="flex gap-4">
        {/* Avatar / photo */}
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-muted">
          {listing.profile_photo_url ? (
            <Image
              src={listing.profile_photo_url}
              alt={listing.business_name}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
              {listing.business_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="truncate text-base font-semibold group-hover:text-primary">
            {listing.business_name}
          </h4>

          {listing.tagline && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{listing.tagline}</p>
          )}

          {/* Rating */}
          {listing.rating_avg != null && (
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              <StarRating rating={listing.rating_avg} />
              <span className="text-muted-foreground">({listing.review_count ?? 0})</span>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="mt-3 space-y-1.5 text-sm">
        {location && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>{location}</span>
          </div>
        )}

        {priceRange && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{priceRange}/person</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {listing.cuisines && listing.cuisines.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {listing.cuisines.slice(0, 4).map((c) => (
            <span
              key={c}
              className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
            >
              {c}
            </span>
          ))}
          {listing.cuisines.length > 4 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
              +{listing.cuisines.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Service types */}
      {listing.service_types && listing.service_types.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {listing.service_types.slice(0, 3).map((s) => (
            <span key={s} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
