import Link from 'next/link'
import { getBusinessTypeLabel, getCuisineLabel } from '@/lib/discover/constants'
import type { DirectoryListingSummary } from '@/lib/discover/actions'

type Props = {
  listing: DirectoryListingSummary
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'verified') {
    return (
      <span className="rounded-full bg-emerald-900/85 px-2.5 py-0.5 text-xxs font-semibold text-emerald-300 backdrop-blur-sm">
        Verified
      </span>
    )
  }
  if (status === 'claimed') {
    return (
      <span className="rounded-full bg-brand-900/85 px-2.5 py-0.5 text-xxs font-semibold text-brand-300 backdrop-blur-sm">
        Claimed
      </span>
    )
  }
  return (
    <span className="rounded-full bg-stone-800/90 px-2.5 py-0.5 text-xxs font-semibold text-stone-400 backdrop-blur-sm">
      Discovered
    </span>
  )
}

export function ListingCard({ listing }: Props) {
  const hasPhoto = listing.photo_urls.length > 0
  const cuisineLabels = listing.cuisine_types.slice(0, 3).map(getCuisineLabel)
  const locationParts = [listing.city, listing.state].filter(Boolean)
  const location = locationParts.join(', ')

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-stone-900 shadow-[0_2px_20px_rgb(0,0,0,0.06)] ring-1 ring-stone-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgb(0,0,0,0.25)] hover:ring-brand-600">
      {/* Image area */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-stone-800 to-stone-900">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.photo_urls[0]}
            alt={listing.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-6xl font-display text-stone-700">
              {listing.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Badges */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
          <StatusBadge status={listing.status} />
          {listing.featured && (
            <span className="rounded-full bg-brand-900/90 px-2.5 py-0.5 text-xxs font-semibold text-brand-300 backdrop-blur-sm">
              Featured
            </span>
          )}
        </div>

        {/* Price range */}
        {listing.price_range && (
          <div className="absolute bottom-3 right-3">
            <span className="rounded-full bg-stone-900/90 px-2.5 py-0.5 text-xs font-semibold text-stone-200 backdrop-blur-sm">
              {listing.price_range}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-stone-100 line-clamp-1">{listing.name}</h3>
          <span className="flex-shrink-0 rounded-full bg-stone-800 px-2 py-0.5 text-xxs font-medium text-stone-400">
            {getBusinessTypeLabel(listing.business_type)}
          </span>
        </div>

        {location && <p className="mt-1 text-xs text-stone-500">{location}</p>}

        {listing.description && (
          <p className="mt-2 text-sm leading-relaxed text-stone-400 line-clamp-2">
            {listing.description}
          </p>
        )}

        {cuisineLabels.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cuisineLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-stone-700 bg-stone-950 px-2 py-0.5 text-xxs font-medium text-stone-400"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          {listing.website_url ? (
            <a
              href={listing.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg bg-brand-600 px-3 py-2.5 text-center text-xs font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Visit website
            </a>
          ) : (
            <span className="flex-1 rounded-lg bg-stone-800 px-3 py-2.5 text-center text-xs font-medium text-stone-500">
              No website listed
            </span>
          )}
          <Link
            href={`/discover/${listing.slug}`}
            className="rounded-lg border border-stone-700 px-3 py-2.5 text-center text-xs font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
          >
            Details
          </Link>
        </div>
      </div>
    </article>
  )
}
